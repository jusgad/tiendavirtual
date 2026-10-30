# PROMPT — Rediseño de una página existente con el sistema visual PomAss

> Copia todo lo que está debajo de esta línea y pégalo en tu herramienta de IA junto con el código (o el acceso al repositorio) de la página que quieres rediseñar.

---

Actúa como diseñador/a senior de producto y desarrollador/a creativo/a front‑end especializado en Three.js, React Three Fiber y Framer Motion.

Tengo una página web **ya creada**. Quiero **cambiar su diseño** aplicando el sistema visual y la experiencia 3D descritos abajo, que ya probé en otra página y funcionan. El objetivo es rediseñar, no rehacer el negocio: **conserva todo el contenido real, las rutas, los formularios, la lógica, las integraciones, el SEO y los datos existentes**, y cambia la capa visual, la composición, la tipografía, el movimiento y la experiencia.

## 0. Antes de tocar nada: audita la página actual

1. Identifica el stack (React/Next/Vite, Vue, HTML plano, WordPress, Shopify, etc.), cómo se sirven los estilos y si ya existe un sistema de diseño.
2. Lista las secciones existentes y su contenido real (textos, precios, imágenes, testimonios, CTAs, formularios).
3. Asigna cada sección existente a uno de los **5 estados narrativos** (sección 5 de este prompt). Si hay más de 5 secciones, agrupa las que comparten intención. Si hay menos, usa los estados que apliquen.
4. Dime en una lista corta qué vas a conservar, qué vas a reestructurar y qué falta (datos o archivos) **antes** de implementar.

Reglas de adaptación:
- Si el proyecto usa **React**, implementa con `three`, `@react-three/fiber`, `@react-three/drei` y `framer-motion`.
- Si **no** usa React, implementa lo mismo con Three.js puro y `motion` (la versión vanilla de Framer Motion). Mantén idénticos el comportamiento y los parámetros.
- **No inventes** datos de producto, certificaciones, resultados, beneficios, ingredientes ni testimonios. Si faltan, deja marcadores visibles entre corchetes, por ejemplo `[Lista real de ingredientes]`.
- El **precio aparece una sola vez**, en el hero. No lo repitas en el resto de la página.

---

## 1. Concepto creativo

**"Una brisa delicada que transporta el aroma y envuelve la sensación de frescura."**

La página debe sentirse como un viento suave y perfumado que atraviesa la pantalla. El aroma y la frescura no son dos ideas separadas: se fusionan en una misma corriente de aire tridimensional que vive en **todo el fondo de la página** y acompaña el scroll de principio a fin.

- Aroma: partículas pequeñas que el viento dispersa.
- Frescura: corrientes de aire luminosas y ligeras.
- Suavidad: formas orgánicas, fluidas y envolventes.
- Bienestar: luz cálida, calma y mucho espacio negativo.

Nivel de ejecución de referencia: heros cinematográficos premium tipo Supahero.io y MotionSites AI (movimiento fluido, cámara elegante, glass, gradientes, 3D integrado al texto), **pero** en un registro cálido, delicado y natural. Nada futurista, nada tech, nada neón, nada oscuro.

Evitar: humo denso, vapor, salpicaduras de agua, exceso de flores, look de publicidad genérica de perfume, animaciones rápidas o bruscas, demasiados elementos flotando.

---

## 2. Sistema visual

### 2.1 Paleta (tokens CSS)

```css
:root {
  --pm-ivory: #f8f1e9;     /* fondo base */
  --pm-powder: #e9cfcb;    /* rosa empolvado: corrientes y fondos */
  --pm-rose: #eab5b0;      /* rosa suave: acentos y reflejos */
  --pm-clay: #c99489;      /* rosa arcilla: identidad (tapa del envase, puntos) */
  --pm-sage: #c7cdb8;      /* verde salvia: SOLO acentos mínimos (fondo de iconos) */
  --pm-champagne: #dcc9b6; /* champaña: partículas e iluminación */
  --pm-ink: #805d53;       /* marrón rosado: titulares, marca, texto grande */
  --pm-text: #6e4e45;      /* misma familia, más profundo: texto pequeño (cumple contraste AA) */
}
```

