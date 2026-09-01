# Referencia · API REST

Descripción completa y exacta de la API del backend PomAss. Todo lo que hay
aquí sale directamente del código (`backend/src/modules/*/interfaces/http/`),
no de un diseño previo.

- **Base URL**: `http://localhost:3000` en desarrollo.
- **Prefijo**: todas las rutas cuelgan de `API_PREFIX` (por defecto `/api`).
- **Formato**: JSON en petición y respuesta. `Content-Type: application/json`.
- **Documentación interactiva**: `GET /api/docs` (Swagger UI, generada del mismo código).
- **Health check**: `GET /health` — fuera del prefijo. Responde `{ "status": "ok", "timestamp": "..." }`.

Ver también: [Cómo probar el flujo de pagos](howto-probar-pagos.md) ·
[Modelo de datos](referencia-modelo-datos.md) · [Modelo de seguridad](explicacion-seguridad.md).

---

## Convenciones

### Autenticación

| Símbolo | Significado |
|---|---|
| (nada) | Público |
| 🔒 | Requiere `Authorization: Bearer <accessToken>` |
| 👑 | Requiere además rol `ADMIN` |
| 🔓 | Autenticación **opcional**: funciona con sesión y como invitado |

El access token es un JWT HS256 con vigencia `JWT_ACCESS_TTL` (por defecto 15
minutos). El refresh token **no** es un JWT: es un valor opaco que el servidor
guarda hasheado y rota en cada uso.

### Identidad de invitado

Los endpoints 🔓 sirven también a compradores sin cuenta. El invitado se
identifica con el header `x-guest-id`:

- Si no lo envías, el servidor genera uno y lo devuelve en el campo `guestId` de la respuesta.
- Debes reenviarlo en las siguientes peticiones para conservar el mismo carrito.
- Solo se aceptan tokens con forma `^[A-Za-z0-9-]{1,64}$`. Cualquier otro valor se descarta y se genera uno nuevo.

### Formato de error

Todas las respuestas de error tienen la misma forma:

```json
{
  "error": {
    "code": "CONFLICT",
    "message": "Stock insuficiente para \"PomAss Día · Crema íntima\"",
    "details": null
  }
}
```

Cuando falla la validación de entrada, el mensaje es siempre
`"Datos de entrada inválidos"` y `details` trae el resultado de
`ZodError.flatten()`:

```json
{
  "error": {
    "code": "BAD_REQUEST",
    "message": "Datos de entrada inválidos",
    "details": {
      "formErrors": [],
      "fieldErrors": { "email": ["Correo inválido"] }
    }
  }
}
```

| HTTP | `code` | Cuándo |
|---|---|---|
| 400 | `BAD_REQUEST` | Regla de negocio violada (cupón expirado, carrito vacío, dirección faltante) **y también** fallo de validación Zod |
| 400 | `VALIDATION_ERROR` | Solo si un `ZodError` llega al manejador central sin pasar por el middleware `validate`. En la práctica no ocurre hoy |
| 401 | `UNAUTHORIZED` | Falta el token, es inválido o expiró; firma de webhook inválida |
| 403 | `FORBIDDEN` | Autenticado pero sin permisos (falta rol `ADMIN`) |
| 404 | `NOT_FOUND` | Recurso inexistente, o ruta no registrada |
| 409 | `CONFLICT` | Stock insuficiente, duplicado único, estado incompatible |
| 422 | `UNPROCESSABLE` | Definido en la jerarquía de errores; sin uso actual |
| 429 | `RATE_LIMITED` | Excediste el límite de peticiones |
| 500 | `INTERNAL_ERROR` | Error no controlado. Nunca filtra detalles internos |

### Límites de petición

| Límite | Valor |
|---|---|
| Tamaño de body | 100 kB |
| Rate limit global | 300 peticiones / 60 s por IP |
| Rate limit en `/auth/*` | 20 peticiones / 15 min por IP |

Ambos límites se desactivan cuando `NODE_ENV=test`.

---

## Auth · `/api/auth`

### `POST /auth/register`

Crea una cuenta y devuelve sesión iniciada. La declaración de mayoría de edad
es obligatoria.

**Body**

| Campo | Tipo | Requerido | Restricciones |
|---|---|---|---|
| `email` | string | sí | Formato email. Se normaliza a minúsculas |
| `password` | string | sí | ≥ 8 caracteres, al menos una letra y un número |
| `firstName` | string | sí | 1–80 caracteres |
| `lastName` | string | sí | 1–80 caracteres |
| `phone` | string | no | 7–20 caracteres |
| `ageConfirmed` | boolean | sí | Debe ser exactamente `true` |

**`201 Created`**

```json
{
  "user": { "id": "uuid", "email": "ana@correo.com", "firstName": "Ana", "lastName": "Díaz", "role": "CLIENT" },
  "tokens": { "accessToken": "eyJ...", "refreshToken": "a1b2c3..." }
}
```

