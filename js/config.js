/* ==========================================================
   config.js — Datos y utilidades compartidas
   Aquí no hay física ni dibujo: solo la descripción de los
   parámetros, los problemas disponibles y funciones de apoyo.
   Para agregar un problema nuevo se empieza por este archivo.
   ========================================================== */
window.Lab = window.Lab || {};

(function (Lab) {
  'use strict';

  /* ---------- Utilidades ---------- */
  Lab.util = {
    /** Atajo para document.getElementById */
    $: function (id) { return document.getElementById(id); },

    /** Grados a radianes */
    rad: function (grados) { return grados * Math.PI / 180; },

    /** Número con 3 cifras significativas y signo menos tipográfico */
    n3: function (x) {
      if (Math.abs(x) < 1e-9) return '0';
      return String(Number(x.toPrecision(3))).replace('-', '−');
    },

    /** Envuelve una expresión para mostrarla con estilo de ecuación */
    eq: function (html) { return '<span class="eq">' + html + '</span>'; }
  };

  /* ---------- Parámetros ajustables ----------
     l: nombre, s: símbolo, u: unidad, min/max/st: rango del control */
  Lab.PARAMS = {
    m:   { l: 'Masa', s: 'm', u: 'kg', min: 0.05, max: 10, st: 0.01 },
    m1:  { l: 'Masa sobre la superficie', s: 'm₁', u: 'kg', min: 0.05, max: 10, st: 0.01 },
    m2:  { l: 'Masa colgante', s: 'm₂', u: 'kg', min: 0.05, max: 10, st: 0.01 },
    th:  { l: 'Ángulo del plano', s: 'θ', u: '°', min: 0, max: 60, st: 0.5 },
    mus: { l: 'Fricción estática', s: 'μₛ', u: '', min: 0, max: 1, st: 0.01 },
    muk: { l: 'Fricción cinética', s: 'μₖ', u: '', min: 0, max: 1, st: 0.01 },
    P:   { l: 'Fuerza aplicada', s: 'P', u: 'N', min: 0, max: 50, st: 0.1 },
    phi: { l: 'Ángulo de P sobre la superficie', s: 'φ', u: '°', min: 0, max: 80, st: 1 },
    v0:  { l: 'Velocidad inicial', s: 'v₀', u: 'm/s', min: -3, max: 3, st: 0.05 },
    d:   { l: 'Recorrido máximo', s: 'd', u: 'm', min: 0.2, max: 3, st: 0.05 },
    g:   { l: 'Gravedad', s: 'g', u: 'm/s²', min: 9.7, max: 9.9, st: 0.001 }
  };
  // En la máquina de Atwood las dos masas cuelgan, así que cambian de nombre
  Lab.PARAMS.m1a = Object.assign({}, Lab.PARAMS.m1, { l: 'Masa izquierda' });
  Lab.PARAMS.m2a = Object.assign({}, Lab.PARAMS.m2, { l: 'Masa derecha' });

  /* ---------- Problemas disponibles ----------
     type:   qué modelo físico usa (ver fisica.js)
     params: qué controles se muestran
     def:    valores iniciales
     pos/neg: cómo se describe en palabras cada sentido del movimiento */
  Lab.SCENARIOS = {
    plano: {
      name: 'Plano inclinado', type: 'plano',
      params: ['m', 'th', 'mus', 'muk', 'P', 'phi', 'v0', 'd'],
      def: { m: 0.5, th: 30, mus: 0.35, muk: 0.25, P: 0, phi: 0, v0: 0, d: 1 },
      pos: 'hacia arriba del plano', neg: 'hacia abajo del plano',
      conv: 'Sentido positivo de s: hacia arriba del plano.'
    },
    horiz: {
      name: 'Superficie horizontal', type: 'plano',
      params: ['m', 'mus', 'muk', 'P', 'phi', 'v0', 'd'],
      def: { m: 2, th: 0, mus: 0.4, muk: 0.3, P: 12, phi: 25, v0: 0, d: 1.5 },
      pos: 'hacia la derecha', neg: 'hacia la izquierda',
      conv: 'Sentido positivo de s: hacia la derecha.'
    },
    atwood: {
      name: 'Máquina de Atwood', type: 'atwood',
      params: ['m1', 'm2', 'v0', 'd'],
      def: { m1: 0.45, m2: 0.5, v0: 0, d: 1 },
      pos: 'con m₂ bajando', neg: 'con m₂ subiendo',
      conv: 'Sentido positivo de s: m₂ baja y m₁ sube.'
    },
    colg: {
      name: 'Plano con masa colgante', type: 'colg',
      params: ['m1', 'm2', 'th', 'mus', 'muk', 'v0', 'd'],
      def: { m1: 1, m2: 0.6, th: 20, mus: 0.25, muk: 0.18, v0: 0, d: 0.8 },
      pos: 'con m₂ bajando', neg: 'con m₂ subiendo',
      conv: 'Sentido positivo de s: m₂ baja y m₁ sube por el plano.'
    }
  };

  /* ---------- Constantes ---------- */
  Lab.G_ESTANDAR = 9.81;
  Lab.DT = 1 / 240;        // paso de tiempo de la simulación (s)
  Lab.T_MAX = 12;          // duración máxima simulada (s)

  /** Mediciones de muestra para la sección de contraste experimental */
  Lab.DATOS_EJEMPLO =
    '0.0, 0.000\n0.1, 0.016\n0.2, 0.052\n0.3, 0.125\n0.4, 0.215\n' +
    '0.5, 0.343\n0.6, 0.487\n0.7, 0.670\n0.8, 0.868';

})(window.Lab);
