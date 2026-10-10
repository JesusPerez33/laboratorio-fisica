/* ==========================================================
   graficas.js — Gráficas en SVG
   Una sola función genérica (chart) y un ayudante para las
   gráficas de posición y velocidad de la simulación.
   ========================================================== */
(function (Lab) {
  'use strict';
  var n3 = Lab.util.n3;

  /**
   * Dibuja una gráfica dentro de un <svg>.
   * @param {SVGElement} el
   * @param {object} o  { series: [{pts: [[x,y],…], cls, dots}], xl, yl, cur }
   *                    cur: id de un punto móvil sobre la primera serie
   * @returns {{X, Y}}  funciones que convierten datos a píxeles
   */
  function chart(el, o) {
    var W = 380, H = 230, ml = 50, mr = 14, mt = 28, mb = 38;
    var xs = [], ys = [0];                        // el 0 siempre entra en el eje y
    o.series.forEach(function (s) { s.pts.forEach(function (q) { xs.push(q[0]); ys.push(q[1]); }); });

    var x0 = Math.min.apply(null, xs), x1 = Math.max.apply(null, xs);
    var y0 = Math.min.apply(null, ys), y1 = Math.max.apply(null, ys);
    if (x1 - x0 < 1e-9) x1 = x0 + 1;
    if (y1 - y0 < 1e-9) { y1 += 0.5; y0 -= 0.5; }

    // Los límites se ajustan a marcas redondas
    var xt = Lab.dibujo.tickVals(x0, x1, 5), yt = Lab.dibujo.tickVals(y0, y1, 4);
    x0 = xt[0]; x1 = xt[xt.length - 1]; y0 = yt[0]; y1 = yt[yt.length - 1];

    var X = function (x) { return ml + (x - x0) / (x1 - x0) * (W - ml - mr); };
    var Y = function (y) { return H - mb - (y - y0) / (y1 - y0) * (H - mt - mb); };
    var h = '';

    yt.forEach(function (v) {
      h += '<line class="gl" x1="' + ml + '" y1="' + Y(v) + '" x2="' + (W - mr) + '" y2="' + Y(v) + '"/>' +
        '<text class="ct" x="' + (ml - 6) + '" y="' + (Y(v) + 4) + '" text-anchor="end">' + n3(v) + '</text>';
    });
    xt.forEach(function (v) {
      h += '<text class="ct" x="' + X(v) + '" y="' + (H - mb + 15) + '" text-anchor="middle">' + n3(v) + '</text>';
    });

    var yCero = Y(Math.max(y0, Math.min(0, y1)));
    h += '<line class="axis" x1="' + ml + '" y1="' + yCero + '" x2="' + (W - mr) + '" y2="' + yCero + '"/>' +
      '<line class="axis" x1="' + ml + '" y1="' + mt + '" x2="' + ml + '" y2="' + (H - mb) + '"/>' +
      '<text class="cl" x="' + ((ml + W - mr) / 2) + '" y="' + (H - 6) + '" text-anchor="middle">' + o.xl + '</text>' +
      '<text class="cl" x="8" y="14">' + o.yl + '</text>';

    o.series.forEach(function (s) {
      if (s.marker) {
        // Punto destacado: la situación actual sobre una curva
        s.pts.forEach(function (q) { h += '<circle class="cur" cx="' + X(q[0]) + '" cy="' + Y(q[1]) + '" r="5.5"/>'; });
      } else if (s.dots || s.pts.length === 1) {
        s.pts.forEach(function (q) { h += '<circle class="dot" cx="' + X(q[0]) + '" cy="' + Y(q[1]) + '" r="3.4"/>'; });
      } else {
        h += '<path class="' + s.cls + '" d="M' + s.pts.map(function (q) { return X(q[0]).toFixed(1) + ' ' + Y(q[1]).toFixed(1); }).join('L') + '"/>';
      }
    });
    if (o.cur) {
      var p0 = o.series[0].pts[0];
      h += '<circle class="cur" id="' + o.cur + '" r="5.5" cx="' + X(p0[0]) + '" cy="' + Y(p0[1]) + '"/>';
    }
    el.innerHTML = h;
    return { X: X, Y: Y };
  }

  /** Mueve el punto que recorre una gráfica durante la animación */
  function moverCursor(id, escala, x, y) {
    var c = document.getElementById(id);
    if (c) { c.setAttribute('cx', escala.X(x)); c.setAttribute('cy', escala.Y(y)); }
  }

  /** Reduce una serie larga a unos 300 puntos para dibujarla */
  function muestrear(n, fn) {
    var paso = Math.max(1, Math.floor(n / 300)), pts = [];
    for (var i = 0; i < n; i += paso) pts.push(fn(i));
    if ((n - 1) % paso) pts.push(fn(n - 1));
    return pts;
  }

  /**
   * Gráficas s(t) y v(t) de los problemas en línea recta.
   * @returns {{mover}}  mover(tau, st, k) actualiza los puntos móviles
   */
  function simCharts(elS, elV, sc, p, md, sim) {
    var n = sim.T.length;
    var eS = chart(elS, { series: [{ pts: muestrear(n, function (i) { return [sim.T[i], sim.S[i]]; }), cls: 's1' }], xl: 't (s)', yl: 'Posición s (m)', cur: 'cur_s' });
    var eV = chart(elV, { series: [{ pts: muestrear(n, function (i) { return [sim.T[i], sim.V[i]]; }), cls: 's1' }], xl: 't (s)', yl: 'Velocidad v (m/s)', cur: 'cur_v' });
    return { mover: function (tau, st) { moverCursor('cur_s', eS, tau, st.s); moverCursor('cur_v', eV, tau, st.v); } };
  }

  /**
   * Gráficas del movimiento circular.
   * Péndulo: θ(t) y T(t). Cónico y curva: mapas que muestran cómo cambia
   * el resultado al variar un dato, con la situación actual marcada.
   */
  function circularCharts(elS, elV, sc, p, md, sim) {
    var C = Lab.circular, g = p.g, i, pts1 = [], pts2 = [];
    var curva = function (pts) { return { pts: pts, cls: 's1' }; };
    var actual = function (x, y) { return { pts: [[x, y]], marker: true }; };

    if (md.tipo === 'pendulo') {
      var n = sim.T.length, grados = 180 / Math.PI;
      var eA = chart(elS, { series: [curva(muestrear(n, function (j) { return [sim.T[j], sim.S[j] * grados]; }))], xl: 't (s)', yl: 'Ángulo θ (°)', cur: 'cur_s' });
      var eT = chart(elV, { series: [curva(muestrear(n, function (j) { return [sim.T[j], C.dyn(md, sim.V[j], sim.S[j]).T]; }))], xl: 't (s)', yl: 'Tensión T (N)', cur: 'cur_v' });
      return { mover: function (tau, st, k) { moverCursor('cur_s', eA, tau, st.s * grados); moverCursor('cur_v', eT, tau, k.T); } };
    }

    if (md.tipo === 'conico') {
      for (i = 5; i <= 80; i++) {
        var th = i * Math.PI / 180;
        pts1.push([i, p.m * g / Math.cos(th)]);
        pts2.push([i, 2 * Math.PI * Math.sqrt(p.L * Math.cos(th) / g)]);
      }
      chart(elS, { series: [curva(pts1), actual(p.thc, md.T)], xl: 'Ángulo θ (°)', yl: 'Tensión T (N)' });
      chart(elV, { series: [curva(pts2), actual(p.thc, md.periodo)], xl: 'Ángulo θ (°)', yl: 'Periodo de giro (s)' });
    } else {
      for (i = 0; i <= 40; i++) pts1.push([i, p.mc * i * i / p.r]);
      for (i = 10; i <= 200; i += 5) pts2.push([i, Math.sqrt(p.mus * g * i)]);
      chart(elS, { series: [curva(pts1), { pts: [[0, md.fmax], [40, md.fmax]], cls: 's2' }, actual(p.v, md.fnec)], xl: 'Rapidez v (m/s)', yl: 'Fricción necesaria (N) · línea roja: máxima' });
      chart(elV, { series: [curva(pts2), actual(p.r, p.v)], xl: 'Radio de la curva r (m)', yl: 'Rapidez máxima (m/s)' });
    }
    return { mover: function () {} };
  }

  Lab.graficas = { chart: chart, simCharts: simCharts, circularCharts: circularCharts };

})(window.Lab);
