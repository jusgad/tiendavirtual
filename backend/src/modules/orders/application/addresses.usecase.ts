import { NotFoundError } from '../../../shared/errors/AppError'
import { Address, AddressRepository, AddressSnapshot } from '../domain/ports'

export class ListAddressesUseCase {
  constructor(private readonly repo: AddressRepository) {}
  execute(userId: string): Promise<Address[]> {
    return this.repo.listByUser(userId)
  }
}

export class CreateAddressUseCase {
  constructor(private readonly repo: AddressRepository) {}
  execute(userId: string, data: AddressSnapshot & { isDefault?: boolean }): Promise<Address> {
    return this.repo.create(userId, data)
  }
}

export class UpdateAddressUseCase {
  constructor(private readonly repo: AddressRepository) {}
  async execute(
    userId: string,
    id: string,
    data: Partial<AddressSnapshot & { isDefault: boolean }>,
  ): Promise<Address> {
    const existing = await this.repo.findByIdForUser(id, userId)
    if (!existing) throw new NotFoundError('Dirección no encontrada')
    return this.repo.update(id, userId, data)
  }
}

export class DeleteAddressUseCase {
  constructor(private readonly repo: AddressRepository) {}
  async execute(userId: string, id: string): Promise<void> {
    const existing = await this.repo.findByIdForUser(id, userId)
    if (!existing) throw new NotFoundError('Dirección no encontrada')
    await this.repo.delete(id, userId)
  }
}
