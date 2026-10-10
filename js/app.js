/* ==========================================================
   app.js — Controlador de la aplicación
   Guarda el estado, escucha los controles y coordina a los
   demás módulos. Es el único archivo que sabe "qué pasa cuando
   el usuario mueve algo".

   Flujo:  control cambia → recalcular() → fisica → dibujo,
           solucion, graficas, experimento → mostrar()
   ========================================================== */
(function (Lab) {
  'use strict';
  var $ = Lab.util.$, n3 = Lab.util.n3;
  var F = Lab.fisica, SC = Lab.SCENARIOS, PS = Lab.PARAMS;

  /* ---------- Estado ---------- */
  var estado = {
    actual: 'plano',          // problema seleccionado
    valores: {},              // parámetros de cada problema
    g: Lab.G_ESTANDAR,        // gravedad, compartida por todos
    md: null, sim: null, k0: null,   // resultados de la física
    colocar: null,            // función que mueve los cuerpos en la escena
    escalas: null,            // escalas de las gráficas (para el punto móvil)
    tau: 0,                   // instante que se está mostrando (s)
    reproduciendo: false, ultimoCuadro: 0, rapidez: 1,
    claveDCL: ''              // evita redibujar el diagrama si nada cambió
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
    var sc = escenario(), p = parametros();

    // 1. Física
    estado.md = F.model(sc.type, p);
    estado.sim = F.simulate(estado.md, p);
    estado.k0 = F.dyn(estado.md, p.v0);
    estado.reproduciendo = false; estado.tau = 0; estado.claveDCL = '';

    // 2. Advertencias sobre los límites del modelo
    var avisos = [];
    if (estado.md.lift) avisos.push('La componente vertical de P supera al peso: el bloque se despegaría de la superficie y este modelo deja de aplicar.');
    if ((p.muk || 0) > (p.mus || 0)) avisos.push('μₖ es mayor que μₛ, algo que no ocurre en materiales reales. La simulación usa μₖ = μₛ.');
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
    estado.colocar = Lab.dibujo.buildScene($('scene'), sc, p, estado.sim);
    estado.escalas = Lab.graficas.simCharts($('ch_s'), $('ch_v'), estado.sim);
    Lab.solucion.render($('steps'), sc, p, estado.md, estado.sim, estado.k0);
    Lab.experimento.render(p, estado.md, estado.k0);
    mostrar();
    actualizarBoton();
  }

  /* ---------- Animación ---------- */

  /** Pinta el instante estado.tau: escena, lecturas, gráficas y diagrama */
  function mostrar() {
    var sc = escenario(), sim = estado.sim;
    var st = F.stateAt(sim, estado.tau), k = F.dyn(estado.md, st.v);

    estado.colocar(st.s);
    $('o_t').textContent = estado.tau.toFixed(2) + ' s';
    $('o_s').textContent = n3(st.s) + ' m';
    $('o_v').textContent = n3(st.v) + ' m/s';
    $('o_a').textContent = n3(k.a) + ' m/s²';
    $('o_e').textContent = k.phase === 0
      ? (estado.md.fsmax > 0 ? 'En reposo, sostenido por la fricción estática' : 'En reposo, fuerzas equilibradas')
      : st.v === 0 ? 'Arranca ' + (k.phase > 0 ? sc.pos : sc.neg) : 'Se mueve ' + (st.v > 0 ? sc.pos : sc.neg);
    $('scrub').value = sim.end > 0 ? Math.round(estado.tau / sim.end * 1000) : 0;

    var cs = $('cur_s'), cv = $('cur_v'), e = estado.escalas;
    if (cs) { cs.setAttribute('cx', e.s.X(estado.tau)); cs.setAttribute('cy', e.s.Y(st.s)); }
    if (cv) { cv.setAttribute('cx', e.v.X(estado.tau)); cv.setAttribute('cy', e.v.Y(st.v)); }

    // El diagrama solo cambia cuando cambia el régimen (reposo / sentido)
    var clave = estado.actual + k.phase;
    if (clave !== estado.claveDCL) {
      estado.claveDCL = clave;
      Lab.dibujo.renderFBD($('fbds'), sc, parametros(), estado.md, k);
    }
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

    var refrescarExperimento = function () { Lab.experimento.render(parametros(), estado.md, estado.k0); };
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
