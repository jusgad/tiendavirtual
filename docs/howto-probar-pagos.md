# Cómo probar el flujo de pagos (Wompi)

Al terminar tendrás un pedido en estado `PAID`, movido ahí por un evento de
Wompi que tú mismo firmaste — igual que lo haría la pasarela real.

Sirve para dos cosas: probar el flujo sin depender del sandbox de Wompi, y
entender qué verifica el backend antes de dar un pedido por pagado.

## Requisitos previos

- Backend corriendo en `http://localhost:3000` con Postgres y Redis vivos ([cómo montarlo](howto-entorno-local.md)).
- Base migrada y sembrada (`npm run prisma:seed`).
- `WOMPI_EVENTS_SECRET` con el valor de tu `backend/.env`. Los ejemplos usan el de la plantilla: `dev_wompi_events_change_me`.
- `curl` y Node disponibles en la terminal.

```bash
curl http://localhost:3000/health
```

## Cómo encaja el flujo real

```
 1. Cliente hace checkout            →  POST /api/orders          →  pedido PENDING
 2. Frontend pide config del widget  →  POST /api/payments        →  { payment, checkout }
 3. Cliente paga DENTRO del widget de Wompi (en su navegador)
    └─ el número de tarjeta nunca pasa por este backend
 4. Wompi redirige al frontend       →  pantalla "verificando pago"
    └─ NO es fuente de verdad: el navegador puede mentir
 5. Wompi envía el evento            →  POST /api/payments/webhook/wompi
    └─ ESTA es la fuente de verdad   →  pedido PAID
```

Los pasos 3 y 4 ocurren en el navegador y no se pueden simular con `curl`. Este
documento cubre 1, 2 y **5**, que es donde vive la lógica del backend.

---

## Pasos

### 1. Consigue el id del producto

```bash
curl -s "http://localhost:3000/api/products?pageSize=1"
```

Copia el `id`. Lo llamaremos `<PRODUCT_ID>`.

### 2. Crea un carrito de invitado

```bash
curl -s -X POST http://localhost:3000/api/cart/items \
  -H 'Content-Type: application/json' \
  -d '{"productId":"<PRODUCT_ID>","quantity":1}'
```

La respuesta trae `guestId`. Cópialo como `<GUEST_ID>`.

### 3. Haz checkout

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

### 4. Prepara el pago

```bash
curl -s -X POST http://localhost:3000/api/payments \
  -H 'Content-Type: application/json' \
  -H 'x-guest-id: <GUEST_ID>' \
  -d '{"orderId":"<ORDER_ID>"}'
```

```json
{
  "payment": { "id": "…", "method": "WOMPI", "status": "PENDING", "externalReference": "PA-2026-A3F91C" },
  "checkout": {
    "publicKey": "pub_test_000000000000000000000000",
    "currency": "COP",
    "amountInCents": 8990000,
    "reference": "PA-2026-A3F91C",
    "signature": "9a3f…",
    "redirectUrl": "http://localhost:5173/track.html"
  }
}
```

Fíjate en lo que **no** hay en la petición: ni número de tarjeta, ni CVV, ni
celular. Solo el pedido. Eso es lo que mantiene al proyecto fuera del alcance de
PCI-DSS.

El bloque `checkout` es lo que el frontend pasa al widget. `signature` es la
firma de integridad: si el cliente cambiara `amountInCents` en el navegador,
Wompi rechazaría la transacción porque la firma dejaría de cuadrar.

### 5. Firma el evento del webhook

El checksum de Wompi **no va en una cabecera**: viaja dentro del propio cuerpo,
en `signature.checksum`. Se calcula así:

```
SHA256( concat(valores de signature.properties) + timestamp + WOMPI_EVENTS_SECRET )
```

Los valores se leen dentro de `data`, siguiendo cada ruta con puntos, **en el
orden del array**.

Genera el cuerpo completo con Node:

```bash
node -e "
const c=require('crypto');
const SECRET='dev_wompi_events_change_me';
const REF='<ORDER_NUMBER>';
const data={transaction:{id:'txn-demo-001',reference:REF,status:'APPROVED',amount_in_cents:8990000}};
const props=['transaction.id','transaction.status','transaction.amount_in_cents'];
const ts=Math.floor(Date.now()/1000);
const concat=props.map(p=>p.split('.').reduce((a,k)=>a[k],data)).join('');
const checksum=c.createHash('sha256').update(concat+ts+SECRET).digest('hex');
console.log(JSON.stringify({event:'transaction.updated',data,timestamp:ts,signature:{properties:props,checksum}}));
"
```

