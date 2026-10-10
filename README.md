# Laboratorio de Cuerpo Libre

Aplicación web que, a partir de los datos de un problema de dinámica, dibuja el
diagrama de cuerpo libre, resuelve la segunda ley de Newton paso a paso, simula
el movimiento y contrasta la predicción con mediciones.

## Cómo abrirla

Doble clic en `index.html`. No necesita instalación ni servidor.
(Solo las fuentes se cargan de internet; sin conexión se ve con otra letra.)

## Estructura

```
laboratorio/
├── index.html          Estructura de la página (sin lógica)
├── css/
│   └── styles.css      Apariencia: colores, tipografía, distribución
└── js/
    ├── config.js       Parámetros, problemas disponibles y utilidades
    ├── fisica.js       Motor de física: modelo, fricción, simulación
    ├── dibujo.js       Escena animada y diagramas de cuerpo libre (SVG)
    ├── solucion.js     Redacción de la solución paso a paso
    ├── graficas.js     Gráficas de posición, velocidad y datos
    ├── experimento.js  Ajuste por mínimos cuadrados y comparación
    └── app.js          Estado, eventos y coordinación de todo lo anterior
```

## Arquitectura

Cada archivo tiene una sola responsabilidad y solo depende de los que están
antes que él en la lista:

```
config  →  fisica  →  dibujo  →  solucion / graficas / experimento  →  app
(datos)   (cálculo)              (vistas)                          (control)
```

- **`fisica.js` no toca la pantalla.** Sus funciones reciben números y devuelven
  números, así que se pueden probar o reutilizar por separado.
- **Las vistas no calculan física.** Reciben los resultados y los pintan.
- **`app.js` es el único que guarda estado** y decide qué se recalcula cuando el
  usuario cambia algo.

Todos los módulos se cuelgan de un único objeto global, `Lab`
(`Lab.fisica`, `Lab.dibujo`, …), para no llenar el espacio global de nombres y
para que la página funcione abriéndola directamente desde el disco.

## El modelo físico en tres funciones

Los cuatro problemas tienen un solo grado de libertad, la coordenada `s`.

1. `model(type, p)` reduce el problema a la masa total `M`, la fuerza impulsora
   `Fd` (todo menos la fricción) y la normal `N`.
2. `dyn(md, v)` decide la fricción: si el cuerpo está quieto y `|Fd| ≤ μs·N`, es
   estática y lo sostiene; si no, es cinética y se opone al movimiento. Devuelve
   la aceleración.
3. `simulate(md, p)` avanza en pasos de 1/240 s y vuelve a llamar a `dyn` en cada
   uno, por eso detecta cuándo el cuerpo se detiene y si regresa o se queda.

## Cómo agregar un problema nuevo

1. `config.js`: añadir la entrada en `Lab.SCENARIOS`.
2. `fisica.js`: añadir su caso en `model` (calcular `M`, `Fd`, `N`).
3. `dibujo.js`: dibujar su escena y la lista de fuerzas en `renderFBD`.
4. `solucion.js`: escribir sus pasos.

## Supuestos

Cuerpos como partículas, cuerda y polea ideales, fricción de Coulomb con
coeficientes constantes y sin resistencia del aire.
