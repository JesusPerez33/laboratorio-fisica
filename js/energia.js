/* ==========================================================
   energia.js — Balance de energía en vivo
   Teorema del trabajo y la energía aplicado a la simulación:

       K + ΔU + Q − W_P = K₀

   K    energía cinética de todo lo que se mueve
   ΔU   cambio de energía potencial gravitacional
   Q    energía disipada por la fricción (calor)
   W_P  trabajo hecho por la fuerza aplicada
   Si el motor de física está bien, el lado izquierdo no cambia
   durante todo el movimiento. Es una verificación independiente.
   ========================================================== */
(function (Lab) {
  'use strict';
  var rad = Lab.util.rad, n3 = Lab.util.n3;

  /** Distancia total recorrida hasta el instante t (cuenta ida y vuelta) */
  function recorrido(sim, t, s) {
    var e = sim.events[0];
    return e && t > e.t ? Math.abs(e.s) + Math.abs(s - e.s) : Math.abs(s);
  }

  /**
   * Energías en un instante.
   * @param {object} st  estado {s, v} de fisica.stateAt
   * @returns {{K, U, Q, WP, total}}  en joules
   */
  function calcular(p, md, sim, t, st) {
    var K = 0.5 * md.M * st.v * st.v;
    var WP = (p.P || 0) * Math.cos(rad(p.phi || 0)) * st.s;
    // Fd reúne la fuerza aplicada y la gravedad: Fd·s = W_P − ΔU
    var U = WP - md.Fd * st.s;
    var Q = md.fk * recorrido(sim, t, st.s);
    return { K: K, U: U, Q: Q, WP: WP, total: K + U + Q - WP };
  }

  var FILAS = [
    { id: 'K',  nombre: 'Cinética', sim: 'K' },
    { id: 'U',  nombre: 'Potencial', sim: 'ΔU' },
    { id: 'Q',  nombre: 'Calor por fricción', sim: 'Q' },
    { id: 'WP', nombre: 'Trabajo de P', sim: 'W<sub>P</sub>' }
  ];

  /**
   * Construye las barras dentro de el y devuelve actualizar(t, st),
   * que se llama en cada cuadro de la animación.
   */
  function render(el, p, md, sim) {
    var F = Lab.fisica, ult = sim.T.length - 1;

    // Escala fija: el mayor valor que alcanza cualquier energía en el recorrido
    var instantes = [0, sim.end].concat(sim.events.map(function (e) { return e.t; }));
    var maximo = 1e-9;
    instantes.forEach(function (t) {
      var en = calcular(p, md, sim, t, t >= sim.end ? { s: sim.S[ult], v: sim.V[ult] } : F.stateAt(sim, t));
      ['K', 'U', 'Q', 'WP'].forEach(function (k) { maximo = Math.max(maximo, Math.abs(en[k])); });
    });

    var filas = FILAS.filter(function (f) { return f.id !== 'WP' || p.P > 0; });
    el.innerHTML = filas.map(function (f) {
      return '<div class="en-row"><span class="en-l">' + f.nombre + ' <span class="eq">' + f.sim + '</span></span>' +
        '<div class="en-track"><div class="en-bar en-' + f.id + '" id="en_' + f.id + '"></div></div>' +
        '<span class="en-v" id="env_' + f.id + '"></span></div>';
    }).join('') + '<p class="en-bal" id="en_bal"></p>';

    var K0 = 0.5 * md.M * p.v0 * p.v0;

    return function actualizar(t, st) {
      var en = calcular(p, md, sim, t, st);
      filas.forEach(function (f) {
        var v = en[f.id], ancho = Math.abs(v) / maximo * 50;      // % de la pista
        var barra = document.getElementById('en_' + f.id);
        barra.style.width = ancho + '%';
        barra.style.left = (v >= 0 ? 50 : 50 - ancho) + '%';      // negativas crecen a la izquierda
        document.getElementById('env_' + f.id).textContent = n3(v) + ' J';
      });
      document.getElementById('en_bal').innerHTML =
        '<span class="eq">K + ΔU + Q' + (p.P > 0 ? ' − W<sub>P</sub>' : '') + ' = ' + (Math.abs(en.total) < 5e-5 ? 0 : en.total).toFixed(4) + ' J</span>' +
        ' · valor inicial <span class="eq">K<sub>0</sub> = ' + K0.toFixed(4) + ' J</span>' +
        ' · diferencia <span class="eq">' + Math.abs(en.total - K0).toExponential(1) + ' J</span>';
    };
  }

  Lab.energia = { calcular: calcular, recorrido: recorrido, render: render };

})(window.Lab);