**Errores**: `409 CONFLICT` si el correo ya existe · `400 VALIDATION_ERROR` si `ageConfirmed` no es `true`.

---

### `POST /auth/login`

**Body**: `{ "email": string, "password": string }`

**`200 OK`**: misma forma que `register`.

**Errores**: `401 UNAUTHORIZED` con mensaje genérico. La respuesta no revela si
el correo existe, y el servidor gasta tiempo de hashing equivalente aunque no
exista (evita el oráculo de tiempos).

---

### `POST /auth/refresh`

Canjea un refresh token por un par nuevo. **El token usado queda invalidado**;
reutilizarlo se rechaza.

**Body**: `{ "refreshToken": string }` (mínimo 10 caracteres)

**`200 OK`**: `{ "user": {...}, "tokens": { "accessToken": "...", "refreshToken": "..." } }`

**Errores**: `401 UNAUTHORIZED` si el token es desconocido, expiró, fue revocado o ya se usó.

---

### `POST /auth/logout`

Revoca un refresh token.

**Body**: `{ "refreshToken": string }`

**`204 No Content`** — sin cuerpo. Es idempotente: revocar un token ya revocado no falla.

---

### `POST /auth/forgot-password`

**Body**: `{ "email": string }`

**`200 OK`**

```json
{ "message": "Si el correo existe, enviaremos instrucciones para restablecer la contraseña" }
```

La respuesta es **siempre la misma**, exista o no el correo (anti-enumeración).

> **Fuera de producción** la respuesta incluye además `devResetToken` con el
> token en claro, para poder probar el flujo sin servicio de correo. En
> `NODE_ENV=production` ese campo no aparece nunca.

---

### `POST /auth/reset-password`

**Body**: `{ "token": string, "password": string }` — `password` con las mismas reglas que en el registro.

**`200 OK`**: `{ "message": "Contraseña actualizada correctamente" }`

Al restablecer, se revocan todos los refresh tokens del usuario.

---

### `GET /auth/me` 🔒

**`200 OK`**: `{ "user": { "id": "uuid", "role": "CLIENT" } }`

Devuelve lo que viene firmado en el access token (id y rol), no una lectura de base de datos.

---

## Catálogo · `/api/products`, `/api/categories`, `/api/brands`

### `GET /products`

Listado público con búsqueda, filtros, orden y paginación. **Por defecto solo
devuelve productos activos.** El resultado se cachea 120 s en Redis.

Acepta también `includeInactive=true`, pero **se honra únicamente si quien
pregunta es ADMIN** (la ruta lleva `optionalAuth`: sin sesión, o con una que no
sea de administración, el parámetro se ignora y siguen saliendo solo los
activos). Lo usa el panel: sin él, desactivar un producto lo haría desaparecer
de la lista y no habría forma de reactivarlo.

**Query**

| Parámetro | Tipo | Default | Notas |
|---|---|---|---|
| `search` | string | — | Busca en el nombre |
| `category` | string | — | **Slug** de categoría, no id |
| `brand` | string | — | **Slug** de marca, no id |
| `minPrice` | number | — | ≥ 0 |
| `maxPrice` | number | — | ≥ 0 |
| `usageType` | string | — | p. ej. `lubricante`, `hidratante`, `higiene` |
| `skinType` | string | — | p. ej. `sensible`, `normal`, `todo tipo` |
| `sort` | enum | — | `price_asc` \| `price_desc` \| `newest` |
| `page` | int | `1` | ≥ 1 |
| `pageSize` | int | `20` | 1–100 |
| `includeInactive` | boolean | `false` | Solo se honra para ADMIN |

**`200 OK`**

```json
{
  "items": [
    {
      "id": "uuid",
      "name": "PomAss Día · Crema íntima",
      "slug": "pomass-dia-crema-intima",
      "sku": "PA-DIA-50",
      "price": 45900,
      "currency": "COP",
      "presentation": "Tubo 50 ml",
      "stock": 120,
      "brand": { "name": "PomAss", "slug": "pomass" },
      "category": { "name": "Cremas hidratantes íntimas", "slug": "cremas-hidratantes-intimas" }
    }
  ],
  "total": 7,
  "page": 1,
  "pageSize": 20
}
```

**Ejemplo**

```bash
curl "http://localhost:3000/api/products?category=lubricantes&sort=price_asc&pageSize=5"
```

---

### `GET /products/:slug`

Detalle por slug (no por id). Cacheado 300 s.

**`200 OK`**: `{ "product": { ...campos del producto, "images": [...] } }`

**Errores**: `404 NOT_FOUND`.

---

### `POST /products` 🔒👑

El `slug` se genera automáticamente a partir del `name`; si colisiona se le
añade un sufijo. Marca y categoría deben existir.

**Body**