El marrón `#805D53` no llega a contraste AA en texto pequeño sobre los rosados más oscuros. Por eso todo el texto pequeño usa `--pm-text` (`#6E4E45`), y `--pm-ink` queda para titulares y marca.

**Fondo atmosférico por estado** (degradado CSS fijo detrás del canvas, interpolado con el scroll):

| Estado | top | bottom | glow |
|---|---|---|---|
| 0 Descubrimiento | `#F7E4DE` | `#EFD2CA` | `#FDEFE8` |
| 1 Expansión | `#FAEDE8` | `#F4E0D9` | `#FFF6F1` |
| 2 Frescura | `#F9F3EC` | `#F6ECE3` | `#FFFAF5` |
| 3 Bienestar | `#F8F1E9` | `#F4E9E0` | `#FBF2EA` |
| 4 Cierre | `#F7EAE1` | `#F1DDD2` | `#FAE6DB` |

```css
.pm-atmosphere {
  position: fixed; inset: 0; z-index: 0;
  background:
    radial-gradient(42% 48% at var(--pm-glow-x) var(--pm-glow-y), var(--pm-glow) 0%, transparent 72%),
    radial-gradient(70% 60% at 12% 8%, rgba(255,255,255,.55), transparent 70%),
    linear-gradient(180deg, var(--pm-bg-top) 0%, var(--pm-bg-bottom) 100%);
}
```
El brillo (`--pm-glow-x/y`) sigue la posición en pantalla del producto.

### 2.2 Tipografía

- **Playfair Display** (400–600, con itálica): marca, titulares, frases sensoriales, numerales y citas en itálica.
- **DM Sans** (300–500): cuerpo, navegación, etiquetas.

Escala:
- Marca del hero: `clamp(54px, 7vw, 116px)`, line-height .95, letter-spacing −.02em.
- Titulares de sección: `clamp(40px, 5.6vw, 88px)` (xl), `clamp(34px, 4.2vw, 64px)` (lg), `clamp(30px, 2.9vw, 46px)` (titular del hero); todos con `text-wrap: balance`.
- Cuerpo: `clamp(15px, 1.1vw, 17px)`, peso 300, line-height 1.75. Cuerpo grande: `clamp(18px, 1.55vw, 23px)`.
- Etiquetas (eyebrows): 12px, peso 500, MAYÚSCULAS, letter-spacing .26em.

### 2.3 Componentes

- **Glass**: `background: rgba(255,251,247,.38); border: 1px solid rgba(255,255,255,.65); backdrop-filter: blur(20px) saturate(130%); box-shadow: 0 30px 70px -40px rgba(128,93,83,.35), inset 0 1px 0 rgba(255,255,255,.7);`. Úsalo en tarjetas, la navbar y el contenedor del testimonio.
- **Botón (CTA discreto)**: tipo ghost, píldora, altura mínima 48px, borde `rgba(128,93,83,.45)`, fondo glass suave, texto 13px en MAYÚSCULAS con letter-spacing .12em. En hover: el fondo se aclara, el borde pasa a `--pm-ink`, aparece una sombra rosada suave y el botón sube 1px, con transición de 0.6s `cubic-bezier(.22,1,.36,1)`. **Nunca** un botón lleno y estridente.
- **Navbar**: píldora glass centrada arriba, oculta sobre el hero. Aparece con fade y desplazamiento cuando el scroll pasa el 70% de la altura de la ventana. Contiene la marca y 3 anclas. En móvil solo la marca.
- **Placeholders**: subrayado punteado `1px dashed rgba(128,93,83,.4)` para que se note que falta el dato real.

