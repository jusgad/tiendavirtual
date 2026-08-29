# Tutorial · Tu primer pedido, de punta a punta

Vas a llevar un pedido real desde el catálogo hasta el estado `PAID`, usando la
interfaz de la demo de checkout y disparando tú mismo la confirmación de pago.
Al terminar habrás visto funcionar el carrito de invitado, el checkout
transaccional, los cupones, el descuento de stock y el webhook firmado — que es
prácticamente todo el backend.

Tiempo estimado: 15 minutos. La primera vez que veas algo funcionando: paso 3.

## Lo que necesitas

- **Node.js 20** o superior (`node --version`).
- **Docker Desktop** funcionando. Si no lo tienes, ve primero a [Cómo montar el entorno local](howto-entorno-local.md) y vuelve aquí con el backend arriba.
- Una terminal y un navegador.

---

## Paso 1 · Levanta la base de datos y la caché

```bash
cd backend
cp .env.example .env
docker compose up -d db redis
```

Esto arranca Postgres y Redis en segundo plano. Comprueba que están sanos:

```bash
docker compose ps
```

Ambos deben aparecer como `healthy`. Si tardan unos segundos es normal: tienen
healthcheck y esperan a estar listos de verdad.

## Paso 2 · Prepara y arranca la API

```bash
npm install
npm run prisma:migrate
npm run prisma:seed
```

La migración crea las 12 tablas. El seed carga un admin, 3 marcas, 6 categorías,
**7 productos** y el cupón `BIENVENIDA10`. Verás:

```
✅ Seed completado: admin, marcas, categorías, productos y cupón.
```

Arranca la API:

```bash
npm run dev
```

Déjala corriendo. Abre **otra terminal** para el resto del tutorial.

## Paso 3 · Comprueba que la API responde

```bash
curl http://localhost:3000/health
```

```json
{"status":"ok","timestamp":"2026-08-08T14:22:03.114Z"}
```

Ahí está lo primero funcionando. Ahora mira los datos que acabas de sembrar:

```bash
curl -s "http://localhost:3000/api/products?pageSize=2"
```

Verás dos productos con precio, stock, marca y categoría. Si `total` es `7`, el
seed hizo su trabajo.

Abre también <http://localhost:3000/api/docs>: es la documentación Swagger
interactiva, generada del mismo código, con los 48 endpoints.

## Paso 4 · Arranca el frontend

En una tercera terminal:

```bash
cd frontend
npm install
npm run dev
```

Se abrirá <http://localhost:5173/> con la landing: la página Día/Noche que vende
por WhatsApp. Pruébala — el toggle del encabezado, el botón sol/luna, y verás
que alterna sola cada 7 segundos.

Ahora pulsa **🛒 COMPRAR AHORA**. Aparece un toast y, tras un instante, te lleva
a `/checkout.html`. Ese es el único punto de contacto entre la landing y el
backend.

## Paso 5 · Compra como invitado

Estás en el paso **Cuenta**. Pulsa **"Continuar como invitado →"**.

En el paso **Tienda** verás los 7 productos del seed. Agrega dos unidades de
cualquiera con el botón *Agregar al carrito* y luego el `+`.

> Lo que acaba de pasar por debajo: la primera petición no llevaba identidad, así
> que el backend generó un `guestId`, lo devolvió en la respuesta y el cliente lo
> guardó en `localStorage`. Tu carrito vive en Redis con TTL de 7 días.

Pulsa **Continuar al envío →**.

## Paso 6 · Aplica un cupón y crea el pedido

En el paso **Envío**, rellena:

| Campo | Valor |
|---|---|
| Correo de contacto | `ana@correo.com` |
| Nombre completo | `Ana Díaz` |
| Celular | `3105676187` |
| Dirección | `Calle 1 # 2-3` |
| Ciudad | `Medellín` |
| Departamento | `Antioquia` |
| Cupón | **`BIENVENIDA10`** |

Marca la casilla de **empaque discreto** y pulsa **Confirmar pedido**.

El cupón exige una compra mínima de $50.000, así que asegúrate de llevar al
menos dos unidades. Si no, verás el mensaje del backend: *"El cupón requiere una
compra mínima de 50000"*.

Ese error viene de una regla pura del dominio
([`pricing.ts`](../backend/src/modules/orders/domain/pricing.ts)), la misma que
cubren los tests unitarios sin necesidad de base de datos.

Cuando funcione, habrás disparado una transacción que hizo cinco cosas
atómicamente: descontar stock con guarda de concurrencia, crear el pedido con
snapshots, incrementar el uso del cupón, registrar el canje y vaciar el carrito.

## Paso 7 · Inicia el pago

Estás en el paso **Pago**, y arriba ves tu número de pedido (`PA-2026-XXXXXX`) y
el total con el descuento aplicado.

