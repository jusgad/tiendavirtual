import { motion } from 'framer-motion'

/** La curva del prompt. Entra rápido y se posa, nunca rebota. */
const SUAVE = [0.22, 1, 0.36, 1]

/**
 * Titular que se revela palabra a palabra, subiendo desde una máscara.
 *
 * El texto se parte en palabras y cada una va dentro de un contenedor con
 * `overflow: hidden`, así que parece que asoman desde debajo de una línea.
 *
 * `aria-label` lleva la frase entera y las palabras van ocultas al lector de
 * pantalla: sin eso, partir el texto en veinte `span` hace que algunos
 * lectores lo lean palabra por palabra, con una pausa en cada una.
 */
export function Titular({ texto, className = '', como: Como = 'h2', id, retraso = 0 }) {
  const palabras = texto.split(' ')

  return (
    <Como id={id} className={className} aria-label={texto}>
      {palabras.map((palabra, i) => (
        <span key={`${palabra}-${i}`} className="pm-palabra" aria-hidden="true">
          <motion.span
            style={{ display: 'inline-block' }}
            initial={{ y: '105%' }}
            whileInView={{ y: '0%' }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 1.1, ease: SUAVE, delay: retraso + i * 0.055 }}
          >
            {palabra}
          </motion.span>
          {/* El espacio va fuera de la máscara: dentro, `overflow: hidden`
              lo recorta y las palabras quedan pegadas. */}
          {i < palabras.length - 1 ? ' ' : ''}
        </span>
      ))}
    </Como>
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
