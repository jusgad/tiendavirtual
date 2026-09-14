// Escena del ambiente del hero.
//
// Vive en su propio módulo para que Vite la separe en un archivo aparte y la
// descargue solo cuando hace falta: Three.js pesa, y nada de esto debe frenar
// la primera pantalla.
//
// Se importan únicamente las piezas que se usan, para que el empaquetador
// pueda dejar fuera el resto de la librería.
import {
  BufferAttribute,
  BufferGeometry,
  Camera,
  Points,
  Scene,
  ShaderMaterial,
  WebGLRenderer,
} from 'three'

// Paleta del manual de marca. Los destellos usan el coral profundo para que se
// distingan sobre el crema.
const COLOR = {
  coral: '#F47A4D',
  dia: '#F56A00',
  noche: '#A70B94',
  durazno: '#F9B38F',
  coralProfundo: '#C2502A',
}

/**
 * '#RRGGBB' a componentes 0–1 tal cual, en sRGB.
 *
 * No se usa `THREE.Color` a propósito: convierte a espacio lineal, y como
 * estos shaders escriben el color directo a pantalla, los tonos saldrían
 * oscuros y distintos a los del manual.
 */
function rgb(hex) {
  const n = parseInt(hex.slice(1), 16)
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
}

/** Pseudoaleatorio con semilla: la composición es la misma en cada visita. */
function generador(semilla) {
  let s = semilla % 2147483647
  if (s <= 0) s += 2147483646
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

// Las posiciones van en coordenadas de pantalla (-1 a 1) y se escriben directo
// en `gl_Position`: no hace falta cámara ni perspectiva para una capa plana.
const VERTEX = /* glsl */ `
  attribute vec3 aColor;
  attribute float aSize;
  attribute float aSeed;
  attribute float aAlpha;

  uniform float uTime;
  uniform float uPixelRatio;
  uniform float uMaxSize;
  uniform vec2 uPointer;
  uniform float uScroll;
  uniform float uDrift;
  uniform float uRise;
  uniform float uDepth;

  varying vec3 vColor;
  varying float vAlpha;
  varying float vSeed;

  void main() {
    vec2 p = position.xy;
    float t = uTime * 0.12;

    // Deriva lenta, distinta para cada partícula.
    p.x += sin(t * (0.6 + aSeed) + aSeed * 6.2831) * uDrift;
    p.y += cos(t * (0.5 + aSeed * 0.8) + aSeed * 12.5663) * uDrift * 0.8;

    // Las motas suben y reaparecen abajo. Solo las que suben: si los halos
    // también dieran la vuelta, se verían saltar de golpe.
    if (uRise > 0.0) {
      p.y = mod(p.y + uTime * uRise + 1.3, 2.6) - 1.3;
    }

    // Parallax: cada capa responde distinto al ratón y al scroll, y eso es lo
    // que da la sensación de profundidad.
    p += uPointer * uDepth;
    p.y += uScroll * uDepth * 1.5;

    gl_Position = vec4(p, 0.0, 1.0);
    // Algunos celulares limitan el tamaño máximo de un punto.
    gl_PointSize = min(aSize * uPixelRatio, uMaxSize);

    vColor = aColor;
    vAlpha = aAlpha;
    vSeed = aSeed;
  }
`

const FRAGMENT_SUAVE = /* glsl */ `
  uniform float uSoftness;
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    float d = length(gl_PointCoord - 0.5) * 2.0;
    float a = 1.0 - smoothstep(uSoftness, 1.0, d);
    gl_FragColor = vec4(vColor, a * vAlpha);
  }
`

const FRAGMENT_DESTELLO = /* glsl */ `
  uniform float uTime;
  varying vec3 vColor;
  varying float vAlpha;
  varying float vSeed;

  void main() {
    vec2 c = (gl_PointCoord - 0.5) * 2.0;
    // Dos rayos finos que se afinan hacia la punta, más un núcleo redondo.
    float h = max(0.0, 1.0 - abs(c.x)) * max(0.0, 1.0 - abs(c.y) * 7.0);
    float v = max(0.0, 1.0 - abs(c.y)) * max(0.0, 1.0 - abs(c.x) * 7.0);
    float nucleo = max(0.0, 1.0 - length(c) * 2.6);
    float forma = clamp(max(max(h, v), nucleo), 0.0, 1.0);

    // Titileo: la mayor parte del tiempo tenue, con destellos breves.
    float pulso = 0.5 + 0.5 * sin(uTime * (0.8 + vSeed * 0.9) + vSeed * 40.0);
    float brillo = 0.25 + 0.75 * pulso * pulso * pulso;

    gl_FragColor = vec4(vColor, forma * vAlpha * brillo);
  }
`

// Dónde van los halos grandes. Se colocan a mano y no al azar: repartidos al
// azar tienden a amontonarse y dejan medio hero sin color.
const POSICIONES_HALOS = [
  [-0.85, 0.55],
  [0.9, 0.7],
  [0.78, -0.55],
  [-0.62, -0.72],
  [0.05, 0.95],
  [-0.15, -0.15],
  [0.35, 0.2],
]

/**
 * Monta el ambiente dentro de `contenedor` y devuelve la función que lo
 * desmonta. Lanza si el navegador no tiene WebGL; quien llama decide qué hacer.
 */
export function crearAmbiente(contenedor, { reducido = false } = {}) {
  const renderer = new WebGLRenderer({ alpha: true, antialias: false, powerPreference: 'low-power' })
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.75)
  renderer.setPixelRatio(pixelRatio)
  renderer.setClearColor(0x000000, 0)

  const canvas = renderer.domElement
  Object.assign(canvas.style, {
    width: '100%',
    height: '100%',
    display: 'block',
    pointerEvents: 'none',
    opacity: '0',
    transition: 'opacity 1.4s ease',
  })
  contenedor.appendChild(canvas)

  const gl = renderer.getContext()
  const tamMaximo = gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE)?.[1] ?? 64

  const escena = new Scene()
  // Los shaders ignoran la cámara, pero `render` necesita una.
  const camara = new Camera()
  const azar = generador(20260914)
  const movil = window.innerWidth < 768

  // Uniformes compartidos por las tres capas: se actualizan una vez por cuadro.
  const comunes = {
    uTime: { value: reducido ? 14 : 0 },
    uPixelRatio: { value: pixelRatio },
    uMaxSize: { value: tamMaximo },
    uPointer: { value: { x: 0, y: 0 } },
    uScroll: { value: 0 },
  }

  const capas = []
  const crearCapa = ({ cantidad, tam, alfa, colores, deriva, subida, profundidad, fragment, suavidad = 0, posiciones }) => {
    const posicion = new Float32Array(cantidad * 3)
    const color = new Float32Array(cantidad * 3)
    const talla = new Float32Array(cantidad)
    const semilla = new Float32Array(cantidad)
    const opacidad = new Float32Array(cantidad)

    for (let i = 0; i < cantidad; i++) {
      const fija = posiciones?.[i]
      posicion[i * 3] = fija ? fija[0] : azar() * 2.4 - 1.2
      posicion[i * 3 + 1] = fija ? fija[1] : azar() * 2.6 - 1.3
      const tono = posiciones ? colores[i % colores.length] : colores[Math.floor(azar() * colores.length)]
      color.set(rgb(tono), i * 3)
      talla[i] = tam[0] + azar() * (tam[1] - tam[0])
      semilla[i] = azar()
      opacidad[i] = alfa[0] + azar() * (alfa[1] - alfa[0])
    }

    const geometria = new BufferGeometry()
    geometria.setAttribute('position', new BufferAttribute(posicion, 3))
    geometria.setAttribute('aColor', new BufferAttribute(color, 3))
    geometria.setAttribute('aSize', new BufferAttribute(talla, 1))
    geometria.setAttribute('aSeed', new BufferAttribute(semilla, 1))
    geometria.setAttribute('aAlpha', new BufferAttribute(opacidad, 1))

    const material = new ShaderMaterial({
      vertexShader: VERTEX,
      fragmentShader: fragment,
      uniforms: {
        ...comunes,
        uDrift: { value: deriva },
        uRise: { value: subida },
        uDepth: { value: profundidad },
        uSoftness: { value: suavidad },
      },
      transparent: true,
      depthTest: false,
      depthWrite: false,
    })

    const puntos = new Points(geometria, material)
    puntos.frustumCulled = false
    escena.add(puntos)
    capas.push({ geometria, material })
  }

  // Halos: pocos, enormes y casi transparentes. Son los que tiñen el fondo.
  crearCapa({
    cantidad: movil ? 5 : POSICIONES_HALOS.length,
    posiciones: POSICIONES_HALOS,
    tam: movil ? [260, 420] : [380, 640],
    alfa: [0.1, 0.2],
    colores: [COLOR.dia, COLOR.noche, COLOR.coral, COLOR.durazno],
    deriva: 0.2,
    subida: 0,
    profundidad: 0.04,
    fragment: FRAGMENT_SUAVE,
  })

  // Motas: pequeñas, suben despacio.
  crearCapa({
    cantidad: movil ? 34 : 64,
    tam: [5, 15],
    alfa: [0.22, 0.5],
    colores: [COLOR.coral, COLOR.dia, COLOR.noche, COLOR.durazno],
    deriva: 0.05,
    subida: 0.012,
    profundidad: 0.09,
    fragment: FRAGMENT_SUAVE,
    suavidad: 0.35,
  })

  // Destellos de cuatro puntas.
  crearCapa({
    cantidad: movil ? 9 : 16,
    tam: [18, 34],
    alfa: [0.55, 0.9],
    colores: [COLOR.coralProfundo, COLOR.noche, COLOR.coral],
    deriva: 0.03,
    subida: 0.004,
    profundidad: 0.14,
    fragment: FRAGMENT_DESTELLO,
  })

  // ---- Bucle de dibujo ----

  const objetivo = { x: 0, y: 0 }
  let scrollObjetivo = 0
  let enPantalla = true
  let raf = 0
  let anterior = 0
  let visible = false

  const pintar = () => {
    renderer.render(escena, camara)
    if (!visible) {
      visible = true
      // Entra con un fundido para no aparecer de golpe sobre el degradado.
      requestAnimationFrame(() => {
        canvas.style.opacity = '1'
      })
    }
  }

  const cuadro = (ahora) => {
    raf = 0
    if (!enPantalla || document.hidden) return

    const dt = Math.min((ahora - anterior) / 1000, 0.05)
    anterior = ahora
    comunes.uTime.value += dt

    // Se persigue al ratón con retraso: seguirlo exacto se siente nervioso.
    const p = comunes.uPointer.value
    p.x += (objetivo.x - p.x) * 0.035
    p.y += (objetivo.y - p.y) * 0.035
    comunes.uScroll.value += (scrollObjetivo - comunes.uScroll.value) * 0.08

    pintar()
    raf = requestAnimationFrame(cuadro)
  }

  // Se detiene cuando el hero sale de pantalla o la pestaña queda oculta: no
  // tiene sentido gastar batería dibujando algo que nadie ve.
  const reanudar = () => {
    if (reducido || raf || !enPantalla || document.hidden) return
    anterior = performance.now()
    raf = requestAnimationFrame(cuadro)
  }

  const ajustar = () => {
    const { width, height } = contenedor.getBoundingClientRect()
    if (!width || !height) return
    renderer.setSize(width, height, false)
    if (reducido) pintar()
  }
  ajustar()

  const observadorTam = new ResizeObserver(ajustar)
  observadorTam.observe(contenedor)

  const observadorVista = new IntersectionObserver(([entrada]) => {
    enPantalla = entrada.isIntersecting
    reanudar()
  })
  observadorVista.observe(contenedor)

  const alMover = (e) => {
    objetivo.x = (e.clientX / window.innerWidth) * 2 - 1
    objetivo.y = -((e.clientY / window.innerHeight) * 2 - 1)
  }
  const alDesplazar = () => {
    scrollObjetivo = Math.min(window.scrollY / window.innerHeight, 1.5)
  }

  if (!reducido) {
    window.addEventListener('pointermove', alMover, { passive: true })
    window.addEventListener('scroll', alDesplazar, { passive: true })
    document.addEventListener('visibilitychange', reanudar)
    alDesplazar()
    reanudar()
  }

  return () => {
    cancelAnimationFrame(raf)
    observadorTam.disconnect()
    observadorVista.disconnect()
    window.removeEventListener('pointermove', alMover)
    window.removeEventListener('scroll', alDesplazar)
    document.removeEventListener('visibilitychange', reanudar)
    for (const { geometria, material } of capas) {
      geometria.dispose()
      material.dispose()
    }
    renderer.dispose()
    canvas.remove()
  }
}
