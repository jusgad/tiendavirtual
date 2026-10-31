// Clase del botón de compra. Vive aquí y no en un componente porque se
// aplica igual a un <a> que a un <button>.
//
// Los demás botones de la landing usan `.pm-cta` (tokens.css), el CTA
// discreto del prompt. Este es el único con relleno: ver `landing.css`.

/** Compra. Letra blanca sobre el degradado profundo de marca (5:1 o más). */
export const btnPrimario =
  'lp-btn lp-grad-cta inline-flex min-h-[52px] items-center justify-center gap-2 rounded-full px-7 text-base font-extrabold text-white shadow-[0_14px_30px_-14px_rgba(167,11,148,.55)]'
