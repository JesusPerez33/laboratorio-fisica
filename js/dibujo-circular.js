/* ==========================================================
   dibujo-circular.js — Escenas y diagramas del movimiento circular
   Misma interfaz que dibujo.js (buildScene y renderFBD), para el
   péndulo simple, el péndulo cónico y la curva plana.
   Reutiliza las primitivas de dibujo.js (flechas y fbdSVG).
   ========================================================== */
(function (Lab) {
  'use strict';
  var $ = Lab.util.$, n3 = Lab.util.n3, D = Lab.dibujo;

  /* ---------- Escenas ---------- */

  /** Devuelve colocar(s), que mueve el cuerpo durante la animación */
  function buildScene(svg, sc, p, sim, md) {
    if (md.tipo === 'pendulo') return escenaPendulo(svg, p, md);
    if (md.tipo === 'conico') return escenaConico(svg, p, md);
    return escenaCurva(svg, p, md, sim);
  }

  function escenaPendulo(svg, p, md) {
    var O = { x: 320, y: 46 }, Lp = 300, th0 = md.th0;   // pivote y largo de la cuerda en píxeles
    var sx = Lp * Math.sin(th0), cy = Lp * Math.cos(th0);

    var h = '<line class="sup" x1="230" y1="' + O.y + '" x2="410" y2="' + O.y + '"/>' +
      // Vertical de referencia, arco de la trayectoria y posición de partida
      '<line class="ref" x1="' + O.x + '" y1="' + O.y + '" x2="' + O.x + '" y2="' + (O.y + Lp + 34) + '"/>' +
      '<path class="ref" d="M' + (O.x - sx) + ' ' + (O.y + cy) + ' A' + Lp + ' ' + Lp + ' 0 0 0 ' + (O.x + sx) + ' ' + (O.y + cy) + '"/>' +
      '<line class="ref" x1="' + O.x + '" y1="' + O.y + '" x2="' + (O.x + sx) + '" y2="' + (O.y + cy) + '"/>' +
      '<path class="ref" d="M' + O.x + ' ' + (O.y + 60) + ' A60 60 0 0 0 ' + (O.x + 60 * Math.sin(th0)) + ' ' + (O.y + 60 * Math.cos(th0)) + '"/>' +
      '<text class="ang" x="' + (O.x + 80 * Math.sin(th0 / 2)) + '" y="' + (O.y + 80 * Math.cos(th0 / 2) + 5) + '" text-anchor="middle">θ₀</text>' +
      '<text class="tk" x="' + (O.x + sx / 2 + 12) + '" y="' + (O.y + cy / 2) + '">L = ' + n3(p.L) + ' m</text>' +
      '<line class="str" id="st1" x1="' + O.x + '" y1="' + O.y + '"/><circle class="hub" cx="' + O.x + '" cy="' + O.y + '" r="4"/>' +
      '<g id="b1"><circle class="body" r="16"/><text class="blbl" y="5" text-anchor="middle">m</text></g>';
    svg.innerHTML = h;

    return function colocar(th) {
      var x = O.x + Lp * Math.sin(th), y = O.y + Lp * Math.cos(th);
      $('st1').setAttribute('x2', x); $('st1').setAttribute('y2', y);
      $('b1').setAttribute('transform', 'translate(' + x + ' ' + y + ')');
    };
  }

  function escenaConico(svg, p, md) {
    var O = { x: 320, y: 40 }, Lp = 290, th = md.th;
    var rp = Lp * Math.sin(th), cy = O.y + Lp * Math.cos(th);   // radio y altura del círculo
    var ry = Math.max(8, rp * 0.22);                    // el círculo se ve como elipse (perspectiva)

    var h = '<line class="sup" x1="230" y1="' + O.y + '" x2="410" y2="' + O.y + '"/>' +
      '<line class="ref" x1="' + O.x + '" y1="' + O.y + '" x2="' + O.x + '" y2="' + (cy + ry + 26) + '"/>' +
      '<ellipse class="ref" cx="' + O.x + '" cy="' + cy + '" rx="' + rp + '" ry="' + ry + '"/>' +
      // Posición de referencia a la izquierda: es la que muestra el diagrama de cuerpo libre
      '<line class="ref" x1="' + O.x + '" y1="' + O.y + '" x2="' + (O.x - rp) + '" y2="' + cy + '"/>' +
      '<line class="ref" x1="' + O.x + '" y1="' + cy + '" x2="' + (O.x - rp) + '" y2="' + cy + '"/>' +
      '<path class="ref" d="M' + O.x + ' ' + (O.y + 56) + ' A56 56 0 0 1 ' + (O.x - 56 * Math.sin(th)) + ' ' + (O.y + 56 * Math.cos(th)) + '"/>' +
      '<text class="ang" x="' + (O.x - 76 * Math.sin(th / 2)) + '" y="' + (O.y + 76 * Math.cos(th / 2) + 5) + '" text-anchor="middle">θ</text>' +
      '<text class="tk" x="' + (O.x - rp / 2) + '" y="' + (cy - 7) + '" text-anchor="middle">r = ' + n3(md.r) + ' m</text>' +
      '<text class="tk" x="' + (O.x - rp / 2 - 12) + '" y="' + (O.y + Lp * Math.cos(th) / 2) + '" text-anchor="end">L = ' + n3(p.L) + ' m</text>' +
      '<line class="str" id="st1" x1="' + O.x + '" y1="' + O.y + '"/><circle class="hub" cx="' + O.x + '" cy="' + O.y + '" r="4"/>' +
      '<g id="b1"><circle class="body" r="15"/><text class="blbl" y="5" text-anchor="middle">m</text></g>';
    svg.innerHTML = h;

    return function colocar(fi) {                       // fi: ángulo de giro
      var x = O.x - rp * Math.cos(fi), y = cy + ry * Math.sin(fi);
      $('st1').setAttribute('x2', x); $('st1').setAttribute('y2', y);
      $('b1').setAttribute('transform', 'translate(' + x + ' ' + y + ')');
    };
  }

  function escenaCurva(svg, p, md, sim) {
    // Vista desde arriba. C es el centro de la curva; k convierte metros a píxeles
    var C = { x: 320, y: 215 }, Rp = 150, k = Rp / p.r, ancho = 46;
    var Rt = md.rTray * k;                              // radio de la trayectoria real (px)
    var Ct = { x: C.x, y: C.y + Rp - Rt };              // su centro: comparte el punto de partida
    var punto = function (s) {
      var al = s / md.rTray;
      return { x: Ct.x + Rt * Math.sin(al), y: Ct.y + Rt * Math.cos(al), al: al };
    };

    var h = '<circle class="road" cx="' + C.x + '" cy="' + C.y + '" r="' + Rp + '" stroke-width="' + ancho + '"/>' +
      '<circle class="edge" cx="' + C.x + '" cy="' + C.y + '" r="' + (Rp - ancho / 2) + '"/>' +
      '<circle class="edge" cx="' + C.x + '" cy="' + C.y + '" r="' + (Rp + ancho / 2) + '"/>' +
      '<circle class="ref" cx="' + C.x + '" cy="' + C.y + '" r="' + Rp + '"/>' +
      '<line class="ref" x1="' + C.x + '" y1="' + C.y + '" x2="' + C.x + '" y2="' + (C.y + Rp) + '"/>' +
      '<circle class="hub" cx="' + C.x + '" cy="' + C.y + '" r="3.5"/>' +
      '<text class="tk" x="' + (C.x - 8) + '" y="' + (C.y + Rp / 2) + '" text-anchor="end">r = ' + n3(p.r) + ' m</text>' +
      '<text class="tk" x="' + C.x + '" y="' + (C.y - 10) + '" text-anchor="middle">centro de la curva</text>';

    if (md.derrapa) {
      // Trayectoria que realmente sigue: una curva más abierta que la vía
      var pts = [];
      for (var i = 0; i <= 60; i++) { var q = punto(sim.S[1] * i / 60); pts.push(q.x.toFixed(1) + ' ' + q.y.toFixed(1)); }
      h += '<path class="skid" d="M' + pts.join('L') + '"/>';
    }
    h += '<g id="b1"><rect class="body" x="-16" y="-9" width="32" height="18" rx="4"/>' +
      '<line class="tick" x1="8" y1="-9" x2="8" y2="9"/>' +
      D.arrow(20, 0, 58, 0, 'vel') + '<text class="fl vel" x="64" y="5">v</text></g>';
    svg.innerHTML = h;

    return function colocar(s) {
      var q = punto(s);
      $('b1').setAttribute('transform', 'translate(' + q.x + ' ' + q.y + ') rotate(' + (-q.al * 180 / Math.PI) + ')');
    };
  }

  /* ---------- Diagramas de cuerpo libre ---------- */

  /**
   * @param {object} k   resultado de circular.dyn en este instante
   * @param {object} st  estado {s, v}
   */
  function renderFBD(el, sc, p, md, k, st) {
    var g = p.g, arriba = Math.PI / 2, abajo = -Math.PI / 2, h;
    var acel = { ang: k.aAng, mag: k.a };

    if (md.tipo === 'pendulo') {
      // Ejes girados con la cuerda: y hacia el pivote, x tangente a la trayectoria
      var th = st.s;
      h = D.fbdSVG('Masa del péndulo', [
        { b: 'W', mag: p.m * g, ang: abajo, cls: 'w' },
        { b: 'T', mag: k.T, ang: arriba + th, cls: 't' }
      ], th * 180 / Math.PI, { descomponer: { cls: 'w', etiquetas: ['W cos θ', 'W sen θ'] }, acel: acel, forma: 'circulo' });
    } else if (md.tipo === 'conico') {
      // Ejes sin girar: y vertical, x horizontal hacia el centro del círculo
      h = D.fbdSVG('Masa (centro del círculo a la derecha)', [
        { b: 'W', mag: p.m * g, ang: abajo, cls: 'w' },
        { b: 'T', mag: md.T, ang: arriba - md.th, cls: 't' }
      ], 0, { descomponer: { cls: 't', etiquetas: ['T cos θ', 'T sen θ'] }, acel: acel, forma: 'circulo' });
    } else {
      h = D.fbdSVG('Auto visto desde atrás (centro de la curva a la derecha)', [
        { b: 'W', mag: md.N, ang: abajo, cls: 'w' },
        { b: 'N', mag: md.N, ang: arriba, cls: 'n' },
        { b: 'f', sub: 's', mag: md.f, ang: 0, cls: 'f' }
      ], 0, { acel: acel });
    }
    el.innerHTML = h;
  }

  Lab.dibujoCircular = { buildScene: buildScene, renderFBD: renderFBD };

})(window.Lab);