| Campo | Tipo | Requerido | Restricciones |
|---|---|---|---|
| `name` | string | sí | 1–160 |
| `sku` | string | sí | 1–60, único |
| `description` | string | sí | ≥ 1 |
| `brandId` | uuid | sí | Debe existir |
| `categoryId` | uuid | sí | Debe existir |
| `price` | number | sí | > 0 |
| `presentation` | string | no | |
| `sizeMl` | int | no | > 0 |
| `usageType` | string | no | |
| `skinType` | string | no | |
| `ingredients` | string | no | |
| `warnings` | string | no | |
| `stock` | int | no (default `0`) | ≥ 0 |
| `images` | array | no | `[{ url, alt?, position? }]`, `url` debe ser URL válida |

**`201 Created`**: `{ "product": {...} }`

**Errores**: `400 BAD_REQUEST` si la marca o la categoría no existen · `409 CONFLICT` si el `sku` se repite.

---

### `PATCH /products/:id` 🔒👑

Todos los campos de `POST /products` son opcionales, más `isActive` (boolean).
Los campos opcionales aceptan `null` para borrarlos. **El slug no cambia** aunque
cambie el nombre — así no se rompen enlaces existentes.

Acepta además `images`: un array de `{ url, alt? }` en el orden deseado. **No es
un añadido, es un reemplazo en bloque**: se borran las imágenes actuales y se
crean las del array, con `position` según su índice. Enviar `[]` deja el
producto sin imágenes; omitir el campo las deja intactas. El borrado y la
creación van en la misma transacción, así que un fallo a mitad no deja el
producto sin fotos.

**`200 OK`**: `{ "product": {...} }`

---

### `DELETE /products/:id` 🔒👑

**`204 No Content`**

**Errores**: `409 CONFLICT` si el producto está referenciado por pedidos (Prisma `P2003`).

---

### `GET /categories` · `GET /brands`

Públicos. Por defecto devuelven solo los activos; con `?includeInactive=true`
se incluyen los desactivados.

**`200 OK`**: `{ "categories": [...] }` o `{ "brands": [...] }`

### `POST|PATCH|DELETE /categories[/:id]` 🔒👑

| Campo | Tipo | Notas |
|---|---|---|
| `name` | string | 1–120, requerido al crear |
| `description` | string | opcional (`null` en PATCH para borrar) |
| `parentId` | uuid | opcional — subcategorías (árbol auto-referenciado) |
| `isActive` | boolean | solo en PATCH |

### `POST|PATCH|DELETE /brands[/:id]` 🔒👑

| Campo | Tipo | Notas |
|---|---|---|
| `name` | string | 1–120, requerido al crear, único |
| `description` | string | opcional |
| `logoUrl` | string | opcional, debe ser URL válida |
| `isActive` | boolean | solo en PATCH |

Respuestas: `201` con `{ "category": {...} }` / `{ "brand": {...} }` al crear,
`200` al actualizar, `204` al eliminar.

---

## Carrito · `/api/cart`

Todas las rutas son 🔓 excepto `merge`. Si estás autenticado el carrito vive en
Postgres; si eres invitado vive en Redis con TTL de 7 días.

Cuando la petición se resuelve como invitado, **la respuesta incluye `guestId`**:

```json
{ "cart": { "items": [], "subtotal": 0, "itemCount": 0 }, "guestId": "3f2a..." }
```

Cuando estás autenticado, la respuesta es solo `{ "cart": {...} }`.

**Forma de `cart`**

```json
{
  "items": [
    {
      "productId": "uuid",
      "name": "PomAss Día · Crema íntima",
      "slug": "pomass-dia-crema-intima",
      "price": 45900,
      "quantity": 2,
      "lineTotal": 91800,
      "image": "https://...",
      "stock": 120,
      "inStock": true
    }
  ],
  "subtotal": 91800,
  "itemCount": 2
}
```

Los productos inexistentes o inactivos se omiten silenciosamente de la vista.

| Método | Ruta | Auth | Body | Éxito |
|---|---|---|---|---|
| GET | `/cart` | 🔓 | — | `200` |
| POST | `/cart/items` | 🔓 | `{ productId: uuid, quantity?: int ≥1 (default 1) }` | `201` |
| PATCH | `/cart/items/:productId` | 🔓 | `{ quantity: int ≥0 }` | `200` |
| DELETE | `/cart/items/:productId` | 🔓 | — | `200` |
| DELETE | `/cart` | 🔓 | — | `200` |
| POST | `/cart/merge` | 🔒 | `{ guestId: string }` | `200` |

**Detalles que importan:**

- `POST /cart/items` **suma** a la cantidad existente; no la reemplaza.
- `PATCH` con `quantity: 0` equivale a eliminar la línea.
- Agregar o actualizar por encima del stock devuelve `409 CONFLICT` con el stock restante en el mensaje.
- `POST /cart/merge` fusiona el carrito de invitado en el del usuario sumando cantidades, **acotadas al stock disponible**, y vacía el de invitado. Es el paso natural justo después de iniciar sesión.

