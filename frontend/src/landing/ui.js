// Clases de los botones de la landing. Viven aquí y no en un componente
// porque se aplican igual a un <a> que a un <button>.

/** Compra. Letra blanca sobre el degradado profundo de marca (5:1 o más). */
export const btnPrimario =
  'lp-btn lp-grad-cta inline-flex min-h-[52px] items-center justify-center gap-2 rounded-full px-7 text-base font-extrabold text-white shadow-[0_14px_30px_-14px_rgba(167,11,148,.55)]'

/** Acción secundaria: contorno sobre crema, sin competir con la compra. */
export const btnSecundario =
  'lp-btn inline-flex min-h-[52px] items-center justify-center gap-2 rounded-full border-2 border-brand-tinta/15 bg-white/70 px-6 text-base font-bold text-brand-tinta backdrop-blur hover:border-brand-tinta/35 hover:bg-white'

/** Rótulo pequeño en mayúsculas sobre los títulos de sección. */
export const antetitulo = 'text-[13px] font-extrabold uppercase tracking-[.16em] text-brand-coral-deep'
