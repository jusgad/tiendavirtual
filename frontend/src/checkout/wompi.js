// Carga e invocación del Widget de Checkout de Wompi.
//
// El widget es un script externo que expone `window.WidgetCheckout`. Se aísla
// aquí para que el componente no tenga que lidiar con la carga del <script>,
// y para poder simularlo en tests.

// De dónde se carga el widget. Es Wompi salvo que se apunte a otro sitio, que
// es lo que hace el entorno de Docker para poder recorrer una compra sin
// credenciales de sandbox (ver `backend/scripts/wompi-widget-falso.mjs`).
// En producción nadie define esta variable y queda la URL de Wompi.
const WIDGET_WOMPI = 'https://checkout.wompi.co/widget.js'
const WIDGET_SRC = import.meta.env.VITE_WOMPI_WIDGET_URL || WIDGET_WOMPI

/**
 * ¿Se está usando el widget simulado en vez del de Wompi? Importa porque el
 * simulado se traga cualquier llave pública, y el real no (ver abajo).
 */
export const WIDGET_SIMULADO = WIDGET_SRC !== WIDGET_WOMPI

let loadPromise = null

/**
 * ¿Esta llave pública sirve para abrir el widget REAL de Wompi?
 *
 * Una llave de Wompi es `pub_test_` o `pub_prod_` seguido de una ristra larga
 * de letras y números, sin guiones bajos. No vale cualquier otra cosa:
 *
 * - la de `.env.example`, que son puros ceros;
 * - la del stack de pruebas (`pub_test_simulacion_local`), que solo entiende
 *   el widget falso de `backend/scripts/wompi-widget-falso.mjs`;
 * - cualquier otra inventada.
 *
 * Importa detectarlas porque el widget real NO avisa: le pide el comercio a la
 * API de Wompi, recibe «Formato inválido» y se queda con su velo oscuro y el
 * giro de carga para siempre, sin mensaje y sin forma de cerrarlo. Mejor no
 * abrirlo y decir en la página que faltan las credenciales.
 */
const FORMATO_LLAVE = /^pub_(test|prod)_[A-Za-z0-9]{20,}$/

export function isUnusableKey(publicKey) {
  if (!publicKey) return true
  // Los ceros pasan el formato por longitud, así que se miran aparte.
  if (/^pub_(test|prod)_0+$/.test(publicKey)) return true
  return !FORMATO_LLAVE.test(publicKey)
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
