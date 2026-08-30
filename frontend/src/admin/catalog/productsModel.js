// Lógica pura del formulario de productos: conversión, validación y orden de
// las imágenes. Aparte del componente para poder probarla sin montar React
// (Vitest corre en entorno node, sin DOM).
//
// El formulario guarda TODO como cadena, incluidos precio y stock: es lo que
// devuelven los <input>, y convertir en el borde evita que un campo a medio
// escribir se vuelva NaN mientras se teclea.

/** Formulario en blanco para dar de alta un producto. */
export function formularioVacio(brandId = '', categoryId = '') {
  return {
    name: '',
    sku: '',
    description: '',
    brandId,
    categoryId,
    price: '',
    stock: '',
    presentation: '',
    sizeMl: '',
    usageType: '',
    skinType: '',
    ingredients: '',
    warnings: '',
    isActive: true,
    images: [],
  }
}

/** Pasa un producto de la API al formulario. Los nulos se vuelven ''. */
export function productoAFormulario(p) {
  const texto = (v) => (v == null ? '' : String(v))
  return {
    name: texto(p.name),
    sku: texto(p.sku),
    description: texto(p.description),
    brandId: texto(p.brandId),
    categoryId: texto(p.categoryId),
    price: texto(p.price),
    stock: texto(p.stock),
    presentation: texto(p.presentation),
    sizeMl: texto(p.sizeMl),
    usageType: texto(p.usageType),
    skinType: texto(p.skinType),
    ingredients: texto(p.ingredients),
    warnings: texto(p.warnings),
    isActive: p.isActive !== false,
    images: (p.images ?? []).map((i) => ({ url: texto(i.url), alt: texto(i.alt) })),
  }
}

/** Errores por campo. `{}` significa que el formulario es válido. */
export function validarProducto(f) {
  const errores = {}

  if (!f.name?.trim()) errores.name = 'El nombre es obligatorio'
  if (!f.sku?.trim()) errores.sku = 'El SKU es obligatorio'
  if (!f.description?.trim()) errores.description = 'La descripción es obligatoria'
  if (!f.brandId) errores.brandId = 'Elige una marca'
  if (!f.categoryId) errores.categoryId = 'Elige una categoría'

  const precio = Number(f.price)
  if (!f.price?.trim() || !Number.isFinite(precio) || precio <= 0) {
    errores.price = 'El precio debe ser mayor que cero'
  }

  const stock = Number(f.stock)
  if (!f.stock?.trim() || !Number.isInteger(stock) || stock < 0) {
    errores.stock = 'El stock debe ser un entero de cero en adelante'
  }

  // sizeMl es opcional, pero si viene, debe ser un entero positivo.
  if (f.sizeMl?.trim()) {
    const sizeMl = Number(f.sizeMl)
    if (!Number.isInteger(sizeMl) || sizeMl <= 0) {
      errores.sizeMl = 'El volumen debe ser un número entero mayor que cero'
    }
  }

  // Valida que cada imagen tenga una URL válida (no solo texto no vacío).
  if ((f.images ?? []).some((i) => {
    const url = i.url?.trim()
    if (!url) return true
    try {
      new URL(url)
      return false
    } catch {
      return true
    }
  })) {
    errores.images = 'Hay una imagen con una dirección inválida; debe ser una URL como https://ejemplo.com/foto.jpg'
  }

  return errores
}

/** Pasa el formulario al cuerpo que espera la API. */
export function formularioAPayload(f) {
  const opcional = (v) => (v?.trim() ? v.trim() : null)
  const numeroOpcional = (v) => (v?.trim() ? Number(v) : null)

  return {
    name: f.name.trim(),
    sku: f.sku.trim(),
    description: f.description.trim(),
    brandId: f.brandId,
    categoryId: f.categoryId,
    price: Number(f.price),
    stock: Number(f.stock),
    presentation: opcional(f.presentation),
    sizeMl: numeroOpcional(f.sizeMl),
    usageType: opcional(f.usageType),
    skinType: opcional(f.skinType),
    ingredients: opcional(f.ingredients),
    warnings: opcional(f.warnings),
    isActive: f.isActive,
    // La posición sale del orden de la lista: es lo que el usuario ve y arrastra.
    images: (f.images ?? []).map((img, i) => ({
      url: img.url.trim(),
      alt: img.alt?.trim() ? img.alt.trim() : null,
      position: i,
    })),
  }
}

/** Devuelve una copia con la imagen movida. Fuera de rango, la deja igual. */
export function moverImagen(imagenes, desde, hacia) {
  if (hacia < 0 || hacia >= imagenes.length || desde < 0 || desde >= imagenes.length) {
    return imagenes
  }
  const copia = [...imagenes]
  const [movida] = copia.splice(desde, 1)
  copia.splice(hacia, 0, movida)
  return copia
}
