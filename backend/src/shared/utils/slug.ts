/** Convierte un texto a slug URL-friendly (sin acentos, minúsculas, guiones). */
export function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '') // quita diacríticos (acentos)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-') // no alfanumérico -> guion
    .replace(/^-+|-+$/g, '') // recorta guiones extremos
}