**Ejemplo de flujo de invitado**

```bash
# 1. Primera petición sin header: el servidor asigna un guestId
curl -s -X POST http://localhost:3000/api/cart/items \
  -H 'Content-Type: application/json' \
  -d '{"productId":"<uuid>","quantity":1}'

# 2. Siguientes peticiones: reenvía el guestId recibido
curl -s http://localhost:3000/api/cart -H 'x-guest-id: <guestId>'
```

---

## Pedidos · `/api/orders`

### `POST /orders` 🔓

Checkout. Convierte el carrito en un pedido dentro de una **única transacción**:
descuenta stock de forma atómica, aplica el cupón, registra el canje y vacía el
carrito.

**Body**

| Campo | Tipo | Requerido | Notas |
|---|---|---|---|
| `addressId` | uuid | condicional | Solo usuarios autenticados. Debe ser una dirección propia |
| `shippingAddress` | objeto | condicional | Alternativa a `addressId` — ver campos abajo |
| `couponCode` | string | no | 1–40 caracteres |
| `discreetPackaging` | boolean | no (default `false`) | Empaque sin marca visible |
| `guestEmail` | string | condicional | **Obligatorio para invitados**. Email válido, ≤ 180 |

Debes enviar `addressId` **o** `shippingAddress`; si falta ambos, `400`.

**`shippingAddress`**

| Campo | Tipo | Requerido | Restricciones |
|---|---|---|---|
| `fullName` | string | sí | 1–120 |
| `phone` | string | sí | 7–20 |
| `line1` | string | sí | 1–180 |
| `line2` | string \| null | no | ≤ 180 |
| `city` | string | sí | 1–80 |
| `department` | string | sí | 1–80 (departamento de Colombia) |
| `postalCode` | string \| null | no | ≤ 20 |

**`201 Created`**

```json
{
  "order": {
    "id": "uuid",
    "orderNumber": "PA-2026-A3F91C",
    "status": "PENDING",
    "subtotal": 91800,
    "discountTotal": 9180,
    "shippingTotal": 12900,
    "total": 95520,
    "currency": "COP",
    "discreetPackaging": false,
    "items": [
      { "productId": "uuid", "productName": "PomAss Día · Crema íntima", "unitPrice": 45900, "quantity": 2, "lineTotal": 91800 }
    ],
    "shipping": { "fullName": "Ana Díaz", "phone": "3105676187", "line1": "Calle 1 # 2-3", "line2": null, "city": "Medellín", "department": "Antioquia", "postalCode": null },
    "createdAt": "2026-08-08T14:22:03.114Z"
  }
}
```

Si el pedido es de invitado, la respuesta añade `"guestId": "..."`.

**Cálculo de totales** (ver [`pricing.ts`](../backend/src/modules/orders/domain/pricing.ts)):

```
subtotal      = Σ (precio_unitario × cantidad)
discountTotal = PERCENTAGE → redondeo(subtotal × valor / 100)
                FIXED      → valor
                (nunca mayor que el subtotal)
neto          = subtotal − discountTotal
shippingTotal = 0 si neto ≥ FREE_SHIPPING_THRESHOLD, si no SHIPPING_FLAT_RATE
total         = neto + shippingTotal
```

Los precios y nombres se guardan como **snapshot** en el pedido: si el catálogo
cambia después, el pedido histórico no se altera.

**Errores**

| Código | Causa |
|---|---|
| `400 BAD_REQUEST` | Carrito vacío · producto inactivo en el carrito · cupón inválido/expirado/sin usos · compra mínima no alcanzada · falta dirección · invitado sin `guestEmail` · invitado usando `addressId` |
| `409 CONFLICT` | Stock insuficiente para algún producto |

---

### `GET /orders` 🔒

**Query**: `page` (default `1`), `pageSize` (default `10`, máx. `50`).

**`200 OK`**

```json
{
  "items": [{ "id": "uuid", "orderNumber": "PA-2026-A3F91C", "status": "PENDING", "total": 95520, "createdAt": "..." }],
  "total": 1, "page": 1, "pageSize": 10
}
```

### `GET /orders/:id` 🔒

**`200 OK`**: `{ "order": {...} }` con la forma completa de arriba. Solo pedidos propios; ajeno → `404`.

### `POST /orders/:id/cancel` 🔒

Cancela y **restaura el stock** en la misma transacción.

**`200 OK`**: `{ "order": { ..., "status": "CANCELLED" } }`

**Errores**: `409 CONFLICT` si el estado no es `PENDING` ni `PAID`.

> Un pedido de invitado no puede cancelarse por API: esa ruta exige sesión.
> Para **consultarlo** sí existe el seguimiento público, justo abajo.

---

### `GET /orders/track`

