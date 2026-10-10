/* ==========================================================
   solucion-circular.js — Solución paso a paso (movimiento circular)
   Misma interfaz que solucion.js. Cada paso es [título, texto].
   ========================================================== */
(function (Lab) {
  'use strict';
  var n3 = Lab.util.n3, E = Lab.util.eq;

  function pasosPendulo(pasos, p, md, sim) {
    var g = p.g, W = p.m * g, th0 = md.th0;
    pasos.push(['Aísla la masa y lista las fuerzas',
      'Solo actúan dos fuerzas: el peso ' + E('W = mg = ' + n3(W) + ' N') + ' hacia abajo y la tensión ' + E('T') +
      ' a lo largo de la cuerda, hacia el pivote. No hay ninguna fuerza "que empuje" en la dirección del movimiento.']);
    pasos.push(['Elige los ejes y descompón',
      'Como la masa se mueve sobre un arco, conviene girar los ejes: ' + E('y') + ' a lo largo de la cuerda (radial) y ' + E('x') +
      ' tangente a la trayectoria. La tensión queda sobre un eje y solo se descompone el peso: ' +
      E('W<sub>x</sub> = −mg sen θ') + ', ' + E('W<sub>y</sub> = −mg cos θ') + '.']);
    pasos.push(['Dirección tangencial',
      E('ΣF<sub>x</sub> = ma<sub>t</sub>  ⟹  −mg sen θ = ma<sub>t</sub>  ⟹  a<sub>t</sub> = −g sen θ') +
      '. Al soltarla en ' + E('θ<sub>0</sub> = ' + n3(p.th0) + '°') + ': ' + E('a<sub>t</sub> = <b>' + n3(-g * Math.sin(th0)) + ' m/s²</b>') +
      '. El signo indica que siempre apunta hacia el centro de la oscilación.']);
    pasos.push(['Dirección radial',
      'Aquí la suma no es cero: debe dar la aceleración centrípeta. ' + E('ΣF<sub>y</sub> = mv²/L  ⟹  T − mg cos θ = mv²/L') +
      '. En el instante de soltarla ' + E('v = 0') + ', así que ' + E('T = mg cos θ<sub>0</sub> = <b>' + n3(W * Math.cos(th0)) + ' N</b>') + ', menor que el peso.']);
    pasos.push(['Punto más bajo',
      'Por conservación de la energía, ' + E('v = √(2gL(1 − cos θ<sub>0</sub>)) = ' + n3(md.vMax) + ' m/s') +
      '. Ahí ' + E('T = mg + mv²/L = mg(3 − 2cos θ<sub>0</sub>) = <b>' + n3(md.TMax) + ' N</b>') +
      ': la tensión es máxima y supera al peso, porque además de sostener la masa debe curvar su trayectoria.']);
    var dif = (sim.periodo - md.periodoPequeno) / md.periodoPequeno * 100;
    pasos.push(['Periodo',
      'La fórmula de ángulos pequeños da ' + E('T<sub>0</sub> = 2π√(L/g) = ' + n3(md.periodoPequeno) + ' s') +
      '. La simulación, que integra la ecuación completa ' + E('θ″ = −(g/L) sen θ') + ', mide ' + E('<b>' + sim.periodo.toFixed(3) + ' s</b>') +
      ', un ' + n3(dif) + ' % más. ' + (dif < 1
        ? 'Con esta amplitud la aproximación es muy buena.'
        : 'La diferencia crece con la amplitud: la aproximación solo vale para ángulos pequeños.') +
      ' Ninguno de los dos depende de la masa.']);
  }

  function pasosConico(pasos, p, md) {
    var g = p.g, W = p.m * g;
    pasos.push(['Aísla la masa y lista las fuerzas',
      'Actúan el peso ' + E('W = mg = ' + n3(W) + ' N') + ' y la tensión ' + E('T') + ' de la cuerda, inclinada ' + E('θ = ' + n3(p.thc) + '°') +
      ' respecto a la vertical. La "fuerza centrípeta" no es una tercera fuerza: es la resultante de estas dos.']);
    pasos.push(['Elige los ejes y descompón',
      'La masa gira en un plano horizontal, así que los ejes no se giran: ' + E('y') + ' vertical y ' + E('x') +
      ' horizontal hacia el centro del círculo. Se descompone la tensión: ' + E('T<sub>y</sub> = T cos θ') + ', ' + E('T<sub>x</sub> = T sen θ') + '.']);
    pasos.push(['Dirección vertical',
      'La masa no sube ni baja: ' + E('ΣF<sub>y</sub> = 0  ⟹  T cos θ = mg  ⟹  T = mg / cos θ = <b>' + n3(md.T) + ' N</b>') + '.']);
    pasos.push(['Dirección horizontal',
      'La componente horizontal es la que curva la trayectoria: ' + E('ΣF<sub>x</sub> = mv²/r  ⟹  T sen θ = mv²/r') +
      ', con ' + E('r = L sen θ = ' + n3(md.r) + ' m') + '.']);
    pasos.push(['Despeja la rapidez',
      'Dividiendo las dos ecuaciones se cancelan ' + E('T') + ' y ' + E('m') + ': ' +
      E('tan θ = v²/(gr)  ⟹  v = √(gr tan θ) = <b>' + n3(md.v) + ' m/s</b>') + '.']);
    pasos.push(['Periodo',
      E('T<sub>giro</sub> = 2πr/v = 2π√(L cos θ / g) = <b>' + n3(md.periodo) + ' s</b>') +
      '. No depende de la masa, y disminuye al abrir el ángulo: para girar más abierto hay que girar más rápido.']);
  }

  function pasosCurva(pasos, p, md) {
    var g = p.g;
    pasos.push(['Aísla el auto y lista las fuerzas',
      'Actúan el peso ' + E('W = mg = ' + n3(md.N) + ' N') + ', la normal ' + E('N') + ' del pavimento y la fricción estática ' + E('f<sub>s</sub>') +
      ' entre las llantas y el piso. Esa fricción es lateral: apunta hacia el centro de la curva, perpendicular a la velocidad.']);
    pasos.push(['Elige los ejes',
      'Mirando el auto desde atrás: ' + E('y') + ' vertical y ' + E('x') + ' horizontal hacia el centro de la curva. Ninguna fuerza necesita descomponerse.']);
    pasos.push(['Dirección vertical',
      E('ΣF<sub>y</sub> = 0  ⟹  N = mg = ' + n3(md.N) + ' N') + '.']);
    pasos.push(['Dirección horizontal',
      'La fricción es la única fuerza horizontal, así que ella sola debe dar la aceleración centrípeta: ' +
      E('ΣF<sub>x</sub> = mv²/r  ⟹  f<sub>s</sub> = mv²/r = ' + n3(p.mc) + ' · ' + n3(p.v) + '² / ' + n3(p.r) + ' = <b>' + n3(md.fnec) + ' N</b>') + '.']);
    pasos.push(['¿Alcanza la fricción?',
      'El pavimento puede dar como máximo ' + E('f<sub>s,máx</sub> = μ<sub>s</sub>N = ' + n3(md.fmax) + ' N') + '. Como la curva exige ' +
      E(n3(md.fnec) + ' N ' + (md.derrapa ? '&gt;' : '≤') + ' f<sub>s,máx</sub>') + ', ' +
      (md.derrapa
        ? 'el auto <b>derrapa</b>: no puede seguir la vía y describe una curva más abierta, de radio ' + E(n3(md.rTray) + ' m') + '.'
        : 'el auto <b>toma la curva</b> usando el ' + n3(md.fnec / md.fmax * 100) + ' % de la fricción disponible.')]);
    pasos.push(['Rapidez máxima',
      'Igualando ' + E('mv²/r = μ<sub>s</sub>mg') + ' la masa se cancela: ' +
      E('v<sub>máx</sub> = √(μ<sub>s</sub>gr) = <b>' + n3(md.vmax) + ' m/s</b> = ' + n3(md.vmax * 3.6) + ' km/h') +
      '. Un camión y una moto tienen el mismo límite en la misma curva; lo que lo cambia es el radio y el estado del piso.']);
  }

  function render(el, sc, p, md, sim) {
    var pasos = [];
    if (md.tipo === 'pendulo') pasosPendulo(pasos, p, md, sim);
    else if (md.tipo === 'conico') pasosConico(pasos, p, md);
    else pasosCurva(pasos, p, md);
    el.innerHTML = pasos.map(function (s) { return '<li><h3>' + s[0] + '</h3><p>' + s[1] + '</p></li>'; }).join('');
  }

  Lab.solucionCircular = { render: render };

})(window.Lab);
