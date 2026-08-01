import { Prisma, PrismaClient } from '@prisma/client'
import {
  CreateProductData,
  Paginated,
  Product,
  ProductFilter,
  ProductRepository,
  UpdateProductData,
} from '../domain/ports'

const withRelations = {
  brand: { select: { id: true, name: true, slug: true } },
  category: { select: { id: true, name: true, slug: true } },
  images: { orderBy: { position: 'asc' as const } },
}

type PrismaProduct = Prisma.ProductGetPayload<{ include: typeof withRelations }>

function toProduct(p: PrismaProduct): Product {
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    sku: p.sku,
    description: p.description,
    brandId: p.brandId,
    categoryId: p.categoryId,
    price: Number(p.price),
    currency: p.currency,
    presentation: p.presentation,
    sizeMl: p.sizeMl,
    usageType: p.usageType,
    skinType: p.skinType,
    ingredients: p.ingredients,
    warnings: p.warnings,
    stock: p.stock,
    isActive: p.isActive,
    brand: p.brand,
    category: p.category,
    images: p.images.map((i) => ({ id: i.id, url: i.url, alt: i.alt, position: i.position })),
  }
}

export class PrismaProductRepository implements ProductRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async list(filter: ProductFilter): Promise<Paginated<Product>> {
    const where: Prisma.ProductWhereInput = {}
    if (filter.activeOnly) where.isActive = true
    if (filter.categorySlug) where.category = { slug: filter.categorySlug }
    if (filter.brandSlug) where.brand = { slug: filter.brandSlug }
    if (filter.usageType) where.usageType = filter.usageType
    if (filter.skinType) where.skinType = filter.skinType
    if (filter.minPrice != null || filter.maxPrice != null) {
      where.price = {}
      if (filter.minPrice != null) where.price.gte = filter.minPrice
      if (filter.maxPrice != null) where.price.lte = filter.maxPrice
    }
    if (filter.search) {
      where.OR = [
        { name: { contains: filter.search, mode: 'insensitive' } },
        { description: { contains: filter.search, mode: 'insensitive' } },
      ]
    }

    const orderBy: Prisma.ProductOrderByWithRelationInput =
      filter.sort === 'price_asc'
        ? { price: 'asc' }
        : filter.sort === 'price_desc'
          ? { price: 'desc' }
          : { createdAt: 'desc' }

    const skip = (filter.page - 1) * filter.pageSize

    const [rows, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        include: withRelations,
        orderBy,
        skip,
        take: filter.pageSize,
      }),
      this.prisma.product.count({ where }),
    ])

    return {
      items: rows.map(toProduct),
      total,
      page: filter.page,
      pageSize: filter.pageSize,
    }
  }

  async findBySlug(slug: string): Promise<Product | null> {
    const p = await this.prisma.product.findUnique({ where: { slug }, include: withRelations })
    return p ? toProduct(p) : null
  }

  async findById(id: string): Promise<Product | null> {
    const p = await this.prisma.product.findUnique({ where: { id }, include: withRelations })
    return p ? toProduct(p) : null
  }

  async create(data: CreateProductData & { slug: string }): Promise<Product> {
    const p = await this.prisma.product.create({
      data: {
        name: data.name,
        slug: data.slug,
        sku: data.sku,
        description: data.description,
        brandId: data.brandId,
        categoryId: data.categoryId,
        price: data.price,
        presentation: data.presentation ?? null,
        sizeMl: data.sizeMl ?? null,
        usageType: data.usageType ?? null,
        skinType: data.skinType ?? null,
        ingredients: data.ingredients ?? null,
        warnings: data.warnings ?? null,
        stock: data.stock,
        images: data.images?.length
          ? { create: data.images.map((i, idx) => ({ url: i.url, alt: i.alt ?? null, position: i.position ?? idx })) }
          : undefined,
      },
      include: withRelations,
    })
    return toProduct(p)
  }

  async update(id: string, data: UpdateProductData): Promise<Product> {
    const p = await this.prisma.product.update({
      where: { id },
      data,
      include: withRelations,
    })
    return toProduct(p)
  }

  async delete(id: string): Promise<void> {
    await this.prisma.product.delete({ where: { id } })
  }
}
