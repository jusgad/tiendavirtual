# Pendientes para lanzar · lista de control

Lista viva de lo que falta para que la tienda venda de verdad. Se marca a
medida que se cierra cada punto. Ordenada por dependencia, no por tamaño.

| | |
|---|---|
| **Creada** | 2026-08-29 |
| **Rama** | `feat/panel-admin-catalogo` |
| **Estado** | 212 tests backend · 114 frontend · typecheck ✅ · lint ✅ · 5 páginas compilando |

---

## 0. Hecho

- [x] **P0 · Panel de administración (frontend)** — completo
  Interfaz web operativa para llevar la tienda. Las cinco secciones están
  construidas y verificadas en navegador:
  - **Pedidos** — login, listado con filtro y paginación, detalle con la
    dirección completa, transiciones de estado, despacho con transportadora y
    guía obligatorios, cancelación.
  - **Productos** — alta, edición, activar/desactivar y borrado, con editor de
    imágenes por dirección web y orden editable. `GET /products` acepta
    `includeInactive`, honrado solo para ADMIN, para que un producto
    desactivado no desaparezca de la lista.
  - **Categorías y marcas** — alta en línea, activación y borrado.
  - **Cupones** — alta y edición. El código queda bloqueado al editar y el
    estado (Vigente, Programado, Expirado, Agotado, Desactivado) se calcula
    en el cliente.
  - **Reportes** — ventas por día o por mes en el rango elegido, productos más
    vendidos y conteo de pedidos por estado.

---

## 1. Bloqueantes — sin esto no se puede vender

- [x] **B1 · `track.html`** — hecho
  Cuarta entrada de Vite. Consulta por nº de pedido + correo, línea de tiempo
  del avance, transportadora y guía cuando el pedido se despacha, y sondeo
  mientras el pago no se confirma. El checkout recuerda el pedido para que al
  volver de PSE la consulta salga sola. Verificado en navegador.

- [x] **B2 · La landing vende en el sitio** — hecho
  Los tres botones de compra llevan al checkout. WhatsApp queda como canal de
  soporte: se recopiaron los botones y el mensaje por defecto ahora pregunta
  en vez de pedir comprar.

- [x] **B3 · El checkout muestra el producto** — hecho
  `ShopStep` pinta la foto del producto. Los dos tubos son PNG con fondo
  transparente a 400 px (~250-290 KB); los originales pesaban ~5 MB cada uno,
  inviables como miniatura en datos móviles. Las fotos se sirven desde el
  propio frontend vía `PRODUCT_IMAGE_BASE_URL`: no hace falta bucket aparte.

- [x] **Rótulos de demo** — hecho
  El checkout se anunciaba como «demo de checkout» y «Demo conectada a la API
  real». Ya no.

- [ ] **B4 · Infraestructura viva** — a medias
  Proyecto de Supabase creado (`us-east-1`). **La puesta en marcha de la base
  ya está automatizada**: pega las dos cadenas del pooler en `backend/.env` y
  corre `npm run supabase:setup` — valida las cadenas antes de conectarse,
  migra, siembra y verifica. Guía paso a paso en
  [howto-supabase.md](howto-supabase.md), incluido cómo **desactivar la Data
  API**, que no es opcional.

  Falta: Redis (lo da Railway), desplegar backend en Railway y frontend en
  Vercel. Verificado: la conexión directa de Supabase es IPv6 y no resuelve
  desde esta máquina — las dos cadenas van por el pooler, y el script lo
  impone.