---

## 3. Composición de las secciones

### Hero (estado 0)
Composición horizontal cinematográfica, grid de 3 columnas `1fr 1.25fr 1fr`, alto mínimo `100svh`.
- **Arriba a la izquierda**: la marca y debajo la frase de marca en MAYÚSCULAS espaciadas (DM Sans).
- **Centro‑derecha**: el producto 3D flotando, protagonista absoluto.
- **Derecha**: el titular sensorial, un párrafo de ancho limitado (máx. 380px), y luego el precio (etiqueta pequeña más valor en Playfair) junto al CTA discreto.
- **Abajo al centro**: "DESCUBRE LA EXPERIENCIA" con una flecha que respira (animación de 2.6s).
- **Notas sensoriales** alrededor del producto, en Playfair itálica de 15px, unidas a él por líneas finas. Las líneas se dibujan con `pathLength` y terminan en un punto marfil con borde arcilla y halo. Solo se muestran en pantallas ≥1100px de ancho con relación de aspecto ≥4/3; en las demás pasan a una lista compacta bajo el párrafo.
- El contenido del hero se desvanece y sube (−90px) al hacer scroll fuera del hero.

### Sección 2: Expansión (estado 1)
Layout editorial: titular xl a la izquierda (máx. 700px), párrafo grande desplazado hacia adentro y abajo, mucho espacio negativo, alto mínimo `120svh`. El producto se desplaza a la derecha.

### Sección 3: Ritual / momento personal (estado 2)
Intro centrada y, debajo, 3 tarjetas glass. Usa numerales (01/02/03) solo si el contenido es una secuencia real. El 3D se retira (el producto pasa pequeño y tenue a la esquina superior derecha) para dejar el centro al texto.

### Sección 4: Confianza (estado 3)
Intro alineada a la izquierda, grid de tarjetas glass (`auto-fit, minmax(240px,1fr)`) con icono de línea fina dentro de un círculo con un toque de salvia, y debajo un testimonio en Playfair itálica. Solo datos reales; si no existen, marcadores visibles.

### Sección 5: Cierre (estado 4)
Grid de 2 columnas: copy a la izquierda (titular xl, párrafo y CTA discreto **sin precio**) y el producto de vuelta a la derecha como último protagonista. El alto se calcula como `calc(100svh - 120px)` con `padding-top: 130px` para que, al llegar al final de la página, la navbar no tape el titular. En móvil el producto va arriba y el copy centrado debajo (`padding-top: 46svh`).

### Animación del texto HTML (Framer Motion)
- Titulares: revelado palabra por palabra. Cada palabra sube desde una máscara (`y: 105% → 0`) en 1.1s, con stagger de 0.055s y aria-label en el titular.
- Bloques: `fadeUp` (`opacity 0→1`, `y 28→0`) en 1.1s con ease `[0.22, 1, 0.36, 1]`, disparado con `whileInView` una sola vez al 30% de visibilidad. Grupos con stagger de 0.12s.
- Hero: aparece al cargar, con la columna narrativa demorada 0.7s.
- Todo bajo `<MotionConfig reducedMotion="user">`.

---

## 4. La escena 3D: el viento de aroma

Arquitectura: un **canvas fijo a pantalla completa** detrás del contenido (`position: fixed; inset: 0; z-index: 0`), transparente (`alpha: true`), sobre la capa de atmósfera CSS. El contenido HTML va encima con `z-index: 1`. La escena vive en su propia carpeta (`three/`), separada del contenido.

Configuración del renderer:
- `NeutralToneMapping`, para que la paleta conserve sus valores hex.
- `dpr [1, 1.75]`.
- `eventSource` en el elemento raíz con `eventPrefix="client"`, para que el puntero se capture aunque el HTML esté encima.
- Cámara a `fov` 35° en escritorio y 42° en móvil.
- Todos los shaders terminan con `#include <colorspace_fragment>`.

