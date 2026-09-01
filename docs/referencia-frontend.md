# Referencia · Frontend

`frontend/` es un único proyecto Vite que construye **dos páginas
independientes** con propósitos distintos.

| Página | Entrada HTML | Raíz React | Qué hace | ¿Llama a la API? |
|---|---|---|---|---|
| **Landing** | `index.html` | `src/main.jsx` → `src/App.jsx` | Vende el combo Día + Noche por WhatsApp | **No** |
| **Checkout demo** | `checkout.html` | `src/checkout-main.jsx` → `src/checkout/CheckoutApp.jsx` | Flujo de compra completo de 5 pasos | **Sí** |
| **Panel admin** | `admin.html` | `src/admin-main.jsx` → `src/admin/AdminApp.jsx` | Gestión completa de la tienda: pedidos, catálogo, cupones y reportes | **Sí** |

Ambas están declaradas como entradas de build en
[`vite.config.js`](../frontend/vite.config.js):

```js
build: {
  rollupOptions: {
    input: {
      main: resolve(__dirname, 'index.html'),
      checkout: resolve(__dirname, 'checkout.html'),
      admin: resolve(__dirname, 'admin.html'),
    },
  },
}
```

`npm run build` genera las tres. Si añades una cuarta página, tienes que
registrarla aquí o no se compilará.

**Stack**: React 18 · Vite 5 · Tailwind CSS 3 · sin router, sin gestor de estado,
sin cliente HTTP externo (`fetch` nativo). Tests con **Vitest**, hoy solo sobre
el cliente de API.

---

## Landing (`index.html`)

Página de una sola vista con alternancia **Día / Noche**. No tiene backend
propio: la conversión ocurre en WhatsApp o saltando al checkout demo.

### Estado

Todo el estado vive en [`src/App.jsx`](../frontend/src/App.jsx) — dos valores:

| Estado | Tipo | Qué controla |
|---|---|---|
| `mode` | `'day'` \| `'night'` | Paleta, fondo, copys, mascota, tubo y CTA |
| `toast` | boolean | Visibilidad del aviso de "agregado" |

### Cómo se alterna Día/Noche

Tres formas, todas escriben el mismo estado:

1. El switch del `Header`.
2. El botón sol/luna de la esquina (`SunMoon`) — solo escritorio.
3. **Swipe horizontal** en pantallas táctiles: izquierda → noche, derecha → día. Umbral de 55 px.

Además hay un **ciclo automático cada 7 segundos** (`setInterval` en `App.jsx`),
heredado del diseño original como efecto de escaparate.

### Qué hace el botón "Comprar"

```js
const buy = () => {
  setToast(true)
  clearTimeout(toastTimer.current)
  toastTimer.current = setTimeout(() => {
    window.location.href = '/checkout.html'
  }, 900)
}
```

Muestra el toast y **900 ms después redirige a la demo de checkout**. Es el
único punto de contacto entre la landing y el backend, y es indirecto: la
landing en sí no hace ninguna petición HTTP.

El botón *Comprar por WhatsApp* es un enlace directo a `wa.me`, sin redirección.

### Componentes

Todos en [`src/components/`](../frontend/src/components/) y son de presentación
pura: reciben props, no tienen estado propio.

| Componente | Responsabilidad |
|---|---|
| `Background` | Degradado día ↔ noche estrellada, con crossfade |
| `SunMoon` | Botón sol/luna flotante (esquina, solo escritorio) |
| `Header` | Logo y switch Día/Noche |
| `Hero` | Rejilla de 3 columnas: beneficios · producto en podio · CTA flotante |
| `BenefitsPanel` | Lista de beneficios según el modo |
| `ProductStage` | Producto sobre podio con mascota y tubo |
| `FloatingCta` | Llamada a la acción flotante hacia WhatsApp |
| `OfferCard` | Tarjeta de precio, botones de compra, sellos de confianza y redes |
| `StickyBar` | Barra inferior fija con precio y accesos de compra |
| `ImageSlot` | Envoltorio de imagen con placeholder de respaldo |
| `Toast` | Aviso de confirmación tras pulsar *Comprar* |

El `Hero` colapsa a una columna por debajo de 920 px (regla en `src/index.css`).

### Configuración de negocio

[`src/site.js`](../frontend/src/site.js) centraliza lo que cambia sin tocar
componentes:

