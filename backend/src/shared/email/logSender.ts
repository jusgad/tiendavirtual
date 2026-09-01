import { logger } from '../logger/logger'
import { EmailMessage, EmailSender } from './types'

/**
 * Deja el correo en el log en vez de enviarlo.
 *
 * Es el adaptador que se usa cuando no hay `RESEND_API_KEY`: en desarrollo
 * permite ver el contenido (y copiar el enlace de recuperación de contraseña)
 * sin montar nada. En producción no debería llegar a usarse nunca; `main.ts`
 * avisa a gritos al arrancar si toca este camino.
 */
export class LogEmailSender implements EmailSender {
  async send(message: EmailMessage): Promise<void> {
    logger.info(
      { to: message.to, subject: message.subject, texto: message.text },
      '📧 Correo NO enviado (sin proveedor configurado)',
    )
  }
}
