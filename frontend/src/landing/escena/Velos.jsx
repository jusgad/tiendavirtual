import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { ESTADOS_ESCENA, factorNoche, leer } from '../historia.js'
import { crearCurvas } from './curvas.js'

/**
 * Velos de brisa: cintas 3D barridas a lo largo de curvas.
 *
 * Cintas y no tubos: una superficie fina que se tuerce sobre sí misma se
 * lee como tela al viento, y un tubo se lee como una manguera.
 *
 * Cada cinta se afina en las puntas, se tuerce, ondula con dos ondas
 * viajeras y tiene bordes luminosos, reflejo de Fresnel, un brillo que se
 * desliza y destellos que viajan por ella. Lo que no tiene es luz de
 * escena: el shader se ilumina solo, porque una cinta semitransparente con
 * sombreado real se ensucia en los pliegues.
 */

/** Construye la superficie de una cinta a lo largo de una curva. */
export function crearCinta(curva, { segmentos, ancho, giro, segmentosAncho = 10 }) {
  const marcos = curva.computeFrenetFrames(segmentos, false)
  const columnas = segmentosAncho + 1
  const total = (segmentos + 1) * columnas
  const posiciones = new Float32Array(total * 3)
  const normales = new Float32Array(total * 3)
  const uvs = new Float32Array(total * 2)

  const p = new THREE.Vector3()
  const dir = new THREE.Vector3()
  const nor = new THREE.Vector3()

  for (let i = 0; i <= segmentos; i++) {
    const u = i / segmentos
    curva.getPointAt(u, p)
    const N = marcos.normals[i]
    const B = marcos.binormals[i]
    const T = marcos.tangents[i]
    // Se tuerce a lo largo del recorrido…
    const angulo = giro * Math.PI * u
    dir.copy(N).multiplyScalar(Math.cos(angulo)).addScaledVector(B, Math.sin(angulo))
    nor.crossVectors(T, dir).normalize()
    // …y se afina en las puntas, sin llegar a cero.
    const w = ancho * (0.3 + 0.7 * Math.sin(Math.PI * u))

    for (let j = 0; j < columnas; j++) {
      const v = j / segmentosAncho
      const k = i * columnas + j
      posiciones[k * 3] = p.x + dir.x * (v - 0.5) * w
      posiciones[k * 3 + 1] = p.y + dir.y * (v - 0.5) * w
      posiciones[k * 3 + 2] = p.z + dir.z * (v - 0.5) * w
      normales[k * 3] = nor.x
      normales[k * 3 + 1] = nor.y
      normales[k * 3 + 2] = nor.z
      uvs[k * 2] = u
      uvs[k * 2 + 1] = v
    }
  }

  const indices = []
  for (let i = 0; i < segmentos; i++) {
    for (let j = 0; j < segmentosAncho; j++) {
      const a = i * columnas + j
      const b = a + columnas
      indices.push(a, b, a + 1, b, b + 1, a + 1)
    }
  }

  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(posiciones, 3))
  g.setAttribute('normal', new THREE.BufferAttribute(normales, 3))
  g.setAttribute('uv', new THREE.BufferAttribute(uvs, 2))
  g.setIndex(indices)
  return g
}

const VERTEX = /* glsl */ `
uniform float uTiempo;
uniform float uAmplitud;
uniform float uExpansion;
uniform vec2  uPuntero;
uniform float uFuerzaPuntero;

varying vec2 vUv;
varying vec3 vNormalV;
varying vec3 vVista;

void main() {
  vUv = uv;
  vec3 p = position;
  float u = uv.x;
  float v = uv.y;

  // Dos ondas viajeras sobre la normal de la superficie.
  float onda = sin(u * 9.0 - uTiempo * 0.9 + v * 1.8) * 0.6 + sin(u * 3.7 + uTiempo * 0.53) * 0.4;
  p += normal * onda * 0.22 * uAmplitud;

  // La corriente entera respira en vertical.
  p.y += sin(uTiempo * 0.35 + u * 2.0) * 0.06;

  // Se abre hacia los bordes según el estado.
  p.x *= uExpansion;

  // El cursor empuja.
  vec2 d = p.xy - uPuntero;
  p.xy += normalize(d + 1e-4) * exp(-dot(d, d) * 0.8) * uFuerzaPuntero * 0.35;

  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  vNormalV = normalize(normalMatrix * normal);
  vVista = normalize(-mv.xyz);
  gl_Position = projectionMatrix * mv;
}
`

