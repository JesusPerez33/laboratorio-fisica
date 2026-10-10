/* ==========================================================
   fisica.js — Motor de física
   Todo el contenido de mecánica vive aquí y no depende de la
   pantalla: son funciones puras (datos de entrada → resultado).

   Idea central: los cuatro problemas tienen un solo grado de
   libertad, la coordenada s. Cada uno se reduce a:
     M     masa total que se mueve
     Fd    fuerza impulsora neta sobre s, sin contar la fricción
     N     fuerza normal (de ella depende la fricción)
   ========================================================== */
(function (Lab) {
  'use strict';
  var rad = Lab.util.rad;

  /**
   * Reduce el problema a sus cantidades esenciales.
   * @param {string} type  'plano' | 'atwood' | 'colg'
   * @param {object} p     parámetros (masas, ángulos, coeficientes, g)
   * @returns {{M,Fd,N,fsmax,fk,lift}}
   */
  function model(type, p) {
    var g = p.g, M, Fd, Nraw = 0;

    if (type === 'plano') {
      // Bloque sobre un plano con fuerza P a un ángulo φ sobre la superficie
      M = p.m;
      Fd = p.P * Math.cos(rad(p.phi)) - p.m * g * Math.sin(rad(p.th));
      Nraw = p.m * g * Math.cos(rad(p.th)) - p.P * Math.sin(rad(p.phi));
    } else if (type === 'atwood') {
      // Dos masas colgantes: no hay superficie, entonces no hay normal
      M = p.m1 + p.m2;
      Fd = (p.m2 - p.m1) * g;
    } else {
      // m1 sobre el plano, unida por una cuerda a m2 que cuelga
      M = p.m1 + p.m2;
      Fd = p.m2 * g - p.m1 * g * Math.sin(rad(p.th));
      Nraw = p.m1 * g * Math.cos(rad(p.th));
    }

    var N = Math.max(0, Nraw);
    var fsmax = (p.mus || 0) * N;                 // fricción estática máxima
    var fk = Math.min((p.muk || 0) * N, fsmax);   // cinética, nunca mayor que la estática

    return { M: M, Fd: Fd, N: N, fsmax: fsmax, fk: fk, lift: Nraw < 0 };
  }

  /**
   * Aceleración y fricción para una velocidad dada.
   * Aquí se decide si la fricción es estática o cinética y hacia dónde apunta.
   * @returns {{a, f, phase}}  f lleva signo sobre s.
   *          phase: 0 en reposo, +1 o −1 según el sentido del movimiento.
   */
  function dyn(md, v) {
    var dir;
    if (v === 0) {
      // Quieto: ¿la fricción estática alcanza a sostenerlo?
      if (Math.abs(md.Fd) <= md.fsmax + 1e-12) {
        return { a: 0, f: -md.Fd, phase: 0 };
      }
      dir = Math.sign(md.Fd);       // arranca hacia donde empuja la fuerza neta
    } else {
      dir = Math.sign(v);           // en movimiento: la fricción se opone a v
    }
    return { a: (md.Fd - dir * md.fk) / md.M, f: -dir * md.fk, phase: dir };
  }

  /**
   * Avanza el sistema paso a paso hasta que recorre d, queda en reposo
   * o se cumple el tiempo máximo.
   * @returns {{T, S, V, events, end}}  series de tiempo, posición y velocidad
   */
  function simulate(md, p) {
    var dt = Lab.DT, T = [0], S = [0], V = [p.v0], events = [];
    var t = 0, s = 0, v = p.v0;

    while (t < Lab.T_MAX && Math.abs(s) < p.d) {
      var k = dyn(md, v);
      if (k.phase === 0) break;                   // reposo definitivo

      var vn = v + k.a * dt;
      if (v !== 0 && vn * v <= 0) {
        // La velocidad cruza por cero dentro de este paso: se avanza
        // exactamente hasta ese instante para reevaluar la fricción.
        var tz = -v / k.a;
        s += v * tz + 0.5 * k.a * tz * tz;
        t += tz;
        v = 0;
        events.push({ t: t, s: s });
      } else {
        s += v * dt + 0.5 * k.a * dt * dt;
        v = vn;
        t += dt;
      }
      T.push(t); S.push(s); V.push(v);
    }
    return { T: T, S: S, V: V, events: events, end: t };
  }

  /** Posición y velocidad en un instante cualquiera (interpolación lineal) */
  function stateAt(sim, t) {
    var T = sim.T, ult = T.length - 1;
    if (ult === 0 || t <= 0) return { s: sim.S[0], v: sim.V[0] };
    if (t >= sim.end) return { s: sim.S[ult], v: sim.V[ult] };

    var lo = 0, hi = ult;                         // búsqueda binaria
    while (hi - lo > 1) {
      var mid = (lo + hi) >> 1;
      if (T[mid] <= t) lo = mid; else hi = mid;
    }
    var u = (t - T[lo]) / (T[hi] - T[lo] || 1);
    return {
      s: sim.S[lo] + u * (sim.S[hi] - sim.S[lo]),
      v: sim.V[lo] + u * (sim.V[hi] - sim.V[lo])
    };
  }

  /** Tensión de la cuerda en los problemas con masa colgante */
  function tension(p, a) { return p.m2 * (p.g - a); }

  Lab.fisica = { model: model, dyn: dyn, simulate: simulate, stateAt: stateAt, tension: tension };

})(window.Lab);
