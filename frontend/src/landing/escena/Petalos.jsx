import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * Pétalos de flor de durazno. Pocos: seis en escritorio, tres en móvil.
 *
 * El prompt pedía pétalos rosados genéricos; los de PomAss son de flor de
 * durazno porque el durazno es el centro de la identidad. Es el único
 * elemento de la escena que dice «durazno» sin decirlo.
 *
 * Derivan con la brisa y giran despacio. No más: un exceso de flores es de
 * lo que el prompt pide huir.
 */

/** Forma de pétalo: dos curvas que se juntan en punta, curvada en z. */
function crearPetalo() {
  const forma = new THREE.Shape()
  forma.moveTo(0, 0)
  forma.bezierCurveTo(0.12, 0.05, 0.16, 0.22, 0, 0.34)
  forma.bezierCurveTo(-0.16, 0.22, -0.12, 0.05, 0, 0)
  const g = new THREE.ShapeGeometry(forma, 12)
  // Se curva: un pétalo plano parece de papel.
  const pos = g.attributes.position
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i)
    const y = pos.getY(i)
    pos.setZ(i, x * x * 1.6 - y * 0.18)
  }
  g.computeVertexNormals()
  g.center()
  return g
}

/**
 * Semiancho de la franja por la que derivan. La pantalla, a la distancia de
 * la escena, mide unas 4 unidades de semiancho en escritorio; con más, la
 * mayoría de los pétalos pasaban fuera de cuadro y no se veía ninguno.
 */
const ANCHO = 5.2

export default function Petalos({ calidad }) {
  const grupo = useRef(null)
  const n = calidad.petalos

  const { geometria, material, estados } = useMemo(() => {
    const m = new THREE.MeshPhysicalMaterial({
      color: '#FBD9C8',
      // Un pétalo real deja pasar la luz. Sin esta emisión, visto de canto
      // recibía tan poca que salía más oscuro que el fondo claro y se leía
      // como una mancha gris, no como un pétalo.
      emissive: '#FBD9C8',
      emissiveIntensity: 0.4,
      roughness: 0.6,
      sheen: 1,
      sheenColor: new THREE.Color('#FFE9E0'),
      sheenRoughness: 0.5,
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
    const e = Array.from({ length: n }, () => ({
      x: -ANCHO + Math.random() * ANCHO * 2,
      y: -2.6 + Math.random() * 5.2,
      z: -2 + Math.random() * 3.4,
      // Inclinación en x e y acotada (oscila), giro libre solo en z: así el
      // pétalo casi siempre se ve de frente o de tres cuartos, nunca de canto.
      fasesInclinacion: [Math.random() * 6.28, Math.random() * 6.28],
      giroZ: Math.random() * 6.28,
      velGiroZ: (Math.random() - 0.5) * 0.5,
      vel: 0.18 + Math.random() * 0.16,
      fase: Math.random() * 6.28,
      escala: 0.7 + Math.random() * 0.6,
    }))
    return { geometria: crearPetalo(), material: m, estados: e }
  }, [n])

  useEffect(
    () => () => {
      geometria.dispose()
      material.dispose()
    },
    [geometria, material],
  )

  useFrame((estado, delta) => {
    const dt = Math.min(delta, 0.05) * calidad.tiempo
    const t = estado.clock.elapsedTime * calidad.tiempo
    const hijos = grupo.current?.children ?? []
    estados.forEach((p, i) => {
      p.x += p.vel * dt
      p.y += Math.sin(t * 0.4 + p.fase) * 0.12 * dt
      // Al salir por la derecha vuelve a entrar por la izquierda, a otra
      // altura, para que no se note el ciclo.
      if (p.x > ANCHO) {
        p.x = -ANCHO
        p.y = -2.6 + Math.random() * 5.2
      }
      p.giroZ += p.velGiroZ * dt
      const malla = hijos[i]
      if (!malla) return
      malla.position.set(p.x, p.y, p.z)
      malla.rotation.set(
        Math.sin(t * 0.3 + p.fasesInclinacion[0]) * 0.55,
        Math.sin(t * 0.25 + p.fasesInclinacion[1]) * 0.55,
        p.giroZ,
      )
      malla.scale.setScalar(p.escala)
    })
  })

  return (
    <group ref={grupo}>
      {estados.map((_, i) => (
        <mesh key={i} geometry={geometria} material={material} />
      ))}
    </group>
  )
}
