/**
 * Contraste WCAG entre dos colores hex. Sirve para comprobar, en tests, que
 * el texto sigue siendo legible sobre la atmósfera, que cambia con el scroll.
 */

const canal = (c) => {
  const v = c / 255
  return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
}

/** Luminancia relativa de un color `#rrggbb`. */
export function luminancia(hex) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return 0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b)
}

/** Relación de contraste, de 1 a 21. */
export function contraste(a, b) {
  const la = luminancia(a)
  const lb = luminancia(b)
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}