const FRAGMENT = /* glsl */ `
precision highp float;
uniform vec3  uColorDia;
uniform vec3  uColorNoche;
uniform vec3  uClaroDia;
uniform vec3  uClaroNoche;
uniform float uNoche;
uniform float uOpacidad;
uniform float uTiempo;

varying vec2 vUv;
varying vec3 vNormalV;
varying vec3 vVista;

void main() {
  float u = vUv.x;
  float v = vUv.y;

  // Se disuelve en las puntas y en los bordes.
  float puntas = smoothstep(0.0, 0.14, u) * smoothstep(1.0, 0.86, u);
  float centro = 1.0 - abs(v * 2.0 - 1.0);
  float bordes = smoothstep(0.0, 0.1, centro);

  // Bordes luminosos, justo antes de disolverse.
  float filo = smoothstep(0.55, 0.0, centro) * bordes;

  // Fresnel: la cinta brilla más cuando se ve de canto.
  float fresnel = pow(1.0 - abs(dot(normalize(vNormalV), normalize(vVista))), 2.0);

  // Un brillo que se desliza a lo largo, despacio.
  float desliza = smoothstep(0.86, 1.0, sin(u * 3.0 - uTiempo * 0.6) * 0.5 + 0.5);

  // Destellos que viajan por la corriente.
  float destellos = smoothstep(0.72, 1.0, sin(u * 16.0 - uTiempo * 2.2 + v * 2.5));

  vec3 base  = mix(uColorDia, uColorNoche, uNoche);
  vec3 claro = mix(uClaroDia, uClaroNoche, uNoche);
  float luz = clamp(filo * 0.7 + fresnel * 0.4 + desliza * 0.3 + destellos * 0.5, 0.0, 1.0);
  vec3 color = mix(base, claro, luz);

  float alfa = (0.16 + filo * 0.35 + fresnel * 0.25 + destellos * 0.22) * puntas * bordes * uOpacidad;
  gl_FragColor = vec4(color, alfa);
  #include <colorspace_fragment>
}
`

export default function Velos({ historia, rafaga, calidad }) {
  const grupo = useRef(null)
  const { size, viewport } = useThree()
  const movil = size.width <= 899

  const cintas = useMemo(() => {
    return crearCurvas(calidad.velos).map((t, i) => {
      const material = new THREE.ShaderMaterial({
        vertexShader: VERTEX,
        fragmentShader: FRAGMENT,
        uniforms: {
          uTiempo: { value: 0 },
          uAmplitud: { value: 1 },
          uExpansion: { value: 1 },
          uPuntero: { value: new THREE.Vector2(99, 99) },
          uFuerzaPuntero: { value: 0 },
          uColorDia: { value: new THREE.Color(t.dia) },
          uColorNoche: { value: new THREE.Color(t.noche) },
          uClaroDia: { value: new THREE.Color('#FFF8F3') },
          uClaroNoche: { value: new THREE.Color('#F8D6F0') },
          uNoche: { value: 0 },
          uOpacidad: { value: 1 },
        },
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
      })
      return {
        id: t.id,
        geometria: crearCinta(t.curva, { segmentos: calidad.segmentos, ancho: t.ancho, giro: t.giro }),
        material,
        tiempo: i * 3.7, // desfasadas: si arrancaran juntas, ondularían al unísono
        fase: i * 1.3,
      }
    })
  }, [calidad.velos, calidad.segmentos])

  useEffect(
    () => () => {
      cintas.forEach((c) => {
        c.geometria.dispose()
        c.material.dispose()
      })
    },
    [cintas],
  )

  useFrame((estado, delta) => {
    const h = historia.get()
    const r = calidad.rafaga ? Math.abs(rafaga.get()) : 0
    const dt = Math.min(delta, 0.05) * calidad.tiempo
    const noche = factorNoche(h)
    const expansion = leer(ESTADOS_ESCENA, h, (e) => e.velos.expansion)
    const opacidad = leer(ESTADOS_ESCENA, h, (e) => e.velos.opacidad)
    const amplitud = leer(ESTADOS_ESCENA, h, (e) => e.velos.amplitud)
    const velocidad = leer(ESTADOS_ESCENA, h, (e) => e.velos.velocidad)

    // El puntero, llevado al plano z = 0 de la escena.
    const px = (estado.pointer.x * viewport.width) / 2
    const py = (estado.pointer.y * viewport.height) / 2

    for (const c of cintas) {
      // La velocidad oscila ±25 % con el tiempo y crece con la ráfaga.
      const oscila = 1 + 0.25 * Math.sin(estado.clock.elapsedTime * 0.2 + c.fase)
      c.tiempo += dt * velocidad * oscila * (1 + r * 2)
      const u = c.material.uniforms
      u.uTiempo.value = c.tiempo
      u.uAmplitud.value = amplitud
      u.uExpansion.value = expansion
      u.uOpacidad.value = opacidad
      u.uNoche.value = noche
      if (calidad.puntero) {
        u.uPuntero.value.set(px, py)
        u.uFuerzaPuntero.value = 1
      }
    }

    // En móvil el grupo se encoge y sube, para que la corriente quepa en una
    // pantalla vertical sin cruzar el texto.
    if (grupo.current) {
      grupo.current.scale.set(movil ? 0.5 : 1, movil ? 0.7 : 1, movil ? 0.7 : 1)
      grupo.current.position.y = movil ? 0.7 : 0
    }
  })

  return (
    <group ref={grupo}>
      {cintas.map((c) => (
        <mesh key={c.id} geometry={c.geometria} material={c.material} frustumCulled={false} />
      ))}
    </group>
  )
}
