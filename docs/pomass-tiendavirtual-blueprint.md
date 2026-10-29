# PomAss — Tienda Virtual — Blueprint de Finalización

> Generado por The Architect el 2026-08-01
> Archetype: `saas-webapp` (variante e-commerce transaccional, sin cuentas obligatorias)
> Tipo de blueprint: **finalización/integración** de un repo existente — no es un build desde cero.
> Repo base: https://github.com/jusgad/tiendavirtual (rama `main`, HEAD `be9695a` al momento de este análisis)

> ### ⚠️ Obsoleto en un punto: la pasarela de pago
>
> Este documento se escribió cuando la pasarela era **Wompi**. La tienda usa
> hoy **Mercado Pago** (Checkout Pro), lo que cambia las credenciales, la ruta
> del webhook y la forma de confirmar un pago. Todo lo demás sigue valiendo.
>
> Para lo vigente: [cómo probar los pagos](howto-probar-pagos.md) ·
> [referencia de la API](referencia-api.md#pagos--apipayments) ·
> [decisiones de diseño](explicacion-decisiones.md#pagos-con-mercado-pago-sacar-la-tarjeta-del-backend).

---

## 0. Contexto para quien ejecute este blueprint

**Lee esto primero, con cero contexto previo del proyecto.**

Este repositorio ya contiene una tienda de comercio electrónico **funcional en su mayor parte**, no un punto de partida vacío:

- Backend headless completo (`backend/`): Node + TypeScript + Express + Prisma (PostgreSQL) + Redis, arquitectura hexagonal por módulos (`auth`, `catalog`, `cart`, `orders`, `payments`, `coupons`, `reviews`, `admin`), con 69+ tests unitarios y tests de integración, CI en GitHub Actions, Docker Compose, docs Swagger en `/api/docs`.
- Frontend (`frontend/`): React + Vite + Tailwind, **dos apps Vite multi-página en el mismo proyecto**: `index.html` (landing "PomAss Día/Noche" que vende por WhatsApp) y `checkout.html` (un checkout que sí llama a la API real, con carrito, dirección, pago e invitado).

Antes de escribir una sola línea de código, lee `README.md`, `ARCHITECTURE.md` y `CLAUDE.md` en la raíz del repo — documentan con precisión cómo está armado. **No los reinterpretes ni los reescribas**: complétalos si algo cambia (p. ej. al quitar Nequi/Daviplata/tarjeta cruda), no los sustituyas.

**Regla de oro de este blueprint:** todo lo marcado como "✅ ya existe" no se reconstruye. Este documento describe únicamente el **delta**: qué falta, qué cambia y en qué orden hacerlo para llegar de "API + landing desconectados" a "tienda funcionando con pagos reales, escalable y con seguimiento de pedido sin cuenta".

---

## 1. Resumen del negocio

- **Producto:** un solo producto físico por ahora — el "Estuche PomAss Día + Noche" (dos cremas de cuidado íntimo vendidas juntas como combo/kit). Marca propia: PomAss by Pao Díaz.
- **Mercado:** Colombia únicamente por ahora. Moneda: COP.
- **Clientes:** compra como invitado, sin cuenta obligatoria. Seguimiento del pedido por link/número de pedido, no por login.
- **Etapa:** producción desde el día uno — pagos reales, seguridad real (no un MVP descartable).
- **Meta explícita del dueño:** que la tienda sea escalable y no se quede estancada al crecer.

---

## 2. Hallazgos de la auditoría (qué existe vs. qué falta)

| # | Área | Estado actual | Acción requerida |
|---|------|---------------|-------------------|
| 1 | Catálogo / carrito / checkout transaccional / cupones / reseñas / admin | ✅ Completo y probado | Ninguna — no tocar la lógica |
| 2 | Checkout de invitado (sin cuenta) | ✅ Ya soportado (`userId` nullable + `guestEmail` en `Order`, `optionalAuth` en `POST /orders`) | Ninguna |
| 3 | Landing (`index.html`) conectada al checkout real | ❌ El CTA "Comprar" abre WhatsApp, no llama a la API | **Reemplazar** el flujo de venta por el checkout real (decisión del dueño, confirmada) |
| 4 | Pagos: Nequi / Daviplata / Tarjeta | ⚠️ Simulados (stub) — **y el endpoint captura número de tarjeta + CVV en crudo en el backend** | **Riesgo de cumplimiento PCI-DSS real si esto llega a producción tal cual.** Reemplazar todo el módulo por integración con **Wompi**, que tokeniza la tarjeta en el navegador del cliente — el backend nunca ve el número de tarjeta |
| 5 | Seguimiento de pedido sin cuenta (link público) | ❌ No existe — `GET /orders/:id` exige `authGuard` | Agregar endpoint público `GET /orders/track` (nº de pedido + email) |
| 6 | Base de datos | Postgres local (Docker) | Migrar a **Supabase Postgres administrado** |
| 7 | Imágenes de producto | Locales / placeholder | Migrar a **Supabase Storage** |
| 8 | Catálogo sembrado (`seed.ts`) | Datos genéricos de ejemplo (3 marcas, categorías tipo "lubricantes", "higiene masculina") que no reflejan el negocio real | Re-sembrar con: 1 marca (PomAss), 1 producto real (Estuche Día + Noche) |
| 9 | Hosting | No configurado | Backend → **Railway** (confirmado). Frontend → **Vercel** |
| 10 | Emails transaccionales (confirmación de compra + link de seguimiento) | ❌ No existe módulo de email | Agregar (Resend) — ver Build Order, paso opcional pero recomendado |
| 11 | Escalabilidad de base | Ya bien encaminada: backend sin estado en memoria (carrito invitado en Redis), stock decrementado atómicamente, caché de catálogo versionada en Redis | Falta: pooling de conexiones Postgres para Supabase (ver §6), y desplegar el backend como contenedor sin estado para poder escalar horizontalmente en Railway |

---

## 3. Decisiones de arquitectura (confirmadas con el dueño)

| Decisión | Elegido | Por qué |
|---|---|---|
| CTA de la landing | Reemplazar WhatsApp por el checkout real | El dueño quiere una tienda real, no un catálogo con desvío a WhatsApp. WhatsApp queda solo como canal de soporte/dudas si se desea, no de venta. |
| Hosting backend | Railway | Despliega el `Dockerfile` que ya existe casi sin cambios, soporta procesos persistentes (necesarios por Redis + Postgres vía Prisma), plan gratuito suficiente para arrancar y escala verticalmente/horizontalmente después sin migrar de plataforma. |
| Base de datos | Supabase Postgres | Managed, con backups automáticos, panel de administración, y Storage incluido para las imágenes de producto — sin tener que operar Postgres tú mismo. |
| Rol de Supabase | **Solo** Postgres administrado + Storage. El backend Express/Prisma sigue siendo la única fuente de lógica de negocio. | El frontend **no** habla directo con Supabase (ni Auth ni API REST de Supabase). Si lo hiciera, perderías el stock atómico, los cupones y el checkout transaccional que ya están bien resueltos en el backend — reconstruirlo como reglas RLS en SQL sería más frágil y duplicaría lógica. |
| Pasarela de pago | Wompi (Widget de Checkout) | Pedido explícito del dueño + resuelve de raíz el problema de PCI-DSS: el número de tarjeta nunca toca tu servidor. Cubre tarjeta, Nequi, PSE y Bancolombia en un solo proveedor — no hace falta un adaptador por método como hoy. |
| Cuentas de usuario | Ninguna obligatoria | Confirmado por el dueño — coincide 100% con lo que el backend ya soporta (`optionalAuth`). No se agrega registro/login a la landing. |

---

## 4. Cambios al Data Model

### 4.1 `PaymentMethod` (Prisma enum)

Reemplazar:
```prisma
enum PaymentMethod {
  NEQUI
  DAVIPLATA
  CREDIT_CARD
}
```
por:
```prisma
enum PaymentMethod {
  WOMPI
}
```
El método específico que el cliente usó dentro de Wompi (tarjeta/Nequi/PSE/Bancolombia) se guarda como dato informativo dentro de `Payment.rawPayload` (ya existe ese campo `Json?`), no como parte del enum — Wompi lo reporta en el evento del webhook, no hace falta modelarlo aparte.

Genera la migración con Prisma normalmente (`prisma migrate dev`); no rompe pedidos existentes porque no hay pedidos reales en producción todavía.

### 4.2 Nuevos campos en `Payment` (opcional pero recomendado)

Agregar `wompiTransactionId String?` (indexado) para poder buscar por el id de transacción de Wompi sin depender solo de `externalReference`. Si `externalReference` ya cumple ese rol, se puede omitir.

### 4.3 Catálogo — datos reales (seed)

Reemplazar el seed genérico por:
- **1 Brand:** `PomAss` (`slug: pomass`)
- **1 Category:** algo como `Cuidado íntimo` (`slug: cuidado-intimo`) — no hace falta el árbol de 6 categorías actual, se puede dejar como capacidad futura sin sembrar datos ficticios
- **1 Product:** `Estuche PomAss Día + Noche`, `sku` único, `price: 89900`, `currency: COP`, `presentation: "Estuche Día + Noche"`, `stock` con el inventario real, descripción/ingredientes/advertencias reales (usa el copy de `frontend/src/site.js` como fuente — ya tiene beneficios día/noche redactados)
- **2 ProductImage** apuntando a Supabase Storage (ver §5)

No se elimina la capacidad del modelo de tener múltiples productos/marcas/categorías — solo se deja de sembrar datos de ejemplo que no son el negocio real. Cuando el dueño agregue más productos, se hace desde el panel admin que ya existe.

---

## 5. Supabase — qué conectar exactamente

1. Crear proyecto en Supabase (región más cercana a Colombia disponible, ej. `us-east-1`).
2. Copiar **dos** cadenas de conexión del panel de Supabase (Settings → Database):
   - **Connection pooling (puerto 6543, PgBouncer)** → usar como `DATABASE_URL` en producción (Railway). Necesaria porque contenedores/serverless abren muchas conexiones cortas; sin pooler se agota el límite de Postgres rápido al escalar.
   - **Direct connection (puerto 5432)** → usar como `DIRECT_URL`, solo para migraciones (`prisma migrate deploy`), porque el pooler en modo transacción no soporta bien los comandos DDL de las migraciones.
3. En `backend/prisma/schema.prisma`, el bloque `datasource db` necesita el campo `directUrl`:
   ```prisma
   datasource db {
     provider  = "postgresql"
     url       = env("DATABASE_URL")
     directUrl = env("DIRECT_URL")
   }
   ```
4. Correr `npx prisma migrate deploy` apuntando a Supabase (usa `DIRECT_URL` automáticamente para esto gracias al paso 3).
5. Correr el seed (`npm run prisma:seed`) ya actualizado con los datos reales (§4.3).
6. **Storage:** crear un bucket público `product-images` en Supabase Storage, subir las fotos reales del estuche (las que ya existen en `frontend/src/assets/products/`), y usar las URLs públicas resultantes en `ProductImage.url` del seed.
7. Confirmar `NODE_ENV=production` en Railway — `shared/config/env.ts` ya rechaza automáticamente secretos por defecto inseguros (`PAYMENTS_WEBHOOK_SECRET`, `ADMIN_PASSWORD`) y `CORS_ORIGIN=*` en ese modo; no lo desactives.

No se toca Prisma Client, no se instala el SDK de Supabase en el backend — Prisma sigue hablando con Supabase igual que con cualquier Postgres, es solo una cadena de conexión distinta.

---

## 6. Pagos — integración con Wompi (reemplaza el módulo actual)

### 6.1 Por qué se reemplaza y no se agrega al lado

El módulo actual modela "un adaptador por método de pago" (`NequiProvider`, `DaviplataProvider`, `CreditCardProvider`) porque simulaba proveedores distintos. Wompi es **un solo proveedor** que internamente ofrece varios métodos (tarjeta, Nequi, PSE, Bancolombia Transferencia/Botón) — no encaja con ese patrón, y forzarlo generaría 3 clases falsas hablándole a la misma API. Se reemplaza por **un solo `WompiGateway`**.

### 6.2 Flujo (Widget de Checkout — recomendado sobre la API directa)

1. Cliente completa el checkout existente (`ShopStep` → `CheckoutFormStep`) hasta llegar a `PaymentStep`. El backend ya creó el `Order` en estado `PENDING` (esto no cambia, es el `CheckoutUseCase` actual).
2. Backend expone un endpoint (nuevo, en el módulo `payments`) que, dado un `orderId`, devuelve los datos que el Widget de Wompi necesita: `publicKey`, `currency`, `amountInCents`, `reference` (usar `order.orderNumber`), y una **firma de integridad** — un hash SHA-256 de `referencia + monto + moneda + secreto de integridad` (el secreto vive solo en el backend, nunca se expone).
3. `PaymentStep.jsx` reemplaza el formulario actual de tarjeta/celular por el **Widget embebible de Wompi** (`<script src="https://checkout.wompi.co/widget.js">`), inicializado con esos datos. El cliente paga dentro del widget — tarjeta, Nequi, PSE o Bancolombia, a elección del cliente. **El backend nunca recibe número de tarjeta ni CVV.**
4. Wompi redirige de vuelta a una URL de confirmación en tu frontend (`redirect-url` del widget) — esa pantalla muestra un estado "verificando pago", no confía en el redirect como fuente de verdad.
5. **Fuente de verdad real:** Wompi envía un **webhook (evento `transaction.updated`)** al backend. El endpoint de webhook existente (`POST /payments/webhook/:provider` o equivalente) se adapta para verificar el **checksum de eventos de Wompi** (algoritmo propio de Wompi: SHA-256 sobre campos concatenados + secreto de eventos — no es el HMAC genérico que hay hoy, hay que ajustar `verifySignature`/`parseWebhook` a ese formato específico). Si el checksum es válido y el estado es `APPROVED`, se ejecuta la misma transición `PENDING → PAID` que ya existe (`markPaid`), que ya es idempotente.
6. Estados de transacción Wompi a mapear a tu `PaymentStatus` existente: `APPROVED → APPROVED`, `DECLINED → DECLINED`, `VOIDED`/`ERROR → DECLINED`, `PENDING → PENDING`.

### 6.3 Qué se elimina

- `NequiProvider`, `DaviplataProvider`, `CreditCardProvider` (incluida la validación Luhn de tarjeta — ya no aplica, Wompi la maneja).
- El campo `card` (número/CVV/expiración) del DTO `initiatePaymentSchema` — el backend deja de aceptar esos datos por completo.
- Las rutas de webhook por proveedor (`nequi`/`daviplata`/`card`) se colapsan en una sola ruta de webhook de Wompi.

### 6.4 Qué se mantiene igual

- `PaymentRepository`, `OrderPaymentGateway`, la transición atómica `markPaid`, la idempotencia del webhook (comparar estado actual antes de reprocesar) — toda esa infraestructura ya es correcta y reutilizable, solo cambia **quién** implementa `PaymentProvider`/qué forma tiene el puerto (probablemente se simplifica: ya no hace falta `PaymentProviderRegistry` con múltiples proveedores si solo hay uno).

### 6.5 Credenciales necesarias (sandbox primero, luego producción)

Crear cuenta en Wompi (https://comercios.wompi.co), obtener del panel: **llave pública**, **llave privada**, **secreto de integridad** (para la firma del widget) y **secreto de eventos** (para verificar webhooks). Probar todo el flujo en **sandbox** antes de pasar a llaves de producción.

---

## 7. Seguimiento de pedido sin cuenta (nuevo endpoint público)

**Objetivo:** un cliente que compró como invitado pueda ver el estado de su pedido sin loguearse, a través de un link.

- **Endpoint:** `GET /orders/track?orderNumber=PA-2026-000123&email=cliente@correo.com`
- **Sin auth**, pero:
  - Requiere **ambos** parámetros (nº de pedido Y correo) — el nº de pedido solo no basta, para no permitir que cualquiera enumere pedidos ajenos.
  - Verifica que el correo coincida con `guestEmail` (pedido de invitado) o con el `email` del `User` dueño del pedido (si en el futuro alguien compra logueado).
  - Aplica el middleware `rateLimit` ya existente en `shared/middlewares/` — este endpoint es un objetivo obvio de fuerza bruta.
- **Respuesta:** subconjunto seguro del pedido — `orderNumber`, `status`, `items` (nombre/cantidad, sin ids internos sensibles), `total`, `createdAt`, `shipCity`. **No** devolver la dirección completa ni datos de pago.
- **Frontend:** una vista simple (puede ser un paso más dentro del proyecto `checkout` de Vite, ej. `track.html` o una ruta dentro de la SPA de checkout) con un formulario de 2 campos (nº de pedido + correo) y una línea de tiempo de estado (Pendiente → Pagado → En preparación → Enviado → Entregado), reutilizando los componentes de UI que ya existen en `frontend/src/checkout/components/ui.jsx`.
- El link de seguimiento (`https://tudominio.com/track.html?orderNumber=...`) se muestra en `ConfirmationStep.jsx` al terminar la compra, y se debería enviar también por email (ver §9, paso opcional de Resend).

---

## 8. Frontend — conectar landing al checkout real

- El CTA principal ("Comprar ahora" / "Comprar por WhatsApp" en `OfferCard.jsx`, `FloatingCta.jsx`, `StickyBar.jsx`) deja de apuntar a `whatsappUrl()` y pasa a apuntar a `checkout.html` (o a la ruta de checkout si se unifica en una sola SPA — no es obligatorio unificarlas, el setup multi-página de Vite ya funciona bien para esto).
- Dado que hoy solo hay **un producto** (el estuche), `ShopStep.jsx` (que hoy probablemente lista productos del catálogo genérico) puede simplificarse para ir directo a "agregar el estuche al carrito" en vez de mostrar un selector de catálogo — pero **no elimines** la capacidad de listar productos: cuando el dueño agregue el segundo producto, ese paso vuelve a ser necesario. Revisa `ShopStep.jsx` antes de decidir cuánto simplificar.
- WhatsApp puede quedar como enlace secundario de soporte ("¿Dudas? Escríbenos") si el dueño lo pide más adelante — no está en el alcance confirmado de este blueprint, pero es trivial de agregar después.
- El toggle Día/Noche, el hero y el resto de la landing **no cambian** — solo cambia a dónde apunta el botón de compra.

---

## 9. Build Order (orden crítico de ejecución)

**Step 1 — Provisionar Supabase.**
Crear proyecto, copiar `DATABASE_URL` (pooled, puerto 6543) y `DIRECT_URL` (directo, puerto 5432), agregar `directUrl` al `schema.prisma` (§5.3), correr `npx prisma migrate deploy` contra Supabase.

**Step 2 — Re-sembrar catálogo real.**
Reescribir `backend/prisma/seed.ts`: 1 marca, 1 categoría, 1 producto (el estuche) con datos reales (§4.3). No correr aún el seed contra producción — probar primero local/staging.

**Step 3 — Cambiar `PaymentMethod` enum a `WOMPI`.**
Editar `schema.prisma` (§4.1), generar y aplicar la migración.

**Step 4 — Reescribir el módulo `payments` para Wompi.**
Backend: nuevo `WompiGateway` en `infrastructure/` (firma de integridad para el widget + verificación de checksum de eventos + mapeo de estados), actualizar `domain/ports.ts` si `PaymentProviderRegistry` deja de tener sentido con un solo proveedor, eliminar `NequiProvider`/`DaviplataProvider`/`CreditCardProvider` y el campo `card` del DTO (§6.3). Actualizar `payments.module.ts` y las rutas de webhook.
**Escribir tests unitarios nuevos** para `WompiGateway` con fakes, siguiendo el patrón ya existente en `tests/unit/payments/` — especialmente la verificación de checksum y el mapeo de estados.

**Step 5 — Endpoint público de seguimiento de pedido.**
Backend: `GET /orders/track` en el módulo `orders` (§7), con su DTO Zod, rate limiting, y test de integración (correo que no coincide → 404, correo correcto → datos limitados del pedido).

**Step 6 — Frontend: integrar el Widget de Wompi.**
Reemplazar el formulario de `PaymentStep.jsx` por la inicialización del script del widget de Wompi, usando los datos que ahora expone el endpoint del Step 4.

**Step 7 — Frontend: vista de seguimiento de pedido.**
Nueva vista simple (formulario + línea de tiempo de estado) que llama al endpoint del Step 5. Enlazarla desde `ConfirmationStep.jsx`.

**Step 8 — Frontend: reconectar la landing al checkout real.**
Cambiar los CTA de `OfferCard.jsx`, `FloatingCta.jsx`, `StickyBar.jsx` para apuntar al checkout real en vez de WhatsApp (§8).

**Step 9 — Imágenes a Supabase Storage.**
Crear bucket público, subir las fotos reales del producto, actualizar las URLs en el seed del Step 2, correr el seed ya sí contra Supabase.

**Step 10 — Variables de entorno de producción.**
Generar secretos fuertes y únicos para: `JWT_ACCESS_SECRET`, `PAYMENTS_WEBHOOK_SECRET` → reemplazar por las llaves reales de Wompi (pública/privada/integridad/eventos), `ADMIN_PASSWORD`, `DATABASE_URL`/`DIRECT_URL` (Supabase), `CORS_ORIGIN` (dominio real del frontend en Vercel), `REDIS_URL` (el que dé Railway). Confirmar `NODE_ENV=production`.

**Step 11 — Desplegar backend en Railway.**
Usar el `Dockerfile` existente. Agregar plugin de Redis de Railway. Configurar las variables del Step 10. Correr `prisma migrate deploy` como parte del release (o manualmente la primera vez).

**Step 12 — Desplegar frontend en Vercel.**
Configurar build de Vite (ya multi-página, no requiere cambios de config), variable `VITE_API_URL` apuntando al backend de Railway, dominio custom si ya existe.

**Step 13 — QA end-to-end en sandbox de Wompi.**
Flujo completo: comprar como invitado → pagar con tarjeta/Nequi de prueba en el widget → confirmar que el webhook mueve el pedido a `PAID` → seguimiento de pedido muestra el estado correcto → el pedido aparece en el panel admin con el reporte de ventas.

**Step 14 — Pasar Wompi a llaves de producción.**
Reemplazar llaves de sandbox por las reales en Railway. Hacer una compra real de bajo monto para confirmar el flujo completo con dinero real antes de anunciar la tienda.

**Step 15 (opcional, recomendado) — Emails transaccionales.**
Agregar Resend (o similar) para enviar confirmación de compra + link de seguimiento al correo del cliente al pasar a `PAID`. No es bloqueante para lanzar, pero mejora mucho la experiencia de un cliente sin cuenta que solo tiene el link como referencia — sin email, el único lugar donde ve el link es la pantalla de confirmación al momento de comprar.

---

## 10. Variables de entorno (delta sobre `backend/.env.example`)

| Variable | Descripción | Cambia respecto a hoy |
|---|---|---|
| `DATABASE_URL` | Cadena pooled de Supabase (puerto 6543) | Reemplaza el Postgres local |
| `DIRECT_URL` | Cadena directa de Supabase (puerto 5432), solo para migraciones | Nueva |
| `WOMPI_PUBLIC_KEY` | Llave pública del widget | Nueva |
| `WOMPI_PRIVATE_KEY` | Llave privada (si se usa la API directa en algún punto, ej. consultar estado de transacción) | Nueva |
| `WOMPI_INTEGRITY_SECRET` | Para firmar la referencia+monto que ve el widget | Nueva — reemplaza el rol de `PAYMENTS_WEBHOOK_SECRET` para el widget |
| `WOMPI_EVENTS_SECRET` | Para verificar el checksum de los webhooks de Wompi | Nueva — reemplaza `PAYMENTS_WEBHOOK_SECRET` |
| `SUPABASE_STORAGE_URL` / bucket público | Base para las URLs de imágenes de producto | Nueva (o simplemente hardcodear la URL pública del bucket en el seed, no hace falta una variable si no cambia por ambiente) |
| `VITE_API_URL` (frontend) | URL del backend en Railway | Ya existe la variable, cambia el valor |
| `PAYMENTS_WEBHOOK_SECRET` | — | **Se elimina**, reemplazado por los dos secretos de Wompi de arriba |

Todo lo demás en `backend/.env.example` (`JWT_ACCESS_SECRET`, `SHIPPING_FLAT_RATE`, `ADMIN_EMAIL`/`ADMIN_PASSWORD`, etc.) se mantiene igual, solo se les debe poner valores reales de producción en el Step 10.

---

## 11. Testing

- **Unitarios:** seguir el patrón existente (`tests/unit/<módulo>/fakes.ts`) para el nuevo `WompiGateway` — probar el cálculo de la firma de integridad y la verificación del checksum de eventos con casos válidos e inválidos, sin llamar a la API real de Wompi.
- **Integración:** test para `GET /orders/track` (caso feliz, correo incorrecto, nº de pedido inexistente, rate limit).
- **CI:** `.github/workflows/backend-ci.yml` ya corre unit + integration contra Postgres/Redis de servicio en cada push — no necesita cambios de infraestructura, solo que los tests nuevos pasen.
- **E2E manual (Step 13):** no hay Playwright configurado hoy; para esta tienda, dado su tamaño, un checklist manual en sandbox de Wompi es suficiente — no es necesario introducir Playwright solo para esto a menos que el dueño lo pida explícitamente.

---

## 12. Escalabilidad — por qué esto no se va a estancar

- El backend ya es **sin estado**: el carrito de invitado vive en Redis (no en memoria del proceso), así que se pueden correr múltiples instancias detrás de Railway sin pegajosidad de sesión.
- El stock se descuenta con `UPDATE ... WHERE stock >= cantidad` (sin locks), y los cupones con el mismo patrón — soporta compras concurrentes sin condiciones de carrera, sea 1 instancia o 10.
- La caché de catálogo es versionada (`INCR` de un contador, nunca `KEYS` sobre Redis) — invalidar no se vuelve más lento a medida que crece el catálogo.
- Con el pooler de Supabase (§5) configurado desde el día uno, agregar réplicas del backend en Railway no agota las conexiones de Postgres.
- Vercel y Supabase Storage ya sirven detrás de CDN — las imágenes de producto no dependen de tu servidor.
- Cuando el catálogo crezca más allá de un producto, no hay que rediseñar nada: `catalog`, `cart`, `orders` ya están escritos para múltiples productos/marcas/categorías — el seed de hoy es minimalista porque el negocio de hoy lo es, no porque el modelo esté limitado.

---

## 13. Skills a usar durante la ejecución

| Skill | Cuándo | Por qué |
|---|---|---|
| `/frontend-design` | Steps 6-8 (widget de pago, vista de seguimiento, reconexión de la landing) | Mantener la calidad visual ya lograda en la landing al agregar las vistas nuevas |
| `/playwright-cli` | Step 13 (QA end-to-end) | Automatizar el checklist de compra completa en sandbox si se vuelve repetitivo |
| `/seo-audit` | Después del Step 8 | La landing pasa a ser el punto de entrada real de ventas — vale la pena una auditoría SEO antes de anunciarla |

---

## 14. Reglas No Negociables

1. **Nunca** vuelvas a aceptar número de tarjeta/CVV en el backend propio — esa es la razón de ser del cambio a Wompi. Si en algún punto "por simplicidad" alguien propone volver a un formulario de tarjeta propio, es un retroceso de seguridad, recházalo.
2. El frontend **no** llama directo a Supabase (ni Auth ni PostgREST) — toda la lógica de negocio pasa por el backend Express/Prisma existente.
3. Respeta la arquitectura hexagonal ya establecida (`domain/application/infrastructure/interfaces`) al tocar el módulo `payments` — no metas Prisma o `fetch` a Wompi dentro de un caso de uso de `application/`.
4. Todo caso de uso nuevo (Wompi, tracking) necesita tests unitarios con fakes en memoria, igual que los módulos existentes — no rompas la cobertura que ya hay.
5. Verifica **siempre** la firma/checksum de los webhooks de Wompi antes de mover un pedido a `PAID`. Nunca confíes en el `redirect-url` del cliente como fuente de verdad de un pago.
6. El endpoint de seguimiento de pedido nunca expone más que lo estrictamente necesario (§7) — no reveles dirección completa, datos de pago ni ids internos de otros pedidos.
7. Sigue usando español en comentarios, mensajes de commit y strings de cara al usuario, tal como indica el `CLAUDE.md` del repo.
8. No reemplaces `README.md`/`ARCHITECTURE.md`/`CLAUDE.md` existentes — actualízalos para reflejar el cambio de pagos y la conexión landing↔checkout una vez hechos.
