// Rol de usuario del dominio, independiente del enum generado por Prisma.
// Los valores coinciden a propósito con el enum `Role` de `schema.prisma`;
// la conversión explícita hacia/desde Prisma vive en la infraestructura
// (ver `infrastructure/roleMapper.ts`).
export const Role = {
  CLIENT: 'CLIENT',
  ADMIN: 'ADMIN',
} as const

export type Role = (typeof Role)[keyof typeof Role]
