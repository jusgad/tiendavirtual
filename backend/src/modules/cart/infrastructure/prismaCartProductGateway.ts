import { PrismaClient } from '@prisma/client'
import { CartProductGateway, CartProductInfo } from '../domain/ports'

const selectFields = {
  id: true,
  name: true,
  slug: true,
  price: true,
  stock: true,
  isActive: true,
  images: { select: { url: true }, orderBy: { position: 'asc' as const }, take: 1 },
}

type Row = {
  id: string
  name: string
  slug: string
  price: unknown
  stock: number
  isActive: boolean
  images: { url: string }[]
}

function toInfo(p: Row): CartProductInfo {
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    price: Number(p.price),
    stock: p.stock,
    isActive: p.isActive,
    image: p.images[0]?.url ?? null,
  }
}

export class PrismaCartProductGateway implements CartProductGateway {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(productId: string): Promise<CartProductInfo | null> {
    const p = await this.prisma.product.findUnique({ where: { id: productId }, select: selectFields })
    return p ? toInfo(p) : null
  }

  async findManyByIds(ids: string[]): Promise<CartProductInfo[]> {
    if (ids.length === 0) return []
    const rows = await this.prisma.product.findMany({ where: { id: { in: ids } }, select: selectFields })
    return rows.map(toInfo)
  }
}
