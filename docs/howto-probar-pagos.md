# Cómo probar el flujo de pagos (Mercado Pago)

Al terminar tendrás un pedido en estado `PAID`, movido ahí por un aviso de
Mercado Pago que tú mismo firmaste — igual que lo haría la pasarela real.

Sirve para dos cosas: probar el flujo sin depender del sandbox ni de internet,
y entender qué verifica el backend antes de dar un pedido por pagado.

## Requisitos previos

- Backend corriendo en `http://localhost:3000` con Postgres y Redis vivos ([cómo montarlo](howto-entorno-local.md)).
- Base migrada y sembrada (`npm run prisma:seed`).
- `curl` y Node disponibles en la terminal.

```bash
curl http://localhost:3000/health
```

## Cómo encaja el flujo real

```
 1. Clienta hace checkout            →  POST /api/orders          →  pedido PENDING
 2. Frontend pide el cobro           →  POST /api/payments        →  { payment, checkout }
    └─ el backend crea una "preferencia" contra la API de Mercado Pago
 3. El navegador se va a checkout.initPoint y la clienta paga EN Mercado Pago
    └─ el número de tarjeta nunca pasa por este backend
 4. Mercado Pago la devuelve a track.html  →  pantalla "esperando confirmación"
    └─ NO es fuente de verdad: el navegador puede mentir
 5. Mercado Pago envía el aviso      →  POST /api/payments/webhook/mercadopago
    └─ el aviso solo trae el ID del pago, no el resultado
 6. El backend consulta el pago      →  GET /v1/payments/{id}
    └─ ESTA es la fuente de verdad   →  pedido PAID
```

Los pasos 3 y 4 ocurren en el navegador. Este documento cubre 1, 2, **5 y 6**,
que es donde vive la lógica del backend.

> **La diferencia con la pasarela anterior.** Wompi metía el resultado dentro
> del propio evento, así que bastaba con firmarse un evento a uno mismo.
> Mercado Pago no: el aviso solo dice «el pago 111222333 cambió», y el backend
> tiene que ir a preguntar en qué quedó. Por eso aquí hace falta algo que
> conteste esa consulta — el script `mercadopago-falso.mjs`.

---

## Pasos

### 1. Apunta el backend al doble local

En `backend/.env`:

```bash
# Un token cualquiera que NO sea el de ejemplo: con el de ejemplo el backend
# ni siquiera llama a la API y devuelve el checkout como "sin configurar".
MERCADO_PAGO_ACCESS_TOKEN=TEST-pruebas-locales
MERCADO_PAGO_API_URL=http://localhost:4100
```

Reinicia el backend. `MERCADO_PAGO_API_URL` es solo para esto: en producción
el backend se niega a arrancar si apunta a algo que no sea la API real.

### 2. Consigue el id del producto

```bash
curl -s "http://localhost:3000/api/products?pageSize=1"
```

Copia el `id`. Lo llamaremos `<PRODUCT_ID>`.

### 3. Crea un carrito de invitado

```bash
curl -s -X POST http://localhost:3000/api/cart/items \
  -H 'Content-Type: application/json' \
  -d '{"productId":"<PRODUCT_ID>","quantity":1}'
```

La respuesta trae `guestId`. Cópialo como `<GUEST_ID>`.

### 4. Haz checkout

```bash
curl -s -X POST http://localhost:3000/api/orders \
  -H 'Content-Type: application/json' \
  -H 'x-guest-id: <GUEST_ID>' \
  -d '{
    "guestEmail": "ana@correo.com",
    "shippingAddress": {
      "fullName": "Ana Díaz",
      "phone": "3105676187",
      "line1": "Calle 1 # 2-3",
      "city": "Medellín",
      "department": "Antioquia"
    }
  }'
```

Copia `order.orderNumber` como `<ORDER_NUMBER>` (algo como `PA-2026-A3F91C`) y
`order.id` como `<ORDER_ID>`. Fíjate en `"status": "PENDING"`.

