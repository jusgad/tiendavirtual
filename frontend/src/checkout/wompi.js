// Carga e invocación del Widget de Checkout de Wompi.
//
// El widget es un script externo que expone `window.WidgetCheckout`. Se aísla
// aquí para que el componente no tenga que lidiar con la carga del <script>,
// y para poder simularlo en tests.

const WIDGET_SRC = 'https://checkout.wompi.co/widget.js'

let loadPromise = null

/**
 * Llave pública de marcador de posición: la que trae `.env.example` cuando aún
 * no se han puesto las credenciales reales de Wompi. Con ella el widget no
 * funciona, así que conviene detectarla y decirlo claramente en vez de dejar
 * que falle de forma confusa.
 */
export function isPlaceholderKey(publicKey) {
  return !publicKey || /^pub_(test|prod)_0+$/.test(publicKey)
}

/** Carga el script una sola vez y resuelve con el constructor del widget. */
export function loadWompiWidget() {
  if (typeof window !== 'undefined' && window.WidgetCheckout) {
    return Promise.resolve(window.WidgetCheckout)
  }

  if (!loadPromise) {
    loadPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = WIDGET_SRC
      script.async = true
      script.onload = () => {
        if (window.WidgetCheckout) resolve(window.WidgetCheckout)
        else {
          loadPromise = null
          reject(new Error('El widget de Wompi se cargó pero no quedó disponible'))
        }
      }
      script.onerror = () => {
        // Se limpia para poder reintentar si fue un fallo de red puntual.
        loadPromise = null
        reject(new Error('No se pudo cargar el widget de Wompi. Revisa tu conexión.'))
      }
      document.head.appendChild(script)
    })
  }

  return loadPromise
}

/**
 * Abre el widget con la configuración firmada que devolvió el backend.
 * Resuelve con la transacción que informa el widget al cerrarse, o `null` si
 * el cliente cerró sin pagar.
 *
 * OJO: lo que devuelve el widget es **informativo**, no una prueba de pago.
 * La confirmación real llega por webhook; quien llama debe verificar el estado
 * contra el backend.
 */
export async function openWompiCheckout(checkout) {
  const WidgetCheckout = await loadWompiWidget()

  return new Promise((resolve) => {
    const widget = new WidgetCheckout({
      currency: checkout.currency,
      amountInCents: checkout.amountInCents,
      reference: checkout.reference,
      publicKey: checkout.publicKey,
      signature: { integrity: checkout.signature },
      // Solo se pasa si el backend lo definió. Los medios que sacan al cliente
      // del sitio (PSE, Bancolombia) lo necesitan para saber a dónde volver.
      ...(checkout.redirectUrl ? { redirectUrl: checkout.redirectUrl } : {}),
    })

    widget.open((result) => {
      resolve(result?.transaction ?? null)
    })
  })
}