Seguimiento sin cuenta. Permite a quien compró como invitado ver el estado de su
pedido sin iniciar sesión.

**Query**

| Parámetro | Tipo | Requerido |
|---|---|---|
| `orderNumber` | string | sí |
| `email` | string (email) | sí |

**Ambos son obligatorios.** El número de pedido por sí solo permitiría recorrer
pedidos ajenos. El correo se compara sin distinguir mayúsculas contra el
`guestEmail` del pedido o el correo del usuario dueño.

**`200 OK`**

```json
{
  "order": {
    "orderNumber": "PA-2026-A3F91C",
    "status": "SHIPPED",
    "total": 79900,
    "currency": "COP",
    "shipCity": "Medellín",
    "carrier": "Servientrega",
    "trackingNumber": "ABC123456789",
    "items": [
      { "productName": "Estuche PomAss Día + Noche", "quantity": 1, "lineTotal": 79900 }
    ],
    "createdAt": "2026-08-08T14:22:03.114Z"
  }
}
```

Es un **subconjunto reducido a propósito**: sin dirección completa, sin
teléfono, sin datos de pago y sin ids internos. Los campos `carrier` y
`trackingNumber` son `null` hasta que el pedido se despache (`SHIPPED`).

**Errores**: `404 NOT_FOUND` si no hay pedido con ese número **y** correo. Se
responde 404 y no 403 incluso cuando el número existe pero el correo no
coincide: un 403 confirmaría que ese pedido existe.

**Límite**: 30 peticiones cada 15 minutos por IP. Es un objetivo obvio de fuerza
bruta.

**Ejemplo**

```bash
curl -s "http://localhost:3000/api/orders/track?orderNumber=PA-2026-A3F91C&email=ana@correo.com"
```

---

## Direcciones · `/api/addresses` 🔒

| Método | Ruta | Body | Éxito |
|---|---|---|---|
| GET | `/addresses` | — | `200` `{ "addresses": [...] }` |
| POST | `/addresses` | campos de `shippingAddress` + `isDefault?: boolean` | `201` `{ "address": {...} }` |
| PATCH | `/addresses/:id` | los mismos, todos opcionales | `200` `{ "address": {...} }` |
| DELETE | `/addresses/:id` | — | `204` |

Todas verifican pertenencia por `userId`, tanto en el caso de uso como en el repositorio.

---

## Pagos · `/api/payments`

La pasarela es **Wompi**, un único proveedor que internamente ofrece tarjeta,
Nequi, PSE y Bancolombia. El cliente elige el medio dentro del widget de Wompi,
en su navegador.

> **Este backend nunca recibe número de tarjeta ni CVV.** Es la razón de ser de
> la integración: mantiene el proyecto fuera del alcance de PCI-DSS. `POST
> /payments` solo acepta un `orderId`.

### `POST /payments` 🔓

Prepara el pago de un pedido `PENDING` y devuelve la configuración firmada que
el widget necesita. **No cobra nada**: el cobro ocurre dentro del widget.

Si el cliente reintenta (cerró el widget, le rechazaron la tarjeta), se reutiliza
el mismo registro de pago en vez de crear uno nuevo.

**Body**

| Campo | Tipo | Requerido |
|---|---|---|
| `orderId` | uuid | sí |

**`201 Created`**

```json
{
  "payment": {
    "id": "uuid",
    "orderId": "uuid",
    "method": "WOMPI",
    "status": "PENDING",
    "amount": 79900,
    "currency": "COP",
    "externalReference": "PA-2026-A3F91C",
    "wompiTransactionId": null
  },
  "checkout": {
    "publicKey": "pub_test_…",
    "currency": "COP",
    "amountInCents": 7990000,
    "reference": "PA-2026-A3F91C",
    "signature": "9a3f…",
    "redirectUrl": "https://tudominio.com/track.html"
  }
}
```

**Sobre `checkout`:**

- `reference` es el **número de pedido**: es lo que Wompi devolverá en el webhook.
- `amountInCents` es el total en centavos (COP × 100).
- `signature` es la **firma de integridad**: `SHA256(reference + amountInCents + currency + WOMPI_INTEGRITY_SECRET)`. Impide que el cliente altere el importe en el navegador. El secreto nunca viaja.

**Errores**: `404 NOT_FOUND` si el pedido no existe o no es tuyo · `409 CONFLICT` si no está `PENDING`.

---

### `GET /payments/:id` 🔒

**`200 OK`**: `{ "payment": {...} }`. Solo pagos de pedidos propios.

---

### `POST /payments/webhook/wompi`

Evento `transaction.updated` de Wompi. **Es la única fuente de verdad de un
pago**: nunca se confía en el redirect del navegador.

No lleva autenticación de usuario. La confianza viene del **checksum que Wompi
incluye dentro del propio cuerpo** (`signature.checksum`), no de una cabecera.

**Body** (forma de Wompi)

