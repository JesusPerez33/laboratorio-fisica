/* ==========================================================
   app.js — Controlador de la aplicación
   Guarda el estado, escucha los controles y coordina a los
   demás módulos. Es el único archivo que sabe "qué pasa cuando
   el usuario mueve algo".

   Flujo:  control cambia → recalcular() → motor de física →
           dibujo, solución, energía, gráficas → mostrar()

   Hay dos familias de problemas (línea recta y movimiento
   circular). Cada una aporta su motor y sus vistas con la misma
   interfaz, así que este archivo las trata igual.
   ========================================================== */
(function (Lab) {
  'use strict';
  var $ = Lab.util.$;
  var SC = Lab.SCENARIOS, PS = Lab.PARAMS;

  /* ---------- Familias de problemas ---------- */
  var LINEAL = {
    motor: Lab.fisica, dibujo: Lab.dibujo, solucion: Lab.solucion,
    graficas: Lab.graficas.simCharts,
    energia: function () { return true; }, experimento: true
  };
  var CIRCULAR = {
    motor: Lab.circular, dibujo: Lab.dibujoCircular, solucion: Lab.solucionCircular,
    graficas: Lab.graficas.circularCharts,
    // Solo en el péndulo simple la energía cambia de forma durante el movimiento
    energia: function (sc) { return sc.type === 'pendulo'; }, experimento: false
  };
  var familiaDe = function (sc) { return Lab.circular.TIPOS.indexOf(sc.type) >= 0 ? CIRCULAR : LINEAL; };

  /* ---------- Estado ---------- */
  var estado = {
    actual: 'plano',          // problema seleccionado
    valores: {},              // parámetros de cada problema
    g: Lab.G_ESTANDAR,        // gravedad, compartida por todos
    md: null, sim: null, k0: null,   // resultados de la física
    colocar: null,            // función que mueve los cuerpos en la escena
    graficas: null,           // {mover}: actualiza los puntos móviles de las gráficas
    energia: null,            // función que actualiza las barras de energía
    tau: 0,                   // instante que se está mostrando (s)
    reproduciendo: false, ultimoCuadro: 0, rapidez: 1
  };
  Object.keys(SC).forEach(function (k) { estado.valores[k] = Object.assign({}, SC[k].def); });

  var escenario = function () { return SC[estado.actual]; };
  var parametros = function () { return Object.assign({}, estado.valores[estado.actual], { g: estado.g }); };
  var listaParams = function () { return escenario().params.concat('g'); };

  /* ---------- Construcción de la interfaz ---------- */
  function construirPestanas() {
    $('tabs').innerHTML = Object.keys(SC).map(function (k) {
      return '<button type="button" id="tab_' + k + '" data-k="' + k + '" aria-pressed="' + (k === estado.actual) + '">' + SC[k].name + '</button>';
    }).join('');
  }

  function construirControles() {
    var sc = escenario(), p = parametros();
    $('controls').innerHTML = listaParams().map(function (k) {
      var s = PS[sc.type === 'atwood' && PS[k + 'a'] ? k + 'a' : k];
      var rango = 'data-k="' + k + '" min="' + s.min + '" max="' + s.max + '" step="' + s.st + '" value="' + p[k] + '"';
      var atajos = k === 'g'
        ? '<div class="hint"><button type="button" class="btn small" data-g="9.81">Estándar 9.81</button><button type="button" class="btn small" data-g="9.774">Bogotá 9.774</button></div>'
        : '';
      return '<div class="ctl"><label for="n_' + k + '">' + s.l + ' <span class="sym">' + s.s + '</span></label>' +
        '<div class="row"><input type="range" id="r_' + k + '" ' + rango + ' aria-label="' + s.l + '">' +
        '<input type="number" id="n_' + k + '" ' + rango + '><span class="unit">' + s.u + '</span></div>' + atajos + '</div>';
    }).join('');
  }

  /* ---------- Cálculo ---------- */
  function fijarValor(k, v) {
    var s = PS[k];
    if (!isFinite(v)) return;
    v = Math.min(s.max, Math.max(s.min, v));
    if (k === 'g') estado.g = v; else estado.valores[estado.actual][k] = v;
    recalcular();
  }

  /** Rehace todo a partir de los parámetros actuales */
  function recalcular() {
    var sc = escenario(), p = parametros(), fam = familiaDe(sc), motor = fam.motor;

    // 1. Física
    estado.md = motor.model(sc.type, p);
    estado.sim = motor.simulate(estado.md, p);
    estado.k0 = motor.dyn(estado.md, estado.sim.V[0], estado.sim.S[0]);
    estado.reproduciendo = false; estado.tau = 0;
    estado.sim.vmax = Math.max.apply(null, estado.sim.V.map(Math.abs));   // para escalar la flecha de velocidad
    estado.sim.smin = Math.min.apply(null, estado.sim.S);                 // recorrido, para mover el cuerpo en el diagrama
    estado.sim.smax = Math.max.apply(null, estado.sim.S);

    // 2. Advertencias sobre los límites del modelo
    var avisos = [];
    if (estado.md.lift) avisos.push('La componente vertical de P supera al peso: el bloque se despegaría de la superficie y este modelo deja de aplicar.');
    if (fam === LINEAL && (p.muk || 0) > (p.mus || 0)) avisos.push('μₖ es mayor que μₛ, algo que no ocurre en materiales reales. La simulación usa μₖ = μₛ.');
    $('warn').hidden = !avisos.length;
    $('warn').textContent = avisos.join(' ');

    // 3. Sincronizar controles (sin pisar el que el usuario está editando)
    listaParams().forEach(function (k) {
      ['r_', 'n_'].forEach(function (pre) {
        var el = $(pre + k);
        if (el && document.activeElement !== el) el.value = p[k];
      });
    });
    $('conv').textContent = sc.conv;

    // 4. Vistas
    var graf = sc.graf || Lab.GRAF_LINEAL;
    $('graf_t').textContent = graf.titulo;
    $('graf_n').textContent = graf.nota;
    estado.colocar = fam.dibujo.buildScene($('scene'), sc, p, estado.sim, estado.md);
    estado.graficas = fam.graficas($('ch_s'), $('ch_v'), sc, p, estado.md, estado.sim);
    fam.solucion.render($('steps'), sc, p, estado.md, estado.sim, estado.k0);

    var conEnergia = fam.energia(sc);
    $('sec_en').hidden = !conEnergia;
    estado.energia = conEnergia ? Lab.energia.render($('energia'), p, estado.md, estado.sim) : null;

    $('sec_exp').hidden = !fam.experimento;
    if (fam.experimento) Lab.experimento.render(p, estado.md, estado.k0);

    mostrar();
    actualizarBoton();
  }

  /* ---------- Animación ---------- */

  /** Pinta el instante estado.tau: escena, lecturas, gráficas, energía y diagrama */
  function mostrar() {
    var sc = escenario(), p = parametros(), fam = familiaDe(sc), sim = estado.sim;
    var st = Lab.fisica.stateAt(sim, estado.tau);
    var k = fam.motor.dyn(estado.md, st.v, st.s);

    estado.colocar(st.s);

    // Lecturas numéricas: cada motor decide qué tres magnitudes mostrar
    var lec = fam.motor.lecturas(sc, estado.md, p, st, k);
    $('o_t').textContent = estado.tau.toFixed(2) + ' s';
    lec.items.forEach(function (item, i) {
      $('l_' + (i + 1)).textContent = item[0];
      $(['o_s', 'o_v', 'o_a'][i]).textContent = item[1];
    });
    $('o_e').textContent = lec.estado;
    $('scrub').value = sim.end > 0 ? Math.round(estado.tau / sim.end * 1000) : 0;

    estado.graficas.mover(estado.tau, st, k);
    if (estado.energia) estado.energia(estado.tau, st);

    // El diagrama se redibuja en cada cuadro: fuerzas, aceleración y velocidad
    // corresponden siempre al instante que se está mostrando.
    fam.dibujo.renderFBD($('fbds'), sc, p, estado.md, k, st, sim);
  }

  function actualizarBoton() {
    var sim = estado.sim, enMedio = estado.tau > 0 && estado.tau < sim.end;
    $('play').textContent = estado.reproduciendo ? 'Pausar' : enMedio ? 'Continuar' : 'Reproducir';
    $('play').disabled = sim.end === 0;
    $('scrub').disabled = sim.end === 0;
  }

  function cuadro(ts) {
    if (!estado.reproduciendo) return;
    estado.tau += Math.min(0.1, (ts - estado.ultimoCuadro) / 1000) * estado.rapidez;
    estado.ultimoCuadro = ts;
    if (estado.tau >= estado.sim.end) { estado.tau = estado.sim.end; estado.reproduciendo = false; }
    mostrar();
    if (estado.reproduciendo) requestAnimationFrame(cuadro); else actualizarBoton();
  }

  /* ---------- Eventos ---------- */
  function conectarEventos() {
    $('tabs').addEventListener('click', function (e) {
      var b = e.target.closest('button');
      if (!b) return;
      estado.actual = b.dataset.k;
      construirPestanas(); construirControles(); recalcular();
    });
    $('controls').addEventListener('input', function (e) {
      var k = e.target.dataset.k;
      if (k) fijarValor(k, parseFloat(e.target.value));
    });
    $('controls').addEventListener('click', function (e) {
      var g = e.target.dataset.g;
      if (g) fijarValor('g', parseFloat(g));
    });
    $('play').addEventListener('click', function () {
      if (estado.reproduciendo) {
        estado.reproduciendo = false;
      } else {
        if (estado.tau >= estado.sim.end) estado.tau = 0;
        estado.reproduciendo = true;
        estado.ultimoCuadro = performance.now();
        requestAnimationFrame(cuadro);
      }
      actualizarBoton();
    });
    $('scrub').addEventListener('input', function (e) {
      estado.reproduciendo = false;
      estado.tau = e.target.value / 1000 * estado.sim.end;
      mostrar(); actualizarBoton();
    });
    $('speed').addEventListener('change', function (e) { estado.rapidez = parseFloat(e.target.value); });

    var refrescarExperimento = function () {
      if (familiaDe(escenario()).experimento) Lab.experimento.render(parametros(), estado.md, estado.k0);
    };
    $('data').addEventListener('input', refrescarExperimento);
    $('exreset').addEventListener('click', function () { $('data').value = Lab.DATOS_EJEMPLO; refrescarExperimento(); });
  }

  /* ---------- Arranque ---------- */
  $('data').value = Lab.DATOS_EJEMPLO;
  construirPestanas();
  construirControles();
  conectarEventos();
  recalcular();

})(window.Lab);
