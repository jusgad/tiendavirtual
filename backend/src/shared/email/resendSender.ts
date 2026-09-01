import { EmailMessage, EmailSender } from './types'

/**
 * Envío por la API HTTP de Resend.
 *
 * Se llama con `fetch` en vez de con el SDK: es una sola petición POST y así
 * no entra otra dependencia al proyecto. `fetch` es global desde Node 18.
 */
export class ResendEmailSender implements EmailSender {
  constructor(
    private readonly apiKey: string,
    private readonly from: string,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async send(message: EmailMessage): Promise<void> {
    const res = await this.fetchImpl('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: this.from,
        to: [message.to],
        subject: message.subject,
        html: message.html,
        text: message.text,
      }),
    })

    if (!res.ok) {
      // El cuerpo del error de Resend dice el motivo real (dominio sin
      // verificar, llave revocada…). Sin él, depurar esto es adivinar.
      const detalle = await res.text().catch(() => '')
      throw new Error(`Resend respondió ${res.status}: ${detalle.slice(0, 300)}`)
    }
  }
}