La escena tiene **cinco capas** (más el producto):

### 4.1 Campo de viento de fondo (la capa principal)
Un quad a pantalla completa que se renderiza a **media resolución** (un tercio en equipos lentos) en un render target y se amplía. Se pinta primero, en el pase opaco, con `renderOrder -100`, `depthTest: false` y CustomBlending equivalente a Normal. Así el producto y las corrientes se dibujan encima.

Algoritmo del fragment shader:
- Usa ruido simplex 3D (Ashima/McEwan) más un fbm de 4 octavas.
- Rota las coordenadas 0.18 rad, para que el viento vaya **de izquierda a derecha subiendo levemente**.
- Pinta **dos capas** con parallax distinto:
  - lejana: `escala 1.4`, `stretch 6`, `velocidad 0.18`, parallax de scroll 0.25;
  - cercana: `escala 0.85`, `stretch 4.5`, `velocidad 0.42`, parallax de scroll 0.7.
- Dentro de cada capa:
  1. Curva la corriente: `p.y += .18*sin(p.x*1.3 + t*.45) + .07*sin(p.x*3.1 − t*.7)`.
  2. Advecta: `a = (p.x − t*speed, p.y)`.
  3. Cuerpo: `fbm(a.x/stretch*1.2, a.y*1.2, t*.16)` → velos con `smoothstep(−.2, .5)`.
  4. **Líneas de viento**: `snoise(a.x*.35, a.y*9, t*.26)` → línea donde `|n| < .09`, activada en ráfagas con otro ruido de baja frecuencia.
  5. **Líneas finas y rápidas**: mismo método con `velocidad×1.7`, frecuencia transversal 16 y umbral .06.
  6. Color: mezcla rosa empolvado `#E9CFCB` → `#EFC4BD` → champaña `#E4D3C2`, con las líneas tendiendo a un blanco cálido `#FFF8F3`.
  7. Alfa = `veil*.36 + lines*.72`.
- Compone la capa cercana sobre la lejana y limita el alfa final a **0.72 × intensidad del estado**.
- El cursor desvía el viento: remolino local `exp(−d²·9) · fuerza · 1.4`.
- El tiempo avanza más rápido con la ráfaga de scroll: `×(1 + ráfaga·3.5)`.

### 4.2 Velos de brisa (cintas 3D)
Seis superficies tipo cinta (no tubos) barridas a lo largo de `CatmullRomCurve3` con frames de Frenet. Cada cinta se tuerce sobre sí misma (`twist`) y se afina en las puntas (`ancho × (0.3 + 0.7·sin(π·u))`), con 220 segmentos a lo largo y 10 a lo ancho (120 en equipos lentos).
- Vertex shader:
  - dos ondas viajeras: `sin(u*9 − t*.9 + v*1.8)` y `sin(u*3.7 + t*.53)`, aplicadas sobre la normal × 0.22 × amplitud;
  - respiración vertical de toda la corriente;
  - expansión lateral `p.x *= spread` según el estado;
  - empuje del cursor.
- Fragment shader:
  - transparencia que se disuelve en las puntas y los bordes;
  - **bordes luminosos**;
  - reflejo fresnel;
  - un brillo que se desliza a lo largo;
  - **destellos que viajan por la corriente**: `smoothstep(.72, 1, sin(u*16 − t*2.2 + v*2.5))`.
- Material: `transparent`, `depthWrite: false`, `DoubleSide`, `frustumCulled = false`.
- Colores: rosa empolvado, rosa suave, marfil y champaña, con algunos tonos un poco más profundos (`#E6B4AC`, `#E2A49B`) para que se lean sobre el fondo rosado.
- La corriente "embrace" pasa **por delante de la base del producto y por detrás de la tapa**. Las demás cruzan el espacio y se abren hacia los bordes.
- Su velocidad oscila ±25% con el tiempo y crece con la ráfaga de scroll (`×(1 + ráfaga·2)`).

