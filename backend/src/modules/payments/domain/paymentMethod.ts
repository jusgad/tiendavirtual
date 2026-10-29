/**
 * Medio de pago. Wompi es un único proveedor que internamente ofrece tarjeta,
 * Nequi, PSE y Bancolombia: el medio concreto que eligió el cliente llega en el
 * evento del webhook y se guarda en `Payment.rawPayload`, no se modela aquí.
 */
export enum PaymentMethod {
  WOMPI = 'WOMPI',
}