| Export | Valor actual | Usado en |
|---|---|---|
| `PRICE` | `'$79.900'` | `OfferCard`, `StickyBar` |
| `CURRENCY` | `'COP'` | `OfferCard` |
| `WHATSAPP_PHONE` | `'573105676187'` | `whatsappUrl()` |
| `whatsappUrl(message?)` | Construye `https://wa.me/<phone>?text=<mensaje url-encoded>` | `OfferCard`, `FloatingCta`, `StickyBar` |
| `DAY_BENEFITS` | 4 objetos `{ icon, text }` | `BenefitsPanel` |
| `NIGHT_BENEFITS` | 4 objetos `{ icon, text }` | `BenefitsPanel` |

**Para cambiar el precio o el teléfono, edita solo este archivo.**

Un detalle a tener en cuenta: el precio de la landing (`$79.900` por el combo)
es independiente de los precios del catálogo del backend (`$45.900` por cada
crema en el seed). Son dos fuentes de verdad distintas y nada las sincroniza.

### Enlaces pendientes

Los iconos de Instagram, TikTok y Facebook en `OfferCard.jsx` apuntan a
`href="#"`. Hay que reemplazarlos por las URLs reales.

### Imágenes

Se sirven como **assets estáticos** desde
[`frontend/public/images/`](../frontend/public/images/) y se referencian por
ruta absoluta en el objeto `products` de `App.jsx`:

```js
const products = {
  tubeDay:   '/images/tubo_dia.png',
  tubeNight: '/images/tubo_noche.png',
}
```

Son PNG con fondo transparente, a 400 px de ancho (~250-290 KB cada uno).
El ancho sale de dónde se muestran —150 px en la landing, ~300 px en la
tarjeta del checkout—, así que deja margen para pantallas retina sin cargar
de más. Los originales rondaban los 5 MB cada uno.

El favicon de las cuatro páginas es `/images/logo.png`, y el mismo archivo
es el logotipo que usa [`shared/Logo.jsx`](../frontend/src/shared/Logo.jsx).

> No se importan desde `src/`, así que Vite no las procesa ni les pone hash.
> Para añadir una imagen, ponla en `public/images/` y referénciala con
> `/images/<archivo>`.

---

## Checkout demo (`checkout.html`)

Flujo de compra de 5 pasos contra la API real del backend. Se identifica como
demo en la propia interfaz (badge "demo de checkout" en el encabezado).

### Los 5 pasos

Orquestados por [`CheckoutApp.jsx`](../frontend/src/checkout/CheckoutApp.jsx)
con un único índice `step` sobre el array `STEPS`:

| # | Paso | Componente | Qué ocurre |
|---|---|---|---|
| 0 | Cuenta | `AuthStep` | Login, registro, o **continuar como invitado** |
| 1 | Tienda | `ShopStep` | Catálogo + carrito lateral con control de cantidad |
| 2 | Envío | `CheckoutFormStep` | Dirección, cupón, empaque discreto → crea el pedido |
| 3 | Pago | `PaymentStep` | Abre el widget de Wompi y verifica el resultado contra el backend |
| 4 | Confirmación | `ConfirmationStep` | Resumen, estado real del pago y datos para el seguimiento |

Indicador visual de progreso: `components/StepIndicator.jsx`.

### Estado de `CheckoutApp`

| Estado | Para qué |
|---|---|
| `checkingSession` | Bloquea el render mientras valida el token guardado |
| `user` | Usuario autenticado, o `null` si es invitado |
| `step` | Índice del paso actual |
| `order` | Pedido creado en el paso "Envío" |
| `payment` | `{ payment, instructions }` devuelto por `POST /payments` |
| `cartVersion` | Contador que fuerza remontar `ShopStep` tras fusionar carritos |

### Sesión persistente

Al cargar la página, si hay sesión guardada en `localStorage`, se valida contra
`GET /auth/me`:

- Token válido → salta directo al paso 1 (Tienda).
- Token inválido → limpia la sesión y muestra el paso 0.

### Fusión de carrito al iniciar sesión

Cuando el usuario se autentica y ya tenía un `guestId` guardado:

```js
const guestId = getGuestId()
if (guestId) {
  try { await api.mergeCart(guestId) } finally { clearGuestId() }
}
```

Llama a `POST /cart/merge`, que suma las cantidades del carrito de invitado al
del usuario (acotadas al stock) y vacía el de invitado. Luego incrementa
`cartVersion` para que `ShopStep` recargue.

### Cliente de API

