import { PrismaClient } from '@prisma/client'
import { Category, CategoryRepository } from '../domain/ports'

export class PrismaCategoryRepository implements CategoryRepository {
  constructor(private readonly prisma: PrismaClient) {}

  list(activeOnly: boolean): Promise<Category[]> {
    return this.prisma.category.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      orderBy: { name: 'asc' },
    })
  }

  findBySlug(slug: string): Promise<Category | null> {
    return this.prisma.category.findUnique({ where: { slug } })
  }

  findById(id: string): Promise<Category | null> {
    return this.prisma.category.findUnique({ where: { id } })
  }

  create(data: { name: string; slug: string; description?: string | null; parentId?: string | null }): Promise<Category> {
    return this.prisma.category.create({ data })
  }

  update(
    id: string,
    data: Partial<{ name: string; description: string | null; parentId: string | null; isActive: boolean }>,
  ): Promise<Category> {
    return this.prisma.category.update({ where: { id }, data })
  }

  async delete(id: string): Promise<void> {
    await this.prisma.category.delete({ where: { id } })
  }
}
