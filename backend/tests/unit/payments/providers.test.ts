import {
  CreditCardProvider,
  NequiProvider,
  ProviderRegistry,
  providerKeyToMethod,
  signPayload,
} from '../../../src/modules/payments/infrastructure/providers'
import { PaymentMethod } from '@prisma/client'

const SECRET = 'test-secret'
const charge = { orderReference: 'PA-2026-ABC', amount: 100000, currency: 'COP' }

describe('CreditCardProvider', () => {
  const provider = new CreditCardProvider(SECRET)

  it('acepta una tarjeta válida (Luhn)', async () => {
    const res = await provider.createCharge({
      ...charge,
      methodData: { card: { number: '4242424242424242', expMonth: 12, expYear: 2030, cvv: '123' } },
    })
    expect(res.externalReference).toMatch(/^card_/)
  })

  it('rechaza una tarjeta con número inválido (Luhn)', async () => {
    await expect(
      provider.createCharge({
        ...charge,
        methodData: { card: { number: '1234567890123456', expMonth: 12, expYear: 2030, cvv: '123' } },
      }),
    ).rejects.toMatchObject({ statusCode: 400 })
  })

  it('rechaza una tarjeta vencida', async () => {
    await expect(
      provider.createCharge({
        ...charge,
        methodData: { card: { number: '4242424242424242', expMonth: 1, expYear: 2024, cvv: '123' } },
      }),
    ).rejects.toMatchObject({ statusCode: 400 })
  })
})

describe('NequiProvider', () => {
  const provider = new NequiProvider(SECRET)

  it('requiere un celular colombiano válido', async () => {
    await expect(provider.createCharge({ ...charge, methodData: { phone: '123' } })).rejects.toMatchObject({
      statusCode: 400,
    })
  })

  it('crea el cobro con un celular válido', async () => {
    const res = await provider.createCharge({ ...charge, methodData: { phone: '3105676187' } })
    expect(res.externalReference).toMatch(/^nequi_/)
  })
})

describe('verifyWebhook (firma HMAC)', () => {
  const provider = new NequiProvider(SECRET)
  const payload = { externalReference: 'nequi_123', status: 'APPROVED' }

  it('acepta una firma válida y extrae el resultado', () => {
    const signature = signPayload(payload, SECRET)
    expect(provider.verifyWebhook(payload, signature)).toEqual({
      externalReference: 'nequi_123',
      approved: true,
    })
  })

  it('rechaza una firma inválida', () => {
    expect(provider.verifyWebhook(payload, 'firma-mala')).toBeNull()
  })

  it('rechaza si falta la firma', () => {
    expect(provider.verifyWebhook(payload, undefined)).toBeNull()
  })
})

describe('ProviderRegistry / mapeo', () => {
  it('resuelve cada método y mapea claves de webhook', () => {
    const registry = new ProviderRegistry([new NequiProvider(SECRET), new CreditCardProvider(SECRET)])
    expect(registry.get(PaymentMethod.NEQUI).method).toBe(PaymentMethod.NEQUI)
    expect(providerKeyToMethod('card')).toBe(PaymentMethod.CREDIT_CARD)
    expect(providerKeyToMethod('desconocido')).toBeNull()
  })
})