[`src/checkout/api.js`](../frontend/src/checkout/api.js). Sin dependencias
externas: `fetch` nativo.

**URL base**: `import.meta.env.VITE_API_URL || 'http://localhost:3000/api'`

**Claves de `localStorage`**

| Clave | Contenido |
|---|---|
| `pomass_access_token` | Access token JWT |
| `pomass_refresh_token` | Refresh token opaco |
| `pomass_user` | Objeto de usuario serializado |
| `pomass_guest_id` | Token de invitado |

**Cabeceras automáticas**

1. Siempre `Content-Type: application/json`.
2. Si hay access token y `auth !== false`: `Authorization: Bearer <token>`.
3. Si **no** se puso `Authorization` y hay `guestId`: `x-guest-id: <guestId>`.

**Captura automática de `guestId`**: cualquier respuesta que traiga un campo
`guestId` en la raíz lo guarda en `localStorage`. Por eso el flujo de invitado
funciona sin código explícito en los componentes.

**Métodos**

| Método | Endpoint |
|---|---|
| `register(payload)` | `POST /auth/register` (sin auth) |
| `login(payload)` | `POST /auth/login` (sin auth) |
| `me()` | `GET /auth/me` |
| `listProducts(params)` | `GET /products?...` (sin auth) |
| `getCart()` | `GET /cart` |
| `addCartItem(productId, quantity=1)` | `POST /cart/items` |
| `updateCartItem(productId, quantity)` | `PATCH /cart/items/:productId` |
| `removeCartItem(productId)` | `DELETE /cart/items/:productId` |
| `mergeCart(guestId)` | `POST /cart/merge` |
| `checkout(payload)` | `POST /orders` |
| `getOrder(id)` | `GET /orders/:id` |
| `trackOrder({ orderNumber, email })` | `GET /orders/track` (sin auth) |
| `initiatePayment(payload)` | `POST /payments` |

**Renovación automática del access token**

El access token vive 15 minutos; el refresh token, 7 días. El cliente renueva
solo, sin que los componentes se enteren:

1. Una petición autenticada devuelve `401`.
2. Si hay refresh token guardado, se llama a `POST /auth/refresh`, se guarda el par rotado y **se reintenta la petición original una sola vez**.
3. Si la renovación falla, el refresh token también caducó o fue revocado: se limpia la sesión y se avisa a la aplicación.

Dos detalles que importan:

- **Las renovaciones concurrentes se deduplican.** El backend rota el refresh token en cada uso y rechaza reutilizar uno consumido. Si tres peticiones caducaran a la vez y cada una pidiera su renovación, la segunda y la tercera usarían un token ya gastado y **matarían la sesión recién renovada**. Todas esperan la misma promesa en vuelo.
- **Se reintenta como máximo una vez.** Un `401` después de renovar se propaga, sin bucle.

```js
import { setOnSessionExpired } from './api'

// La app se entera solo cuando la sesión se perdió de verdad.
setOnSessionExpired(() => { /* volver al paso 0 */ })
```

`CheckoutApp` registra ese aviso y muestra un banner explicando qué pasó.

**Manejo de errores**: todo lanza `ApiError` con `message`, `status` y
`details`. El mensaje sale de `error.message` de la API. Si `fetch` falla
(backend caído), lanza `ApiError` con `status: 0` y un mensaje explícito que
nombra la URL:

> `No se pudo conectar con la API (http://localhost:3000/api). ¿Está el backend corriendo?`

**Utilidad de formato**

```js
formatCOP(45900)  // → "$ 45.900"
```

Usa `Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })`.

### Componentes de UI

[`src/checkout/components/ui.jsx`](../frontend/src/checkout/components/ui.jsx) —
primitivos compartidos por los pasos:

| Componente | Props relevantes |
|---|---|
| `Card` | `className` |
| `Field` | `label`, `error` |
| `Input` | pasa todo a `<input>` |
| `PrimaryButton` | pasa todo a `<button>`; ancho completo, degradado durazno |
| `SecondaryButton` | pasa todo a `<button>`; contorno |
| `ErrorBanner` | `message` — no renderiza nada si es vacío |

### Detalles de cada paso

**`AuthStep`** — pestañas Login / Crear cuenta. En registro pide nombre,
apellido, celular opcional y **casilla obligatoria** de mayoría de edad
(`ageConfirmed`), que el backend exige. El botón "Continuar como invitado" salta
al paso 1 sin autenticarse.

