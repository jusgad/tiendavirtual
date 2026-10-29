import {
  PaymentMethod as PrismaPaymentMethod,
  PaymentStatus as PrismaPaymentStatus,
} from '@prisma/client'
import { PaymentMethod as DomainPaymentMethod } from '../domain/paymentMethod'
import { PaymentStatus as DomainPaymentStatus } from '../domain/paymentStatus'

// Punto único de conversión entre los enums de dominio de `payments`
// (PaymentMethod, PaymentStatus) y los enums generados por Prisma.

const methodToDomain: Record<PrismaPaymentMethod, DomainPaymentMethod> = {
  WOMPI: DomainPaymentMethod.WOMPI,
}

const methodToPrisma: Record<DomainPaymentMethod, PrismaPaymentMethod> = {
  WOMPI: 'WOMPI',
}

export function toDomainPaymentMethod(method: PrismaPaymentMethod): DomainPaymentMethod {
  return methodToDomain[method]
}

export function toPrismaPaymentMethod(method: DomainPaymentMethod): PrismaPaymentMethod {
  return methodToPrisma[method]
}

const statusToDomain: Record<PrismaPaymentStatus, DomainPaymentStatus> = {
  PENDING: DomainPaymentStatus.PENDING,
  APPROVED: DomainPaymentStatus.APPROVED,
  DECLINED: DomainPaymentStatus.DECLINED,
  REFUNDED: DomainPaymentStatus.REFUNDED,
}

const statusToPrisma: Record<DomainPaymentStatus, PrismaPaymentStatus> = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  DECLINED: 'DECLINED',
  REFUNDED: 'REFUNDED',
}

export function toDomainPaymentStatus(status: PrismaPaymentStatus): DomainPaymentStatus {
  return statusToDomain[status]
}

export function toPrismaPaymentStatus(status: DomainPaymentStatus): PrismaPaymentStatus {
  return statusToPrisma[status]
}
