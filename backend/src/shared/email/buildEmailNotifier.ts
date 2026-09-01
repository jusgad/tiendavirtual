import { env } from '../config/env'
import { logger } from '../logger/logger'
import { EmailNotifier } from './emailNotifier'
import { LogEmailSender } from './logSender'
import { ResendEmailSender } from './resendSender'

/**
 * Construye el notificador según la configuración.
 *
 * Sin `RESEND_API_KEY` los correos se escriben en el log en vez de enviarse.
 * Eso es lo deseable en desarrollo, y un fallo silencioso en producción: por
 * eso ahí se avisa con un `error` en el log, que es lo que sí se ve en un
 * agregador. No se rompe el arranque a propósito: una tienda sin correos vende
 * (a medias); una tienda que no arranca, no vende nada.
 */
export function buildEmailNotifier(): EmailNotifier {
  if (!env.RESEND_API_KEY) {
    if (env.NODE_ENV === 'production') {
      logger.error(
        'RESEND_API_KEY no está configurada: NO se enviará ningún correo. ' +
          'Las clientas no recibirán confirmación de pedido ni aviso de envío, ' +
          'y la recuperación de contraseña del panel no funcionará.',
      )
    }
    return new EmailNotifier(new LogEmailSender(), env.FRONTEND_URL)
  }

  return new EmailNotifier(
    new ResendEmailSender(env.RESEND_API_KEY, env.EMAIL_FROM),
    env.FRONTEND_URL,
  )
}