- [ ] **B5 · Credenciales de Mercado Pago** — sin empezar
  La tienda cambió de pasarela: las llaves de Wompi que había en `.env` ya no
  sirven de nada. Hay que crear la aplicación en el
  [panel de Mercado Pago](https://www.mercadopago.com.co/developers/panel),
  poner `MERCADO_PAGO_ACCESS_TOKEN` y `MERCADO_PAGO_PUBLIC_KEY` (primero las
  de prueba, `TEST-…`), y registrar la URL de notificación con su secreto en
  `MERCADO_PAGO_WEBHOOK_SECRET`. **Sin esa URL ningún pago se confirma**: el
  pedido se quedaría en PENDING para siempre.

- [ ] **B6 · QA end-to-end en sandbox**
  Los tests de integración compilan pero nunca se han ejecutado aquí (Docker
  no arranca en esta máquina). El flujo real de pago no se ha probado nunca de
  punta a punta contra una base de datos viva.

---

## 2. Necesario para operar la tienda

- [x] **O1 · Emails transaccionales** — hecho
  Cuatro correos, por la API HTTP de Resend (sin dependencias nuevas):
  «recibimos tu pedido» al cerrar el checkout, «pago confirmado» desde el
  webhook, «tu pedido va en camino» con transportadora y guía al despachar, y
  el enlace de recuperación de contraseña.

  Tres decisiones que importan:
  - **Un fallo de correo nunca tumba una operación de negocio.** Los avisos
    salen después de que el pedido existe y el stock ya se descontó; si el
    proveedor está caído, se registra en el log y la compra sigue.
  - **El aviso de pago no se duplica**: `markPaid` devuelve los datos de
    contacto solo si la guarda `PENDING → PAID` dejó pasar, así que un
    reintento de Mercado Pago no manda un segundo correo.
  - **La recuperación de contraseña ya funciona de verdad.** Antes el token se
    generaba y solo se exponía fuera de producción: en la tienda real nadie lo
    recibía. Ahora llega por correo, hay pantalla para usarlo
    (`admin.html#/nueva-contrasena/<token>`) y un enlace «Olvidé mi contraseña»
    en el acceso.

  ⚠️ **Falta configurarlo**: `RESEND_API_KEY`, `EMAIL_FROM` y `FRONTEND_URL`
  en `.env`. Sin la llave los correos quedan en el log en vez de enviarse; la
  tienda arranca igual y avisa a gritos en el log de producción.

- [x] **O2 · Número de guía de la transportadora**
  El modelo `Order` tiene campos `carrier` y `trackingNumber`. El panel de
  administración pide ambos al despachar (`PATCH /admin/orders/:id/status`
  con estado `SHIPPED` rechaza si falta alguno). El cliente ve el número en
  el seguimiento público (`GET /orders/track`).

- [x] **O3 · Textos legales (Colombia)** — redactados, faltan tus datos
  Quinta entrada de Vite, `legal.html`, con cuatro apartados enlazables:
  quién te vende, tratamiento de datos (Ley 1581 de 2012 y Decreto 1377 de
  2013), términos y condiciones, y devoluciones con el retracto de cinco días
  hábiles, la garantía legal y la reversión del pago (Ley 1480 de 2011,
  artículos 47, 50 y 51). Hay pie con los enlaces en la landing, el checkout y
  el seguimiento, porque el artículo 50 pide que se vean antes de contratar.

  ⚠️ **Falta completar `COMERCIANTE` en `frontend/src/site.js`**: razón social,
  NIT, dirección y correo de contacto. Mientras tanto la página publica
  literalmente «POR DEFINIR», a propósito, para que no se pase por alto.

  Son un punto de partida serio, no un concepto jurídico: conviene que los
  revise un abogado antes de publicar, sobre todo por el producto.

---

## 3. Riesgos a cerrar antes de escalar

- [x] **R1 · Tolerancia a fallos de Redis** — hecho
  El defecto grave era que `cart.clear()` corría tras crear el pedido sin
  `try/catch`: un corte de Redis en ese instante devolvía error por un pedido
  que sí existía y ya había descontado inventario. Ahora se ignora ese fallo,
  y el resto del carrito responde 503 con mensaje claro en vez de 500.

- [ ] **R2 · `perUserLimit` de cupones no es exigible sin cuentas**
  Solo funciona el tope global `maxUses`. Un cupón «uno por cliente» hoy es
  ilimitado para los pedidos de invitado. Mitigado a medias: el formulario de
  cupones del panel avisa de esto junto al campo y remite al máximo de usos,
  así que ya no se promete un límite que no se cumple. La restricción de fondo
  sigue ahí.

- [ ] **R3 · Sin observabilidad**
  No hay Sentry, ni alertas, ni backups verificados de la base de datos.

---

## Orden sugerido

**Ya no queda código por escribir.** Todo lo que falta son cuentas externas,
credenciales y datos tuyos.

```
1. Completa COMERCIANTE en site.js  (5 minutos)
2. B4 — Supabase (`npm run supabase:setup`) + Redis + desplegar
3. B5 — credenciales de prueba de Mercado Pago + registrar la URL de notificación
4. Resend — crear cuenta, verificar el dominio, poner RESEND_API_KEY
5. B6 — comprar de mentira de punta a punta
6. Credenciales de producción de Mercado Pago (APP_USR-…)
7. R2-R3 cuando haya tráfico
```

### Lo que hay que poner en `.env` al desplegar

| Variable | De dónde sale |
|---|---|
| `DATABASE_URL` y `DIRECT_URL` | Supabase → Connect. **Las dos por el pooler**: transacción (6543, con `?pgbouncer=true`) y sesión (5432). Ver [howto-supabase.md](howto-supabase.md). |
| `REDIS_URL` | Railway → añadir Redis al proyecto. |
| `FRONTEND_URL` | La dirección pública de la tienda. En producción no puede quedar en `localhost`: el arranque falla si se intenta. |
| `CORS_ORIGIN` | La misma dirección. En producción `*` está prohibido. |
| `RESEND_API_KEY` | resend.com → API Keys. |
| `EMAIL_FROM` | Un remitente de un dominio verificado en Resend. |
| `MERCADO_PAGO_*` | Las de prueba primero (`TEST-…`); las de producción al final. |
| `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `ADMIN_PASSWORD` | Valores propios. El arranque falla si quedan los de ejemplo. |

### La URL de notificación de Mercado Pago

En el panel de Mercado Pago, en **Webhooks > Configurar notificación**:
`https://TU-BACKEND/api/payments/webhook/mercadopago`

Marca el evento **Pagos** y copia la clave secreta que te da a
`MERCADO_PAGO_WEBHOOK_SECRET`.

**Hoy está vacía. Mientras siga así, ningún pago se confirma**: el cliente
paga y el pedido se queda en PENDING para siempre. Es lo primero que hay que
hacer apenas el backend tenga dirección pública.

## Relacionado

- [Análisis de brechas](analisis-brechas-blueprint.md) — el detalle técnico de cada hueco
- [Montar la base en Supabase](howto-supabase.md)
- [Cómo desplegar](howto-desplegar.md)
