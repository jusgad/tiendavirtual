// -------- Tipos de dominio (dinero como number para respuestas limpias) --------

export interface Brand {
  id: string
  name: string
  slug: string
  description: string | null
  logoUrl: string | null
  isActive: boolean
}

export interface Category {
  id: string
  name: string
  slug: string
  description: string | null
  parentId: string | null
  isActive: boolean
}

export interface ProductImage {
  id: string
  url: string
  alt: string | null
  position: number
}

export interface Product {
  id: string
  name: string
  slug: string
  sku: string
  description: string
  brandId: string
  categoryId: string
  price: number
  currency: string
  presentation: string | null
  sizeMl: number | null
  usageType: string | null
  skinType: string | null
  ingredients: string | null
  warnings: string | null
  stock: number
  isActive: boolean
  brand?: Pick<Brand, 'id' | 'name' | 'slug'>
  category?: Pick<Category, 'id' | 'name' | 'slug'>
  images?: ProductImage[]
}

export interface ProductFilter {
  search?: string
  categorySlug?: string
  brandSlug?: string
  minPrice?: number
  maxPrice?: number
  usageType?: string
  skinType?: string
  activeOnly?: boolean
  sort?: 'price_asc' | 'price_desc' | 'newest'
  page: number
  pageSize: number
}

export interface Paginated<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}

export interface CreateProductData {
  name: string
  sku: string
  description: string
  brandId: string
  categoryId: string
  price: number
  presentation?: string | null
  sizeMl?: number | null
  usageType?: string | null
  skinType?: string | null
  ingredients?: string | null
  warnings?: string | null
  stock: number
  images?: { url: string; alt?: string | null; position?: number }[]
}

export type UpdateProductData = Partial<Omit<CreateProductData, 'images'>> & {
  isActive?: boolean
  /**
   * Cuando llega, REEMPLAZA el juego completo de imágenes del producto.
   * Cuando no llega, las deja como estaban. No hay actualización parcial:
   * `ProductImage` no tiene clave natural con la que casar filas sueltas.
   */
  images?: { url: string; alt?: string | null; position?: number }[]
}

// -------- Puertos --------

export interface ProductRepository {
  list(filter: ProductFilter): Promise<Paginated<Product>>
  findBySlug(slug: string): Promise<Product | null>
  findById(id: string): Promise<Product | null>
  create(data: CreateProductData & { slug: string }): Promise<Product>
  update(id: string, data: UpdateProductData): Promise<Product>
  delete(id: string): Promise<void>
}

export interface CategoryRepository {
  list(activeOnly: boolean): Promise<Category[]>
  findBySlug(slug: string): Promise<Category | null>
  findById(id: string): Promise<Category | null>
  create(data: { name: string; slug: string; description?: string | null; parentId?: string | null }): Promise<Category>
  update(id: string, data: Partial<{ name: string; description: string | null; parentId: string | null; isActive: boolean }>): Promise<Category>
  delete(id: string): Promise<void>
}

export interface BrandRepository {
  list(activeOnly: boolean): Promise<Brand[]>
  findBySlug(slug: string): Promise<Brand | null>
  findById(id: string): Promise<Brand | null>
  create(data: { name: string; slug: string; description?: string | null; logoUrl?: string | null }): Promise<Brand>
  update(id: string, data: Partial<{ name: string; description: string | null; logoUrl: string | null; isActive: boolean }>): Promise<Brand>
  delete(id: string): Promise<void>
}

/** Puerto de caché del catálogo (implementado con Redis). */
export interface CatalogCache {
  getJson<T>(key: string): Promise<T | null>
  setJson<T>(key: string, value: T, ttlSeconds: number): Promise<void>
  invalidate(): Promise<void>
}
