import { Role as PrismaRole } from '@prisma/client'
import { Role as DomainRole } from '../domain/role'

// Punto único de conversión entre el `Role` de dominio y el enum de Prisma.
const toDomainMap: Record<PrismaRole, DomainRole> = {
  CLIENT: DomainRole.CLIENT,
  ADMIN: DomainRole.ADMIN,
}

const toPrismaMap: Record<DomainRole, PrismaRole> = {
  CLIENT: 'CLIENT',
  ADMIN: 'ADMIN',
}

export function toDomainRole(role: PrismaRole): DomainRole {
  return toDomainMap[role]
}

export function toPrismaRole(role: DomainRole): PrismaRole {
  return toPrismaMap[role]
}