**`ShopStep`** — carga catálogo (`pageSize: 12`) y carrito en paralelo. Cada
tarjeta muestra marca, presentación y stock. Si el producto ya está en el
carrito muestra un control `−  n  +`; el `+` se deshabilita al alcanzar el
stock. Si el catálogo no carga, muestra el error con un botón *Reintentar*.

**`CheckoutFormStep`** — formulario de dirección. Si **no** hay usuario, pide un
correo de contacto (`guestEmail`), que el backend exige para invitados. Envía
siempre `shippingAddress` (nunca `addressId`), normalizando `line2` y
`postalCode` vacíos a `null`. El panel lateral muestra el subtotal y avisa de
que descuento y envío se calculan al confirmar — porque es el backend quien los
calcula.

**`PaymentStep`** — **no pide datos de tarjeta**. Al entrar llama a
`POST /payments` para obtener la configuración firmada y muestra un único botón
que abre el widget de Wompi, donde el cliente elige entre tarjeta, Nequi, PSE o
Bancolombia. Sus fases:

```
preparing → ready → paying (widget abierto) → verifying (consultando) → onPaid
```

Cuando el widget se cierra, **no se cree lo que informa**: pasa a "verificando"
y consulta `GET /orders/track` cada 3 s, hasta 20 veces (~60 s), esperando que
el estado del pedido deje de ser `PENDING`. La única fuente de verdad es el
webhook, que llega al backend por su cuenta. Si se agota la espera, se continúa
igualmente y la confirmación lo explica.

Si el cliente cierra el widget sin pagar, vuelve a `ready` sin error.

Detecta además la **llave pública de ejemplo** (`pub_test_0000…`) y, en vez de
abrir un widget que fallaría, muestra qué hay que configurar en `backend/.env`.

**`ConfirmationStep`** — tres desenlaces según el estado real leído del backend:

| Estado | Mensaje |
|---|---|
| Pedido pagado | «¡Pago confirmado!» + «Ya estamos preparando tu pedido» |
| Wompi rechazó | «El pago no se completó», con el pedido aún reservado |
| Sin confirmar aún | «Estamos esperando la confirmación» (PSE puede tardar minutos) |

Siempre muestra el desglose y, destacado, **el número de pedido y el correo**:
son las dos cosas que hacen falta para consultar el seguimiento sin cuenta.

**`wompi.js`** — carga del script externo (una sola vez, deduplicada) e
invocación del widget. Aislado del componente para poder simularlo en tests.

---

---

## Panel admin (`admin.html`)

Interfaz operativa para llevar la tienda. Cinco secciones, todas construidas:

- **Pedidos** — listado con filtro y paginación, detalle con direcciones e
  historial, transiciones de estado (preparación, despacho con transportadora
  y guía obligatorios, entrega, cancelación).
- **Productos** — alta, edición, activación y borrado. La lista pide siempre
  `includeInactive=true`: si no, un producto desactivado desaparecería y no
  habría forma de reactivarlo. Las imágenes se administran por dirección web,
  con orden editable.
- **Categorías y marcas** — dos listas de la misma forma (nombre, estado),
  con alta en línea, activación y borrado.
- **Cupones** — alta y edición. El código no se puede cambiar al editar
  (quien ya lo tenga dejaría de poder usarlo) y el estado —Vigente,
  Programado, Expirado, Agotado, Desactivado— se calcula en el cliente.
- **Reportes** — ventas por día o por mes en el rango elegido, productos más
  vendidos y conteo de pedidos por estado.

### Autenticación

[`LoginGate.jsx`](../frontend/src/admin/LoginGate.jsx) valida credenciales
contra `POST /auth/login`. Al recibir la respuesta, llama a `storeSession(data)`
que guarda en `localStorage` el usuario, el access token y el refresh token
(este permite reutilizar la sesión al recargar la página). La renovación
automática del access token vencido corre en
[`httpClient.js`](../frontend/src/shared/httpClient.js): si un endpoint devuelve
401, se renueva el token con `POST /auth/refresh` y se reintenta la petición.
La renovación se deduplica para evitar consumir el refresh token dos veces si
hay múltiples peticiones caducadas a la vez.

### Enrutador

Hash router casero en [`router.js`](../frontend/src/admin/router.js) — sin
dependencias. Rutas:

