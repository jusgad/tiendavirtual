import { BadRequestError, NotFoundError } from '../../../shared/errors/AppError'
import { slugify } from '../../../shared/utils/slug'
import {
  BrandRepository,
  CatalogCache,
  CategoryRepository,
  CreateProductData,
  Paginated,
  Product,
  ProductFilter,
  ProductRepository,
  UpdateProductData,
} from '../domain/ports'

const LIST_TTL = 120 // seg
const ITEM_TTL = 300 // seg

/** Lista productos con filtros/paginación; cachea el resultado (cache-aside). */
export class ListProductsUseCase {
  constructor(
    private readonly products: ProductRepository,
    private readonly cache: CatalogCache,
  ) {}

  async execute(filter: ProductFilter): Promise<Paginated<Product>> {
    const key = `products:list:${JSON.stringify(filter)}`
    const cached = await this.cache.getJson<Paginated<Product>>(key)
    if (cached) return cached

    const result = await this.products.list(filter)
    await this.cache.setJson(key, result, LIST_TTL)
    return result
  }
}

/** Obtiene un producto por slug (cacheado). */
export class GetProductUseCase {
  constructor(
    private readonly products: ProductRepository,
    private readonly cache: CatalogCache,
  ) {}

  async execute(slug: string): Promise<Product> {
    const key = `products:slug:${slug}`
    const cached = await this.cache.getJson<Product>(key)
    if (cached) return cached

    const product = await this.products.findBySlug(slug)
    if (!product) throw new NotFoundError('Producto no encontrado')

    await this.cache.setJson(key, product, ITEM_TTL)
    return product
  }
}

/** Crea un producto (admin). Valida marca/categoría y genera un slug único. */
export class CreateProductUseCase {
  constructor(
    private readonly products: ProductRepository,
    private readonly brands: BrandRepository,
    private readonly categories: CategoryRepository,
    private readonly cache: CatalogCache,
  ) {}

  async execute(data: CreateProductData): Promise<Product> {
    const [brand, category] = await Promise.all([
      this.brands.findById(data.brandId),
      this.categories.findById(data.categoryId),
    ])
    if (!brand) throw new BadRequestError('La marca indicada no existe')
    if (!category) throw new BadRequestError('La categoría indicada no existe')

    let slug = slugify(data.name)
    if (await this.products.findBySlug(slug)) {
      slug = `${slug}-${Date.now().toString(36)}`
    }

    const created = await this.products.create({ ...data, slug })
    await this.cache.invalidate()
    return created
  }
}

/** Actualiza un producto (admin). El slug permanece estable. */
export class UpdateProductUseCase {
  constructor(
    private readonly products: ProductRepository,
    private readonly cache: CatalogCache,
  ) {}

  async execute(id: string, data: UpdateProductData): Promise<Product> {
    const existing = await this.products.findById(id)
    if (!existing) throw new NotFoundError('Producto no encontrado')

    const updated = await this.products.update(id, data)
    await this.cache.invalidate()
    return updated
  }
}

/** Elimina un producto (admin). */
export class DeleteProductUseCase {
  constructor(
    private readonly products: ProductRepository,
    private readonly cache: CatalogCache,
  ) {}

  async execute(id: string): Promise<void> {
    const existing = await this.products.findById(id)
    if (!existing) throw new NotFoundError('Producto no encontrado')

    await this.products.delete(id)
    await this.cache.invalidate()
  }
}