```json
{
  "event": "transaction.updated",
  "data": {
    "transaction": {
      "id": "01-1730000000-12345",
      "reference": "PA-2026-A3F91C",
      "status": "APPROVED",
      "amount_in_cents": 7990000
    }
  },
  "timestamp": 1730000000,
  "signature": {
    "properties": ["transaction.id", "transaction.status", "transaction.amount_in_cents"],
    "checksum": "3B9F…"
  }
}
```

**Cálculo del checksum**: se concatenan los valores de cada ruta de
`signature.properties` (leídas dentro de `data`, en ese orden), luego el
`timestamp`, luego `WOMPI_EVENTS_SECRET`; de todo eso, SHA-256 en hexadecimal.
La comparación es en tiempo constante y tolerante a mayúsculas.

**Mapeo de estados**

| Wompi | `PaymentStatus` | ¿Mueve el pedido a `PAID`? |
|---|---|---|
| `APPROVED` | `APPROVED` | Sí |
| `DECLINED` | `DECLINED` | No |
| `VOIDED` | `DECLINED` | No |
| `ERROR` | `DECLINED` | No |
| `PENDING` | `PENDING` | No |

**`200 OK`**

```json
{ "received": true, "status": "APPROVED" }
```

**Idempotencia**, en dos capas:

- Un pago ya `APPROVED` **nunca se degrada**, llegue lo que llegue después.
- La reentrega del mismo evento (misma transacción y mismo estado) responde `"idempotent": true` sin reprocesar.

Pero un **reintento legítimo sí funciona**: tras un `DECLINED`, una transacción
nueva con estado `APPROVED` sí aprueba el pedido.

**Errores**: `401 UNAUTHORIZED` si el checksum no cuadra o el evento no es interpretable · `404 NOT_FOUND` si la referencia no corresponde a ningún pago.

Guía paso a paso: [Cómo probar el flujo de pagos](howto-probar-pagos.md).

---

## Cupones · `/api/coupons` 🔒👑

CRUD de gestión. **Aplicar** un cupón no pasa por aquí: se hace con `couponCode`
en `POST /orders`, que sí es público.

| Método | Ruta | Éxito |
|---|---|---|
| GET | `/coupons` | `200` `{ "coupons": [...] }` |
| GET | `/coupons/:id` | `200` `{ "coupon": {...} }` |
| POST | `/coupons` | `201` `{ "coupon": {...} }` |
| PATCH | `/coupons/:id` | `200` `{ "coupon": {...} }` |

`GET /coupons` devuelve solo activos; con `?includeInactive=true` incluye los desactivados.

**Body de `POST`**

| Campo | Tipo | Requerido | Restricciones |
|---|---|---|---|
| `code` | string | sí | 3–40. Se normaliza en MAYÚSCULAS. Único |
| `type` | enum | sí | `PERCENTAGE` \| `FIXED` |
| `value` | number | sí | > 0. Si es `PERCENTAGE`, ≤ 100 |
| `minPurchase` | number | no | ≥ 0. Compra mínima para poder usarlo |
| `maxUses` | int | no | > 0. Usos totales. Ausente = ilimitado |
| `perUserLimit` | int | no | > 0. Usos por usuario. Ausente = sin límite |
| `startsAt` | date | no | Debe ser anterior a `endsAt` |
| `endsAt` | date | no | |

**`PATCH`**: los mismos campos, todos opcionales, más `isActive: boolean`. Los
opcionales aceptan `null`. **No hay borrado físico** — se desactiva con
`{ "isActive": false }`.

**Errores**: `409 CONFLICT` si el código ya existe · `400 BAD_REQUEST` si un cupón porcentual queda fuera de 1–100 o si `startsAt >= endsAt`.

> `perUserLimit` no aplica a invitados: sin identidad persistente solo se puede
> hacer valer el límite global `maxUses`.

---

## Reseñas · `/api/products/:productId/reviews`

### `GET /products/:productId/reviews`

Público. Solo reseñas aprobadas, paginadas.

**Query**: `page` (default `1`), `pageSize` (default `20`, máx. `100`).

**`200 OK`**: `{ "items": [...], "total": n, "page": 1, "pageSize": 20 }`

### `POST /products/:productId/reviews` 🔒

Requiere **compra verificada**: debe existir un pedido propio en estado
`DELIVERED` que contenga ese producto. La reseña se aprueba automáticamente (no
hay cola de moderación).

**Body**

| Campo | Tipo | Requerido | Restricciones |
|---|---|---|---|
| `rating` | int | sí | 1–5 |
| `title` | string | no | 1–120 |
| `comment` | string | no | 1–2000 |
| `isAnonymous` | boolean | no | Oculta el nombre públicamente |

**`201 Created`**: `{ "review": {...} }`

**Errores**: `400 BAD_REQUEST` si no hay compra `DELIVERED` de ese producto · `409 CONFLICT` si ya reseñaste ese producto (una por usuario y producto).

