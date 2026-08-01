import { PrismaClient } from '@prisma/client'
import { NotFoundError } from '../../../shared/errors/AppError'
import { Address, AddressRepository, AddressSnapshot } from '../domain/ports'

export class PrismaAddressRepository implements AddressRepository {
  constructor(private readonly prisma: PrismaClient) {}

  listByUser(userId: string): Promise<Address[]> {
    return this.prisma.address.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    })
  }

  findByIdForUser(id: string, userId: string): Promise<Address | null> {
    return this.prisma.address.findFirst({ where: { id, userId } })
  }

  async create(userId: string, data: AddressSnapshot & { isDefault?: boolean }): Promise<Address> {
    return this.prisma.$transaction(async (tx) => {
      if (data.isDefault) {
        await tx.address.updateMany({ where: { userId }, data: { isDefault: false } })
      }
      return tx.address.create({ data: { ...data, userId } })
    })
  }

  async update(
    id: string,
    userId: string,
    data: Partial<AddressSnapshot & { isDefault: boolean }>,
  ): Promise<Address> {
    return this.prisma.$transaction(async (tx) => {
      // Defensa en profundidad: confirma que la dirección es del usuario antes de
      // tocarla, para que un `id` de otro usuario nunca pueda modificarse.
      const owned = await tx.address.findFirst({ where: { id, userId }, select: { id: true } })
      if (!owned) throw new NotFoundError('Dirección no encontrada')

      if (data.isDefault) {
        await tx.address.updateMany({ where: { userId }, data: { isDefault: false } })
      }
      return tx.address.update({ where: { id }, data })
    })
  }

  async delete(id: string, userId: string): Promise<void> {
    await this.prisma.address.deleteMany({ where: { id, userId } })
  }
}
