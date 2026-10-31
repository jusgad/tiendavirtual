import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { ESTADOS_ESCENA, factorNoche, leer } from '../historia.js'
import { crearCurvas, muestrear, puntoEn } from './curvas.js'

/**
 * Partículas que viajan sobre las corrientes: el aroma que arrastran los
 * velos.
 *
 * Nacen sobre las curvas y avanzan en su dirección; una de cada cuatro se
 * suelta y sube libre. Aparecen y se apagan a lo largo del recorrido, así
 * que nunca se ve dónde empieza ni dónde acaba una corriente.
 *
 * Aquí el movimiento sí va en la CPU: seguir una curva en el shader exigiría
 * mandar las curvas como texturas, y con unos cientos de puntos y curvas ya
 * muestreadas, interpolar en JavaScript cuesta menos que esa complicación.
 */

const MUESTRAS = 128

const VERTEX = /* glsl */ `
attribute float aAlfa;
attribute float aTamano;
uniform float uEscalaPunto;
varying float vAlfa;
void main() {
  vAlfa = aAlfa;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = aTamano * uEscalaPunto / max(-mv.z, 0.5);
  gl_Position = projectionMatrix * mv;
}
`

const FRAGMENT = /* glsl */ `
precision highp float;
uniform vec3 uColor;
uniform vec3 uColorNoche;
uniform float uNoche;
uniform float uOpacidad;
varying float vAlfa;
void main() {
  float d = length(gl_PointCoord - 0.5) * 2.0;
  if (d > 1.0) discard;
  float forma = smoothstep(1.0, 0.0, d);
  gl_FragColor = vec4(mix(uColor, uColorNoche, uNoche), forma * vAlfa * uOpacidad);
  #include <colorspace_fragment>
}
`

export default function ParticulasCorriente({ historia, rafaga, calidad }) {
  const grupo = useRef(null)
  const { size, gl } = useThree()
  const movil = size.width <= 899
  const n = calidad.particulasCorriente

  const datos = useMemo(() => {
    const curvas = crearCurvas(calidad.velos).map((t) => muestrear(t.curva, MUESTRAS))
    const particulas = Array.from({ length: n }, () => ({
      curva: Math.floor(Math.random() * curvas.length),
      inicio: Math.random(),
      velocidad: 0.018 + Math.random() * 0.03,
      libre: Math.random() < 0.25,
      lateral: [(Math.random() - 0.5) * 0.35, (Math.random() - 0.5) * 0.35, (Math.random() - 0.5) * 0.35],
    }))

    const posiciones = new Float32Array(n * 3)
    const alfas = new Float32Array(n)
    const tamanos = new Float32Array(n).map(() => 1.5 + Math.random() * 3)
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(posiciones, 3).setUsage(THREE.DynamicDrawUsage))
    g.setAttribute('aAlfa', new THREE.BufferAttribute(alfas, 1).setUsage(THREE.DynamicDrawUsage))
    g.setAttribute('aTamano', new THREE.BufferAttribute(tamanos, 1))

    const m = new THREE.ShaderMaterial({
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      uniforms: {
        uEscalaPunto: { value: 1 },
        uColor: { value: new THREE.Color('#FFF1E2') },
        uColorNoche: { value: new THREE.Color('#F8D0EE') },
        uNoche: { value: 0 },
        uOpacidad: { value: 1 },
      },
      transparent: true,
      depthWrite: false,
    })

    return { curvas, particulas, geometria: g, material: m, tiempo: { valor: 0 }, punto: [0, 0, 0] }
  }, [calidad.velos, n])

  useEffect(
    () => () => {
      datos.geometria.dispose()
      datos.material.dispose()
    },
    [datos],
  )

  useFrame((_, delta) => {
    const h = historia.get()
    const r = calidad.rafaga ? Math.abs(rafaga.get()) : 0
    const velocidad = leer(ESTADOS_ESCENA, h, (e) => e.particulasCorriente.velocidad)
    const expansion = leer(ESTADOS_ESCENA, h, (e) => e.velos.expansion)
    datos.tiempo.valor += Math.min(delta, 0.05) * calidad.tiempo * velocidad * (1 + r * 2)
    const t = datos.tiempo.valor

    const pos = datos.geometria.attributes.position.array
    const alf = datos.geometria.attributes.aAlfa.array
    const p = datos.punto

    for (let i = 0; i < datos.particulas.length; i++) {
      const q = datos.particulas[i]
      const u = (q.inicio + t * q.velocidad) % 1
      puntoEn(datos.curvas[q.curva], u, p)

      let x = (p[0] + q.lateral[0]) * expansion
      let y = p[1] + q.lateral[1]
      const z = p[2] + q.lateral[2]
      let vida = Math.sin(Math.PI * u)

      if (q.libre) {
        // Las sueltas se despegan de la corriente y suben.
        y += u * 2.4
        x += Math.sin(u * 6 + i) * 0.2
        vida *= 1 - u * 0.6
      }

      pos[i * 3] = x
      pos[i * 3 + 1] = y
      pos[i * 3 + 2] = z
      alf[i] = vida
    }
    datos.geometria.attributes.position.needsUpdate = true
    datos.geometria.attributes.aAlfa.needsUpdate = true

    const u = datos.material.uniforms
    u.uNoche.value = factorNoche(h)
    u.uOpacidad.value = leer(ESTADOS_ESCENA, h, (e) => e.particulasCorriente.opacidad)
    u.uEscalaPunto.value = gl.getPixelRatio() * (size.height / 900) * 6

    if (grupo.current) {
      grupo.current.scale.set(movil ? 0.5 : 1, movil ? 0.7 : 1, movil ? 0.7 : 1)
      grupo.current.position.y = movil ? 0.7 : 0
    }
  })

  return (
    <group ref={grupo}>
      <points geometry={datos.geometria} material={datos.material} frustumCulled={false} />
    </group>
  )
}
