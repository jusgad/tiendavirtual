import { PrismaClient, User as PrismaUser } from '@prisma/client'
import { CreateUserData, DomainUser, UserRepository } from '../domain/ports'
import { toDomainRole } from './roleMapper'

function toDomainUser(u: PrismaUser): DomainUser {
  return {
    id: u.id,
    email: u.email,
    passwordHash: u.passwordHash,
    firstName: u.firstName,
    lastName: u.lastName,
    phone: u.phone,
    role: toDomainRole(u.role),
    ageConfirmed: u.ageConfirmed,
    isActive: u.isActive,
  }
}

export class PrismaUserRepository implements UserRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findByEmail(email: string): Promise<DomainUser | null> {
    const u = await this.prisma.user.findUnique({ where: { email: email.toLowerCase() } })
    return u ? toDomainUser(u) : null
  }

  async findById(id: string): Promise<DomainUser | null> {
    const u = await this.prisma.user.findUnique({ where: { id } })
    return u ? toDomainUser(u) : null
  }

  async create(data: CreateUserData): Promise<DomainUser> {
    const u = await this.prisma.user.create({
      data: {
        email: data.email.toLowerCase(),
        passwordHash: data.passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone ?? null,
        ageConfirmed: data.ageConfirmed,
      },
    })
    return toDomainUser(u)
  }

  async updatePassword(userId: string, passwordHash: string): Promise<void> {
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash } })
  }
}
