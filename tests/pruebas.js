/* ==========================================================
   pruebas.js — Pruebas automáticas del motor de física
   Cada prueba compara lo que calcula fisica.js con la solución
   analítica de un problema clásico de libro. Si alguien rompe
   el motor al modificarlo, aquí aparece en rojo.
   ========================================================== */
(function (Lab) {
  'use strict';
  var F = Lab.fisica, g = 9.81, rad = Lab.util.rad;
  var resultados = [];

  /** Registra una prueba: pasa si |obtenido − esperado| ≤ tol */
  function cerca(nombre, obtenido, esperado, tol) {
    tol = tol || 1e-9;
    resultados.push({ nombre: nombre, obtenido: obtenido, esperado: esperado, ok: Math.abs(obtenido - esperado) <= tol });
  }
  function cierto(nombre, condicion, detalle) {
    resultados.push({ nombre: nombre, obtenido: detalle || String(condicion), esperado: 'verdadero', ok: !!condicion });
  }
  /** Atajo: aceleración inicial de un problema */
  function acel(type, p) { var md = F.model(type, p); return F.dyn(md, p.v0 || 0).a; }

  /* ---------- Plano inclinado ---------- */
  cerca('Plano sin fricción: a = −g sen θ',
    acel('plano', { m: 2, th: 30, mus: 0, muk: 0, P: 0, phi: 0, g: g }), -g * Math.sin(rad(30)));

  cerca('Plano con fricción, bajando: a = −g(sen θ − μk cos θ)',
    acel('plano', { m: 0.5, th: 30, mus: 0.35, muk: 0.25, P: 0, phi: 0, g: g }),
    -g * (Math.sin(rad(30)) - 0.25 * Math.cos(rad(30))));

  cerca('La aceleración en el plano no depende de la masa',
    acel('plano', { m: 0.1, th: 40, mus: 0.3, muk: 0.2, P: 0, phi: 0, g: g }),
    acel('plano', { m: 9, th: 40, mus: 0.3, muk: 0.2, P: 0, phi: 0, g: g }));

  // Ángulo crítico: el bloque empieza a deslizar cuando tan θ = μs
  var critico = Math.atan(0.5) * 180 / Math.PI;
  cierto('Justo por debajo del ángulo crítico se queda quieto',
    acel('plano', { m: 1, th: critico - 0.1, mus: 0.5, muk: 0.4, P: 0, phi: 0, g: g }) === 0);
  cierto('Justo por encima del ángulo crítico desliza',
    acel('plano', { m: 1, th: critico + 0.1, mus: 0.5, muk: 0.4, P: 0, phi: 0, g: g }) < 0);

  /* ---------- Superficie horizontal ---------- */
  var ph = { m: 2, th: 0, mus: 0.4, muk: 0.3, P: 12, phi: 25, g: g };
  cerca('Fuerza en ángulo: N = mg − P sen φ',
    F.model('plano', ph).N, 2 * g - 12 * Math.sin(rad(25)));
  cerca('Fuerza en ángulo: a = (P cos φ − μk N)/m',
    acel('plano', ph), (12 * Math.cos(rad(25)) - 0.3 * (2 * g - 12 * Math.sin(rad(25)))) / 2);
  cierto('Una fuerza menor que la fricción estática máxima no mueve el bloque',
    acel('plano', { m: 2, th: 0, mus: 0.4, muk: 0.3, P: 5, phi: 0, g: g }) === 0);

  /* ---------- Máquina de Atwood ---------- */
  var pa = { m1: 0.45, m2: 0.5, g: g }, aAt = acel('atwood', pa);
  cerca('Atwood: a = (m₂ − m₁)g/(m₁ + m₂)', aAt, (0.5 - 0.45) * g / 0.95);
  cerca('Atwood: T = 2m₁m₂g/(m₁ + m₂)', F.tension(pa, aAt), 2 * 0.45 * 0.5 * g / 0.95);
  cierto('Atwood con masas iguales queda en equilibrio', acel('atwood', { m1: 1, m2: 1, g: g }) === 0);

  /* ---------- Plano con masa colgante ---------- */
  cerca('Mesa lisa con masa colgante: a = m₂g/(m₁ + m₂)',
    acel('colg', { m1: 1, m2: 0.6, th: 0, mus: 0, muk: 0, g: g }), 0.6 * g / 1.6);
  var pc = { m1: 1, m2: 0.6, th: 20, mus: 0.25, muk: 0.18, g: g };
  cerca('Plano con masa colgante y fricción',
    acel('colg', pc), (0.6 * g - g * Math.sin(rad(20)) - 0.18 * g * Math.cos(rad(20))) / 1.6);

  /* ---------- Simulación contra cinemática ---------- */
  var ps = { m: 0.5, th: 30, mus: 0.35, muk: 0.25, P: 0, phi: 0, v0: 0, d: 1, g: g };
  var mds = F.model('plano', ps), sims = F.simulate(mds, ps), as = Math.abs(F.dyn(mds, 0).a);
  cerca('Tiempo de recorrido: t = √(2d/a)', sims.end, Math.sqrt(2 * 1 / as), Lab.DT);
  cerca('Velocidad final: v = √(2ad)', Math.abs(sims.V[sims.V.length - 1]), Math.sqrt(2 * as * 1), 0.02);

  // Bloque lanzado hacia arriba: frena, se detiene y regresa
  var pl = { m: 0.5, th: 30, mus: 0.35, muk: 0.25, P: 0, phi: 0, v0: 2, d: 1, g: g };
  var mdl = F.model('plano', pl), siml = F.simulate(mdl, pl);
  var frenado = g * (Math.sin(rad(30)) + 0.25 * Math.cos(rad(30)));
  cerca('Lanzado hacia arriba: distancia de frenado v₀²/(2a)', siml.events[0].s, 4 / (2 * frenado), 1e-9);
  cerca('Lanzado hacia arriba: tiempo de frenado v₀/a', siml.events[0].t, 2 / frenado, 1e-9);
  cierto('Después de detenerse, regresa (la fricción estática no lo sostiene)', siml.S[siml.S.length - 1] < 0);

  // Con mucha fricción, sube, se detiene y se queda
  var pq = { m: 0.5, th: 15, mus: 0.6, muk: 0.5, P: 0, phi: 0, v0: 2, d: 3, g: g };
  var simq = F.simulate(F.model('plano', pq), pq);
  cierto('Con fricción alta, se detiene y se queda quieto', simq.V[simq.V.length - 1] === 0 && simq.S[simq.S.length - 1] > 0);

  /* ---------- Conservación de la energía ---------- */
  function desviacionEnergia(type, p) {
    var md = F.model(type, p), sim = F.simulate(md, p), K0 = 0.5 * md.M * p.v0 * p.v0, peor = 0;
    for (var i = 0; i < sim.T.length; i++) {
      var en = Lab.energia.calcular(p, md, sim, sim.T[i], { s: sim.S[i], v: sim.V[i] });
      peor = Math.max(peor, Math.abs(en.total - K0));
    }
    return peor;
  }
  cerca('Energía: K + ΔU + Q se conserva al bajar con fricción', desviacionEnergia('plano', ps), 0, 1e-9);
  cerca('Energía: se conserva con ida y vuelta', desviacionEnergia('plano', pl), 0, 1e-9);
  cerca('Energía: se conserva con fuerza aplicada en ángulo',
    desviacionEnergia('plano', Object.assign({ v0: 0, d: 1.5 }, ph)), 0, 1e-9);
  cerca('Energía: se conserva en la máquina de Atwood',
    desviacionEnergia('atwood', Object.assign({ v0: -1, d: 1 }, pa)), 0, 1e-9);
  cerca('Energía: se conserva en el plano con masa colgante',
    desviacionEnergia('colg', Object.assign({ v0: 0, d: 0.8 }, pc)), 0, 1e-9);

  /* ---------- Movimiento circular ---------- */
  var C = Lab.circular;

  // Péndulo simple
  var pp = { m: 0.2, L: 1, th0: 35, g: g }, mdp = C.model('pendulo', pp), simp = C.simulate(mdp, pp);
  cerca('Péndulo: periodo simulado = periodo exacto para esa amplitud', simp.periodo, C.periodoExacto(1, g, rad(35)), 1e-4);
  var pchico = { m: 0.2, L: 1, th0: 2, g: g };
  cerca('Péndulo: con amplitud pequeña el periodo tiende a 2π√(L/g)',
    C.simulate(C.model('pendulo', pchico), pchico).periodo, 2 * Math.PI * Math.sqrt(1 / g), 1e-3);
  cerca('Péndulo: al soltarlo, T = mg cos θ₀', C.dyn(mdp, 0, rad(35)).T, 0.2 * g * Math.cos(rad(35)));
  var wBajo = mdp.vMax / pp.L;
  cerca('Péndulo: en el punto más bajo, T = mg(3 − 2cos θ₀)', C.dyn(mdp, wBajo, 0).T, 0.2 * g * (3 - 2 * Math.cos(rad(35))));
  var vSim = 0;
  simp.V.forEach(function (w) { vSim = Math.max(vSim, Math.abs(w) * pp.L); });
  cerca('Péndulo: rapidez máxima simulada = √(2gL(1 − cos θ₀))', vSim, mdp.vMax, 1e-4);
  cerca('Péndulo: el periodo no depende de la masa',
    C.simulate(C.model('pendulo', { m: 5, L: 1, th0: 35, g: g }), { m: 5, L: 1, th0: 35, g: g }).periodo, simp.periodo);
  var peorE = 0, E0 = Lab.energia.calcular(pp, mdp, simp, 0, { s: simp.S[0], v: 0 }).total;
  for (var j = 0; j < simp.T.length; j++) {
    peorE = Math.max(peorE, Math.abs(Lab.energia.calcular(pp, mdp, simp, simp.T[j], { s: simp.S[j], v: simp.V[j] }).total - E0));
  }
  cerca('Péndulo: Runge-Kutta conserva la energía (error < 10⁻⁹ J)', peorE, 0, 1e-9);

  // Péndulo cónico
  var pk = { m: 0.2, L: 1, thc: 30, g: g }, mdk = C.model('conico', pk);
  cerca('Cónico: T cos θ = mg', mdk.T * Math.cos(rad(30)), 0.2 * g);
  cerca('Cónico: T sen θ = mv²/r', mdk.T * Math.sin(rad(30)), 0.2 * mdk.v * mdk.v / mdk.r);
  cerca('Cónico: periodo = 2π√(L cos θ/g)', mdk.periodo, 2 * Math.PI * Math.sqrt(Math.cos(rad(30)) / g));
  cerca('Cónico: la rapidez no depende de la masa', C.model('conico', { m: 3, L: 1, thc: 30, g: g }).v, mdk.v);

  // Curva plana
  var pv = { mc: 1200, r: 30, v: 12, mus: 0.7, g: g }, mdv = C.model('curva', pv);
  cerca('Curva: fricción necesaria = mv²/r', mdv.fnec, 1200 * 144 / 30);
  cerca('Curva: v máx = √(μs g r)', mdv.vmax, Math.sqrt(0.7 * g * 30));
  cierto('Curva: por debajo de v máx no derrapa', !mdv.derrapa);
  cierto('Curva: por encima de v máx derrapa', C.model('curva', { mc: 1200, r: 30, v: mdv.vmax + 0.5, mus: 0.7, g: g }).derrapa);
  cerca('Curva: v máx no depende de la masa', C.model('curva', { mc: 3000, r: 30, v: 12, mus: 0.7, g: g }).vmax, mdv.vmax);
  var mdd = C.model('curva', { mc: 1200, r: 30, v: 20, mus: 0.7, g: g });
  cerca('Curva: al derrapar, el radio de la trayectoria es v²/(μs g)', mdd.rTray, 400 / (0.7 * g));

  /* ---------- Ajuste experimental ---------- */
  var ts = [], xs = [];
  for (var i = 0; i < 9; i++) { ts.push(i * 0.1); xs.push(0.02 + 0.3 * i * 0.1 + 0.5 * 2.5 * i * i * 0.01); }
  cerca('El ajuste recupera la aceleración de una parábola exacta', 2 * Lab.experimento.fitQuad(ts, xs).c[2], 2.5, 1e-6);

  /* ---------- Reporte ---------- */
  var pasan = resultados.filter(function (r) { return r.ok; }).length;
  var fmt = function (v) { return typeof v === 'number' ? Number(v.toPrecision(6)) : v; };
  document.getElementById('resumen').textContent = pasan + ' de ' + resultados.length + ' pruebas pasan';
  document.getElementById('resumen').className = pasan === resultados.length ? 'ok' : 'falla';
  document.getElementById('tabla').innerHTML = resultados.map(function (r) {
    return '<tr class="' + (r.ok ? 'ok' : 'falla') + '"><td>' + (r.ok ? '✓ Pasa' : '✗ Falla') + '</td><td>' + r.nombre +
      '</td><td>' + fmt(r.obtenido) + '</td><td>' + fmt(r.esperado) + '</td></tr>';
  }).join('');

})(window.Lab);