Elige **Nequi**, escribe el celular `3105676187` y pulsa *Pagar*.

Prueba antes a poner un celular inválido como `123`: el backend lo rechaza con
*"Número de celular colombiano inválido (debe iniciar en 3 y tener 10 dígitos)"*.
La pasarela es simulada, pero la validación de formato es real.

En el paso **Confirmación** verás el desglose completo y las instrucciones del
proveedor. Fíjate en el aviso:

> El pedido pasará a **PAID** automáticamente cuando el proveedor confirme el
> pago por webhook (fuera del alcance de esta demo de interfaz).

Eso es lo que vas a hacer tú en el siguiente paso.

## Paso 8 · Confirma el pago con un webhook firmado

Necesitas el `externalReference` del pago. Búscalo en la base:

```bash
cd backend && npm run prisma:studio
```

Abre la tabla **`payments`**, toma la fila más reciente y copia su
`externalReference` (algo como `nequi_8f3c1a2b-…`).

Genera el cuerpo y la firma:

```bash
node -e "const c=require('crypto');const p={externalReference:'<EXTERNAL_REF>',status:'APPROVED'};const b=JSON.stringify(p);console.log('BODY='+b);console.log('SIG='+c.createHmac('sha256','dev_webhook_secret_change_me').update(b).digest('hex'))"
```

Envía el webhook con el `BODY` y el `SIG` que imprimió:

```bash
curl -s -X POST http://localhost:3000/api/payments/webhook/nequi \
  -H 'Content-Type: application/json' \
  -H 'x-signature: <SIG>' \
  -d '<BODY>'
```

```json
{ "received": true, "status": "APPROVED" }
```

Vuelve a Prisma Studio, mira la tabla **`orders`** y confirma que tu pedido está
en **`PAID`**.

> Si obtienes `401`, casi siempre es que el cuerpo enviado no es idéntico al
> firmado. Detalle y más casos en [Cómo probar el flujo de pagos](howto-probar-pagos.md).

## Paso 9 · Comprueba que el stock bajó

```bash
curl -s "http://localhost:3000/api/products?pageSize=10" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const j=JSON.parse(d);j.items.forEach(p=>console.log(p.stock, p.name))})"
```

El producto que compraste tiene dos unidades menos. Y no bajó al añadirlo al
carrito: bajó **en el checkout**, dentro de la transacción, con un
`UPDATE ... WHERE stock >= cantidad` que hace imposible vender el mismo frasco
dos veces.

Al confirmarse el pedido, el backend también invalidó la caché del catálogo
(incrementando un contador de versión, sin recorrer el keyspace de Redis), por
eso ves el stock actualizado de inmediato.

---

## Lo que construiste

Un pedido completo que atravesó todo el sistema:

```
Landing  →  checkout demo  →  carrito de invitado (Redis)
                                     │
                                     ▼
                            checkout transaccional
                     (stock atómico + cupón + snapshots)
                                     │
                                     ▼
                              pago iniciado
                                     │
                        webhook firmado con HMAC
                                     │
                                     ▼
                              pedido PAID
```

Por el camino viste funcionar de verdad:

- **Carrito de invitado** en Redis, sin necesidad de cuenta.
- **Checkout transaccional** con descuento de stock a prueba de concurrencia.
- **Cupones** con compra mínima, validados por una regla de dominio pura.
- **Snapshots** de precio, nombre y dirección en el pedido.
- **Webhook firmado** con HMAC-SHA256 e idempotente.
- **Invalidación de caché** por versión de namespace.

## Siguientes pasos

**Prueba el flujo con cuenta.** Vuelve a `/checkout.html`, crea una cuenta (verás
la casilla obligatoria de mayoría de edad) y comprueba cómo el carrito de
invitado se fusiona automáticamente con el del usuario. Ahora `GET /orders` sí
te devuelve tu historial:

```bash
curl -s http://localhost:3000/api/orders -H 'Authorization: Bearer <ACCESS_TOKEN>'
```

**Entra como admin.** Usa `admin@pomass.co` / `Admin123*` para obtener un token
y prueba los reportes:

```bash
curl -s http://localhost:3000/api/admin/reports/sales -H 'Authorization: Bearer <ACCESS_TOKEN>'
```

**Mira los tests.** Corren en 12 segundos sin base de datos:

```bash
cd backend && npm run test:unit
```

`tests/unit/orders/checkout.test.ts` prueba exactamente el flujo que acabas de
ejecutar, pero con dobles en memoria.

**Sigue leyendo:**

- [Referencia de la API](referencia-api.md) — los 48 endpoints con sus contratos
- [Decisiones de diseño](explicacion-decisiones.md) — por qué el stock se descuenta así
- [Cómo agregar un módulo nuevo](howto-agregar-modulo.md) — para extender el backend
- [Cómo probar el flujo de pagos](howto-probar-pagos.md) — más variantes del webhook
