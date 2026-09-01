/**
 * Puerto de envío de correo. Deliberadamente mínimo: un mensaje ya compuesto.
 *
 * Quién lo implementa (Resend, un log en consola, mañana otro proveedor) no le
 * importa a nadie más. Los módulos no dependen de esta interfaz directamente:
 * cada uno declara su propio puerto estrecho en su dominio y recibe el
 * notificador ya construido, igual que se hace con el caché de catálogo.
 */
export interface EmailSender {
  send(message: EmailMessage): Promise<void>
}

export interface EmailMessage {
  to: string
  subject: string
  /** Cuerpo en HTML. */
  html: string
  /** Alternativa en texto plano: no todos los clientes muestran HTML. */
  text: string
}
