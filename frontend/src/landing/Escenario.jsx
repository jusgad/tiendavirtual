import { Component, Suspense, lazy, useState } from 'react'
import EscenaCSS from './EscenaCSS.jsx'

/**
 * Decide qué escena se pinta detrás del contenido.
 *
 * - Hay WebGL → la escena 3D, cargada en diferido para que el texto pinte
 *   primero (Three, Fiber y drei pesan bastante más que la página).
 * - No hay WebGL, o la escena revienta en tiempo de ejecución → la escena
 *   CSS, con la misma atmósfera, velos SVG y los tubos reales.
 *
 * Nunca una pantalla en blanco: es lo único innegociable del respaldo.
 *
 * `?escena=css` en la URL fuerza el respaldo. Sirve para comprobarlo sin
 * tener que buscar un navegador sin WebGL.
 */
const Escena = lazy(() => import('./escena/Escena.jsx'))

export function soportaWebGL() {
  if (typeof window === 'undefined') return false
  if (new URLSearchParams(window.location.search).get('escena') === 'css') return false
  try {
    const lienzo = document.createElement('canvas')
    return Boolean(
      lienzo.getContext('webgl2') || lienzo.getContext('webgl') || lienzo.getContext('experimental-webgl'),
    )
  } catch {
    return false
  }
}

/** Atrapa un fallo de la escena 3D y pasa al respaldo en vez de romper la página. */
class LimiteDeError extends Component {
  constructor(props) {
    super(props)
    this.state = { fallo: false }
  }

  static getDerivedStateFromError() {
    return { fallo: true }
  }

  componentDidCatch(error) {
    // Al log de la consola, no a la cara de la clienta.
    console.warn('La escena 3D falló; se muestra la versión CSS.', error)
    this.props.alFallar?.()
  }

  render() {
    return this.state.fallo ? null : this.props.children
  }
}

export default function Escenario({ historia, rafaga, raiz }) {
  const [usarWebGL] = useState(soportaWebGL)
  const [fallo, setFallo] = useState(false)

  if (!usarWebGL || fallo) return <EscenaCSS historia={historia} />

  return (
    <LimiteDeError alFallar={() => setFallo(true)}>
      {/* Mientras llega el código de la escena no se pinta nada: detrás ya
          está la atmósfera, que es el mismo degradado. */}
      <Suspense fallback={null}>
        <Escena historia={historia} rafaga={rafaga} raiz={raiz} />
      </Suspense>
    </LimiteDeError>
  )
}
