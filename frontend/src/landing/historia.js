/**
 * Los cinco estados del recorrido, y cómo se sincronizan con el scroll.
 *
 * El prompt pide cinco estados narrativos. Resulta que PomAss ya tenía los
 * suyos: el manual identifica Día con naranja, Noche con magenta y reserva el
 * degradado que los une para donde ambos se tocan. Así que los estados no se
 * inventan — son el recorrido del día que la página ya contaba, ahora ligado
 * a la escena 3D y a la atmósfera.
 *
 *   0 Amanecer    crema cálida      la promesa de marca
 *   1 Día         naranja durazno   neutraliza olores
 *   2 Transición  el degradado      por qué son dos y no una
 *   3 Noche       magenta           crema blanqueadora
 *   4 Cierre      vuelta a crema    quién la hace, y la compra
 *
 * Nada aquí importa React ni Three: son datos y matemáticas. La escena los
 * lee en cada fotograma y el contenido los usa para pintar la atmósfera.
 */

/**
 * Atmósfera CSS por estado. Son los colores del manual, no los del prompt.
 *
 * En minúsculas a propósito: `mezclarHex` devuelve minúsculas, y si la tabla
 * fuera en mayúsculas el mismo color se leería distinto según se pidiera un
 * estado entero o uno interpolado.
 */
export const ATMOSFERAS = [
  // 0 · Amanecer: crema con el durazno apenas insinuado.
  { top: '#fff7ef', bottom: '#ffe9d6', glow: '#ffe0c2' },
  // 1 · Día: el naranja sube sin llegar a saturar el texto.
  { top: '#fff1e2', bottom: '#ffd9b4', glow: '#ffc98e' },
  // 2 · Transición: naranja arriba, magenta abajo. El degradado del manual.
  { top: '#ffd9b4', bottom: '#d98bc8', glow: '#ffb9a0' },
  // 3 · Noche: magenta profundo. Aquí el texto va en crema. El de arriba no
  // puede ser más claro: el texto que queda en lo alto de la pantalla bajaría
  // de 4,5:1 (lo comprueba `historia.test.js`).
  { top: '#a8389a', bottom: '#5e0854', glow: '#b6479f' },
  // 4 · Cierre: vuelve a la crema del principio, el día que termina.
  { top: '#fff2e6', bottom: '#ffe4d2', glow: '#ffd9be' },
]

/**
 * Tramo del recorrido en el que el fondo es oscuro y el texto va en crema.
 *
 * Es una ventana y no un umbral: la noche empieza en la transición y acaba
 * antes del cierre, que vuelve a la crema del amanecer. Con un umbral, el
 * texto del cierre se quedaría en crema sobre fondo crema.
 *
 * Los bordes no son la mitad entre estados a ojo: son donde la crema pasa de
 * unos 4:1 sobre el centro de la pantalla. Entre 2,4 y 2,6 ni la tinta ni la
 * crema llegan a 4,5:1 sobre el fondo desnudo; en ese tramo lo que se lee son
 * las tarjetas del ritual, que llevan su propio fondo de cristal.
 */
export const ESTADO_OSCURO = 2.6
export const ESTADO_CLARO = 3.4

/** ¿Va el texto en crema en este punto del recorrido? */
export const esOscuro = (historia) => historia >= ESTADO_OSCURO && historia < ESTADO_CLARO

/**
 * Parámetros de la escena 3D por estado.
 *
 * Las posiciones del producto están elegidas para que NUNCA quede detrás de
 * un titular: en las bandas con texto centrado se aparta a un lado, y en las
 * que el texto va a un lado ocupa el otro.
 */
