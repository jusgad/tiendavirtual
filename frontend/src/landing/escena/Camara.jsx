import { useEffect, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { ESTADOS_ESCENA, ESTADOS_MOVIL, leerVector } from '../historia.js'

/**
 * La cámara: solo pequeños acercamientos y paneos, nunca zooms fuertes.
 *
 * Sigue el recorrido amortiguada y, en escritorio, se inclina un poco hacia
 * donde está el puntero. En móvil o con menos movimiento no hay parallax:
 * en móvil no hay puntero que seguir, y con menos movimiento justamente es
 * lo que se pidió que no pasara.
 */
export default function Camara({ historia, calidad }) {
  const { camera, size } = useThree()
  const movil = size.width <= 899
  const objetivo = useMemo(() => [0, 0, 7], [])
  const mirada = useMemo(() => new THREE.Vector3(0, 0, 0), [])

  // 35° en escritorio y 42° en móvil: en vertical hace falta más campo para
  // que el producto quepa encima del texto.
  useEffect(() => {
    camera.fov = movil ? 42 : 35
    camera.updateProjectionMatrix()
  }, [camera, movil])

  useFrame((estado, delta) => {
    const dt = Math.min(delta, 0.05)
    const estados = movil ? ESTADOS_MOVIL : ESTADOS_ESCENA
    leerVector(estados, historia.get(), (e) => e.camara, objetivo)

    let px = 0
    let py = 0
    if (calidad.puntero && !movil) {
      px = estado.pointer.x * 0.25
      py = estado.pointer.y * 0.15
    }

    camera.position.x = THREE.MathUtils.damp(camera.position.x, objetivo[0] + px, 2, dt)
    camera.position.y = THREE.MathUtils.damp(camera.position.y, objetivo[1] + py, 2, dt)
    camera.position.z = THREE.MathUtils.damp(camera.position.z, objetivo[2], 2, dt)
    camera.lookAt(mirada)
  })

  return null
}
