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
  includeInactive: z.coerce.boolean().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
})

export const slugParamSchema = z.object({ slug: z.string().min(1) })
export const idParamSchema = z.object({ id: z.string().uuid('id inválido') })

const imageSchema = z.object({
  url: z.string().url(),
  alt: z.string().optional(),
  position: z.number().int().nonnegative().optional(),
})

export const createProductSchema = z.object({
  name: z.string().min(1).max(160),
  sku: z.string().min(1).max(60),
  description: z.string().min(1),
  brandId: z.string().uuid(),
  categoryId: z.string().uuid(),
  price: z.number().positive('El precio debe ser mayor a 0'),
  presentation: z.string().optional(),
  sizeMl: z.number().int().positive().optional(),
  usageType: z.string().optional(),
  skinType: z.string().optional(),
  ingredients: z.string().optional(),
  warnings: z.string().optional(),
  stock: z.number().int().nonnegative().default(0),
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
