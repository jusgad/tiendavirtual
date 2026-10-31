import { useEffect, useRef } from 'react'
import { CATALOGO } from '../site.js'
import { centro, rectAncla } from './anclas.js'
import { ESTADOS_ESCENA, ESTADOS_MOVIL, factorNoche, leer, leerVector, posicionProducto } from './historia.js'

/**
 * La escena sin WebGL.
 *
 * Mismo degradado de atmósfera (lo pone `Atmosfera`, debajo), cuatro velos
 * SVG que derivan despacio y los tubos del catálogo. Los tubos son las
 * fotos reales del producto, no un envase dibujado en CSS: el prompt
 * proponía uno, pero teniendo las fotos, dibujar otro sería inventar el
 * packaging.
 *
 * Los tubos siguen los mismos estados que la escena 3D. Su posición sale de
 * proyectar las coordenadas de la escena con la misma cámara —35° o 42° de
 * campo, a la distancia de cada estado—, así que el respaldo y la escena
 * colocan el producto en el mismo sitio de la pantalla.
 */

/** Alto y separación de los tubos, en unidades de escena. Igual que en 3D. */
const ALTO_TUBO = 1.25
const SEPARACION = 0.58

const VELOS = [
  { d: 'M-200 520 C 200 380, 520 640, 900 470 S 1500 300, 1900 430', ancho: 120, dur: 31, dia: '#FFD0A8', noche: '#C15BB0' },
  { d: 'M-200 300 C 260 240, 600 420, 960 300 S 1520 180, 1900 260', ancho: 70, dur: 23, dia: '#F9A27C', noche: '#E07FCE' },
  { d: 'M-200 760 C 300 680, 700 860, 1100 720 S 1600 640, 1900 700', ancho: 90, dur: 27, dia: '#FFC9A3', noche: '#B04FA8' },
  { d: 'M-200 140 C 340 90, 760 220, 1180 130 S 1640 80, 1900 120', ancho: 50, dur: 19, dia: '#FFF1E2', noche: '#F3C3EA' },
]

export default function EscenaCSS({ historia }) {
  const capa = useRef(null)

  useEffect(() => {
    const el = capa.current
    if (!el) return undefined
    const objetivo = [0, 0, 0]
    const camara = [0, 0, 0]

    const colocar = (h) => {
      const movil = window.innerWidth <= 899
      const estados = movil ? ESTADOS_MOVIL : ESTADOS_ESCENA
      leerVector(estados, h, (e) => e.camara, camara)
      const escala = leer(estados, h, (e) => e.producto.escala)
      const opacidad = leer(estados, h, (e) => e.producto.opacidad)

      // Cámara estenopeica, la misma que usa Three: foco en píxeles a
      // partir del campo vertical y del alto de la ventana.
      const fov = ((movil ? 42 : 35) * Math.PI) / 180
      const foco = window.innerHeight / 2 / Math.tan(fov / 2)

      // Un estado anclado va al centro del hueco que le deja la página: la
      // proyección de abajo, al revés.
      posicionProducto(estados, h, objetivo, (e) => {
        const r = e.ancla ? rectAncla(e.ancla) : null
        if (!r) return e.producto.pos
        const [cx, cy] = centro(r)
        const z = e.producto.pos[2]
        const distancia = Math.max(camara[2] - z, 0.5)
        return [
          camara[0] + ((cx - window.innerWidth / 2) * distancia) / foco,
          camara[1] - ((cy - window.innerHeight / 2) * distancia) / foco,
          z,
        ]
      })
      const total = CATALOGO.length

      el.querySelectorAll('[data-tubo]').forEach((img, i) => {
        const lugar = i - (total - 1) / 2
        const x = objetivo[0] + lugar * SEPARACION * escala
        const z = objetivo[2] - Math.abs(lugar) * 0.25 * escala
        const distancia = Math.max(camara[2] - z, 0.5)
        const px = window.innerWidth / 2 + ((x - camara[0]) * foco) / distancia
        const py = window.innerHeight / 2 - ((objetivo[1] - camara[1]) * foco) / distancia
        const alto = (ALTO_TUBO * escala * foco) / distancia
        img.style.setProperty('--x', `${px}px`)
        img.style.setProperty('--y', `${py}px`)
        img.style.setProperty('--alto', `${alto}px`)
        img.style.setProperty('--giro', `${-lugar * 3.4}deg`)
        img.style.opacity = String(opacidad)
      })

      el.style.setProperty('--noche', String(factorNoche(h)))
    }

    colocar(historia.get())
    const quitar = historia.on('change', colocar)
    // Con scroll pero sin cambio de estado (las mesetas), el hueco anclado
    // se mueve igual: hay que seguirlo.
    const recolocar = () => colocar(historia.get())
    window.addEventListener('resize', recolocar)
    window.addEventListener('scroll', recolocar, { passive: true })
    return () => {
      quitar()
      window.removeEventListener('resize', recolocar)
      window.removeEventListener('scroll', recolocar)
    }
  }, [historia])

  return (
    <div ref={capa} className="pm-escena-css" aria-hidden="true">
      <svg className="pm-velos-css" viewBox="0 0 1700 900" preserveAspectRatio="xMidYMid slice">
        <defs>
          <filter id="pm-desenfoque" x="-20%" y="-50%" width="140%" height="200%">
            <feGaussianBlur stdDeviation="14" />
          </filter>
          {VELOS.map((v, i) => {
            // El color se mezcla aquí, en el degradado, y no en el `path`: un
            // degradado de `<defs>` hereda las variables CSS de sus propios
            // ancestros, no del trazo que lo usa. `--noche` lo escribe el
            // efecto de arriba en el contenedor.
            const color = `color-mix(in srgb, ${v.noche} calc(var(--noche, 0) * 100%), ${v.dia})`
            return (
              <linearGradient key={i} id={`pm-velo-${i}`} x1="0" x2="1" y1="0" y2="0">
                <stop offset="0" style={{ stopColor: color, stopOpacity: 0 }} />
                <stop offset="0.25" style={{ stopColor: color, stopOpacity: 0.55 }} />
                <stop offset="0.75" style={{ stopColor: color, stopOpacity: 0.55 }} />
                <stop offset="1" style={{ stopColor: color, stopOpacity: 0 }} />
              </linearGradient>
            )
          })}
        </defs>
        {VELOS.map((v, i) => (
          <path
            key={i}
            d={v.d}
            className="pm-velo-css"
            stroke={`url(#pm-velo-${i})`}
            strokeWidth={v.ancho}
            strokeLinecap="round"
            fill="none"
            filter="url(#pm-desenfoque)"
            style={{ animationDuration: `${v.dur}s`, animationDelay: `${-i * 4}s` }}
          />
        ))}
      </svg>

      {CATALOGO.map((p) => (
        <img
          key={p.id}
          data-tubo
          src={p.envase.imagen}
          alt=""
          width="400"
          height="600"
          draggable="false"
          className="pm-tubo-css"
        />
      ))}
    </div>
  )
}