| Ruta | Componente | Qué hace |
|---|---|---|
| `/` | `LoginGate` | Formulario de acceso (no muestra si hay sesión válida) |
| `/pedidos` | `OrdersPage` | Listado de pedidos con filtro por estado y paginación |
| `/pedidos/:id` | `OrderDetailPage` | Detalle de un pedido, acciones de transición |
| `/productos` | `ProductsPage` + `ProductForm` | Catálogo: lista, alta y edición |
| `/taxonomia` | `TaxonomyPage` | Categorías y marcas |
| `/cupones` | `CouponsPage` | Cupones: lista, alta y edición |
| `/reportes` | `ReportsPage` | Ventas, top de productos y pedidos por estado |

El router también escucha cambios de hash y renderiza el componente correcto.

### Estructura de `src/admin/`

| Archivo | Responsabilidad |
|---|---|
| `AdminApp.jsx` | Shell: sesión, sidebar, enrutador |
| `LoginGate.jsx` | Formulario de login; valida contra la API |
| `router.js` | Router por hash, sin dependencias externas |
| `api.js` | Cliente de endpoints `/api/admin/*` |
| `components/ui.jsx` | Primitivos: `Badge`, `Table`, `Modal`, `FilaMensaje`, `Confirmacion` |
| `orders/OrdersPage.jsx` | Listado de pedidos |
| `orders/OrderDetailPage.jsx` | Detalle + panel de acciones |
| `orders/ShipDialog.jsx` | Modal para registrar transportadora y guía |
| `orders/CancelDialog.jsx` | Modal de confirmación de cancelación |
| `orders/ordersModel.js` | Lógica pura: validación de guía, transiciones |
| `catalog/ProductsPage.jsx` | Lista de productos, activar/desactivar, borrar |
| `catalog/ProductForm.jsx` | Alta y edición, con editor de imágenes por URL |
| `catalog/TaxonomyPage.jsx` | Categorías y marcas (dos instancias de `Seccion`) |
| `catalog/productsModel.js` | Lógica pura: validación, payload, orden de imágenes |
| `coupons/CouponsPage.jsx` | Lista, alta y edición de cupones |
| `coupons/couponsModel.js` | Lógica pura: validación, estado, descripción del descuento |
| `reports/ReportsPage.jsx` | Las tres vistas de reporte |
| `reports/Bars.jsx` | Barras horizontales con divs; sin librería de gráficas |
| `reports/reportsModel.js` | Lógica pura: rango, límites en hora de Colombia, escalado |

Patrón repetido en las cuatro pantallas nuevas: **la lógica testeable vive en
un `*Model.js` puro** y el componente solo pinta. Vitest corre en entorno node
sin DOM, así que los componentes no llevan test; su render se verifica en
navegador.

Las pantallas que recargan tras una mutación llevan una guarda `cargaId` con
`useRef`: el identificador se toma antes del `await` y se compara en la rama
de éxito y en la de error, para que una respuesta vieja que llega tarde no
pise a la más reciente.

### Seguridad

Tras el login exitoso, el panel comprueba que `data.user.role === 'ADMIN'`.
Si no es ADMIN, se muestra «Esta cuenta no tiene permisos de administración.»
y no se guarda la sesión. Este gate es **solo por conveniencia**: la
autenticación real ocurre en el backend, que valida con `roleGuard('ADMIN')`
en cada endpoint `/admin`. La sesión guardada es la del servidor (no se puede
falsificar desde el navegador).

### Integración con código compartido

`src/admin/components/ui.jsx` y `src/admin/api.js` **reutilizan** código de
`src/shared/` para evitar duplicación:

- [`src/shared/httpClient.js`](../frontend/src/shared/httpClient.js) — Motor
  HTTP con sesión, renovación automática de token y reintentos.
- [`src/shared/format.js`](../frontend/src/shared/format.js) — `formatCOP`
  y `formatFecha`.
- [`src/shared/ui.jsx`](../frontend/src/shared/ui.jsx) — Componentes como
  `Card`, `Field`, `Input`, etc., compartidos con checkout.

El `checkout/api.js` ahora también reutiliza `httpClient`, así que los dos
flujos (checkout y admin) comparten la misma lógica de sesión y renovación.

---

## Sistema de diseño

[`tailwind.config.js`](../frontend/tailwind.config.js) extiende el tema por
defecto. `content` incluye las tres páginas HTML y `src/**/*.{js,jsx}`.

### Tipografía

| Familia | Fuente |
|---|---|
| `font-serif` | DM Serif Display |
| `font-sans` | Nunito, `system-ui`, `sans-serif` |

