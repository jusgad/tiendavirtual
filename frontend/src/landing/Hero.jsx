import { useRef } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import { CATALOGO, CURRENCY } from '../site.js'
import { IconArrowDown, IconArrowRight } from './icons.jsx'
import { usePrecio } from './precio.js'
import { btnPrimario } from './ui.js'

/**
 * Estado 0 · La apertura. Amanecer.
 *
 * Composición cinematográfica en tres columnas: la marca arriba a la
 * izquierda, el producto 3D en el centro (lo pinta la escena, aquí solo se le
 * deja sitio) y el relato a la derecha. En móvil, la marca arriba, el
 * producto en medio y el relato debajo.
 *
 * **Precio y compra en la apertura.** Antes no estaban: el precio vivía solo
 * en el combo, por una crítica de diseño que señaló que se repetía. La
 * revisión de usabilidad lo revirtió —en móvil había que bajar casi un
 * pantallazo entero para ver qué cuesta y dónde se compra—, así que la
 * apertura lleva ahora propuesta, precio y botón de compra. El precio sigue
 * saliendo del panel de administración (`usePrecio`), no escrito a mano.
 *
 * El botón de compra es el único con relleno; explorar la rutina se queda en
 * la flecha de abajo, que ya decía «Descubre la rutina». Antes había además
 * un botón «Conocer la rutina» que competía con la compra y la empujaba
 * fuera de la pantalla.
 *
 * Lo que NO lleva, a propósito: **las frases de perfume del prompt**
 * («aroma que se expande en el aire»). PomAss no es un perfume: las notas
 * que rodean al producto son sus beneficios reales, del catálogo.
 *
 * Al bajar, el contenido se desvanece y sube: la escena se queda y el texto
 * se aparta para la siguiente banda.
 */

// Las notas que rodean al producto. Solo datos reales del catálogo: el
// beneficio principal de cada crema y el último de la noche.
//
// Posiciones en % de la columna central. Comprobadas a 1440×810: ninguna
// nota pisa la marca ni el relato. La de Noche va ENCIMA de su tubo y no a
// su derecha: a la derecha invadía la columna del relato.
const NOTAS = [
  {
    texto: CATALOGO[0]?.beneficio,
    estiloTexto: { top: '24%', right: '78%' },
    inicio: ['22%', '24%'],
    punto: ['44%', '38%'],
  },
  {
    texto: CATALOGO[1]?.beneficio,
    estiloTexto: { top: '12%', left: '56%' },
    inicio: ['60%', '15%'],
    punto: ['58%', '33%'],
  },
  {
    texto: CATALOGO[1]?.beneficios.at(-1)?.text,
    estiloTexto: { top: '70%', right: '78%' },
    inicio: ['22%', '70%'],
    punto: ['46%', '64%'],
  },
].filter((n) => n.texto)

const SUAVE = [0.22, 1, 0.36, 1]

