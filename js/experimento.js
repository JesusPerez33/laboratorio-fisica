/* ==========================================================
   experimento.js — Contraste con mediciones reales
   Lee pares (t, x), ajusta x = c0 + c1·t + c2·t² por mínimos
   cuadrados y compara la aceleración medida (a = 2·c2) con la
   que predice el modelo.
   ========================================================== */
(function (Lab) {
  'use strict';
  var $ = Lab.util.$, n3 = Lab.util.n3;

  /** Convierte el texto pegado en dos listas de números */
  function parseData(txt) {
    var ts = [], xs = [];
    txt.split(/\n/).forEach(function (linea) {
      linea = linea.trim();
      if (!linea) return;
      var q = linea.split(/[;\t ]+/).filter(Boolean);   // separadores: ; tab espacio
      if (q.length < 2) q = linea.split(',');           // o una sola coma
      if (q.length < 2) return;
      var t = parseFloat(q[0].replace(/,$/, '').replace(',', '.'));
      var x = parseFloat(q[1].replace(',', '.'));
      if (isFinite(t) && isFinite(x)) { ts.push(t); xs.push(x); }
    });
    return { ts: ts, xs: xs };
  }

  /** Inversa de una matriz 3×3 (o null si no existe) */
  function inv3(A) {
    var a = A[0][0], b = A[0][1], c = A[0][2], d = A[1][0], e = A[1][1], f = A[1][2], g = A[2][0], h = A[2][1], i = A[2][2];
    var det = a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g);
    if (Math.abs(det) < 1e-18) return null;
    return [
      [(e * i - f * h) / det, (c * h - b * i) / det, (b * f - c * e) / det],
      [(f * g - d * i) / det, (a * i - c * g) / det, (c * d - a * f) / det],
      [(d * h - e * g) / det, (b * g - a * h) / det, (a * e - b * d) / det]
    ];
  }

  /**
   * Ajuste cuadrático por mínimos cuadrados (ecuaciones normales).
   * @returns {{c: [c0,c1,c2], sa}}  sa: incertidumbre estándar de a = 2·c2
   */
  function fitQuad(ts, xs) {
    var n = ts.length, S = [0, 0, 0, 0, 0], b = [0, 0, 0];
    for (var i = 0; i < n; i++) {
      var pw = 1;
      for (var j = 0; j < 5; j++) { S[j] += pw; if (j < 3) b[j] += pw * xs[i]; pw *= ts[i]; }
    }
    var iv = inv3([[S[0], S[1], S[2]], [S[1], S[2], S[3]], [S[2], S[3], S[4]]]);
    if (!iv) return null;

    var c = iv.map(function (r) { return r[0] * b[0] + r[1] * b[1] + r[2] * b[2]; });
    var ssr = 0;                                   // suma de residuos al cuadrado
    for (i = 0; i < n; i++) { var r = xs[i] - (c[0] + c[1] * ts[i] + c[2] * ts[i] * ts[i]); ssr += r * r; }

    // Varianza de c2 = (varianza residual) × (elemento de la matriz inversa)
    return { c: c, sa: n > 3 ? 2 * Math.sqrt(ssr / (n - 3) * iv[2][2]) : NaN };
  }

  /** Actualiza resultados, veredicto y gráfica de la sección */
  function render(p, md, k0) {
    var txt = $('data').value, datos = parseData(txt), ts = datos.ts, xs = datos.xs;
    $('extag').hidden = txt.trim() !== Lab.DATOS_EJEMPLO;

    var mostrar = function (a, m, d, mu, v) {
      $('e_a').textContent = a; $('e_m').textContent = m; $('e_d').textContent = d;
      $('e_mu').textContent = mu; $('e_v').textContent = v;
    };
    var aModelo = Math.abs(k0.a), aModeloTxt = k0.phase === 0 ? '0 (reposo)' : n3(aModelo) + ' m/s²';

    var ajuste = ts.length >= 4 ? fitQuad(ts, xs) : null;
    if (!ajuste) {
      mostrar('–', aModeloTxt, '–', '–', 'Se necesitan al menos 4 mediciones válidas, una por línea, con tiempos distintos.');
      $('ch_e').innerHTML = '';
      return;
    }
    var aMedida = Math.abs(2 * ajuste.c[2]), signo = Math.sign(ajuste.c[2]) || 1;

    // Coeficiente de fricción cinética que explicaría la aceleración medida
    var mu = '–';
    if (md.N > 0 && k0.phase !== 0 && p.v0 === 0) {
      var m = (Math.abs(md.Fd) - md.M * aMedida) / md.N;
      if (m > -0.05 && m < 1.5) mu = n3(m) + ' ± ' + n3(md.M * ajuste.sa / md.N);
    }

    var dif = '–', veredicto;
    if (k0.phase === 0) {
      veredicto = 'Con los datos actuales el modelo predice reposo, pero tus mediciones muestran movimiento. Revisa el ángulo o el coeficiente de fricción estática.';
    } else {
      var pct = (aMedida - aModelo) / aModelo * 100, z = Math.abs(aMedida - aModelo) / ajuste.sa;
      dif = (pct >= 0 ? '+' : '−') + n3(Math.abs(pct)) + ' %';
      veredicto = z <= 2
        ? 'Compatible: la diferencia equivale a ' + n3(z) + ' veces la incertidumbre del ajuste (menos de 2σ).'
        : 'No compatible: la diferencia equivale a ' + n3(z) + ' veces la incertidumbre del ajuste. Ajusta μₖ o el ángulo, o busca qué fuerza le falta al modelo.';
    }
    mostrar(n3(aMedida) + ' ± ' + n3(ajuste.sa) + ' m/s²', aModeloTxt, dif, mu,
      veredicto + ' Se comparan magnitudes, porque el signo depende de hacia dónde apunte tu eje.');

    // Curvas: ajuste a los datos y predicción del modelo con el mismo arranque
    var t0 = Math.min.apply(null, ts), t1 = Math.max.apply(null, ts), cAjuste = [], cModelo = [];
    for (var i = 0; i <= 40; i++) {
      var t = t0 + (t1 - t0) * i / 40, base = ajuste.c[0] + ajuste.c[1] * t;
      cAjuste.push([t, base + ajuste.c[2] * t * t]);
      cModelo.push([t, base + signo * 0.5 * aModelo * t * t]);
    }
    Lab.graficas.chart($('ch_e'), {
      series: [{ pts: cAjuste, cls: 's1' }, { pts: cModelo, cls: 's2' }, { pts: ts.map(function (t, i) { return [t, xs[i]]; }), dots: true }],
      xl: 't (s)', yl: 'Posición medida x (m)'
    });
  }

  Lab.experimento = { parseData: parseData, fitQuad: fitQuad, render: render };

})(window.Lab);