Copia la línea JSON completa que imprime. La llamaremos `<BODY>`.

> Ajusta `amount_in_cents` si tu pedido no cuesta $89.900. No es obligatorio que
> coincida con el total para que el checksum valide (el backend no lo compara
> hoy), pero conviene que sea realista.

### 6. Envía el evento

```bash
curl -s -X POST http://localhost:3000/api/payments/webhook/wompi \
  -H 'Content-Type: application/json' \
  -d '<BODY>'
```

```json
{ "received": true, "status": "APPROVED" }
```

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

Wompi reintenta si no recibe un 200 a tiempo; esto es lo que hace inofensivo el
reintento.

### Comprueba que un pago aprobado nunca se degrada

Genera un evento `DECLINED` con **otro** `transaction.id` y envíalo. La
respuesta seguirá siendo `APPROVED` con `idempotent: true`, y el pedido seguirá
en `PAID`. Un pago cobrado no se deshace por un evento posterior.

---

## Variantes útiles

### Simular un rechazo (y luego un reintento con éxito)

Cambia `status:'APPROVED'` por `status:'DECLINED'` en el script del paso 5 y
envíalo. El pago queda `DECLINED` y **el pedido sigue en `PENDING`**.

Ahora genera otro evento con un `transaction.id` distinto (`txn-demo-002`) y
estado `APPROVED`. Esta vez **sí** aprueba: la idempotencia no bloquea los
reintentos legítimos, solo las reentregas del mismo evento.

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

### Estados de Wompi y su efecto

| `status` de Wompi | `PaymentStatus` | ¿Pedido a `PAID`? |
|---|---|---|
| `APPROVED` | `APPROVED` | Sí |
| `DECLINED` | `DECLINED` | No |
| `VOIDED` | `DECLINED` | No |
| `ERROR` | `DECLINED` | No |
| `PENDING` | `PENDING` | No |

---

## Resolución de problemas

### `401 UNAUTHORIZED` — "Checksum de evento inválido"

Por orden de probabilidad:

1. **El secreto no coincide.** El script usa `dev_wompi_events_change_me`; comprueba `WOMPI_EVENTS_SECRET` en `backend/.env`.
2. **Modificaste el cuerpo después de firmarlo.** Cambiar cualquier valor de `signature.properties` (id, estado o monto) invalida el checksum. Vuelve a generarlo.
3. **Cambiaste el orden de `properties`.** El orden entra en la concatenación.
4. **El `timestamp` del cuerpo no es el que usaste al firmar.**
5. **Falta `signature`, `timestamp` o `data.transaction`** — el evento se descarta antes de verificar.

### `404 NOT_FOUND` — "Pago no encontrado"

El `reference` del evento no corresponde a ningún pago. Debe ser el
**`orderNumber`**, no el `orderId`. Verifica que preparaste el pago (paso 4)
antes de enviar el evento.

### `409 CONFLICT` — "El pedido no está pendiente de pago"

Ya lo pagaste. Crea un pedido nuevo desde el paso 2.

### El seguimiento devuelve 404

Comprueba que el correo es exactamente el `guestEmail` del checkout. Si no
coincide, la respuesta es 404 a propósito: un 403 confirmaría que ese número de
pedido existe.

---

## Cuando conectes el sandbox real de Wompi

1. Crea una cuenta en <https://comercios.wompi.co> y copia del panel: llave pública, llave privada, secreto de integridad y secreto de eventos.
2. Ponlas en `backend/.env` (`WOMPI_PUBLIC_KEY`, `WOMPI_PRIVATE_KEY`, `WOMPI_INTEGRITY_SECRET`, `WOMPI_EVENTS_SECRET`).
3. Configura la URL de eventos en el panel de Wompi apuntando a tu `POST /api/payments/webhook/wompi`. En local necesitarás un túnel público (ngrok, Cloudflare Tunnel) porque Wompi tiene que poder alcanzarte.
4. El frontend debe montar el widget con los datos de `checkout` — ese paso todavía está pendiente (ver [análisis de brechas](analisis-brechas-blueprint.md)).

Nada del backend cambia al pasar de este simulacro al sandbox real: el mismo
código verifica los mismos checksums.

---

## Relacionado

- [Referencia: API de pagos](referencia-api.md#pagos--apipayments)
- [Referencia: seguimiento público](referencia-api.md#get-orderstrack)
- [Referencia: gestión de pedidos (admin)](referencia-api.md#admin--gestión-de-pedidos--apiadminorders-)
- [Explicación: modelo de seguridad](explicacion-seguridad.md)