### 5. Prepara el pago

Para este paso necesitas el doble local corriendo, porque el backend va a
crear la preferencia contra él. En **otra terminal**:

```bash
cd backend && node scripts/mercadopago-falso.mjs --pedido <ORDER_NUMBER>
```

Y ahora sí:

```bash
curl -s -X POST http://localhost:3000/api/payments \
  -H 'Content-Type: application/json' \
  -H 'x-guest-id: <GUEST_ID>' \
  -d '{"orderId":"<ORDER_ID>"}'
```

```json
{
  "payment": { "id": "…", "method": "MERCADO_PAGO", "status": "PENDING", "externalReference": "PA-2026-A3F91C" },
  "checkout": {
    "configured": true,
    "preferenceId": "pref-local-001",
    "initPoint": "http://localhost:4100/checkout-simulado",
    "publicKey": "TEST-00000000-0000-0000-0000-000000000000",
    "reference": "PA-2026-A3F91C",
    "amount": 89900,
    "currency": "COP",
    "sandbox": true
  }
}
```

Fíjate en lo que **no** hay en la petición: ni número de tarjeta, ni CVV, ni
celular. Solo el pedido. Eso es lo que mantiene al proyecto fuera del alcance
de PCI-DSS.

Y fíjate en lo que no hay en la **respuesta**: el access token no sale de aquí.
`initPoint` es a dónde iría el navegador; el monto ya vive del lado de Mercado
Pago, así que no hay nada que la clienta pueda alterar antes de pagar.

### 6. Manda el aviso firmado

Para el doble local (Ctrl+C) y vuelve a lanzarlo, esta vez con `--enviar`:

```bash
cd backend && node scripts/mercadopago-falso.mjs --pedido <ORDER_NUMBER> --enviar
```

```
API falsa de Mercado Pago en http://localhost:4100
  pedido PA-2026-A3F91C · pago 111222333 · estado "approved"

→ POST http://localhost:3000/api/payments/webhook/mercadopago?data.id=111222333&type=payment
  manifiesto firmado: id:111222333;request-id:req-local-1730000000;ts:1730000000;
  [api falsa] GET /v1/payments/111222333 → 200

← 200 {"received":true,"status":"APPROVED"}
```

Ahí se ve el flujo entero: el script firma y avisa, el backend verifica la
firma, **vuelve a preguntar** por el pago, y solo entonces lo da por bueno.

#### Cómo se firma

```
HMAC-SHA256( "id:<data.id>;request-id:<x-request-id>;ts:<ts>;" , MERCADO_PAGO_WEBHOOK_SECRET )
```

El resultado en hexadecimal viaja en la cabecera `x-signature`, junto al mismo
`ts`: `x-signature: ts=1730000000,v1=9a3f…`. El `data.id` que entra en la firma
es el de la **query string**, no el del cuerpo, y va en minúsculas. Los tramos
que no vengan se omiten enteros.

---

## Verificación

El pedido ya debería estar en `PAID`. Compruébalo con el **seguimiento
público**, sin necesidad de sesión ni de mirar la base de datos:

```bash
curl -s "http://localhost:3000/api/orders/track?orderNumber=<ORDER_NUMBER>&email=ana@correo.com"
```

```json
{ "order": { "orderNumber": "PA-2026-A3F91C", "status": "PAID", "...": "..." } }
```

### Comprueba la idempotencia

Repite **exactamente** el mismo comando del paso 6:

```json
{ "received": true, "status": "APPROVED", "idempotent": true }
```

Mercado Pago reintenta si no recibe un 200 a tiempo; esto es lo que hace
inofensivo el reintento.

### Comprueba que un pago aprobado nunca se degrada

```bash
node scripts/mercadopago-falso.mjs --pedido <ORDER_NUMBER> --estado rejected --id-pago 999 --enviar
```

