import { motion } from 'framer-motion'

/** La curva del prompt. Entra rápido y se posa, nunca rebota. */
const SUAVE = [0.22, 1, 0.36, 1]

/**
 * Titular que se revela palabra a palabra, subiendo desde una máscara.
 *
 * El texto se parte en palabras y cada una va dentro de un contenedor con
 * `overflow: hidden`, así que parece que asoman desde debajo de una línea.
 *
 * El disparo (`whileInView`) va en el titular entero y baja a las palabras
 * por variantes. No puede ir en cada palabra: al empezar desplazada por
 * debajo de su máscara, la palabra está recortada del todo, y el
 * `IntersectionObserver` descuenta ese recorte. Nunca «entraba en pantalla»
 * y el titular se quedaba invisible para siempre.
 *
 * `enfasis` pinta las últimas N palabras en cursiva con el degradado de
 * marca, que el manual reserva para los titulares clave.
 *
 * `aria-label` lleva la frase entera y las palabras van ocultas al lector de
 * pantalla: sin eso, partir el texto en veinte `span` hace que algunos
 * lectores lo lean palabra por palabra, con una pausa en cada una.
 */
export function Titular({ texto, className = '', como = 'h2', id, retraso = 0, enfasis = 0 }) {
  const palabras = texto.split(' ')
  const desdeEnfasis = palabras.length - enfasis
  const Motion = motion[como] ?? motion.h2

  return (
    <Motion
      id={id}
      className={className}
      aria-label={texto}
      initial="oculto"
      whileInView="visible"
      viewport={{ once: true, amount: 0.3 }}
      variants={{
        oculto: {},
        visible: { transition: { staggerChildren: 0.055, delayChildren: retraso } },
      }}
    >
      {palabras.map((palabra, i) => (
        <span key={`${palabra}-${i}`} className="pm-palabra" aria-hidden="true">
          <motion.span
            style={{ display: 'inline-block' }}
            className={i >= desdeEnfasis ? 'lp-grad-text italic' : undefined}
            variants={{
              oculto: { y: '105%' },
              visible: { y: '0%', transition: { duration: 1.1, ease: SUAVE } },
            }}
          >
            {palabra}
          </motion.span>
          {/* El espacio va fuera de la máscara: dentro, `overflow: hidden`
              lo recorta y las palabras quedan pegadas. */}
          {i < palabras.length - 1 ? '\u00A0' : ''}
        </span>
      ))}
    </Motion>
  )
}

/**
 * Bloque que aparece subiendo cuando entra en pantalla. Una sola vez: lo que
 * ya se leyó no vuelve a desvanecerse al subir.
 */
export function Bloque({ children, className = '', retraso = 0, como: Como = 'div' }) {
  const Motion = motion[Como] ?? motion.div
  return (
    <Motion
      className={className}
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 1.1, ease: SUAVE, delay: retraso }}
    >
      {children}
    </Motion>
  )
}

/** Varios `Bloque` en cascada, con el escalonado que pide el prompt. */
export function Grupo({ children, className = '', retraso = 0 }) {
  return (
    <motion.div
      className={className}
      initial="oculto"
      whileInView="visible"
      viewport={{ once: true, amount: 0.3 }}
      variants={{
        oculto: {},
        visible: { transition: { staggerChildren: 0.12, delayChildren: retraso } },
      }}
    >
      {children}
    </motion.div>
  )
}

/** Hijo de `Grupo`. Hereda el escalonado en vez de llevar su propio retraso. */
export function Item({ children, className = '', como: Como = 'div' }) {
  const Motion = motion[Como] ?? motion.div
  return (
    <Motion
      className={className}
      variants={{
        oculto: { opacity: 0, y: 28 },
        visible: { opacity: 1, y: 0, transition: { duration: 1.1, ease: SUAVE } },
      }}
    >
      {children}
    </Motion>
  )
}
