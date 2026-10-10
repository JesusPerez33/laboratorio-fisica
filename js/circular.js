/* ==========================================================
   circular.js — Motor de física para movimiento circular
   Péndulo simple, péndulo cónico y auto en curva plana.
   Igual que fisica.js: funciones puras, sin tocar la pantalla,
   y con la misma interfaz (model, dyn, simulate, lecturas) para
   que el resto de la aplicación no tenga que distinguirlos.

   En los tres casos la clave es la misma: en la dirección
   radial la suma de fuerzas NO es cero, vale m·v²/r y apunta
   hacia el centro (fuerza centrípeta = resultante, no una
   fuerza adicional).
   ========================================================== */
(function (Lab) {
  'use strict';
  var rad = Lab.util.rad, n3 = Lab.util.n3;

  var TIPOS = ['pendulo', 'conico', 'curva'];

  /**
   * Cantidades que no cambian durante el movimiento.
   * @param {string} type  'pendulo' | 'conico' | 'curva'
   */
  function model(type, p) {
    var g = p.g, md = { tipo: type, p: p };

    if (type === 'pendulo') {
      md.th0 = rad(p.th0);                              // amplitud (rad)
      md.periodoPequeno = 2 * Math.PI * Math.sqrt(p.L / g);   // fórmula de ángulos pequeños
      md.vMax = Math.sqrt(2 * g * p.L * (1 - Math.cos(md.th0)));   // en el punto más bajo
      md.TMax = p.m * g * (3 - 2 * Math.cos(md.th0));
    } else if (type === 'conico') {
      var th = rad(p.thc);
      md.th = th;
      md.r = p.L * Math.sin(th);                        // radio del círculo
      md.T = p.m * g / Math.cos(th);                    // de ΣFy = 0
      md.v = Math.sqrt(g * md.r * Math.tan(th));        // de ΣFx = m v²/r
      md.w = md.v / md.r;                               // rapidez angular
      md.periodo = 2 * Math.PI / md.w;
      md.ac = md.v * md.v / md.r;
    } else {
      md.N = p.mc * g;                                  // de ΣFy = 0
      md.fnec = p.mc * p.v * p.v / p.r;                 // fricción que exige la curva
      md.fmax = p.mus * md.N;                           // la que el piso puede dar
      md.derrapa = md.fnec > md.fmax + 1e-9;
      md.vmax = Math.sqrt(p.mus * g * p.r);
      md.f = Math.min(md.fnec, md.fmax);                // la que realmente actúa
      md.ac = md.f / p.mc;
      // Radio de la trayectoria real: el de la vía, o uno mayor si derrapa
      md.rTray = md.derrapa ? (md.ac > 1e-6 ? Math.min(1e5, p.v * p.v / md.ac) : 1e5) : p.r;
    }
    return md;
  }

  /**
   * Fuerzas y aceleración en un instante.
   * @param {number} v  velocidad (angular en los péndulos, lineal en la curva)
   * @param {number} s  coordenada (ángulo θ en el péndulo simple)
   * @returns {{a, aAng, T, phase}}  aAng: dirección de la aceleración (rad).
   *          phase null indica que las fuerzas cambian en cada instante.
   */
  function dyn(md, v, s) {
    var p = md.p;
    if (md.tipo === 'pendulo') {
      var at = -p.g * Math.sin(s);                      // tangencial: la que devuelve la masa
      var ac = p.L * v * v;                             // centrípeta: v²/L hacia el pivote
      // Vector aceleración en ejes de pantalla (x derecha, y arriba)
      var ax = at * Math.cos(s) - ac * Math.sin(s), ay = at * Math.sin(s) + ac * Math.cos(s);
      return {
        a: Math.hypot(ax, ay), aAng: Math.atan2(ay, ax), at: at, ac: ac,
        T: p.m * (p.g * Math.cos(s) + ac),              // de ΣF radial = m v²/L
        phase: null
      };
    }
    return { a: md.ac, aAng: 0, T: md.T, phase: 'uniforme' };
  }

  /** Un paso de Runge-Kutta de orden 4 para θ'' = −(g/L) sen θ */
  function pasoRK4(th, w, dt, k) {
    var f = function (x) { return -k * Math.sin(x); };
    var k1t = w,                 k1w = f(th);
    var k2t = w + 0.5 * dt * k1w, k2w = f(th + 0.5 * dt * k1t);
    var k3t = w + 0.5 * dt * k2w, k3w = f(th + 0.5 * dt * k2t);
    var k4t = w + dt * k3w,       k4w = f(th + dt * k3t);
    return [
      th + dt / 6 * (k1t + 2 * k2t + 2 * k3t + k4t),
      w + dt / 6 * (k1w + 2 * k2w + 2 * k3w + k4w)
    ];
  }

  /**
   * Series de tiempo. S es la coordenada (θ, ángulo de giro o arco) y V su derivada.
   * @returns {{T, S, V, events, end, periodo}}
   */
  function simulate(md, p) {
    if (md.tipo === 'pendulo') {
      // Integración numérica: aquí no hay fórmula exacta sencilla
      var dt = Lab.DT, k = p.g / p.L, t = 0, th = md.th0, w = 0;
      var T = [0], S = [th], V = [0], extremos = [];
      while (t < 20 && extremos.length < 4) {           // 4 extremos = 2 oscilaciones
        var sig = pasoRK4(th, w, dt, k);
        if (w !== 0 && sig[1] * w < 0) extremos.push(t + dt * w / (w - sig[1]));   // ω cruza por cero
        th = sig[0]; w = sig[1]; t += dt;
        T.push(t); S.push(th); V.push(w);
      }
      return { T: T, S: S, V: V, events: [], end: t, periodo: extremos.length ? 2 * extremos[0] : NaN };
    }

    if (md.tipo === 'conico') {
      var fin = 2 * md.periodo;                         // dos vueltas
      return { T: [0, fin], S: [0, md.w * fin], V: [md.w, md.w], events: [], end: fin, periodo: md.periodo };
    }

    // Curva: una vuelta completa, o hasta salirse de la vía si derrapa
    var largo = 2 * Math.PI * p.r;
    if (md.derrapa) {
      var R = md.rTray, ds = p.r / 200;
      for (largo = 0; largo < 10 * p.r; largo += ds) {
        var al = largo / R, x = R * Math.sin(al), y = -p.r + R - R * Math.cos(al);
        if (Math.hypot(x, y) > 1.55 * p.r) break;       // ya está fuera de la carretera
      }
    }
    return { T: [0, largo / p.v], S: [0, largo], V: [p.v, p.v], events: [], end: largo / p.v, periodo: 2 * Math.PI * p.r / p.v };
  }

  /** Magnitudes que se muestran bajo la escena durante la animación */
  function lecturas(sc, md, p, st, k) {
    if (md.tipo === 'pendulo') {
      return {
        items: [['Ángulo θ', n3(st.s * 180 / Math.PI) + '°'], ['Rapidez', n3(Math.abs(p.L * st.v)) + ' m/s'], ['Tensión', n3(k.T) + ' N']],
        estado: Math.abs(st.s) > 0.98 * md.th0 ? 'En un extremo: rapidez casi nula, tensión mínima'
          : Math.abs(st.s) < 0.05 * md.th0 ? 'Punto más bajo: rapidez y tensión máximas' : 'Oscilando'
      };
    }
    if (md.tipo === 'conico') {
      return {
        items: [['Rapidez', n3(md.v) + ' m/s'], ['Periodo', n3(md.periodo) + ' s'], ['Tensión', n3(md.T) + ' N']],
        estado: 'Movimiento circular uniforme de radio ' + n3(md.r) + ' m'
      };
    }
    return {
      items: [['Rapidez', n3(p.v * 3.6) + ' km/h'], ['Fricción necesaria', n3(md.fnec) + ' N'], ['Fricción máxima', n3(md.fmax) + ' N']],
      estado: md.derrapa ? 'Derrapa: la fricción no alcanza para girar con ese radio' : 'Toma la curva sin derrapar'
    };
  }

  /** Periodo exacto del péndulo para cualquier amplitud (media aritmético-geométrica) */
  function periodoExacto(L, g, th0) {
    var a = 1, b = Math.cos(th0 / 2);
    for (var i = 0; i < 30; i++) { var m = (a + b) / 2; b = Math.sqrt(a * b); a = m; }
    return 2 * Math.PI * Math.sqrt(L / g) / a;
  }

  Lab.circular = { TIPOS: TIPOS, model: model, dyn: dyn, simulate: simulate, lecturas: lecturas, periodoExacto: periodoExacto };

})(window.Lab);
