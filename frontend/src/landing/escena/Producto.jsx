import { useCallback, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { CATALOGO } from '../../site.js'
import { centro, rectAncla } from '../anclas.js'
import { ESTADOS_ESCENA, ESTADOS_MOVIL, leer, posicionProducto, usaAncla } from '../historia.js'
import { ALTO_CUERPO, ALTO_SELLADO, ALTO_TAPA, ALTO_TOTAL } from './geometriaTubo.js'
import Tubo from './Tubo.jsx'

/**
 * El producto: todos los tubos del catálogo, juntos.
 *
 * Se construye recorriendo `CATALOGO`, así que un producto nuevo aparece en
 * la escena con solo añadirlo en `site.js`. Los tubos se reparten en un arco
 * suave, el del centro delante y los de los extremos un poco atrás.
 *
 * Cada producto tiene su `momento` en el recorrido. Cuando la página llega a
 * él, ese tubo da un paso al frente: Día en la mañana, Noche en la noche. En
 * la apertura y en el cierre están todos iguales, que es como se compran.
 *
 * Dos grupos, como pide el prompt: el exterior viaja entre estados y el
 * interior flota. Nunca gira sobre sí mismo como en una demo: la etiqueta
 * mira siempre a la cámara.
 */

/** Alto de un tubo en la escena. El prompt normaliza el producto a 1,2. */
const ALTO_ESCENA = 1.25
const ESCALA_TUBO = ALTO_ESCENA / ALTO_TOTAL
/** Centro vertical del tubo respecto a su origen (la unión con la tapa). */
const CENTRO_TUBO = (ALTO_CUERPO + ALTO_SELLADO - ALTO_TAPA) / 2
const SEPARACION = 0.58

function texturaSombra() {
  const lienzo = document.createElement('canvas')
  lienzo.width = lienzo.height = 128
  const ctx = lienzo.getContext('2d')
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64)
  g.addColorStop(0, 'rgba(52,53,83,0.35)')
  g.addColorStop(0.55, 'rgba(52,53,83,0.12)')
  g.addColorStop(1, 'rgba(52,53,83,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 128, 128)
  return new THREE.CanvasTexture(lienzo)
}

export default function Producto({ historia, calidad }) {
  const exterior = useRef(null)
  const interior = useRef(null)
  const tubos = useRef([])
  const materiales = useRef([])
  const opacidadAplicada = useRef(1)
  const sombra = useRef(null)
  const { camera, size } = useThree()

  const auxiliares = useMemo(
    () => ({
      objetivo: [0, 0, 0],
      mundo: new THREE.Vector3(),
      rayo: new THREE.Vector3(),
      anclados: new Map(),
      sombra: texturaSombra(),
    }),
    [],
  )

  // Un estado anclado pone el producto donde la página le dejó sitio: el
  // centro del hueco, llevado a la profundidad del estado por el rayo que
  // sale de la cámara. Sin hueco a la vista, la coordenada fija del estado.
  const resolver = useCallback(
    (e) => {
      const r = e.ancla ? rectAncla(e.ancla) : null
      if (!r) return e.producto.pos
      const [cx, cy] = centro(r)
      const { rayo, anclados } = auxiliares
      rayo.set((cx / size.width) * 2 - 1, -(cy / size.height) * 2 + 1, 0.5).unproject(camera)
      rayo.sub(camera.position).normalize()
      const z = e.producto.pos[2]
      const t = (z - camera.position.z) / rayo.z
      if (!anclados.has(e)) anclados.set(e, [0, 0, 0])
      const destino = anclados.get(e)
      destino[0] = camera.position.x + rayo.x * t
      destino[1] = camera.position.y + rayo.y * t
      destino[2] = z
      return destino
    },
    [auxiliares, camera, size],
  )

  const registrar = useCallback((lista) => {
    for (const m of lista) if (!materiales.current.includes(m)) materiales.current.push(m)
  }, [])

  useFrame((estado, delta) => {
    const ext = exterior.current
    const int = interior.current
    if (!ext || !int) return
    const h = historia.get()
    const dt = Math.min(delta, 0.05)
    const movil = size.width <= 899
    const estados = movil ? ESTADOS_MOVIL : ESTADOS_ESCENA

    // Viaje entre estados, amortiguado: la escena se posa, no salta.
    posicionProducto(estados, h, auxiliares.objetivo, resolver)
    const escala = leer(estados, h, (e) => e.producto.escala)
    const opacidad = leer(estados, h, (e) => e.producto.opacidad)
    const amortiguar = (a, b) => THREE.MathUtils.damp(a, b, 2.2, dt)
    if (opacidad < 0.01 || usaAncla(estados, h)) {
      // Invisible, se coloca de golpe: amortiguado, el deslizamiento se vería
      // en cuanto empezara a aparecer. Anclado, también: el hueco se mueve
      // con el scroll y el producto tiene que ir pegado a él, no detrás.
      ext.position.fromArray(auxiliares.objetivo)
      ext.scale.setScalar(escala)
    } else {
      ext.position.set(
        amortiguar(ext.position.x, auxiliares.objetivo[0]),
        amortiguar(ext.position.y, auxiliares.objetivo[1]),
        amortiguar(ext.position.z, auxiliares.objetivo[2]),
      )
      ext.scale.setScalar(amortiguar(ext.scale.x, escala))
    }

    // Flotación casi imperceptible e inclinación leve.
    const t = estado.clock.elapsedTime * calidad.tiempo
    int.position.y = Math.sin(t * 0.8) * 0.05
    int.rotation.z = Math.sin(t * 0.5) * 0.03
    int.rotation.x = Math.sin(t * 0.4) * 0.02

    const total = CATALOGO.length
    tubos.current.forEach((tubo, i) => {
      if (!tubo) return
      const producto = CATALOGO[i]
      const lugar = i - (total - 1) / 2
      // Paso al frente cuando el recorrido llega al momento de este producto.
      const peso = Math.max(0, 1 - Math.abs(h - producto.momento) * 1.1)
      tubo.position.x = amortiguar(tubo.position.x, lugar * SEPARACION)
      tubo.position.z = amortiguar(tubo.position.z, -Math.abs(lugar) * 0.25 + peso * 0.35)
      tubo.position.y = -CENTRO_TUBO * ESCALA_TUBO
      tubo.scale.setScalar(ESCALA_TUBO * (1 + 0.08 * peso))
      // La etiqueta mira a la cámara, con el leve escorzo que pide el prompt.
      tubo.getWorldPosition(auxiliares.mundo)
      tubo.rotation.y =
        Math.atan2(camera.position.x - auxiliares.mundo.x, camera.position.z - auxiliares.mundo.z) -
        0.28 +
        lugar * 0.1
      tubo.rotation.z = -lugar * 0.06
    })

    if (sombra.current) {
      sombra.current.material.opacity = opacidad
      sombra.current.position.y = -(ALTO_TAPA + CENTRO_TUBO) * ESCALA_TUBO - 0.02
    }

    // Del todo transparente no se dibuja: son seis mallas con material
    // físico, y pintarlas invisibles es gastar la GPU en nada.
    ext.visible = opacidad > 0.01

    // El desvanecido solo recorre los materiales cuando el valor cambia.
    // Por encima de 0,995 se fija en 1 y el tubo vuelve al pase opaco: un
    // objeto «transparente» al 100 % se ordena peor y pierde sombreado.
    const destino = opacidad > 0.995 ? 1 : opacidad
    if (Math.abs(destino - opacidadAplicada.current) > 0.002) {
      const transparente = destino < 1
      for (const m of materiales.current) {
        if (m.transparent !== transparente) {
          m.transparent = transparente
          m.needsUpdate = true
        }
        m.opacity = destino
      }
      opacidadAplicada.current = destino
    }
  })

  return (
    <group ref={exterior} position={[0.3, 0, 0]}>
      <group ref={interior}>
        {CATALOGO.map((producto, i) => (
          <Tubo
            key={producto.id}
            producto={producto}
            alRegistrar={registrar}
            ref={(el) => {
              tubos.current[i] = el
            }}
          />
        ))}
      </group>
      {/* Sombra ambiental: un degradado bajo los tubos, sin luces que la
          proyecten. Una sombra real costaría un pase más y aquí no aporta. */}
      <mesh ref={sombra} rotation={[-Math.PI / 2, 0, 0]} renderOrder={1}>
        <planeGeometry args={[CATALOGO.length * 0.7 + 0.6, 0.9]} />
        <meshBasicMaterial map={auxiliares.sombra} transparent depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  )
}
