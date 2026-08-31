import { z } from 'zod'

// -------- Query de listado de productos (búsqueda + filtros + paginación) --------
export const productListQuerySchema = z.object({
  search: z.string().trim().min(1).optional(),
  category: z.string().trim().min(1).optional(), // slug de categoría
  brand: z.string().trim().min(1).optional(), // slug de marca
  minPrice: z.coerce.number().nonnegative().optional(),
  maxPrice: z.coerce.number().nonnegative().optional(),
  usageType: z.string().trim().min(1).optional(),
  skinType: z.string().trim().min(1).optional(),
  sort: z.enum(['price_asc', 'price_desc', 'newest']).optional(),
  // Solo lo honra el panel de administración; ver el controlador.
  // OJO: no usar z.coerce.boolean() aquí — Boolean('false') es `true` en JS,
  // así que coerce.boolean() convertiría el string "false" en verdadero. Se
  // compara explícitamente contra el string 'true'; si el parámetro no viene,
  // el ZodOptional exterior corta antes de llamar al preprocess y el
  // resultado sigue siendo `undefined` (no `false`).
  includeInactive: z.preprocess((v) => v === 'true', z.boolean()).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
})

export const slugParamSchema = z.object({ slug: z.string().min(1) })
export const idParamSchema = z.object({ id: z.string().uuid('id inválido') })

const imageSchema = z.object({
  url: z.string().url(),
  alt: z.string().nullable().optional(),
  position: z.number().int().nonnegative().optional(),
})

export const createProductSchema = z.object({
  name: z.string().min(1).max(160),
  sku: z.string().min(1).max(60),
  description: z.string().min(1),
  brandId: z.string().uuid(),
  categoryId: z.string().uuid(),
  price: z.number().positive('El precio debe ser mayor a 0'),
  presentation: z.string().nullable().optional(),
  sizeMl: z.number().int().positive().nullable().optional(),
  usageType: z.string().nullable().optional(),
  skinType: z.string().nullable().optional(),
  ingredients: z.string().nullable().optional(),
  warnings: z.string().nullable().optional(),
  stock: z.number().int().nonnegative().default(0),
  // Opcional: permite dar de alta un producto ya desactivado (ficha en
  // preparación que todavía no debe verse en la tienda). Si no viene, la
  // columna toma su valor por defecto en base de datos (`true`).
  isActive: z.boolean().optional(),
  images: z.array(imageSchema).optional(),
})

export const updateProductSchema = z
  .object({
    name: z.string().min(1).max(160),
    sku: z.string().min(1).max(60),
    description: z.string().min(1),
    brandId: z.string().uuid(),
    categoryId: z.string().uuid(),
    price: z.number().positive(),
    presentation: z.string().nullable(),
    sizeMl: z.number().int().positive().nullable(),
    usageType: z.string().nullable(),
    skinType: z.string().nullable(),
    ingredients: z.string().nullable(),
    warnings: z.string().nullable(),
    stock: z.number().int().nonnegative(),
    isActive: z.boolean(),
    images: z.array(imageSchema),
  })
  .partial()

// -------- Categorías --------
export const createCategorySchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().optional(),
  parentId: z.string().uuid().optional(),
})
export const updateCategorySchema = z
  .object({
    name: z.string().min(1).max(120),
    description: z.string().nullable(),
    parentId: z.string().uuid().nullable(),
    isActive: z.boolean(),
  })
  .partial()

// -------- Marcas --------
export const createBrandSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().optional(),
  logoUrl: z.string().url().optional(),
})
export const updateBrandSchema = z
  .object({
    name: z.string().min(1).max(120),
    description: z.string().nullable(),
    logoUrl: z.string().url().nullable(),
    isActive: z.boolean(),
  })
  .partial()

export const listQuerySchema = z.object({
  includeInactive: z.coerce.boolean().optional(),
})