La respuesta seguirá siendo `APPROVED` con `idempotent: true`, y el pedido
seguirá en `PAID`. Un pago cobrado no se deshace por un aviso posterior.

**Salvo un reembolso**, que sí es información nueva y real:

```bash
node scripts/mercadopago-falso.mjs --pedido <ORDER_NUMBER> --estado refunded --enviar
```

Ahí el pago pasa a `REFUNDED`. El pedido se queda en `PAID` a propósito:
devolverlo es una decisión de la tienda, no algo que deba pasar solo.

---

## Variantes útiles

### Simular un rechazo (y luego un reintento con éxito)

Con un pedido nuevo:

```bash
node scripts/mercadopago-falso.mjs --pedido <ORDER_NUMBER> --estado rejected --enviar
```

El pago queda `DECLINED` y **el pedido sigue en `PENDING`**. Ahora manda otro
aviso con un id de pago distinto y aprobado:

```bash
node scripts/mercadopago-falso.mjs --pedido <ORDER_NUMBER> --id-pago 222333444 --enviar
```

Esta vez **sí** aprueba: la idempotencia no bloquea los reintentos legítimos,
solo las reentregas del mismo aviso.

### Comprobar que una firma falsa no pasa

```bash
curl -s -X POST "http://localhost:3000/api/payments/webhook/mercadopago?data.id=111222333" \
  -H 'Content-Type: application/json' \
  -H 'x-signature: ts=1730000000,v1=0000000000000000000000000000000000000000000000000000000000000000' \
  -H 'x-request-id: req-falso' \
  -d '{"type":"payment","data":{"id":"111222333"}}'
```

```json
{ "error": { "code": "UNAUTHORIZED", "message": "Firma del evento inválida" } }
```

Y, lo importante, el backend **no llega a consultar** el pago: un aviso falso
no gasta ni una llamada a la API.

### Avanzar el pedido como administrador

Ya pagado, el pedido se opera desde el panel admin. Consigue un token:

```bash
curl -s -X POST http://localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@pomass.co","password":"Admin123*"}'
```

```bash
curl -s -X PATCH http://localhost:3000/api/admin/orders/<ORDER_ID>/status \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <ACCESS_TOKEN>' \
  -d '{"status":"PREPARING"}'
```

Repite con `SHIPPED` y luego `DELIVERED`, y vuelve a consultar el seguimiento:
verás avanzar la línea de tiempo. Al llegar a `DELIVERED` se habilitan las
reseñas de ese producto.

Prueba también a saltarte un paso (`PAID → DELIVERED`): responde `409` diciendo
qué transiciones sí caben. Y a marcar `PAID` a mano: responde `400`, porque ese
estado solo lo produce el webhook.

### Estados de Mercado Pago y su efecto

| `status` del pago | `PaymentStatus` | ¿Pedido a `PAID`? |
|---|---|---|
| `approved` | `APPROVED` | Sí |
| `authorized` | `PENDING` | No — dinero retenido, no cobrado |
| `pending` | `PENDING` | No |
| `in_process` | `PENDING` | No |
| `in_mediation` | `PENDING` | No — disputa abierta |
| `rejected` | `DECLINED` | No |
| `cancelled` | `DECLINED` | No |
| `refunded` | `REFUNDED` | No |
| `charged_back` | `REFUNDED` | No |

Cualquier otro estado se responde con 200 y `ignored: true`, sin tocar el pago:
más vale dejarlo como está que adivinar si el dinero entró.

---

## Resolución de problemas

### `401 UNAUTHORIZED` — "Firma del evento inválida"

Por orden de probabilidad:

1. **El secreto no coincide.** El script usa `MERCADO_PAGO_WEBHOOK_SECRET` del entorno, o `dev_mercadopago_webhook_change_me` si no está definido. Comprueba que sea el mismo que tiene el backend.
2. **Firmaste un `data.id` distinto del que va en la query.** El valor firmado es el de la URL, no el del cuerpo.
3. **El `ts` del manifiesto no es el de la cabecera.** Los dos tienen que ser el mismo número.
4. **Falta la cabecera `x-signature`**, o no trae `v1=`.

