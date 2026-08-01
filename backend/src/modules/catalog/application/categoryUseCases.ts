import { BadRequestError, NotFoundError } from '../../../shared/errors/AppError'
import { slugify } from '../../../shared/utils/slug'
import { CatalogCache, Category, CategoryRepository } from '../domain/ports'

const TTL = 300

export class ListCategoriesUseCase {
  constructor(
    private readonly categories: CategoryRepository,
    private readonly cache: CatalogCache,
  ) {}

  async execute(activeOnly = true): Promise<Category[]> {
    const key = `categories:list:${activeOnly}`
    const cached = await this.cache.getJson<Category[]>(key)
    if (cached) return cached
    const data = await this.categories.list(activeOnly)
    await this.cache.setJson(key, data, TTL)
    return data
  }
}

export class CreateCategoryUseCase {
  constructor(
    private readonly categories: CategoryRepository,
    private readonly cache: CatalogCache,
  ) {}

  async execute(data: { name: string; description?: string; parentId?: string }): Promise<Category> {
    if (data.parentId && !(await this.categories.findById(data.parentId))) {
      throw new BadRequestError('La categoría padre no existe')
    }
    let slug = slugify(data.name)
    if (await this.categories.findBySlug(slug)) slug = `${slug}-${Date.now().toString(36)}`

    const created = await this.categories.create({
      name: data.name,
      slug,
      description: data.description ?? null,
      parentId: data.parentId ?? null,
    })
    await this.cache.invalidate()
    return created
  }
}

export class UpdateCategoryUseCase {
  constructor(
    private readonly categories: CategoryRepository,
    private readonly cache: CatalogCache,
  ) {}

  async execute(
    id: string,
    data: Partial<{ name: string; description: string | null; parentId: string | null; isActive: boolean }>,
  ): Promise<Category> {
    if (!(await this.categories.findById(id))) throw new NotFoundError('Categoría no encontrada')
    const updated = await this.categories.update(id, data)
    await this.cache.invalidate()
    return updated
  }
}

export class DeleteCategoryUseCase {
  constructor(
    private readonly categories: CategoryRepository,
    private readonly cache: CatalogCache,
  ) {}

  async execute(id: string): Promise<void> {
    if (!(await this.categories.findById(id))) throw new NotFoundError('Categoría no encontrada')
    await this.categories.delete(id)
    await this.cache.invalidate()
  }
}
