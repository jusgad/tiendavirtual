import {
  PaymentMethod as PrismaPaymentMethod,
  PaymentStatus as PrismaPaymentStatus,
  Prisma,
  PrismaClient,
} from '@prisma/client'
import { PaymentRecord, PaymentRepository } from '../domain/ports'
import { PaymentMethod } from '../domain/paymentMethod'
import { PaymentStatus } from '../domain/paymentStatus'
import {
  toDomainPaymentMethod,
  toDomainPaymentStatus,
  toPrismaPaymentMethod,
  toPrismaPaymentStatus,
} from './paymentEnumMapper'

type Row = {
  id: string
  orderId: string
  method: PrismaPaymentMethod
  status: PrismaPaymentStatus
  amount: unknown
  currency: string
  externalReference: string | null
  providerTransactionId: string | null
}

const toRecord = (p: Row): PaymentRecord => ({
  id: p.id,
  orderId: p.orderId,
  method: toDomainPaymentMethod(p.method),
  status: toDomainPaymentStatus(p.status),
  amount: Number(p.amount),
  currency: p.currency,
  externalReference: p.externalReference,
  providerTransactionId: p.providerTransactionId,
})

export class PrismaPaymentRepository implements PaymentRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(data: {
    orderId: string
    method: PaymentMethod
    amount: number
    currency: string
    externalReference: string
  }): Promise<PaymentRecord> {
    const p = await this.prisma.payment.create({
      data: { ...data, method: toPrismaPaymentMethod(data.method) },
    })
    return toRecord(p)
  }

  async findByIdForUser(id: string, userId: string): Promise<PaymentRecord | null> {
    const p = await this.prisma.payment.findFirst({ where: { id, order: { userId } } })
    return p ? toRecord(p) : null
  }

  async findByExternalReference(ref: string): Promise<PaymentRecord | null> {
    // Si hubo varios intentos con la misma referencia, gana el más reciente.
    const p = await this.prisma.payment.findFirst({
      where: { externalReference: ref },
      orderBy: { createdAt: 'desc' },
    })
    return p ? toRecord(p) : null
  }

  async findPendingByOrderId(orderId: string): Promise<PaymentRecord | null> {
    const p = await this.prisma.payment.findFirst({
      where: { orderId, status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
    })
    return p ? toRecord(p) : null
  }

  async markStatus(
    id: string,
    status: PaymentStatus,
    rawPayload: unknown,
    providerTransactionId: string | null,
  ): Promise<PaymentRecord> {
    const p = await this.prisma.payment.update({
      where: { id },
      data: {
        status: toPrismaPaymentStatus(status),
        rawPayload: rawPayload as Prisma.InputJsonValue,
        providerTransactionId,
      },
    })
    return toRecord(p)
  }
}
