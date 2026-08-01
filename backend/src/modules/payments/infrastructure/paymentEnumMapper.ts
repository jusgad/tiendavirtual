import {
  PaymentMethod as PrismaPaymentMethod,
  PaymentStatus as PrismaPaymentStatus,
} from '@prisma/client'
import { PaymentMethod as DomainPaymentMethod } from '../domain/paymentMethod'
import { PaymentStatus as DomainPaymentStatus } from '../domain/paymentStatus'

// Punto único de conversión entre los enums de dominio de `payments`
// (PaymentMethod, PaymentStatus) y los enums generados por Prisma.

const methodToDomain: Record<PrismaPaymentMethod, DomainPaymentMethod> = {
  NEQUI: DomainPaymentMethod.NEQUI,
  DAVIPLATA: DomainPaymentMethod.DAVIPLATA,
  CREDIT_CARD: DomainPaymentMethod.CREDIT_CARD,
}

const methodToPrisma: Record<DomainPaymentMethod, PrismaPaymentMethod> = {
  NEQUI: 'NEQUI',
  DAVIPLATA: 'DAVIPLATA',
  CREDIT_CARD: 'CREDIT_CARD',
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
