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
      if (s.dots || s.pts.length === 1) {
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

  /** Gráficas s(t) y v(t) de la simulación. Devuelve las escalas de cada una. */
  function simCharts(elS, elV, sim) {
    var n = sim.T.length, paso = Math.max(1, Math.floor(n / 300)), ps = [], pv = [];
    for (var i = 0; i < n; i += paso) { ps.push([sim.T[i], sim.S[i]]); pv.push([sim.T[i], sim.V[i]]); }
    if ((n - 1) % paso) { ps.push([sim.T[n - 1], sim.S[n - 1]]); pv.push([sim.T[n - 1], sim.V[n - 1]]); }

    return {
      s: chart(elS, { series: [{ pts: ps, cls: 's1' }], xl: 't (s)', yl: 'Posición s (m)', cur: 'cur_s' }),
      v: chart(elV, { series: [{ pts: pv, cls: 's1' }], xl: 't (s)', yl: 'Velocidad v (m/s)', cur: 'cur_v' })
    };
  }

  Lab.graficas = { chart: chart, simCharts: simCharts };

})(window.Lab);