---

## Admin · reportes · `/api/admin/reports` 🔒👑

### `GET /admin/reports/sales`

**Query**

| Parámetro | Tipo | Default |
|---|---|---|
| `from` | date | `to` − 30 días |
| `to` | date | ahora |
| `groupBy` | `day` \| `month` | `day` |

Cuenta pedidos en estado `PAID`, `PREPARING`, `SHIPPED` o `DELIVERED`
(`PENDING` y `CANCELLED` quedan fuera).

**Errores**: `400 BAD_REQUEST` si `from >= to`.

### `GET /admin/reports/top-products`

**Query**: `limit` (default `10`, tope duro `100` — valores mayores se recortan
en silencio, no fallan).

**`200 OK`**: `{ "products": [...] }` ordenado por unidades vendidas.

### `GET /admin/reports/orders-by-status`

**`200 OK`**: `{ "statuses": [{ "status": "PENDING", "count": 3 }, ...] }` — un conteo por cada `OrderStatus`.

---

## Admin · gestión de pedidos · `/api/admin/orders` 🔒👑

Es lo que permite **operar** la tienda: ver los pedidos que entran y hacerlos
avanzar. Sin esto, un pedido se quedaría en `PAID` para siempre.

### `GET /admin/orders`

**Query**: `status` (opcional, cualquier `OrderStatus`), `page` (default `1`),
`pageSize` (default `20`, máx. `100`).

**`200 OK`**: `{ "items": [...], "total": n, "page": 1, "pageSize": 20 }`, más
recientes primero. Cada elemento trae `orderNumber`, `status`, `total`,
`contactEmail` (del usuario dueño o el `guestEmail`), `shipCity` y `createdAt`.

### `GET /admin/orders/:id`

**`200 OK`**

```json
{
  "order": {
    "id": "uuid",
    "orderNumber": "PA-2026-A3F91C",
    "status": "PREPARING",
    "subtotal": 91800,
    "discountTotal": 0,
    "shippingTotal": 0,
    "total": 91800,
    "currency": "COP",
    "discreetPackaging": true,
    "contactEmail": "ana@correo.com",
    "shipCity": "Medellín",
    "shipFullName": "Ana Gómez",
    "shipPhone": "3001234567",
    "shipLine1": "Calle 10 # 20-30",
    "shipLine2": "Apto 501",
    "shipDepartment": "Antioquia",
    "shipPostalCode": "050001",
    "carrier": null,
    "trackingNumber": null,
    "items": [
      { "productId": "uuid", "productName": "PomAss Día · Crema íntima", "quantity": 1, "lineTotal": 91800 }
    ],
    "createdAt": "2026-08-08T14:22:03.114Z"
  },
  "allowedTransitions": ["SHIPPED", "CANCELLED"]
}
```

`allowedTransitions` evita que el panel tenga que duplicar la regla de negocio
para decidir qué botones pintar.

**Campos de envío**: `shipFullName`, `shipPhone`, `shipLine1`, `shipLine2`,
`shipDepartment`, `shipPostalCode` son la dirección completa de envío. Los
campos `carrier` y `trackingNumber` son `null` hasta que se despache el
pedido; luego los asigna `PATCH /admin/orders/:id/status`.

### `PATCH /admin/orders/:id/status`

Mueve el pedido por su ciclo de vida operativo.

**Body**

| Campo | Tipo | Obligatorio | Notas |
|---|---|---|---|
| `status` | enum | sí | `PREPARING` \| `SHIPPED` \| `DELIVERED` \| `CANCELLED` |
| `carrier` | string | condicional | Obligatorio si `status` es `SHIPPED`. Ej: `"Servientrega"` |
| `trackingNumber` | string | condicional | Obligatorio si `status` es `SHIPPED`. Ej: `"ABC123456789"` |

Cuando `status` es `SHIPPED`, **ambos campos son obligatorios** y no pueden estar
vacíos ni contener solo espacios. En cualquier otra transición, estos campos se
rechazan con `400 BAD_REQUEST`.

**Transiciones permitidas**

| Desde | Hacia |
|---|---|
| `PENDING` | `CANCELLED` |
| `PAID` | `PREPARING`, `CANCELLED` |
| `PREPARING` | `SHIPPED`, `CANCELLED` |
| `SHIPPED` | `DELIVERED` |
| `DELIVERED` | — (estado final) |
| `CANCELLED` | — (estado final) |

Tres reglas que no se pueden saltar:

- **`PAID` no se puede marcar a mano.** Solo lo produce el webhook de pago verificado. Permitirlo abriría la puerta a despachar sin haber cobrado.
- **Un pedido ya enviado no se cancela.** Cancelar antes del despacho (`PENDING`, `PAID`, `PREPARING`) **devuelve el stock** al catálogo e invalida su caché.
- **`SHIPPED` exige transportadora y guía.** Sin ambas, la petición falla con `400 BAD_REQUEST`.

