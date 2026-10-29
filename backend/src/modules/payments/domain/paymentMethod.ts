/**
 * Medio de pago. Mercado Pago es un único proveedor que internamente ofrece
 * tarjeta, PSE, Efecty, Nequi y saldo de Mercado Pago: el medio concreto que
 * eligió la clienta llega en el pago consultado por el webhook y se guarda en
 * `Payment.rawPayload`, no se modela aquí.
 */
export enum PaymentMethod {
  MERCADO_PAGO = 'MERCADO_PAGO',
}
