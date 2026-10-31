import { useEffect, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { ESTADOS_ESCENA, factorNoche, leer } from '../historia.js'

/**
 * Partículas en volumen: el aire tiene cuerpo.
 *
 * Viven dentro de una caja que sigue a la cámara, y se envuelven con `mod`
 * al salir por un lado: así el aire no se acaba en ninguna sección, por
 * mucho que se baje.
 *
 * Todo el movimiento va en el shader. Cada partícula avanza con el mismo
 * campo de viento que el fondo, evaluado en su posición de partida; la CPU
 * solo acumula cuánto viento ha soplado. Mover 900 puntos en JavaScript
 * cada fotograma sería gastar el presupuesto en lo que la GPU hace gratis.
 */

const VERTEX = /* glsl */ `
attribute vec3 aBase;
attribute float aTamano;
attribute float aSemilla;

uniform vec3  uCaja;
uniform vec3  uCentro;
uniform float uViento;
uniform float uTiempo;
uniform float uElevacion;
uniform float uEscalaPunto;

varying float vBorde;
varying float vCerca;
varying float vSemilla;

void main() {
  vec3 b = aBase * uCaja;

  // El campo de viento del prompt, el mismo que el del fondo.
  vec3 viento = vec3(
    1.0 + 0.35 * sin(b.y * 0.8 + b.z * 0.3),
    0.22 + 0.3 * sin(b.x * 0.45 + b.z * 0.5),
    0.25 * cos(b.x * 0.35 + b.y * 0.6)
  );
  vec3 p = b + viento * uViento * 0.32;

  // Aleteo acotado, encima del avance.
  p += vec3(
    sin(uTiempo * 0.7 + aSemilla * 6.283),
    cos(uTiempo * 0.6 + aSemilla * 4.0),
    sin(uTiempo * 0.5 + aSemilla * 2.0)
  ) * 0.08;

  // La ráfaga de scroll empuja el aroma hacia arriba.
  p.y += uElevacion;

  // Envoltura: la caja está centrada delante de la cámara y la sigue.
  vec3 rel = mod(p - uCentro + uCaja * 0.5, uCaja) - uCaja * 0.5;
  vec3 mundo = uCentro + rel;

  // Se apagan cerca de las paredes de la caja, para que no se vea el salto
  // al envolver.
  vec3 holgura = (uCaja * 0.5 - abs(rel)) / (uCaja * 0.12);
  vBorde = clamp(min(holgura.x, min(holgura.y, holgura.z)), 0.0, 1.0);

  vec4 mv = modelViewMatrix * vec4(mundo, 1.0);
  float distancia = -mv.z;
  vCerca = smoothstep(5.5, 2.0, distancia);
  vSemilla = aSemilla;

  gl_PointSize = aTamano * uEscalaPunto / max(distancia, 0.5);
  gl_Position = projectionMatrix * mv;
}
`

const FRAGMENT = /* glsl */ `
precision highp float;
uniform vec3  uColorA;
uniform vec3  uColorB;
uniform vec3  uColorANoche;
uniform vec3  uColorBNoche;
uniform float uNoche;
uniform float uOpacidad;

varying float vBorde;
varying float vCerca;
varying float vSemilla;

void main() {
  float d = length(gl_PointCoord - 0.5) * 2.0;
  if (d > 1.0) discard;

  // Lejanas: pequeñas y nítidas, con núcleo brillante. Cercanas: grandes,
  // suaves y desenfocadas, como algo que pasa por delante del objetivo.
  float nitida = smoothstep(1.0, 0.25, d) * 0.6 + smoothstep(0.35, 0.0, d) * 0.6;
  float suave  = smoothstep(1.0, 0.0, d) * 0.35;
  float forma = mix(nitida, suave, vCerca);

  vec3 a = mix(uColorA, uColorANoche, uNoche);
  vec3 b = mix(uColorB, uColorBNoche, uNoche);
  vec3 color = mix(a, b, fract(vSemilla * 7.13));

  gl_FragColor = vec4(color, forma * vBorde * uOpacidad);
  #include <colorspace_fragment>
}
`

export default function ParticulasVolumen({ historia, rafaga, calidad }) {
  const { camera, size, gl } = useThree()
  const movil = size.width <= 899
  const n = calidad.particulasVolumen

  const { geometria, material, acumulado } = useMemo(() => {
    const base = new Float32Array(n * 3)
    const tamano = new Float32Array(n)
    const semilla = new Float32Array(n)
    for (let i = 0; i < n; i++) {
      base[i * 3] = Math.random()
      base[i * 3 + 1] = Math.random()
      base[i * 3 + 2] = Math.random()
      tamano[i] = 2 + Math.random() * 5
      semilla[i] = Math.random()
    }
    const g = new THREE.BufferGeometry()
    // `position` es obligatorio para que Three calcule cuántos puntos pintar,
    // aunque el shader no lo use.
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3))
    g.setAttribute('aBase', new THREE.BufferAttribute(base, 3))
    g.setAttribute('aTamano', new THREE.BufferAttribute(tamano, 1))
    g.setAttribute('aSemilla', new THREE.BufferAttribute(semilla, 1))

    const m = new THREE.ShaderMaterial({
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      uniforms: {
        uCaja: { value: new THREE.Vector3(14, 9, 10) },
        uCentro: { value: new THREE.Vector3() },
        uViento: { value: 0 },
        uTiempo: { value: 0 },
        uElevacion: { value: 0 },
        uEscalaPunto: { value: 1 },
        uColorA: { value: new THREE.Color('#FFD9B8') },
        uColorB: { value: new THREE.Color('#F7A07A') },
        uColorANoche: { value: new THREE.Color('#F0B5E4') },
        uColorBNoche: { value: new THREE.Color('#D57CC7') },
        uNoche: { value: 0 },
        uOpacidad: { value: 0.9 },
      },
      transparent: true,
      depthWrite: false,
    })
    return { geometria: g, material: m, acumulado: { viento: 0, elevacion: 0 } }
  }, [n])

  useEffect(
    () => () => {
      geometria.dispose()
      material.dispose()
    },
    [geometria, material],
  )

  useFrame((estado, delta) => {
    const h = historia.get()
    const r = calidad.rafaga ? rafaga.get() : 0
    const dt = Math.min(delta, 0.05) * calidad.tiempo

    acumulado.viento += dt * (1 + Math.abs(r) * 1.5)
    // Solo al bajar: subir la página no debería hundir el aroma.
    acumulado.elevacion += Math.max(0, r) * dt * 1.6

    const u = material.uniforms
    u.uViento.value = acumulado.viento
    u.uTiempo.value += dt
    u.uElevacion.value = acumulado.elevacion
    u.uNoche.value = factorNoche(h)
    u.uOpacidad.value = leer(ESTADOS_ESCENA, h, (e) => e.volumen)
    if (movil) u.uCaja.value.set(7, 12, 10)
    else u.uCaja.value.set(14, 9, 10)
    // La caja va delante de la cámara, alrededor de donde está la escena.
    u.uCentro.value.set(camera.position.x, camera.position.y, camera.position.z - 6.5)
    // Tamaño en píxeles que no depende de la densidad de la pantalla.
    u.uEscalaPunto.value = gl.getPixelRatio() * (size.height / 900) * 6
  })

  return <points geometry={geometria} material={material} frustumCulled={false} />
}
