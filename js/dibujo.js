/* ==========================================================
   dibujo.js — Escena animada y diagramas de cuerpo libre
   Convierte resultados de fisica.js en dibujos SVG.
   No calcula física: solo recibe magnitudes y las pinta.
   ========================================================== */
(function (Lab) {
  'use strict';
  var $ = Lab.util.$, rad = Lab.util.rad, n3 = Lab.util.n3;

  /* ---------- Primitivas ---------- */

  /** Flecha de (x1,y1) a (x2,y2). cls define el color (w, n, f, t, p). */
  function arrow(x1, y1, x2, y2, cls) {
    var dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1;
    var ux = dx / L, uy = dy / L, h = 10, w = 4.5;
    var bx = x2 - ux * h, by = y2 - uy * h;       // base de la punta
    return '<g class="F ' + cls + '">' +
      '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + bx + '" y2="' + by + '"/>' +
      '<polygon points="' + x2 + ',' + y2 + ' ' + (bx - uy * w) + ',' + (by + ux * w) + ' ' + (bx + uy * w) + ',' + (by - ux * w) + '"/></g>';
  }

  /** Paso "redondo" (1, 2, 5 × 10ⁿ) para marcas de regla y ejes */
  function niceStep(raw) {
    var mag = Math.pow(10, Math.floor(Math.log10(raw))), r = raw / mag;
    return (r < 1.5 ? 1 : r < 3 ? 2 : r < 7 ? 5 : 10) * mag;
  }

  /** Marcas entre a y b, aproximadamente n divisiones */
  function tickVals(a, b, n) {
    var st = niceStep((b - a || 1) / n);
    var i0 = Math.floor(a / st + 1e-9), i1 = Math.ceil(b / st - 1e-9), out = [];
    for (var i = i0; i <= i1; i++) out.push(+(i * st).toFixed(9));
    return out;
  }

  /* ---------- Escena ---------- */

  /**
   * Dibuja el montaje dentro de svg y devuelve una función colocar(s)
   * que mueve los cuerpos a la posición s durante la animación.
   */
  function buildScene(svg, sc, p, sim) {
    // Tramo de la coordenada s que hay que mostrar
    var smin = Math.min.apply(null, sim.S), smax = Math.max.apply(null, sim.S);
    if (smax - smin < 0.3) { var c0 = (smax + smin) / 2; smin = c0 - 0.15; smax = c0 + 0.15; }
    var R = smax - smin, step = niceStep(R / 5), marks = [];
    for (var i = Math.ceil(smin / step - 1e-9); i * step <= smax + 1e-9; i++) marks.push(+(i * step).toFixed(9));

    return sc.type === 'atwood'
      ? sceneAtwood(svg, smin, smax, R, marks)
      : scenePlano(svg, sc, p, smin, R, marks);
  }

  function sceneAtwood(svg, smin, smax, R, marks) {
    var bw = 44, bh = 40, y0 = 130, k = (440 - 12 - bh - y0) / R;   // k: píxeles por metro
    var h = '<line class="sup" x1="200" y1="16" x2="440" y2="16"/><line class="sup" x1="320" y1="16" x2="320" y2="70"/>' +
      '<circle class="pul" cx="320" cy="70" r="30"/><circle class="hub" cx="320" cy="70" r="3.5"/>' +
      '<line class="str" id="st1" x1="290" y1="70" x2="290" y2="130"/><line class="str" id="st2" x1="350" y1="70" x2="350" y2="130"/>';

    marks.forEach(function (sv) {
      var y = y0 + (sv - smin) * k + bh / 2;
      h += '<line class="tick" x1="380" y1="' + y + '" x2="388" y2="' + y + '"/><text class="tk" x="393" y="' + (y + 4) + '">' + n3(sv) + ' m</text>';
    });
    ['m₁', 'm₂'].forEach(function (nombre, j) {
      h += '<g id="b' + (j + 1) + '"><rect class="body" x="' + (-bw / 2) + '" y="0" width="' + bw + '" height="' + bh + '" rx="3"/>' +
        '<text class="blbl" y="' + (bh / 2 + 5) + '" text-anchor="middle">' + nombre + '</text></g>';
    });
    svg.innerHTML = h;

    return function colocar(s) {
      var y1 = y0 + (smax - s) * k, y2 = y0 + (s - smin) * k;
      $('b1').setAttribute('transform', 'translate(290 ' + y1 + ')');
      $('b2').setAttribute('transform', 'translate(350 ' + y2 + ')');
      $('st1').setAttribute('y2', y1);
      $('st2').setAttribute('y2', y2);
    };
  }

  function scenePlano(svg, sc, p, smin, R, marks) {
    var col = sc.type === 'colg';                 // ¿hay masa colgante?
    var thd = p.th || 0, th = rad(thd), c = Math.cos(th), sn = Math.sin(th);

    // Geometría del plano: B es la base, T la cima
    var B = { x: 40, y: col ? 220 : 330 }, Wm = col ? 430 : 540, Hm = col ? 160 : 270;
    var L = Math.min(Wm / c, sn > 1e-6 ? Hm / sn : 1e9);
    var T = { x: B.x + L * c, y: B.y - L * sn };
    var tx = c, ty = -sn;                         // vector unitario a lo largo del plano
    var nx = -sn, ny = -c;                        // vector unitario normal al plano
    var bw = 56, bh = 36, mg = bw / 2 + 12;
    var k = (L - 2 * mg) / R, C, hx, hy0;         // k: píxeles por metro

    if (col) {
      // Polea en la cima y espacio vertical para la masa colgante
      var a = (14 + 6 * sn) / c;
      C = { x: T.x + a * c + nx * 6, y: T.y - a * sn + ny * 6 };
      hx = C.x + 12; hy0 = C.y + 26;
      k = Math.min(k, (440 - 10 - 36 - hy0) / R);
    }
    var u0 = mg + (col ? (L - 2 * mg - R * k) : 0);
    var U = function (s) { return u0 + (s - smin) * k; };   // metros → píxeles sobre el plano

    var h = '<polygon class="solid" points="' + B.x + ',' + B.y + ' ' + T.x + ',' + T.y + ' ' + T.x + ',440 ' + B.x + ',440"/>';
    if (thd > 1) {
      h += '<line class="ref" x1="' + B.x + '" y1="' + B.y + '" x2="' + (B.x + 96) + '" y2="' + B.y + '"/>' +
        '<path class="ref" d="M' + (B.x + 52) + ' ' + B.y + ' A52 52 0 0 0 ' + (B.x + 52 * c) + ' ' + (B.y - 52 * sn) + '"/>' +
        '<text class="ang" x="' + (B.x + 68 * Math.cos(th / 2)) + '" y="' + (B.y - 68 * Math.sin(th / 2) + 5) + '">θ</text>';
    }
    marks.forEach(function (sv) {
      var x = B.x + tx * U(sv), y = B.y + ty * U(sv);
      h += '<line class="tick" x1="' + x + '" y1="' + y + '" x2="' + (x - nx * 7) + '" y2="' + (y - ny * 7) + '"/>' +
        '<text class="tk" x="' + (x - nx * 20) + '" y="' + (y - ny * 20 + 4) + '" text-anchor="middle">' + n3(sv) + ' m</text>';
    });
    if (col) {
      h += '<line class="sup" x1="' + T.x + '" y1="' + T.y + '" x2="' + C.x + '" y2="' + C.y + '"/><line class="str" id="st1"/>' +
        '<line class="str" id="st2" x1="' + hx + '" y1="' + C.y + '" x2="' + hx + '"/>' +
        '<circle class="pul" cx="' + C.x + '" cy="' + C.y + '" r="12"/><circle class="hub" cx="' + C.x + '" cy="' + C.y + '" r="2.5"/>' +
        '<g id="b2"><rect class="body" x="-20" y="0" width="40" height="36" rx="3"/><text class="blbl" y="23" text-anchor="middle">m₂</text></g>';
    }

    // Flecha de la fuerza aplicada, pegada al bloque
    var flechaP = '';
    if (!col && p.P > 0) {
      var ph = rad(p.phi), dx = Math.cos(ph), dy = -Math.sin(ph);
      var r0 = Math.min(bw / 2 / Math.max(dx, 1e-6), bh / 2 / Math.max(-dy, 1e-6));
      flechaP = arrow(dx * r0, dy * r0, dx * (r0 + 48), dy * (r0 + 48), 'p') +
        '<text class="fl p" x="' + (dx * (r0 + 60)) + '" y="' + (dy * (r0 + 60) + 5) + '" text-anchor="middle">P</text>';
    }
    h += '<g id="b1"><rect class="body" x="' + (-bw / 2) + '" y="' + (-bh / 2) + '" width="' + bw + '" height="' + bh + '" rx="3"/>' +
      '<text class="blbl" y="5" text-anchor="middle">' + (col ? 'm₁' : 'm') + '</text>' + flechaP + '</g>';
    svg.innerHTML = h;

    return function colocar(s) {
      var u = U(s), cx = B.x + tx * u + nx * bh / 2, cy = B.y + ty * u + ny * bh / 2;
      $('b1').setAttribute('transform', 'translate(' + cx + ' ' + cy + ') rotate(' + (-thd) + ')');
      if (col) {
        var l = $('st1');
        l.setAttribute('x1', cx + tx * bw / 2); l.setAttribute('y1', cy + ty * bw / 2);
        l.setAttribute('x2', C.x + nx * 12);    l.setAttribute('y2', C.y + ny * 12);
        var y2 = hy0 + (s - smin) * k;
        $('b2').setAttribute('transform', 'translate(' + hx + ' ' + y2 + ')');
        $('st2').setAttribute('y2', y2);
      }
    };
  }

  /* ---------- Diagrama de cuerpo libre ---------- */

  /**
   * Un diagrama para un cuerpo.
   * @param {string} title
   * @param {Array}  forces  [{b: símbolo, sub: subíndice, mag: N, ang: rad, cls}]
   *                         ang se mide desde +x en sentido antihorario.
   * @param {number} axDeg   inclinación de los ejes en grados
   * @param {object} [opts]  descomponer: {cls, etiquetas: [sobre y, sobre x]}
   *                           dibuja las componentes de esa fuerza sobre los ejes
   *                         acel: {ang, mag} muestra aparte el vector aceleración
   *                         vel: {ang, mag, frac} lo mismo con la velocidad; frac (0 a 1)
   *                           es la fracción de la rapidez máxima y fija el largo
   *                         forma: 'circulo' dibuja el cuerpo como una esfera
   */
  function fbdSVG(title, forces, axDeg, opts) {
    opts = opts || {};
    var cx = 190, cy = 140, a = rad(axDeg);
    var tx = Math.cos(a), ty = -Math.sin(a), nx = -Math.sin(a), ny = -Math.cos(a);
    var mx = Math.max.apply(null, forces.map(function (f) { return f.mag; }).concat(1e-9));
    var len = function (m) { return 36 + 62 * m / mx; };    // longitud a escala
    var ancla = function (ox) { return ox > 2 ? 'start' : ox < -2 ? 'end' : 'middle'; };

    var h = '<svg viewBox="0 0 380 280" role="img" aria-label="Diagrama de cuerpo libre de ' + title + '">';
    // Ejes x e y (girados axDeg respecto a la horizontal)
    h += '<line class="ax" x1="' + (cx - tx * 118) + '" y1="' + (cy - ty * 118) + '" x2="' + (cx + tx * 118) + '" y2="' + (cy + ty * 118) + '"/>' +
      '<line class="ax" x1="' + (cx - nx * 118) + '" y1="' + (cy - ny * 118) + '" x2="' + (cx + nx * 118) + '" y2="' + (cy + ny * 118) + '"/>' +
      '<text class="axl" x="' + (cx + tx * 128) + '" y="' + (cy + ty * 128 + 5) + '" text-anchor="middle">x</text>' +
      '<text class="axl" x="' + (cx + nx * 128) + '" y="' + (cy + ny * 128 + 5) + '" text-anchor="middle">y</text>' +
      (opts.forma === 'circulo'
        ? '<circle class="body" cx="' + cx + '" cy="' + cy + '" r="15"/>'
        : '<rect class="body" x="-19" y="-13" width="38" height="26" rx="3" transform="translate(' + cx + ' ' + cy + ') rotate(' + (-axDeg) + ')"/>');

    // Componentes de una fuerza sobre los ejes (triángulo punteado)
    var desc = null;                              // {cls, lado} si se dibujó
    if (opts.descomponer) {
      var fd = forces.filter(function (f) { return f.cls === opts.descomponer.cls; })[0];
      if (fd && fd.mag > 1e-9) {
        var Ld = len(fd.mag), ddx = Math.cos(fd.ang), ddy = -Math.sin(fd.ang);
        var cn = Ld * (ddx * nx + ddy * ny), ct = Ld * (ddx * tx + ddy * ty);   // sobre y, sobre x
        if (Math.abs(cn) > 6 && Math.abs(ct) > 6) {
          var qx = cx + nx * cn, qy = cy + ny * cn, ex0 = cx + ddx * Ld, ey0 = cy + ddy * Ld;
          var o1x = -Math.sign(ct) * tx * 9, o1y = -Math.sign(ct) * ty * 9;     // rótulos por fuera del triángulo
          var o2x = Math.sign(cn) * nx * 15, o2y = Math.sign(cn) * ny * 15;
          h += '<g class="' + fd.cls + '"><path class="cmp" d="M' + cx + ' ' + cy + 'L' + qx + ' ' + qy + 'L' + ex0 + ' ' + ey0 + '"/>' +
            '<text class="cmpl" x="' + ((cx + qx) / 2 + o1x) + '" y="' + ((cy + qy) / 2 + o1y + 4) + '" text-anchor="' + ancla(o1x) + '">' + opts.descomponer.etiquetas[0] + '</text>' +
            '<text class="cmpl" x="' + ((qx + ex0) / 2 + o2x) + '" y="' + ((qy + ey0) / 2 + o2y + 4) + '" text-anchor="' + ancla(o2x) + '">' + opts.descomponer.etiquetas[1] + '</text></g>';
          desc = { cls: fd.cls, lado: Math.sign(qx - cx) || 1 };
        }
      }
    }

    var usados = [];                              // direcciones ya ocupadas
    forces.forEach(function (f) {
      if (f.mag < 1e-9) return;                   // las fuerzas nulas no se dibujan
      var L = len(f.mag), dx = Math.cos(f.ang), dy = -Math.sin(f.ang);
      // Si dos fuerzas comparten dirección, la segunda se desplaza para no taparse
      var dup = usados.filter(function (u) { return Math.abs(Math.atan2(Math.sin(u - f.ang), Math.cos(u - f.ang))) < 0.08; }).length;
      usados.push(f.ang);
      var ox = cx - dy * 13 * dup, oy = cy + dx * 13 * dup, ex = ox + dx * L, ey = oy + dy * L;
      h += arrow(ox, oy, ex, ey, f.cls);

      var lx = ex + dx * 12, ly = ey + dy * 14 + 5, an = dx > 0.35 ? 'start' : dx < -0.35 ? 'end' : 'middle';
      // El rótulo del peso descompuesto va del lado contrario al triángulo
      if (desc && desc.cls === 'w' && f.cls === 'w') { lx = ex - 9 * desc.lado; ly = ey + 2; an = desc.lado > 0 ? 'end' : 'start'; }
      var sub = f.sub ? '<tspan dy="4" font-size="10.5">' + f.sub + '</tspan><tspan dy="-4"> </tspan>' : ' ';
      h += '<text class="fl ' + f.cls + '" x="' + lx + '" y="' + ly + '" text-anchor="' + an + '">' + f.b + sub + '= ' + n3(f.mag) + ' N</text>';
    });

    // Aceleración: se dibuja aparte, en la esquina, porque no es una fuerza
    if (opts.acel) {
      var A = opts.acel, ax0 = 46, ay0 = 226;
      if (A.mag > 1e-6) {
        var adx = Math.cos(A.ang) * 22, ady = -Math.sin(A.ang) * 22;
        h += arrow(ax0 - adx, ay0 - ady, ax0 + adx, ay0 + ady, 'acc');
      }
      h += '<text class="accl" x="12" y="270">a = ' + n3(A.mag) + ' m/s²</text>';
    }

    // Velocidad: también aparte. Su flecha crece y se encoge con la animación
    if (opts.vel) {
      var V = opts.vel, vx0 = 46, vy0 = 50;
      if (V.mag > 1e-6) {
        var medio = 6 + 16 * Math.min(1, V.frac);
        var vdx = Math.cos(V.ang) * medio, vdy = -Math.sin(V.ang) * medio;
        h += arrow(vx0 - vdx, vy0 - vdy, vx0 + vdx, vy0 + vdy, 'vel');
      }
      h += '<text class="accl" x="12" y="18">v = ' + n3(V.mag) + ' m/s</text>';
    }
    return '<div class="paper fbd"><h3>' + title + '</h3>' + h + '</svg></div>';
  }

  /**
   * Vista desde arriba de un movimiento circular: el cuerpo sobre su
   * trayectoria, la fuerza horizontal neta (siempre hacia el centro) y la
   * velocidad (siempre tangente). Las dos giran con el cuerpo.
   * @param {number} posAng  ángulo de la posición visto desde el centro (rad)
   * @param {object} fuerza  {b, sub, mag, cls} fuerza horizontal
   * @param {number} velAng  dirección de la velocidad (rad)
   * @param {string} nota    qué fuerzas no se ven por ser verticales
   */
  function topViewSVG(title, posAng, fuerza, velAng, vTexto, nota) {
    var cx = 190, cy = 132, R = 78;
    var px = cx + R * Math.cos(posAng), py = cy - R * Math.sin(posAng);
    var ux = (cx - px) / R, uy = (cy - py) / R;             // unitario hacia el centro
    var vx = Math.cos(velAng), vy = -Math.sin(velAng);
    var ancla = function (ox) { return ox > 0.35 ? 'start' : ox < -0.35 ? 'end' : 'middle'; };
    var sub = fuerza.sub ? '<tspan dy="4" font-size="10.5">' + fuerza.sub + '</tspan><tspan dy="-4"> </tspan>' : ' ';

    var h = '<svg viewBox="0 0 380 280" role="img" aria-label="' + title + '">' +
      '<circle class="ax" cx="' + cx + '" cy="' + cy + '" r="' + R + '" fill="none"/>' +
      '<circle class="hub" cx="' + cx + '" cy="' + cy + '" r="3"/>' +
      arrow(px, py, px + vx * 54, py + vy * 54, 'vel') +
      '<text class="accl" x="' + (px + vx * 66) + '" y="' + (py + vy * 66 + 5) + '" text-anchor="' + ancla(vx) + '">' + vTexto + '</text>' +
      arrow(px, py, px + ux * 56, py + uy * 56, fuerza.cls) +
      '<circle class="body" cx="' + px + '" cy="' + py + '" r="11"/>' +
      // El rótulo de la fuerza va por fuera del círculo, del lado opuesto al centro
      '<text class="fl ' + fuerza.cls + '" x="' + (px - ux * 20) + '" y="' + (py - uy * 22 + 5) + '" text-anchor="' + ancla(-ux) + '">' + fuerza.b + sub + '= ' + n3(fuerza.mag) + ' N</text>' +
      '<text class="tk" x="190" y="268" text-anchor="middle">' + nota + '</text>';
    return '<div class="paper fbd"><h3>' + title + '</h3>' + h + '</svg></div>';
  }

  /**
   * Arma la lista de fuerzas de cada cuerpo según el problema y el
   * estado actual k (de fisica.dyn), y pinta los diagramas en el.
   * @param {object} st   estado {s, v} en este instante
   * @param {object} sim  simulación completa (se usa su rapidez máxima)
   */
  function renderFBD(el, sc, p, md, k, st, sim) {
    var g = p.g, arriba = Math.PI / 2, abajo = -Math.PI / 2, h;
    // La fricción apunta a favor o en contra del eje según su signo
    var friccion = function (th) {
      return { b: 'f', sub: k.phase === 0 ? 's' : 'k', mag: Math.abs(k.f), ang: k.f >= 0 ? th : th + Math.PI, cls: 'f' };
    };
    // Aceleración a lo largo de una dirección dada (cambia de sentido con el signo)
    var acel = function (ang) { return { ang: k.a >= 0 ? ang : ang + Math.PI, mag: Math.abs(k.a) }; };
    // Velocidad en esa misma dirección; su largo es proporcional a la rapidez
    var vel = function (ang) { return { ang: st.v >= 0 ? ang : ang + Math.PI, mag: Math.abs(st.v), frac: Math.abs(st.v) / (sim.vmax || 1) }; };
    var peso = { cls: 'w', etiquetas: ['W cos θ', 'W sen θ'] };

    if (sc.type === 'plano') {
      var th = rad(p.th || 0);
      h = fbdSVG('Bloque m', [
        { b: 'W', mag: p.m * g, ang: abajo, cls: 'w' },
        { b: 'N', mag: md.N, ang: th + arriba, cls: 'n' },
        { b: 'P', mag: p.P, ang: th + rad(p.phi), cls: 'p' },
        friccion(th)
      ], p.th || 0, { descomponer: peso, acel: acel(th), vel: vel(th) });
    } else {
      var T = Lab.fisica.tension(p, k.a);
      var colgante = [{ b: 'W', sub: '2', mag: p.m2 * g, ang: abajo, cls: 'w' }, { b: 'T', mag: T, ang: arriba, cls: 't' }];
      if (sc.type === 'atwood') {
        h = fbdSVG('Masa m₁', [{ b: 'W', sub: '1', mag: p.m1 * g, ang: abajo, cls: 'w' }, { b: 'T', mag: T, ang: arriba, cls: 't' }], 0, { acel: acel(arriba), vel: vel(arriba) }) +
            fbdSVG('Masa m₂', colgante, 0, { acel: acel(abajo), vel: vel(abajo) });
      } else {
        var th2 = rad(p.th);
        h = fbdSVG('Bloque m₁ (sobre el plano)', [
          { b: 'W', sub: '1', mag: p.m1 * g, ang: abajo, cls: 'w' },
          { b: 'N', mag: md.N, ang: th2 + arriba, cls: 'n' },
          { b: 'T', mag: T, ang: th2, cls: 't' },
          friccion(th2)
        ], p.th, { descomponer: peso, acel: acel(th2), vel: vel(th2) }) + fbdSVG('Masa colgante m₂', colgante, 0, { acel: acel(abajo), vel: vel(abajo) });
      }
    }
    el.innerHTML = h;
  }

  Lab.dibujo = { arrow: arrow, niceStep: niceStep, tickVals: tickVals, buildScene: buildScene, fbdSVG: fbdSVG, topViewSVG: topViewSVG, renderFBD: renderFBD };

})(window.Lab);
