# Pendientes para lanzar · lista de control

Lista viva de lo que falta para que la tienda venda de verdad. Se marca a
medida que se cierra cada punto. Ordenada por dependencia, no por tamaño.

| | |
|---|---|
| **Creada** | 2026-08-29 |
| **Rama** | `feat/panel-admin-catalogo` |
| **Estado** | 163 tests backend · 104 frontend · typecheck ✅ · lint ✅ · 4 páginas compilando |

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
  Proyecto de Supabase creado (`us-east-1`). Falta: pegar las dos cadenas de
  conexión en `.env` y aplicar migraciones; Redis (lo da Railway); desplegar
  backend en Railway y frontend en Vercel. Las configuraciones ya están.
  Verificado: la conexión directa de Supabase es IPv6 y no resuelve desde
  esta máquina — hay que usar el pooler para ambas cadenas.

- [ ] **B5 · Credenciales de Wompi** — a medias
  Las cuatro llaves de **producción** ya están en `.env`. Falta: cambiar a las
  de sandbox para probar sin cobrar de verdad, y registrar la URL de Eventos
  en el panel de Wompi — hoy está vacía, así que **ningún pago se
  confirmaría**: el pedido se quedaría en PENDING para siempre.

- [ ] **B6 · QA end-to-end en sandbox**
  Los tests de integración compilan pero nunca se han ejecutado aquí (Docker
  no arranca en esta máquina). El flujo real de pago no se ha probado nunca de
  punta a punta contra una base de datos viva.

---

## 2. Necesario para operar la tienda

- [ ] **O1 · Emails transaccionales**
  No existe **nada**: ni nodemailer, ni Resend, ni SMTP. Consecuencias:
  - Si el cliente cierra la pantalla de confirmación, pierde el acceso a su
    pedido para siempre.
  - No hay aviso de «pedido enviado».
  - La recuperación de contraseña del admin **no funciona en producción**: el
    token se genera pero `devResetToken` solo se expone fuera de producción.

- [x] **O2 · Número de guía de la transportadora**
  El modelo `Order` tiene campos `carrier` y `trackingNumber`. El panel de
  administración pide ambos al despachar (`PATCH /admin/orders/:id/status`
  con estado `SHIPPED` rechaza si falta alguno). El cliente ve el número en
  el seguimiento público (`GET /orders/track`).

- [ ] **O3 · Textos legales (Colombia)**
  Política de tratamiento de datos (Ley 1581), términos y condiciones,
  política de devoluciones con el retracto de 5 días hábiles (Estatuto del
  Consumidor) y datos del comerciante.

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

Todo lo que era código puro ya está cerrado. Lo que queda depende de cuentas
externas o de contenido tuyo, salvo O1 y R2.

```
O1 emails  →  B4 infra (Supabase + Redis + despliegue)  →  B5 llaves sandbox
      →  B6 QA de punta a punta  →  O3 legales  →  llaves de producción
      →  R2-R3 cuando haya tráfico
```

## Relacionado

- [Análisis de brechas](analisis-brechas-blueprint.md) — el detalle técnico de cada hueco
- [Cómo desplegar](howto-desplegar.md)
