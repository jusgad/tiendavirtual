import { PrismaClient } from '@prisma/client'
import { Brand, BrandRepository } from '../domain/ports'

export class PrismaBrandRepository implements BrandRepository {
  constructor(private readonly prisma: PrismaClient) {}

  list(activeOnly: boolean): Promise<Brand[]> {
    return this.prisma.brand.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      orderBy: { name: 'asc' },
    })
  }

  findBySlug(slug: string): Promise<Brand | null> {
    return this.prisma.brand.findUnique({ where: { slug } })
  }

  findById(id: string): Promise<Brand | null> {
    return this.prisma.brand.findUnique({ where: { id } })
  }

  create(data: { name: string; slug: string; description?: string | null; logoUrl?: string | null }): Promise<Brand> {
    return this.prisma.brand.create({ data })
  }

  update(
    id: string,
    data: Partial<{ name: string; description: string | null; logoUrl: string | null; isActive: boolean }>,
  ): Promise<Brand> {
    return this.prisma.brand.update({ where: { id }, data })
  }

  async delete(id: string): Promise<void> {
    await this.prisma.brand.delete({ where: { id } })
  }
}
