import { NotFoundError } from '../../../shared/errors/AppError'
import { slugify } from '../../../shared/utils/slug'
import { Brand, BrandRepository, CatalogCache } from '../domain/ports'

const TTL = 300

export class ListBrandsUseCase {
  constructor(
    private readonly brands: BrandRepository,
    private readonly cache: CatalogCache,
  ) {}

  async execute(activeOnly = true): Promise<Brand[]> {
    const key = `brands:list:${activeOnly}`
    const cached = await this.cache.getJson<Brand[]>(key)
    if (cached) return cached
    const data = await this.brands.list(activeOnly)
    await this.cache.setJson(key, data, TTL)
    return data
  }
}

export class CreateBrandUseCase {
  constructor(
    private readonly brands: BrandRepository,
    private readonly cache: CatalogCache,
  ) {}

  async execute(data: { name: string; description?: string; logoUrl?: string }): Promise<Brand> {
    let slug = slugify(data.name)
    if (await this.brands.findBySlug(slug)) slug = `${slug}-${Date.now().toString(36)}`
    const created = await this.brands.create({
      name: data.name,
      slug,
      description: data.description ?? null,
      logoUrl: data.logoUrl ?? null,
    })
    await this.cache.invalidate()
    return created
  }
}

export class UpdateBrandUseCase {
  constructor(
    private readonly brands: BrandRepository,
    private readonly cache: CatalogCache,
  ) {}

  async execute(
    id: string,
    data: Partial<{ name: string; description: string | null; logoUrl: string | null; isActive: boolean }>,
  ): Promise<Brand> {
    if (!(await this.brands.findById(id))) throw new NotFoundError('Marca no encontrada')
    const updated = await this.brands.update(id, data)
    await this.cache.invalidate()
    return updated
  }
}

export class DeleteBrandUseCase {
  constructor(
    private readonly brands: BrandRepository,
    private readonly cache: CatalogCache,
  ) {}

  async execute(id: string): Promise<void> {
    if (!(await this.brands.findById(id))) throw new NotFoundError('Marca no encontrada')
    await this.brands.delete(id)
    await this.cache.invalidate()
  }
}
