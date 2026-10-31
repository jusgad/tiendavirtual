import { useEffect, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { ESTADOS_ESCENA, factorNoche, leer } from '../historia.js'
import { RUIDO_SIMPLEX } from './ruido.glsl.js'

/**
 * El campo de viento: la capa principal de la escena.
 *
 * Un shader de ruido que pinta velos y hebras de corriente moviéndose de
 * izquierda a derecha, subiendo levemente. Todo lo demás —cintas,
 * partículas, producto— se dibuja encima.
 *
 * Tres decisiones que no conviene deshacer:
 *
 * 1. **Media resolución.** El ruido se pinta en un render target a la mitad
 *    (un tercio en equipos lentos) y luego se amplía. Son cuatro octavas de
 *    ruido por píxel, dos veces; a resolución completa se nota en un
 *    portátil normal. El resultado es difuso por naturaleza y la pérdida no
 *    se ve.
 *
 * 2. **Pase opaco con mezcla personalizada.** Si el material fuera
 *    `transparent`, Three lo pintaría después del producto, que es opaco, y
 *    al no tener test de profundidad lo taparía. Opaco con `CustomBlending`
 *    se pinta el primero (`renderOrder -100`) y aun así mezcla con el fondo
 *    transparente del canvas. Con `NormalBlending` en un material opaco,
 *    Three desactiva la mezcla y el fondo saldría negro.
 *
 * 3. **Colores del manual, no del prompt.** El prompt pedía rosa empolvado;
 *    aquí van durazno y coral de día, y violetas de noche. Pasan como
 *    `THREE.Color`, que los convierte a espacio lineal: el shader termina con
 *    `colorspace_fragment` y, si recibiera los hex tal cual, quedarían
 *    lavados por partida doble.
 */

const VERTEX = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  // Pantalla completa sin cámara: el quad ya está en coordenadas de recorte.
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`

const FRAGMENT_RUIDO = /* glsl */ `
precision highp float;
varying vec2 vUv;

uniform float uTiempo;
uniform float uAspecto;
uniform float uDesplazamiento;
uniform vec2  uPuntero;
uniform float uFuerzaPuntero;
uniform float uNoche;

uniform vec3 uDurazno;
uniform vec3 uCoral;
uniform vec3 uCrema;
uniform vec3 uDuraznoNoche;
uniform vec3 uCoralNoche;
uniform vec3 uCremaNoche;

${RUIDO_SIMPLEX}

vec2 girar(vec2 p, float a) {
  float c = cos(a), s = sin(a);
  return vec2(p.x * c - p.y * s, p.x * s + p.y * c);
}

/**
 * Una capa de viento. Lejana y cercana usan la misma función con escalas,
 * velocidades y parallax distintos: eso es lo que da profundidad sin pintar
 * más geometría.
 */
vec4 capa(vec2 uv, float escala, float estirado, float velocidad, float parallax) {
  // 0.18 rad: el viento avanza hacia la derecha subiendo un poco.
  vec2 p = girar(uv, 0.18) / escala;
  p.y -= uDesplazamiento * parallax;
  float t = uTiempo;

  // La corriente ondula despacio, como el aire real.
  p.y += 0.18 * sin(p.x * 1.3 + t * 0.45) + 0.07 * sin(p.x * 3.1 - t * 0.7);

  // El cursor abre un remolino local que se recompone enseguida.
  vec2 d = uv - uPuntero;
  p += normalize(d + 1e-5) * exp(-dot(d, d) * 9.0) * uFuerzaPuntero * 1.4;

  vec2 a = vec2(p.x - t * velocidad, p.y);

  // Cuerpo del velo.
  float velo = smoothstep(-0.2, 0.5, fbm(vec3(a.x / estirado * 1.2, a.y * 1.2, t * 0.16)));

  // Hebras: ruido comprimido en y. Se encienden a ráfagas con otro ruido
  // lento, para que no estén siempre todas.
  float hebra = snoise(vec3(a.x * 0.35, a.y * 9.0, t * 0.26));
  float rafagas = smoothstep(-0.1, 0.5, snoise(vec3(a.x * 0.2, a.y * 0.5, t * 0.1)));
  float lineas = smoothstep(0.09, 0.0, abs(hebra)) * rafagas;

  // Hebras finas y más rápidas.
  vec2 af = vec2(p.x - t * velocidad * 1.7, p.y);
  float fina = snoise(vec3(af.x * 0.35, af.y * 16.0, t * 0.3));
  lineas += smoothstep(0.06, 0.0, abs(fina)) * 0.6 * rafagas;
  lineas = clamp(lineas, 0.0, 1.0);

  vec3 durazno = mix(uDurazno, uDuraznoNoche, uNoche);
  vec3 coral   = mix(uCoral, uCoralNoche, uNoche);
  vec3 crema   = mix(uCrema, uCremaNoche, uNoche);
  vec3 color = mix(durazno, coral, smoothstep(0.2, 0.9, velo));
  color = mix(color, crema, lineas * 0.85);

  // De noche las hebras se apagan un poco: van detrás de texto en crema, y
  // una línea clara cruzándolo le quita contraste.
  float alfa = velo * 0.36 + lineas * 0.72 * mix(1.0, 0.55, uNoche);
  return vec4(color, alfa);
}

void main() {
  vec2 uv = (vUv - 0.5) * vec2(uAspecto, 1.0) * 2.0;
  vec4 lejos = capa(uv, 1.40, 6.0, 0.18, 0.25);
  vec4 cerca = capa(uv, 0.85, 4.5, 0.42, 0.70);
  // Se compone, no se suma: sumando, los cruces saturan a blanco.
  vec3 color = mix(lejos.rgb, cerca.rgb, cerca.a);
  float alfa = lejos.a + cerca.a * (1.0 - lejos.a);
  gl_FragColor = vec4(color, alfa);
  #include <colorspace_fragment>
}
`

const FRAGMENT_MOSTRAR = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform sampler2D uTextura;
uniform float uIntensidad;
void main() {
  vec4 texel = texture2D(uTextura, vUv);
  // 0.72 es el techo que pide el prompt: por encima, el viento empieza a
  // competir con el texto en vez de quedarse detrás.
  gl_FragColor = vec4(texel.rgb, min(texel.a, 0.72) * uIntensidad);
  #include <colorspace_fragment>
}
`

const color = (hex) => new THREE.Color(hex)

export default function CampoDeViento({ historia, rafaga, calidad }) {
  const { size, gl } = useThree()

  const fbo = useMemo(
    () =>
      new THREE.WebGLRenderTarget(1, 1, {
        depthBuffer: false,
        stencilBuffer: false,
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
      }),
    [],
  )

  const { escena, camara, ruido, mostrar, tiempo } = useMemo(() => {
    const ruidoMat = new THREE.ShaderMaterial({
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT_RUIDO,
      uniforms: {
        uTiempo: { value: 0 },
        uAspecto: { value: 1 },
        uDesplazamiento: { value: 0 },
        uPuntero: { value: new THREE.Vector2(9, 9) },
        uFuerzaPuntero: { value: 0 },
        uNoche: { value: 0 },
        uDurazno: { value: color('#FFD0A8') },
        uCoral: { value: color('#F47A4D') },
        uCrema: { value: color('#FFF7EF') },
        uDuraznoNoche: { value: color('#B44AA4') },
        uCoralNoche: { value: color('#7C1474') },
        uCremaNoche: { value: color('#F0C2E6') },
      },
      // En el render target se guarda el color tal cual, sin mezclar: la
      // mezcla con el fondo se hace una sola vez, al mostrarlo.
      blending: THREE.NoBlending,
      depthTest: false,
      depthWrite: false,
    })
    const escenaRT = new THREE.Scene()
    escenaRT.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), ruidoMat))

    const mostrarMat = new THREE.ShaderMaterial({
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT_MOSTRAR,
      uniforms: { uTextura: { value: null }, uIntensidad: { value: 0.9 } },
      transparent: false,
      blending: THREE.CustomBlending,
      blendEquation: THREE.AddEquation,
      blendSrc: THREE.SrcAlphaFactor,
      blendDst: THREE.OneMinusSrcAlphaFactor,
      blendSrcAlpha: THREE.OneFactor,
      blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
      depthTest: false,
      depthWrite: false,
    })

    return {
      escena: escenaRT,
      camara: new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1),
      ruido: ruidoMat,
      mostrar: mostrarMat,
      tiempo: { valor: 0 },
    }
  }, [])

  mostrar.uniforms.uTextura.value = fbo.texture

  useEffect(() => {
    const escala = calidad.resolucionCampo
    fbo.setSize(Math.max(1, Math.round(size.width * escala)), Math.max(1, Math.round(size.height * escala)))
  }, [fbo, size.width, size.height, calidad.resolucionCampo])

  // Se libera todo al desmontar: si no, cada vuelta del monitor de
  // rendimiento dejaría un render target huérfano en la GPU.
  useEffect(
    () => () => {
      fbo.dispose()
      ruido.dispose()
      mostrar.dispose()
      escena.traverse((o) => o.geometry?.dispose())
    },
    [fbo, ruido, mostrar, escena],
  )

  useFrame((estado, delta) => {
    const h = historia.get()
    const r = calidad.rafaga ? Math.abs(rafaga.get()) : 0
    // El tiempo corre más rápido con la ráfaga de scroll: el aire reacciona
    // a que la persona avance, no solo al reloj.
    tiempo.valor += Math.min(delta, 0.05) * (1 + r * 3.5) * calidad.tiempo

    const u = ruido.uniforms
    u.uTiempo.value = tiempo.valor
    u.uAspecto.value = size.width / Math.max(size.height, 1)
    u.uDesplazamiento.value = window.scrollY / Math.max(window.innerHeight, 1)
    u.uNoche.value = factorNoche(h)
    if (calidad.puntero) {
      u.uPuntero.value.set(estado.pointer.x * u.uAspecto.value, estado.pointer.y)
      u.uFuerzaPuntero.value = 0.25
    }
    mostrar.uniforms.uIntensidad.value = leer(ESTADOS_ESCENA, h, (e) => e.campo)

    const previo = gl.getRenderTarget()
    gl.setRenderTarget(fbo)
    gl.render(escena, camara)
    gl.setRenderTarget(previo)
  })

  return (
    <mesh renderOrder={-100} frustumCulled={false} material={mostrar}>
      <planeGeometry args={[2, 2]} />
    </mesh>
  )
}