Trayectorias de referencia (producto en `(0.3, 0, 0)`):

```js
veil-back:    w1.7  [[-6.5,-1.3,-2.6],[-3.2,-0.3,-1.9],[-0.6,0.8,-1.4],[1.6,0.7,-1.5],[4.2,-0.3,-2.1],[7,0.4,-2.9]]
embrace:      w0.75 [[-5.5,0.9,-1.2],[-2.4,-0.2,0.1],[-0.3,-0.95,1.25],[1.3,-0.55,1.1],[1.75,0.55,-0.2],[0.6,1.35,-1.2],[-1.4,2.3,-2.1]]
upper-thread: w0.45 [[-6.2,2.5,-2],[-2.6,1.75,-0.8],[0.7,1.55,0.35],[3,2.15,-0.3],[6.6,3,-1.5]]
front-sweep:  w1.0  [[7,-2.3,1.2],[3.6,-1.5,1.7],[1,-1.75,2.3],[-2.2,-2.5,1.6],[-6.2,-1.9,0.4]]
rising:       w0.55 [[1.4,-3.2,-1.3],[0.5,-1.1,-0.9],[1.5,0.4,-1.1],[0.7,2,-1.5],[1.9,3.5,-2.1]]
far-left:     w2.3  [[-7.2,-0.6,-4],[-4.6,1.2,-3.6],[-2.1,0.2,-3.3],[0.2,-1.5,-3.7]]
```
En móvil o en equipos lentos se conservan solo `veil-back`, `embrace` y `upper-thread`.

### 4.3 Partículas en volumen (el aroma en el espacio)
900 puntos (320 en móvil o equipos lentos) dentro de una **caja que sigue a la cámara**: 14×9×10 en escritorio, 7×12×10 en móvil. Así el aire nunca se acaba, en ninguna sección.
- Cada partícula avanza con un **campo de viento suave**, el mismo del fondo: `(1 + .35 sin(y·.8 + z·.3), .22 + .3 sin(x·.45 + z·.5), .25 cos(x·.35 + y·.6))`, multiplicado por `t · 0.32 · velocidad`. Encima lleva un aleteo acotado.
- Envoltura con `mod` y fade en los bordes de la caja.
- Las cercanas se ven grandes, suaves y desenfocadas; las lejanas, pequeñas y nítidas, con núcleo brillante.
- Colores entre champaña `#DCC9B6` y rosa `#E8B2AA`, con un brillo leve.
- Al hacer scroll hacia abajo, una ráfaga empuja el aroma hacia arriba (`lift += ráfaga · dt · 1.6`).

### 4.4 Partículas sobre las corrientes
700 puntos (260 en equipos lentos) que nacen sobre las curvas de los velos y viajan en su dirección; una cuarta parte flota libre hacia arriba. Aparecen y se desvanecen a lo largo de su recorrido.

### 4.5 Pétalos (pocos)
6 pétalos en escritorio y 3 en móvil. Geometría `ShapeGeometry` con forma de pétalo, curvada. Material físico `#F7DFD9` con brillo de terciopelo (sheen), opacidad 0.7. Derivan y giran lentamente con la brisa.

### 4.6 Producto 3D
En una capa independiente: un grupo exterior que se mueve según el estado y un grupo interior que flota.
- Si existe el modelo real `.glb`, cárgalo con `useGLTF`, normalízalo a 1.2 unidades de alto y céntralo.
- Si no existe, usa un **envase provisional** claramente marcado en el código como reemplazable:
  - cuerpo por revolución (`LatheGeometry`) en porcelana satinada `#F3E4DC`;
  - tapa en rosa arcilla `#C59A91`;
  - aro champaña metálico;
  - etiqueta "PomAss" (Playfair) en una banda de cilindro, con canvas de 4096×256 para que el texto no se deforme.
