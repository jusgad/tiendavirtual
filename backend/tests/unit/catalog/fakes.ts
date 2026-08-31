import {
  Brand,
  BrandRepository,
  CatalogCache,
  Category,
  CategoryRepository,
  CreateProductData,
  Paginated,
  Product,
  ProductFilter,
  ProductRepository,
  UpdateProductData,
} from '../../../src/modules/catalog/domain/ports'

let seq = 0
const id = (p: string) => `${p}-${++seq}`

export class InMemoryProductRepository implements ProductRepository {
  products: Product[] = []
  /** Última carga recibida por `update`: permite comprobar qué se pidió cambiar. */
  ultimaActualizacion: UpdateProductData | null = null

  async list(filter: ProductFilter): Promise<Paginated<Product>> {
    let items = this.products
    if (filter.activeOnly) items = items.filter((p) => p.isActive)
    if (filter.minPrice != null) items = items.filter((p) => p.price >= filter.minPrice!)
    if (filter.maxPrice != null) items = items.filter((p) => p.price <= filter.maxPrice!)
    if (filter.search) items = items.filter((p) => p.name.toLowerCase().includes(filter.search!.toLowerCase()))
    const total = items.length
    const start = (filter.page - 1) * filter.pageSize
    return { items: items.slice(start, start + filter.pageSize), total, page: filter.page, pageSize: filter.pageSize }
  }
  async findBySlug(slug: string) {
    return this.products.find((p) => p.slug === slug) ?? null
  }
  async findById(pid: string) {
    return this.products.find((p) => p.id === pid) ?? null
  }
  async create(data: CreateProductData & { slug: string }): Promise<Product> {
    const product: Product = {
      id: id('prod'),
      name: data.name,
      slug: data.slug,
      sku: data.sku,
      description: data.description,
      brandId: data.brandId,
      categoryId: data.categoryId,
      price: data.price,
      currency: 'COP',
      presentation: data.presentation ?? null,
      sizeMl: data.sizeMl ?? null,
      usageType: data.usageType ?? null,
      skinType: data.skinType ?? null,
      ingredients: data.ingredients ?? null,
      warnings: data.warnings ?? null,
      stock: data.stock,
      // Igual que el repositorio Prisma real: si no viene, nace activo.
      isActive: data.isActive ?? true,
    }
    this.products.push(product)
    return product
  }
  async update(pid: string, data: UpdateProductData): Promise<Product> {
    this.ultimaActualizacion = data
    const p = this.products.find((x) => x.id === pid)!
    Object.assign(p, data)
    return p
  }
  async delete(pid: string): Promise<void> {
    this.products = this.products.filter((p) => p.id !== pid)
  }
}

export class InMemoryBrandRepository implements BrandRepository {
  brands: Brand[] = []
  async list() {
    return this.brands
  }
  async findBySlug(slug: string) {
    return this.brands.find((b) => b.slug === slug) ?? null
  }
  async findById(bid: string) {
    return this.brands.find((b) => b.id === bid) ?? null
  }
  async create(data: { name: string; slug: string }): Promise<Brand> {
    const brand: Brand = { id: id('brand'), name: data.name, slug: data.slug, description: null, logoUrl: null, isActive: true }
    this.brands.push(brand)
    return brand
  }
  async update(bid: string, data: Partial<Brand>): Promise<Brand> {
    const b = this.brands.find((x) => x.id === bid)!
    Object.assign(b, data)
    return b
  }
  async delete(bid: string): Promise<void> {
    this.brands = this.brands.filter((b) => b.id !== bid)
  }
  seed(brand: Partial<Brand> & { id: string }): Brand {
    const b: Brand = { name: 'X', slug: 'x', description: null, logoUrl: null, isActive: true, ...brand }
    this.brands.push(b)
    return b
  }
}

export class InMemoryCategoryRepository implements CategoryRepository {
  categories: Category[] = []
  async list() {
    return this.categories
  }
  async findBySlug(slug: string) {
    return this.categories.find((c) => c.slug === slug) ?? null
  }
  async findById(cid: string) {
    return this.categories.find((c) => c.id === cid) ?? null
  }
  async create(data: { name: string; slug: string }): Promise<Category> {
    const c: Category = { id: id('cat'), name: data.name, slug: data.slug, description: null, parentId: null, isActive: true }
    this.categories.push(c)
    return c
  }
  async update(cid: string, data: Partial<Category>): Promise<Category> {
    const c = this.categories.find((x) => x.id === cid)!
    Object.assign(c, data)
    return c
  }
  async delete(cid: string): Promise<void> {
    this.categories = this.categories.filter((c) => c.id !== cid)
  }
  seed(cat: Partial<Category> & { id: string }): Category {
    const c: Category = { name: 'X', slug: 'x', description: null, parentId: null, isActive: true, ...cat }
    this.categories.push(c)
    return c
  }
}

export class FakeCatalogCache implements CatalogCache {
  store = new Map<string, unknown>()
  invalidateCalls = 0
  async getJson<T>(key: string): Promise<T | null> {
    return (this.store.get(key) as T) ?? null
  }
  async setJson<T>(key: string, value: T): Promise<void> {
    this.store.set(key, value)
  }
  async invalidate(): Promise<void> {
    this.invalidateCalls++
    this.store.clear()
  }
}