export const ESTADOS_ESCENA = [
  {
    // `ancla`: el producto se coloca sobre el hueco que le reserva la
    // maquetación (`[data-ancla-producto="…"]`) en vez de en `pos`. Así se
    // desplaza con la página y no puede pisar texto, mida lo que mida la
    // pantalla. `pos` queda de respaldo y aporta la profundidad.
    ancla: 'apertura',
    camara: [0, 0.05, 7],
    producto: { pos: [0.3, 0, 0], escala: 1.05, opacidad: 1 },
    velos: { expansion: 1, opacidad: 1, amplitud: 1, velocidad: 1 },
    particulasCorriente: { opacidad: 1, velocidad: 1 },
    campo: 0.9,
    volumen: 0.9,
  },
  {
    camara: [0.25, 0, 6.2],
    producto: { pos: [1.7, 0.15, -0.6], escala: 1, opacidad: 1 },
    velos: { expansion: 1.45, opacidad: 0.9, amplitud: 1.15, velocidad: 1.15 },
    particulasCorriente: { opacidad: 1, velocidad: 1.25 },
    campo: 1,
    volumen: 1,
  },
  {
    camara: [0, 0.1, 6.5],
    // Más a la derecha y más arriba que en el prompt: las tarjetas del
    // ritual ocupan hasta ~1230 px de ancho a 1440, y a 3,4 el producto
    // asomaba por detrás de la de la derecha.
    producto: { pos: [4.4, 1.5, -2.4], escala: 0.6, opacidad: 0.35 },
    velos: { expansion: 1.75, opacidad: 0.6, amplitud: 0.7, velocidad: 0.75 },
    particulasCorriente: { opacidad: 0.7, velocidad: 0.7 },
    campo: 0.8,
    volumen: 0.85,
  },
  {
    // Del mismo lado que el ritual, arriba a la derecha: con el producto a la
    // izquierda aquí, entre el ritual y la confianza cruzaba la pantalla de
    // lado a lado pasando por detrás del texto.
    //
    // Y del todo invisible, no al 20 % como en el prompt: es la banda con más
    // texto de la página (confianza y preguntas), y medido a 1440×810 el
    // producto tenue seguía asomando tras algún titular en cualquier hueco
    // que se le buscara. Vuelve, entero, para el cierre.
    camara: [0, 0, 6.9],
    producto: { pos: [4.6, 1.6, -2.8], escala: 0.55, opacidad: 0 },
    velos: { expansion: 1.95, opacidad: 0.45, amplitud: 0.5, velocidad: 0.45 },
    particulasCorriente: { opacidad: 0.6, velocidad: 0.35 },
    campo: 0.7,
    volumen: 0.7,
  },
  {
    ancla: 'cierre',
    camara: [0.15, 0, 6.3],
    producto: { pos: [1.5, 0, 0], escala: 1.15, opacidad: 1 },
    velos: { expansion: 1.2, opacidad: 0.6, amplitud: 0.55, velocidad: 0.5 },
    particulasCorriente: { opacidad: 0.35, velocidad: 0.3 },
    campo: 0.75,
    volumen: 0.55,
  },
]

/**
 * En móvil el producto solo aparece donde la página le deja sitio: en la
 * apertura, encima del relato, y en el cierre, encima del combo. Los dos
 * llevan ancla, así que siguen a su hueco al desplazarse.
 *
 * En las bandas de en medio se oculta. El prompt lo quería pequeño y tenue
 * arriba a la derecha, pero en móvil el texto ocupa todo el ancho y se
 * desplaza por debajo de un producto fijo: medido a 375×812, pisaba
 * titulares y párrafos en todas ellas. Los envases ya salen en foto en las
 * tarjetas del ritual.
 */
export const ESTADOS_MOVIL = [
  { ancla: 'apertura', camara: [0, 0, 9.2], producto: { pos: [0, 0.9, 0], escala: 1.35, opacidad: 1 } },
  { camara: [0, 0, 9.4], producto: { pos: [0, 2.1, -0.4], escala: 0.72, opacidad: 0 } },
  { camara: [0, 0, 9.6], producto: { pos: [1.5, 2.3, -1.2], escala: 0.55, opacidad: 0 } },
  { camara: [0, 0, 9.6], producto: { pos: [1.5, 2.3, -1.2], escala: 0.55, opacidad: 0 } },
  { ancla: 'cierre', camara: [0, 0, 9.2], producto: { pos: [0, 2.05, 0], escala: 1.15, opacidad: 1 } },
]

/** Interpolación lineal. */
export const mezclar = (a, b, t) => a + (b - a) * t

/** Suavizado en los extremos: hace que la escena «se asiente» en cada estado. */
export const suavizar = (t) => t * t * (3 - 2 * t)

/**
 * Lee un valor continuo de `historia` (0…4) y devuelve el parámetro
 * interpolado entre los dos estados que lo rodean.
 *
 * `leer(ESTADOS_ESCENA, 1.4, e => e.campo)` → entre el campo del 1 y el del 2.
 */
export function leer(estados, historia, seleccionar) {
  const limite = estados.length - 1
  const posicion = Math.min(Math.max(historia, 0), limite)
  const i = Math.floor(posicion)
  if (i >= limite) return seleccionar(estados[limite])
  const t = suavizar(posicion - i)
  return mezclar(seleccionar(estados[i]), seleccionar(estados[i + 1]), t)
}

