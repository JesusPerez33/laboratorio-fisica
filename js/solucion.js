/* ==========================================================
   solucion.js — Solución escrita paso a paso
   Redacta el procedimiento con los números del problema.
   Cada paso es un par [título, texto].
   ========================================================== */
(function (Lab) {
  'use strict';
  var rad = Lab.util.rad, n3 = Lab.util.n3, E = Lab.util.eq;

  /** Último paso: qué debería observarse en el montaje real */
  function prediccion(sc, p, md, sim, k0) {
    if (sim.T.length === 1) {
      return 'El sistema permanece en reposo, así que no hay movimiento que predecir. Cambia los datos hasta que la fuerza impulsora supere a la fricción estática máxima.';
    }
    var h = '', e = sim.events[0], i = sim.T.length - 1;
    if (e) {
      var k = Lab.fisica.dyn(md, 0);
      h += 'Frena y se detiene en ' + E('t = ' + n3(e.t) + ' s') + ' tras avanzar ' + E(n3(Math.abs(e.s)) + ' m') + '. ' +
        (k.phase === 0
          ? 'En ese punto la fricción estática alcanza para sostenerlo y se queda quieto. '
          : 'Como la fricción estática no alcanza para sostenerlo, regresa con ' + E('a = ' + n3(k.a) + ' m/s²') + '. ');
    }
    if (Math.abs(sim.S[i]) >= p.d - 1e-6) {
      h += 'Completa el recorrido de ' + E('d = ' + n3(p.d) + ' m') + ' ' + (sim.S[i] > 0 ? sc.pos : sc.neg) +
        ' en ' + E('t = ' + n3(sim.end) + ' s') + ' y llega con ' + E('|v| = ' + n3(Math.abs(sim.V[i])) + ' m/s') + '. ';
    } else if (sim.end >= Lab.T_MAX) {
      h += 'En ' + Lab.T_MAX + ' s de simulación no alcanza a completar el recorrido. ';
    }
    if (p.v0 === 0 && !e && k0.a !== 0) {
      // Parte del reposo con aceleración constante: se puede comprobar a mano
      var a = Math.abs(k0.a);
      h += 'Comprobación con cinemática: ' + E('t = √(2d/|a|) = ' + n3(Math.sqrt(2 * p.d / a)) + ' s') + ' y ' +
        E('v = √(2|a|d) = ' + n3(Math.sqrt(2 * a * p.d)) + ' m/s') + ', igual que la simulación.';
    }
    return h;
  }

  /** Pasos comunes a los problemas con fricción: ¿se mueve? y segunda ley */
  function pasosFriccion(pasos, sc, p, md, k0, Fexpr, Mexpr) {
    var F = md.Fd, hayFriccion = md.N > 0 && (p.mus > 0 || p.muk > 0);

    if (p.v0 === 0) {
      var comparacion = hayFriccion
        ? 'La fricción estática resiste hasta ' + E('f<sub>s,máx</sub> = μ<sub>s</sub>N = ' + n3(md.fsmax) + ' N') + '. Como ' +
          E('|F| = ' + n3(Math.abs(F)) + ' N ' + (k0.phase === 0 ? '≤' : '&gt;') + ' f<sub>s,máx</sub>') + ', '
        : 'No hay fricción que se le oponga, así que ';
      var conclusion = k0.phase === 0
        ? 'el sistema <b>se queda en reposo</b>.'
        : 'el sistema <b>se mueve ' + (k0.phase > 0 ? sc.pos : sc.neg) + '</b>' +
          (hayFriccion ? ' y la fricción pasa a ser cinética: ' + E('f<sub>k</sub> = μ<sub>k</sub>N = ' + n3(md.fk) + ' N') : '') + '.';
      pasos.push(['¿Se mueve o se queda quieto?',
        'Sin contar la fricción, la fuerza neta a lo largo del movimiento es ' + E('F = ' + Fexpr + ' = ' + n3(F) + ' N') + '. ' + comparacion + conclusion]);
    } else {
      pasos.push(['Sentido de la fricción',
        'El sistema arranca moviéndose ' + (p.v0 > 0 ? sc.pos : sc.neg) + '. La fricción es cinética y se opone a la velocidad: ' +
        E('f<sub>k</sub> = μ<sub>k</sub>N = ' + n3(md.fk) + ' N') + '. La fuerza neta sin fricción es ' + E('F = ' + Fexpr + ' = ' + n3(F) + ' N') + '.']);
    }

    if (k0.phase === 0) {
      pasos.push(['Segunda ley de Newton',
        'En reposo ' + E('a = 0') + '. La fricción estática toma justo el valor que equilibra: ' +
        E('f<sub>s</sub> = |F| = ' + n3(Math.abs(k0.f)) + ' N') + ', por debajo de su máximo.']);
    } else {
      pasos.push(['Segunda ley de Newton',
        'Con la fricción incluida con su signo (' + E('f<sub>x</sub> = ' + n3(k0.f) + ' N') + '): ' +
        E('ΣF = ' + Mexpr + 'a  ⟹  a = (F + f<sub>x</sub>) / ' + Mexpr + ' = (' + n3(F) + ' + (' + n3(k0.f) + ')) / ' + n3(md.M) + ' = <b>' + n3(k0.a) + ' m/s²</b>') + '.']);
    }
  }

  function pasosPlano(pasos, sc, p, md, k0) {
    var g = p.g, th = rad(p.th || 0), W = p.m * g;
    var inclinado = (p.th || 0) > 0, hayP = p.P > 0, PconAngulo = hayP && p.phi > 0;

    pasos.push(['Aísla el cuerpo y lista las fuerzas',
      'Sobre el bloque actúan el peso ' + E('W = mg = ' + n3(p.m) + ' · ' + g + ' = ' + n3(W) + ' N') + ', la normal ' + E('N') + ' que ejerce la superficie' +
      (hayP ? ', la fuerza aplicada ' + E('P = ' + n3(p.P) + ' N') : '') +
      (p.mus > 0 || p.muk > 0 ? ' y la fricción ' + E('f') + ', paralela a la superficie' : '') + '.']);

    pasos.push(['Elige los ejes y descompón',
      'Eje ' + E('x') + ' paralelo a la superficie, positivo ' + sc.pos + '; eje ' + E('y') + ' perpendicular. ' +
      (inclinado
        ? 'El peso se descompone en ' + E('W<sub>x</sub> = −mg sen θ = ' + n3(-W * Math.sin(th)) + ' N') + ' y ' + E('W<sub>y</sub> = −mg cos θ = ' + n3(-W * Math.cos(th)) + ' N') + '. '
        : 'El peso solo tiene componente en y. ') +
      (PconAngulo
        ? 'La fuerza aplicada aporta ' + E('P<sub>x</sub> = P cos φ = ' + n3(p.P * Math.cos(rad(p.phi))) + ' N') + ' y ' + E('P<sub>y</sub> = P sen φ = ' + n3(p.P * Math.sin(rad(p.phi))) + ' N') + '.'
        : '')]);

    pasos.push(['Equilibrio perpendicular a la superficie',
      'No hay aceleración en y, entonces ' +
      E('ΣF<sub>y</sub> = 0  ⟹  N = mg' + (inclinado ? ' cos θ' : '') + (PconAngulo ? ' − P sen φ' : '') + ' = ' + n3(md.N) + ' N') + '.' +
      (PconAngulo ? ' Al tirar hacia arriba, P reduce la normal y con ella la fricción.' : '')]);

    var Fexpr = ((hayP ? 'P' + (PconAngulo ? ' cos φ' : '') : '') + (inclinado ? ' − mg sen θ' : '')).trim() || '0';
    pasosFriccion(pasos, sc, p, md, k0, Fexpr, 'm');
  }

  function pasosAtwood(pasos, p, md, k0) {
    var g = p.g;
    pasos.push(['Aísla cada masa y lista las fuerzas',
      'Sobre cada masa actúan su peso hacia abajo y la tensión hacia arriba: ' + E('W<sub>1</sub> = m<sub>1</sub>g = ' + n3(p.m1 * g) + ' N') + ', ' +
      E('W<sub>2</sub> = m<sub>2</sub>g = ' + n3(p.m2 * g) + ' N') + '. La tensión ' + E('T') + ' es la misma en ambos lados porque la cuerda y la polea son ideales.']);
    pasos.push(['Fija el sentido positivo',
      'Positivo cuando ' + E('m<sub>2</sub>') + ' baja y ' + E('m<sub>1</sub>') + ' sube. Como la cuerda no se estira, las dos masas comparten la misma aceleración ' + E('a') + '.']);
    pasos.push(['Segunda ley en cada cuerpo',
      'Para ' + E('m<sub>2</sub>') + ': ' + E('m<sub>2</sub>g − T = m<sub>2</sub>a') + '. Para ' + E('m<sub>1</sub>') + ': ' + E('T − m<sub>1</sub>g = m<sub>1</sub>a') + '.']);
    pasos.push(['Suma las ecuaciones',
      'La tensión se cancela: ' + E('a = (m<sub>2</sub> − m<sub>1</sub>)g / (m<sub>1</sub> + m<sub>2</sub>) = ' + n3(md.Fd) + ' / ' + n3(md.M) + ' = <b>' + n3(k0.a) + ' m/s²</b>') + '.']);
    pasos.push(['Despeja la tensión',
      E('T = m<sub>1</sub>(g + a) = <b>' + n3(p.m1 * (g + k0.a)) + ' N</b>') + ', un valor intermedio entre los dos pesos.']);
  }

  function pasosColgante(pasos, sc, p, md, k0) {
    var g = p.g, th = rad(p.th), W1 = p.m1 * g, inclinado = p.th > 0;
    pasos.push(['Aísla cada cuerpo y lista las fuerzas',
      'Sobre ' + E('m<sub>1</sub>') + ': peso ' + E('W<sub>1</sub> = ' + n3(W1) + ' N') + ', normal ' + E('N') + ', tensión ' + E('T') + ' hacia la polea y fricción ' + E('f') + '. Sobre ' +
      E('m<sub>2</sub>') + ': peso ' + E('W<sub>2</sub> = ' + n3(p.m2 * g) + ' N') + ' y la misma tensión ' + E('T') + ' hacia arriba.']);
    pasos.push(['Elige los ejes y descompón',
      'Para ' + E('m<sub>1</sub>') + ', eje ' + E('x') + ' a lo largo del plano hacia la polea; para ' + E('m<sub>2</sub>') + ', positivo hacia abajo. ' +
      (inclinado
        ? 'El peso de ' + E('m<sub>1</sub>') + ' aporta ' + E('W<sub>1x</sub> = −m<sub>1</sub>g sen θ = ' + n3(-W1 * Math.sin(th)) + ' N') + ' y ' + E('W<sub>1y</sub> = −m<sub>1</sub>g cos θ = ' + n3(-W1 * Math.cos(th)) + ' N') + '.'
        : '')]);
    pasos.push(['Equilibrio perpendicular al plano',
      E('ΣF<sub>y</sub> = 0  ⟹  N = m<sub>1</sub>g' + (inclinado ? ' cos θ' : '') + ' = ' + n3(md.N) + ' N') + '.']);
    pasosFriccion(pasos, sc, p, md, k0, 'm<sub>2</sub>g' + (inclinado ? ' − m<sub>1</sub>g sen θ' : ''), '(m<sub>1</sub> + m<sub>2</sub>)');
    pasos.push(['Despeja la tensión',
      'De la ecuación de la masa colgante, ' + E('m<sub>2</sub>g − T = m<sub>2</sub>a  ⟹  T = m<sub>2</sub>(g − a) = <b>' + n3(Lab.fisica.tension(p, k0.a)) + ' N</b>') + '.']);
  }

  /** Escribe la lista completa de pasos dentro de el */
  function render(el, sc, p, md, sim, k0) {
    var pasos = [];
    if (sc.type === 'plano') pasosPlano(pasos, sc, p, md, k0);
    else if (sc.type === 'atwood') pasosAtwood(pasos, p, md, k0);
    else pasosColgante(pasos, sc, p, md, k0);
    pasos.push(['Predicción para el experimento', prediccion(sc, p, md, sim, k0)]);

    el.innerHTML = pasos.map(function (s) { return '<li><h3>' + s[0] + '</h3><p>' + s[1] + '</p></li>'; }).join('');
  }

  Lab.solucion = { render: render };

})(window.Lab);