### `200` con `"ignored": true`

La firma era buena pero el aviso no se procesó. El campo `reason` dice por qué:

| `reason` | Qué pasó |
|---|---|
| `tipo de aviso no procesado: merchant_order` | No es un aviso de pago. Normal: Mercado Pago manda varios tipos. |
| `pago … inexistente` | La API respondió 404. Normal con las pruebas del panel. |
| `pago … sin referencia de comercio` | El pago no lleva `external_reference`; no se puede saber de qué pedido es. |
| `estado desconocido: …` | Un estado que el backend todavía no mapea. |

### `404 NOT_FOUND` — "Pago no encontrado"

El `external_reference` del pago no corresponde a ningún pago registrado. Debe
ser el **`orderNumber`**, no el `orderId`. Verifica que preparaste el pago
(paso 5) antes de mandar el aviso, y que `--pedido` lleva el número correcto.

### `503 SERVICE_UNAVAILABLE` — "No se pudo contactar con Mercado Pago"

El backend no pudo hablar con la API. Si estás con el doble local, comprueba
que sigue corriendo y que `MERCADO_PAGO_API_URL` apunta a su puerto.

### `409 CONFLICT` — "El pedido no está pendiente de pago"

Ya lo pagaste. Crea un pedido nuevo desde el paso 3.

### El checkout viene con `"configured": false`

El backend todavía tiene el access token de ejemplo, así que ni llama a la API.
Pon cualquier otro valor en `MERCADO_PAGO_ACCESS_TOKEN` y reinicia.

### El seguimiento devuelve 404

Comprueba que el correo es exactamente el `guestEmail` del checkout. Si no
coincide, la respuesta es 404 a propósito: un 403 confirmaría que ese número de
pedido existe.

---

## Cuando conectes el sandbox real de Mercado Pago

1. Crea la aplicación en <https://www.mercadopago.com.co/developers/panel> y copia de **Credenciales de prueba**: el *access token* (`TEST-…`) y la *public key*.
2. Ponlas en `backend/.env` (`MERCADO_PAGO_ACCESS_TOKEN`, `MERCADO_PAGO_PUBLIC_KEY`) y **borra `MERCADO_PAGO_API_URL`** para volver a la API real.
3. En el panel, **Webhooks > Configurar notificación**: pon la URL de tu `POST /api/payments/webhook/mercadopago`, marca el evento *Pagos*, y copia la **clave secreta** a `MERCADO_PAGO_WEBHOOK_SECRET`.
4. En local hace falta un túnel público (ngrok, Cloudflare Tunnel) porque Mercado Pago tiene que poder alcanzarte. Pon esa URL pública también en `MERCADO_PAGO_NOTIFICATION_URL`.
5. Crea usuarios de prueba (comprador y vendedor) desde el panel y paga con las [tarjetas de prueba](https://www.mercadopago.com.co/developers/es/docs/checkout-pro/additional-content/test-cards). El nombre del titular decide el resultado: `APRO` aprueba, `OTHE` rechaza.

Nada del backend cambia al pasar de este simulacro al sandbox real: el mismo
código verifica las mismas firmas y hace las mismas consultas.

> **Sin paso 3 y 4 no hay tienda.** Si no configuras la URL de notificación, los
> pedidos se quedan en `PENDING` para siempre aunque la clienta pague: nadie le
> cuenta al backend que el dinero entró.

---

## Relacionado

- [Referencia: API de pagos](referencia-api.md#pagos--apipayments)
- [Referencia: seguimiento público](referencia-api.md#get-orderstrack)
- [Referencia: gestión de pedidos (admin)](referencia-api.md#admin--gestión-de-pedidos--apiadminorders-)
- [Explicación: modelo de seguridad](explicacion-seguridad.md)
