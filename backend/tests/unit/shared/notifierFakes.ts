/**
 * Espías de los puertos de notificación por correo.
 *
 * Cada módulo declara su propio puerto estrecho (`OrderNotifier`,
 * `PaymentNotifier`, `ShipmentNotifier`, `PasswordResetNotifier`) y en
 * producción los cuatro los cumple una sola clase. Aquí pasa lo mismo:
 * `SpyNotifier` los satisface todos por estructura, y guarda lo enviado para
 * poder afirmar sobre ello.
 */
export class SpyNotifier {
  readonly enviados: { tipo: string; datos: Record<string, unknown> }[] = []

  /** Si se activa, todos los envíos lanzan: sirve para probar la tolerancia a fallos. */
  falla = false

  private registrar(tipo: string, datos: Record<string, unknown>) {
    if (this.falla) throw new Error('proveedor de correo caído')
    this.enviados.push({ tipo, datos })
  }

  async orderPlaced(datos: Record<string, unknown>): Promise<void> {
    this.registrar('orderPlaced', datos)
  }

  async orderPaid(datos: Record<string, unknown>): Promise<void> {
    this.registrar('orderPaid', datos)
  }

  async orderShipped(datos: Record<string, unknown>): Promise<void> {
    this.registrar('orderShipped', datos)
  }

  async passwordReset(datos: Record<string, unknown>): Promise<void> {
    this.registrar('passwordReset', datos)
  }

  /** Los envíos de un tipo, para afirmar sin escarbar en el array completo. */
  de(tipo: string) {
    return this.enviados.filter((e) => e.tipo === tipo).map((e) => e.datos)
  }
}
