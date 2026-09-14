import { useEnPantalla } from './hooks.js'

/**
 * Hace aparecer su contenido con un deslizamiento suave al entrar en pantalla.
 *
 * No se usa en el hero a propósito: lo primero que se ve tiene que estar ahí
 * desde el primer pintado, sin esperar a ninguna animación.
 */
export default function Revelar({ as: Etiqueta = 'div', retraso = 0, className = '', children, ...resto }) {
  const [ref, visible] = useEnPantalla()

  return (
    <Etiqueta
      ref={ref}
      className={`lp-reveal ${className}`}
      data-visible={visible}
      style={{ '--lp-delay': `${retraso}ms` }}
      {...resto}
    >
      {children}
    </Etiqueta>
  )
}
