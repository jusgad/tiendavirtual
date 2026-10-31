import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Environment, Lightformer } from '@react-three/drei'
import * as THREE from 'three'
import { factorNoche } from '../historia.js'

/**
 * Luces de la escena. Solo las ven los tubos y los pétalos: el campo, las
 * cintas y las partículas se iluminan solas en su shader.
 *
 * Cálida desde arriba a la izquierda, contraluz desde atrás a la derecha y
 * un relleno suave desde abajo. De día el contraluz es coral; de noche se
 * vuelve magenta y la principal baja, para que el tubo se lea como algo que
 * está en la misma habitación que el fondo y no como un recorte pegado.
 *
 * El entorno sale de `Lightformer` locales y se pinta una sola vez: no se
 * descarga ningún HDR.
 */
const CORAL = new THREE.Color('#F7A07A')
const MAGENTA = new THREE.Color('#E07FCE')

export default function Luces({ historia }) {
  const principal = useRef(null)
  const contraluz = useRef(null)
  const ambiente = useRef(null)

  useFrame(() => {
    const noche = factorNoche(historia.get())
    if (principal.current) principal.current.intensity = 1.6 - noche * 0.5
    if (contraluz.current) {
      contraluz.current.color.copy(CORAL).lerp(MAGENTA, noche)
      contraluz.current.intensity = 1.1 + noche * 0.4
    }
    if (ambiente.current) ambiente.current.intensity = 0.55 - noche * 0.15
  })

  return (
    <>
      <ambientLight ref={ambiente} color="#FFF3E8" intensity={0.55} />
      <hemisphereLight args={['#FFF7F1', '#FFD9C8', 0.6]} />
      <directionalLight ref={principal} position={[-3, 4, 5]} color="#FFE8D8" intensity={1.6} />
      <directionalLight ref={contraluz} position={[4, 2, -4]} color="#F7A07A" intensity={1.1} />
      <directionalLight position={[0, -3, 3]} color="#FFF7EF" intensity={0.35} />
      <Environment resolution={64} frames={1}>
        <Lightformer form="rect" intensity={2.2} color="#FFF1E6" position={[-3, 3, 4]} scale={[4, 2, 1]} />
        <Lightformer form="rect" intensity={1.2} color="#FFD0A8" position={[4, 1, -3]} scale={[3, 3, 1]} />
        <Lightformer form="circle" intensity={0.8} color="#FFFFFF" position={[0, 5, 0]} scale={2} />
      </Environment>
    </>
  )
}