- No inventes el packaging definitivo ni cambies el nombre de la marca.

Movimiento:
- Flotación casi imperceptible (±0.05) e inclinación leve; **nunca un giro continuo de demostración**.
- La etiqueta siempre mira a la cámara (`atan2(cam.x − p.x, cam.z − p.z) − 0.28`).
- Sombra ambiental: un plano con degradado radial debajo.

Opacidad:
- El fade de opacidad solo recorre los materiales cuando el valor cambia.
- Por encima de 0.995 se fija en 1, para que el cuerpo vuelva al pase opaco.
- La etiqueta lleva `renderOrder 2`, para que nunca desaparezca detrás del cuerpo.

### 4.7 Luces
- Luz ambiental marfil.
- Luz hemisférica (`#FFF7F1` / rosa empolvado).
- Luz principal cálida `#FFE8D8` desde arriba a la izquierda.
- Luz rosada secundaria `#EAB5B0` desde atrás a la derecha, como contraluz.
- Luz de relleno marfil desde abajo.
- `Environment` con `Lightformer` locales, sin descargar HDR.

Las intensidades se interpolan con el estado.

### 4.8 Cámara
Solo pequeños acercamientos y paneos, nunca zooms fuertes, con amortiguación `damp(…, 2)`. Parallax leve con el puntero (±0.25 x, ±0.15 y), desactivado en móvil y con movimiento reducido.

---

## 5. Storytelling ligado al scroll (5 estados)

**Sincronización**:
- Cada sección lleva un atributo `data-story="0…4"`.
- Se mide el centro de cada sección y se calcula un valor continuo `story` según dónde cae el centro del viewport respecto a esos centros: 0 cuando el hero está centrado, 1 cuando lo está la sección 2, y así sucesivamente, interpolando entre ellos.
- Ese valor se suaviza con `useSpring` (rigidez 60, amortiguación 20).
- La escena lo lee en cada frame con `story.get()`, **sin estado de React dentro del loop de animación**.
- Entre estados se interpola con smoothstep, para que la escena "se asiente" en cada uno.
- Se re-mide con `ResizeObserver`, porque las alturas cambian al cargar las fuentes.

**Ráfaga de scroll**:
- `useVelocity(scrollY)` se suaviza con `useSpring(rigidez 40, amortiguación 25)` y se normaliza a −1…1 (`velocidad/2000`).
- La ráfaga acelera el viento, los velos y las partículas, y empuja el aroma hacia arriba.

| Estado | Cámara (x,y,z) | Producto (x,y,z) · escala · opacidad | Velos: expansión / opacidad / amplitud / velocidad | Partículas sobre corrientes: opacidad / velocidad | Campo | Volumen |
|---|---|---|---|---|---|---|
| 0 Descubrimiento | 0, .05, 7 | .3, 0, 0 · 1.05 · 1 | 1 / 1 / 1 / 1 | 1 / 1 | .9 | .9 |
| 1 Expansión del aroma | .25, 0, 6.2 | 1.7, .15, −.6 · 1 · 1 | 1.45 / .9 / 1.15 / 1.15 | 1 / 1.25 | 1 | 1 |
| 2 Frescura | 0, .1, 6.5 | 3.4, 1.2, −2.4 · .6 · .35 | 1.75 / .6 / .7 / .75 | .7 / .7 | .8 | .85 |
| 3 Bienestar | 0, 0, 6.9 | 3.6, 1.3, −2.8 · .55 · .2 | 1.95 / .45 / .5 / .45 | .6 / .35 | .7 | .7 |
| 4 Cierre | .15, 0, 6.3 | 1.5, 0, 0 · 1.15 · 1 | 1.2 / .6 / .55 / .5 | .35 / .3 | .75 | .55 |