Se cargan desde Google Fonts con `<link>` en los tres HTML.

### Paletas

**Día (`peach`)**

| Token | Hex |
|---|---|
| `peach-50` | `#FFF3DE` |
| `peach-100` | `#FFD79A` |
| `peach-400` | `#FF9E4D` |
| `peach-500` | `#FF8A3D` |
| `peach-600` | `#FF6A1F` |
| `peach-700` | `#FF7A2F` |

**Noche (`night`)**

| Token | Hex |
|---|---|
| `night-900` | `#140E38` |
| `night-800` | `#241653` |
| `night-700` | `#3A2378` |
| `night-600` | `#4A2C90` |
| `night-violet` | `#7C5CE0` |
| `night-lilac` | `#B98CFF` |

### Animaciones

Keyframes definidos: `twinkle`, `sunPulse`, `sunGlow`, `breathe`, `floatZ`,
`drift`, `ringPulse`, `toastIn`, `bobArrow`.

Registradas como utilidades `animate-*`: `sunGlow`, `breathe`, `ringPulse`,
`toastIn`, `bobArrow`. Las demás (`twinkle`, `sunPulse`, `floatZ`, `drift`) solo
existen como keyframes y se usan desde CSS en `src/index.css`.

### Nota sobre estilos mixtos

La landing usa mayoritariamente **estilos en línea** (objetos `style={{...}}`),
no clases de Tailwind. La demo de checkout usa **Tailwind**. Es una
inconsistencia heredada de que la landing se importó de un diseño HTML previo.
Si tocas la landing, sigue su convención local en vez de mezclarlas.

---

## Cómo desarrollar

```bash
cd frontend
npm install
npm run dev
```

Tests (no necesitan backend: `fetch` va simulado):

```bash
npm test
```

- Landing: <http://localhost:5173/>
- Checkout demo: <http://localhost:5173/checkout.html>

El checkout necesita el backend vivo en `VITE_API_URL`. Sin él, `ShopStep`
mostrará el error de conexión con el botón *Reintentar*.

Para levantar los dos a la vez, desde la raíz del repo:

```bash
npm run dev
```

---

## Huecos conocidos

Útil si estás comparando el proyecto contra un blueprint:

| Hueco | Detalle |
|---|---|
| Credenciales de Wompi | El widget está integrado, pero con la llave de ejemplo no cobra. Faltan las credenciales reales en `backend/.env` |
| Vista de seguimiento pendiente | `api.trackOrder` ya existe y `PaymentStep` la usa para verificar, pero **no hay una pantalla `track.html`**. Hasta que exista, `WOMPI_REDIRECT_URL` apunta a una página inexistente: afecta a PSE y Bancolombia, que sacan al cliente del sitio |
| Sin CI | Ningún workflow hace lint ni build de `frontend/**` |
| Cobertura de tests parcial | `checkout/api.js` y `checkout/wompi.js` están probados (22 tests). Los componentes no; el panel aún no tiene tests |
| Sin recuperación de contraseña | La API la expone; la demo no la usa |
| Sin direcciones guardadas | La demo siempre envía `shippingAddress`; nunca usa `addressId` ni `/api/addresses` |
| Sin historial de pedidos | `GET /orders` no se consume; `api.getOrder` está definido pero no se llama |
| Sin reseñas | La API las expone; la demo no las muestra ni permite crearlas |
| Panel: secciones incompletas | Cerrado: las cinco secciones están construidas y verificadas en navegador |
| Landing desconectada del catálogo | Precio y contenido salen de `site.js`, no de `GET /products` |
| CTA del hero aún a WhatsApp | `FloatingCta.jsx` sigue apuntando a `whatsappUrl()`; `OfferCard` y `StickyBar` ya van al checkout |
| Enlaces de redes sin destino | `href="#"` en `OfferCard.jsx` |

**Cerrado recientemente**:
- El cliente guardaba el `refreshToken` pero nunca lo usaba, así que la sesión moría a los 15 minutos. Ahora [renueva automáticamente](#renovación-automática-del-access-token).
- El panel de administración cubre las cinco secciones: pedidos, productos, categorías y marcas, cupones y reportes.

---

## Relacionado

- [Referencia: API REST](referencia-api.md)
- [Referencia: configuración](referencia-configuracion.md)
- [Tutorial: tu primer pedido de punta a punta](tutorial-primer-pedido.md)
- [Cómo probar el flujo de pagos](howto-probar-pagos.md)