export default function Hero() {
  const seccion = useRef(null)
  const precio = usePrecio()
  const { scrollYProgress } = useScroll({ target: seccion, offset: ['start start', 'end start'] })
  const opacidad = useTransform(scrollYProgress, [0, 0.75], [1, 0])
  const opacidadFlecha = useTransform(scrollYProgress, [0, 0.12], [1, 0])
  const subida = useTransform(scrollYProgress, [0, 0.75], [0, -90])

  return (
    <section ref={seccion} aria-labelledby="hero-titulo" className="pm-hero relative">
      <motion.div style={{ opacity: opacidad, y: subida }} className="pm-hero-rejilla">
        {/* Columna 1 · la marca */}
        <motion.div
          className="pm-hero-marca"
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.1, ease: SUAVE }}
        >
          {/* La marca es el logotipo, no un texto en Fraunces: el manual
              prohíbe redibujarlo. Va como imagen y sin enlace, para no
              arrastrar un «ir al inicio» en la propia portada.

              Ya NO es el <h1>: un encabezado principal que solo dice la
              marca no le cuenta a un buscador de qué va la página. El h1 es
              ahora la propuesta («Una crema para tu día y otra para tu
              noche»), que además es el texto más grande en pantalla. */}
          {/* `fetchpriority="high"`: es lo primero que se ve y, por tanto,
              el candidato a ser el elemento más grande del primer pintado
              (LCP). Sin esto el navegador lo trata como una imagen más. */}
          <img
            src="/images/logo.png"
            alt="PomAss by Pao Díaz"
            width="636"
            height="208"
            fetchPriority="high"
            className="mx-auto h-[clamp(54px,7vw,104px)] w-auto md:mx-0"
          />
          <p className="pm-etiqueta pm-acento mt-5 block text-center md:text-left">
            Confianza en todo momento.
          </p>
        </motion.div>

        {/* Columna 2 · sitio para el producto, que pinta la escena 3D */}
        <div className="relative" aria-hidden="true" data-ancla-producto="apertura">
          <div className="pm-notas absolute inset-0">
            {NOTAS.map((n, i) => (
              <Nota key={n.texto} {...n} indice={i} />
            ))}
          </div>
        </div>

        {/* Columna 3 · el relato */}
        <motion.div
          className="pm-hero-relato"
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.1, ease: SUAVE, delay: 0.7 }}
        >
          <p className="pm-etiqueta pm-acento">Cuidado íntimo · Hecho en Colombia</p>
          <h1 id="hero-titulo" className="pm-titular-hero mt-4">
            Una crema para tu día y otra para tu noche.
          </h1>
          <p className="pm-cuerpo pm-suave mx-auto mt-5 max-w-[380px] md:mx-0">
            Dos cremas íntimas de 50 ml que se usan como se vive un día: una por la mañana y otra
            antes de dormir.
          </p>

          {/* Donde no caben las notas alrededor del producto, van aquí. */}
          <ul className="pm-notas-compactas mt-6 flex-wrap justify-center gap-2 md:justify-start">
            {NOTAS.map((n) => (
              <li key={n.texto} className="pm-glass rounded-full px-4 py-1.5 font-display text-[15px] italic">
                {n.texto}
              </li>
            ))}
          </ul>

          {/* Precio y compra, lo que la revisión de usabilidad echaba en
              falta en el primer pantallazo del móvil. */}
          <p className="mt-6 flex items-baseline justify-center gap-2 md:justify-start">
            <span className="font-display text-[34px] font-semibold leading-none">{precio}</span>
            <span className="pm-suave text-sm font-bold">{CURRENCY}</span>
          </p>
          <a href="/checkout.html" className={`${btnPrimario} mt-5`}>
            Comprar el combo
            <IconArrowRight size={18} className="lp-flecha" />
          </a>
        </motion.div>
      </motion.div>

      {/* Se desvanece con el resto: si no, al empezar a bajar subía justo
          por delante del producto.

          Oculta en móvil estrecho: ahí abajo va ahora el botón de compra y
          la flecha se le montaba encima. Que la página sigue hacia abajo se
          entiende igual, y en pantallas anchas la flecha se mantiene. */}
      <motion.a
        href="#problema"
        style={{ opacity: opacidadFlecha }}
        className="absolute bottom-7 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 min-[600px]:flex"
      >
        <span className="pm-etiqueta pm-suave">Descubre la rutina</span>
        <span className="pm-respira inline-flex h-11 w-11 items-center justify-center rounded-full pm-glass">
          <IconArrowDown size={18} />
        </span>
      </motion.a>
    </section>
  )
}

/**
 * Una nota sensorial, unida al producto por una línea fina que se dibuja.
 * Termina en un punto crema con borde coral y un halo.
 */
function Nota({ texto, estiloTexto, inicio, punto, indice }) {
  return (
    <>
      <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible">
        <motion.line
          x1={inicio[0]}
          y1={inicio[1]}
          x2={punto[0]}
          y2={punto[1]}
          stroke="currentColor"
          strokeWidth="1"
          strokeOpacity="0.45"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.4, ease: SUAVE, delay: 1.1 + indice * 0.2 }}
        />
      </svg>
      <motion.span
        className="pm-nota-punto"
        style={{ left: punto[0], top: punto[1] }}
        initial={{ opacity: 0, scale: 0.4 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: SUAVE, delay: 2.2 + indice * 0.2 }}
      />
      <motion.span
        className="pm-nota"
        style={{ ...estiloTexto, transform: 'translateY(-50%)' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, ease: SUAVE, delay: 1.5 + indice * 0.2 }}
      >
        {texto}
      </motion.span>
    </>
  )
}