En **móvil** (≤899px):
- Cámara en z ≈ 9–9.6.
- Producto: hero `(0, .9, 0)` escala 1.35, encima del copy; secciones 2–4 pequeño y tenue arriba a la derecha; cierre `(0, 2.05, 0)` escala .8.
- El grupo de velos se encoge `(.5, .7, .7)` y sube 0.7.

Ajusta las posiciones del producto para que **nunca quede detrás de un titular o un párrafo**, comprobándolo en escritorio y en móvil.

---

## 6. Copy y tono

- Cálido, delicado, humano y específico. Sensación antes que venta.
- Prioriza aroma, frescura, suavidad, bienestar, confianza y discreción.
- Sin lenguaje explícito, clínico ni técnico, y sin presión de compra.
- Conserva los textos reales de la página existente cuando ya cumplen el tono. Cuando reescribas, ofrece la propuesta y señala qué cambiaste.
- Frases que funcionaron:
  - Marca: "EL BIENESTAR TAMBIÉN SE SIENTE EN LA PIEL."
  - Hero: "Aroma y frescura, en perfecta armonía." / "Una brisa delicada que envuelve tu piel, combinando un aroma sutil con una frescura que se siente desde el primer momento."
  - Notas: "Aroma que se expande en el aire." · "Frescura que acaricia y revitaliza." · "Suavidad que acompaña."
  - "Hay sensaciones que se sienten desde el primer instante."
  - "Tu momento. Tu espacio. Tu bienestar."
  - "El cuidado comienza con sentirte bien."
  - "Haz espacio para sentirte bien." · CTA: "Conocer PomAss".
  - Pie: "Una brisa delicada. Una sensación que permanece."

---

## 7. Respaldo, accesibilidad y rendimiento

- **Sin WebGL** (detección previa) o si la escena falla en tiempo de ejecución (error boundary alrededor del canvas): se muestra una escena CSS con el mismo degradado de atmósfera, 4 velos SVG de trazo grueso con gradiente que se desvanece en los extremos y desenfoque, que derivan con keyframes de 19–31s, y un envase hecho en CSS (tapa y cuerpo con degradados, etiqueta "PomAss"). Este envase sigue los mismos estados mediante variables CSS calculadas con la proyección de la cámara. Nunca una pantalla en blanco.
- **`prefers-reduced-motion`**: la escena se calma (tiempo ×0.12–0.15), sin ráfagas ni perturbación del cursor. Framer Motion omite los desplazamientos y CSS desactiva sus animaciones.
- **Carga diferida**: three.js y la escena se cargan con `lazy()` + `Suspense`, para que el texto pinte primero (unos 90 KB gzip iniciales) y el canvas entre con un fade de 1.8s.
- **`PerformanceMonitor`** (drei): si el equipo no da abasto, baja el DPR a 1 y reduce corrientes, segmentos, partículas y resolución del campo.
- Sin post-procesado. Libera geometrías, materiales y render targets al desmontar.
- Mantén el contraste AA del texto sobre el fondo en movimiento: las líneas claras deben pasar **detrás** del texto, nunca encima.
- Botones y enlaces reales, foco visible, `aria-hidden` en las capas decorativas, y sin scroll horizontal en móvil.

---

## 8. Entrega esperada

1. La auditoría breve de la sección 0, con el mapeo de secciones a estados.
2. El código integrado en la página existente:
   - escena 3D separada del contenido HTML;
   - tokens y estilos;
   - componentes de sección rediseñados con su contenido real;
   - sincronización del scroll;
   - fallback;
   - responsive.
3. Una lista de lo que quedó como marcador (precio, enlaces, modelo 3D, datos de confianza, testimonios).
4. Verificación en navegador en escritorio (1440×810) y en móvil (375×812):
   - el hero y las cinco secciones;
   - que el producto no tape texto;
   - que la navbar no tape titulares;
   - consola sin errores;
   - fallback sin WebGL.
5. Un README corto con cómo ejecutar el proyecto, cómo reemplazar el envase por el modelo real y dónde ajustar los estados.