**`200 OK`**: misma forma que `GET /admin/orders/:id`, ya actualizada. Los campos
`carrier` y `trackingNumber` quedan guardados en la respuesta.

**Errores**: `400 BAD_REQUEST` si ya está en ese estado, si se intenta marcar `PAID`, si se va a `SHIPPED` sin transportadora o guía, o si en otra transición se envían esos campos · `409 CONFLICT` si la transición no cabe desde el estado actual (el mensaje dice cuáles sí) · `404 NOT_FOUND`.

> Este endpoint es lo que hace visible la línea de tiempo del
> [seguimiento público](#get-orderstrack) y lo que finalmente **habilita las
> reseñas**: solo se puede reseñar un producto de un pedido `DELIVERED`.

---

## Mapa completo de endpoints

| # | Método | Ruta | Auth |
|---|---|---|---|
| 1 | GET | `/health` | — |
| 2 | GET | `/api/docs` | — |
| 3 | POST | `/api/auth/register` | — |
| 4 | POST | `/api/auth/login` | — |
| 5 | POST | `/api/auth/refresh` | — |
| 6 | POST | `/api/auth/logout` | — |
| 7 | POST | `/api/auth/forgot-password` | — |
| 8 | POST | `/api/auth/reset-password` | — |
| 9 | GET | `/api/auth/me` | 🔒 |
| 10 | GET | `/api/products` | — |
| 11 | GET | `/api/products/:slug` | — |
| 12 | POST | `/api/products` | 🔒👑 |
| 13 | PATCH | `/api/products/:id` | 🔒👑 |
| 14 | DELETE | `/api/products/:id` | 🔒👑 |
| 15 | GET | `/api/categories` | — |
| 16 | POST | `/api/categories` | 🔒👑 |
| 17 | PATCH | `/api/categories/:id` | 🔒👑 |
| 18 | DELETE | `/api/categories/:id` | 🔒👑 |
| 19 | GET | `/api/brands` | — |
| 20 | POST | `/api/brands` | 🔒👑 |
| 21 | PATCH | `/api/brands/:id` | 🔒👑 |
| 22 | DELETE | `/api/brands/:id` | 🔒👑 |
| 23 | GET | `/api/cart` | 🔓 |
| 24 | POST | `/api/cart/items` | 🔓 |
| 25 | PATCH | `/api/cart/items/:productId` | 🔓 |
| 26 | DELETE | `/api/cart/items/:productId` | 🔓 |
| 27 | DELETE | `/api/cart` | 🔓 |
| 28 | POST | `/api/cart/merge` | 🔒 |
| 29 | POST | `/api/orders` | 🔓 |
| 30 | GET | `/api/orders` | 🔒 |
| 31 | GET | `/api/orders/track` | — |
| 32 | GET | `/api/orders/:id` | 🔒 |
| 33 | POST | `/api/orders/:id/cancel` | 🔒 |
| 34 | GET | `/api/addresses` | 🔒 |
| 35 | POST | `/api/addresses` | 🔒 |
| 36 | PATCH | `/api/addresses/:id` | 🔒 |
| 37 | DELETE | `/api/addresses/:id` | 🔒 |
| 38 | POST | `/api/payments` | 🔓 |
| 39 | GET | `/api/payments/:id` | 🔒 |
| 40 | POST | `/api/payments/webhook/wompi` | checksum de Wompi |
| 41 | GET | `/api/coupons` | 🔒👑 |
| 42 | GET | `/api/coupons/:id` | 🔒👑 |
| 43 | POST | `/api/coupons` | 🔒👑 |
| 44 | PATCH | `/api/coupons/:id` | 🔒👑 |
| 45 | GET | `/api/products/:productId/reviews` | — |
| 46 | POST | `/api/products/:productId/reviews` | 🔒 |
| 47 | GET | `/api/admin/reports/sales` | 🔒👑 |
| 48 | GET | `/api/admin/reports/top-products` | 🔒👑 |
| 49 | GET | `/api/admin/reports/orders-by-status` | 🔒👑 |
| 50 | GET | `/api/admin/orders` | 🔒👑 |
| 51 | GET | `/api/admin/orders/:id` | 🔒👑 |
| 52 | PATCH | `/api/admin/orders/:id/status` | 🔒👑 |

---

## Relacionado

- [Tutorial: tu primer pedido de punta a punta](tutorial-primer-pedido.md)
- [Cómo probar el flujo de pagos con webhook firmado](howto-probar-pagos.md)
- [Referencia: modelo de datos](referencia-modelo-datos.md)
- [Referencia: configuración y variables de entorno](referencia-configuracion.md)
- [Explicación: decisiones de diseño](explicacion-decisiones.md)
- [Explicación: modelo de seguridad](explicacion-seguridad.md)