/** Igual que `leer`, pero para una terna [x, y, z]. */
export function leerVector(estados, historia, seleccionar, destino) {
  const limite = estados.length - 1
  const posicion = Math.min(Math.max(historia, 0), limite)
  const i = Math.floor(posicion)
  const a = seleccionar(estados[i])
  const b = i >= limite ? a : seleccionar(estados[i + 1])
  const t = i >= limite ? 0 : suavizar(posicion - i)
  destino[0] = mezclar(a[0], b[0], t)
  destino[1] = mezclar(a[1], b[1], t)
  destino[2] = mezclar(a[2], b[2], t)
  return destino
}

/** Mezcla dos colores hex. Para la atmósfera, que se interpola en CSS. */
export function mezclarHex(hexA, hexB, t) {
  const n = (h) => [
    parseInt(h.slice(1, 3), 16),
    parseInt(h.slice(3, 5), 16),
    parseInt(h.slice(5, 7), 16),
  ]
  const [r1, g1, b1] = n(hexA)
  const [r2, g2, b2] = n(hexB)
  const c = (a, b) => Math.round(mezclar(a, b, t)).toString(16).padStart(2, '0')
  return `#${c(r1, r2)}${c(g1, g2)}${c(b1, b2)}`
}

/** La atmósfera que corresponde a un valor continuo de `historia`. */
export function atmosferaEn(historia) {
  const limite = ATMOSFERAS.length - 1
  const posicion = Math.min(Math.max(historia, 0), limite)
  const i = Math.floor(posicion)
  if (i >= limite) return ATMOSFERAS[limite]
  const t = suavizar(posicion - i)
  const a = ATMOSFERAS[i]
  const b = ATMOSFERAS[i + 1]
  return {
    top: mezclarHex(a.top, b.top, t),
    bottom: mezclarHex(a.bottom, b.bottom, t),
    glow: mezclarHex(a.glow, b.glow, t),
  }
}

/**
 * Cuánto de «noche» tiene la escena en este punto del recorrido: 0 de día,
 * 1 en plena noche. Sube en la transición y baja al llegar al cierre, que
 * vuelve a la crema del amanecer.
 *
 * La usan las capas 3D para cambiar de paleta: una hebra durazno sobre el
 * magenta se leería como una mancha y no como aire, y sobre todo restaría
 * contraste al texto en crema que va encima.
 */
export function factorNoche(historia) {
  const sube = suavizar(Math.min(Math.max((historia - 2.2) / 0.8, 0), 1))
  const baja = suavizar(Math.min(Math.max((historia - 3.35) / 0.55, 0), 1))
  return sube * (1 - baja)
}

/**
 * Posición del producto, con una regla que `leerVector` solo no cumple:
 * **mientras es invisible, no viaja.**
 *
 * Si uno de los dos estados entre los que se interpola tiene el producto a
 * opacidad 0, la posición se queda la del otro. Así el producto se apaga
 * donde estaba y se enciende donde va a estar, en vez de cruzar la pantalla
 * mientras aparece. Medido a 1440×810: al volver al cierre desde la esquina
 * de arriba, el producto ya visible al 17 % pasaba por detrás del texto de
 * las preguntas.
 */
export function posicionProducto(estados, historia, destino, resolver = (e) => e.producto.pos) {
  const limite = estados.length - 1
  const posicion = Math.min(Math.max(historia, 0), limite)
  const i = Math.min(Math.floor(posicion), limite - 1)
  const a = estados[i]
  const b = estados[i + 1]
  const pa = resolver(a)
  const pb = resolver(b)
  if (a.producto.opacidad === 0 && b.producto.opacidad > 0) return copiar(pb, destino)
  if (b.producto.opacidad === 0 && a.producto.opacidad > 0) return copiar(pa, destino)
  const t = suavizar(Math.min(Math.max(posicion - i, 0), 1))
  destino[0] = mezclar(pa[0], pb[0], t)
  destino[1] = mezclar(pa[1], pb[1], t)
  destino[2] = mezclar(pa[2], pb[2], t)
  return destino
}

/** ¿Interviene algún estado con ancla en este punto del recorrido? */
export function usaAncla(estados, historia) {
  const limite = estados.length - 1
  const posicion = Math.min(Math.max(historia, 0), limite)
  const i = Math.min(Math.floor(posicion), limite - 1)
  return Boolean(estados[i].ancla || estados[i + 1].ancla)
}

function copiar(origen, destino) {
  destino[0] = origen[0]
  destino[1] = origen[1]
  destino[2] = origen[2]
  return destino
}
