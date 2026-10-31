import { Suspense, useEffect, useState } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { PerformanceMonitor } from '@react-three/drei'
import * as THREE from 'three'
import { bajarCalidad, detectarCalidad } from './calidad.js'
import Camara from './Camara.jsx'
import CampoDeViento from './CampoDeViento.jsx'
import Luces from './Luces.jsx'
import ParticulasCorriente from './ParticulasCorriente.jsx'
import ParticulasVolumen from './ParticulasVolumen.jsx'
import Petalos from './Petalos.jsx'
import Producto from './Producto.jsx'
import Velos from './Velos.jsx'

/**
 * La escena 3D entera: un canvas fijo a pantalla completa, detrás del
 * contenido y delante de la atmósfera CSS.
 *
 * Se carga en diferido (`Escenario.jsx`), así que Three, Fiber y drei no
 * bloquean el primer pintado del texto. Entra con un fundido de 1,8 s
 * cuando el primer fotograma está listo, no antes: un canvas vacío que
 * aparece de golpe se lee como un fallo.
 *
 * Capas, de atrás adelante: campo de viento, velos, partículas en volumen,
 * partículas sobre corrientes, pétalos y los tubos.
 */
export default function Escena({ historia, rafaga, raiz }) {
  const [calidad, setCalidad] = useState(detectarCalidad)
  const [lista, setLista] = useState(false)

  return (
    <div
      className="pm-canvas"
      aria-hidden="true"
      style={{ opacity: lista ? 1 : 0, transition: 'opacity 1.8s cubic-bezier(0.22, 1, 0.36, 1)' }}
    >
      <Canvas
        // El HTML va encima del canvas, así que los eventos se escuchan en
        // la raíz de la página: si no, el puntero nunca llegaría a la escena.
        eventSource={raiz?.current ?? undefined}
        eventPrefix="client"
        dpr={calidad.dpr}
        gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}
        camera={{ fov: calidad.movil ? 42 : 35, position: [0, 0.05, 7], near: 0.1, far: 60 }}
        onCreated={({ gl }) => {
          // `NeutralToneMapping` respeta los hex de la paleta; el ACES por
          // defecto los desatura y el naranja Día sale marrón.
          gl.toneMapping = THREE.NeutralToneMapping
          gl.setClearColor(0x000000, 0)
          setLista(true)
        }}
      >
        {/* Si el equipo no llega a los fotogramas, se baja a la calidad de
            móvil: menos cintas, menos partículas y DPR 1. */}
        <PerformanceMonitor onDecline={() => setCalidad((c) => (c.nivel === 'baja' && c.dpr[1] === 1 ? c : bajarCalidad(c)))} />
        <Camara historia={historia} calidad={calidad} />
        <Luces historia={historia} />
        <CampoDeViento historia={historia} rafaga={rafaga} calidad={calidad} />
        <Velos historia={historia} rafaga={rafaga} calidad={calidad} />
        <ParticulasVolumen historia={historia} rafaga={rafaga} calidad={calidad} />
        <ParticulasCorriente historia={historia} rafaga={rafaga} calidad={calidad} />
        <Petalos calidad={calidad} />
        <Suspense fallback={null}>
          <Producto historia={historia} calidad={calidad} />
        </Suspense>
        {import.meta.env.DEV && <Diagnostico />}
      </Canvas>
    </div>
  )
}

/**
 * Solo en desarrollo: deja en `window.__pomassEscena` una forma de forzar
 * fotogramas y leer qué se está pintando.
 *
 * Existe porque hay entornos —una pestaña en segundo plano, un panel de
 * vista previa oculto— donde el navegador no da fotogramas y la escena no
 * corre sola. Con esto se puede comprobar igual que los shaders compilan y
 * que todo está donde debe.
 */
function Diagnostico() {
  const { advance, gl, scene, camera } = useThree()
  useEffect(() => {
    window.__pomassEscena = {
      escena: scene,
      camara: camera,
      avanzar(pasos = 1) {
        const ahora = performance.now()
        for (let i = 0; i < pasos; i++) advance(ahora + i * 16, true)
        return this.info()
      },
      info() {
        const objetos = []
        scene.traverse((o) => {
          if (o.isMesh || o.isPoints) objetos.push(o.type)
        })
        return {
          llamadas: gl.info.render.calls,
          triangulos: gl.info.render.triangles,
          puntos: gl.info.render.points,
          programas: gl.info.programs?.length ?? null,
          objetos: objetos.length,
          camara: camera.position.toArray().map((v) => +v.toFixed(2)),
        }
      },
      /** Dónde cae en pantalla un punto de la escena, en px. */
      proyectar(x, y, z) {
        const v = new THREE.Vector3(x, y, z).project(camera)
        const r = gl.domElement.getBoundingClientRect()
        return [((v.x + 1) / 2) * r.width, ((1 - v.y) / 2) * r.height]
      },
    }
    return () => {
      delete window.__pomassEscena
    }
  }, [advance, gl, scene, camera])
  return null
}
