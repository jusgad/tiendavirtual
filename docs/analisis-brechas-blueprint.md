# Análisis de brechas · Blueprint vs. código real

Contraste entre [`pomass-tiendavirtual-blueprint.md`](pomass-tiendavirtual-blueprint.md)
y el estado real del repositorio.

| | |
|---|---|
| **Fecha del análisis** | 2026-08-08 |
| **Blueprint analizado** | Generado 2026-08-01, baseline `be9695a` |
| **Commit del análisis** | `be9695a` |
| **Método** | Lectura del código + ejecución de tests, typecheck, lint y builds |

> ## ⚠️ Estado: parcialmente ejecutado
>
> Este documento describe el estado en `be9695a`. Después de escribirlo se
> ejecutó el **camino crítico del backend** en la rama
> `feat/wompi-seguimiento-pedido`. Lo ya hecho está marcado en la
> [tabla del Build Order](#estado-del-build-order); el detalle, en
> [lo ejecutado](#lo-ejecutado-desde-este-análisis) al final.

> **El código no ha cambiado desde que se generó el blueprint.** Ambos apuntan a
> `be9695a`. Esto importa para interpretar la sección
> [errores de origen](#errores-de-origen-del-blueprint): las tres discrepancias
> encontradas no son deriva del código, son datos que el blueprint tomó por
> buenos del `README.md` y `ARCHITECTURE.md` de entonces, que estaban
> equivocados. Esos documentos ya se corrigieron; el blueprint no.

---

## Resumen

**La premisa del blueprint es correcta.** Afirma que el repositorio contiene una
tienda funcional en su mayor parte y que solo describe el delta hasta
producción. Verificado: así es. La base es sólida y no hay que reconstruir nada.

**Del Build Order de 15 pasos: 0 completos, 1 parcial, 14 pendientes.**

Wompi, Supabase, Resend y el endpoint de seguimiento **no aparecen en ninguna
parte del código**. El único archivo del repositorio que los menciona es el
propio blueprint.

Además, este análisis encontró **cuatro huecos que el blueprint no cubre** y que
bloquean funcionalidad que él mismo da por hecha. El más serio: la vista de
seguimiento que especifica mostraría siempre el mismo estado, porque no existe
forma de avanzar un pedido más allá de `PAID`.

---

## Estado del Build Order

Estado en `be9695a` y, en la última columna, qué cambió al ejecutar el camino
crítico.

| # | Paso del blueprint | En `be9695a` | Ahora |
|---|---|---|---|
| 1 | Provisionar Supabase | ❌ | ⚠️ **Código listo**: `directUrl` en el schema y `DIRECT_URL` en env, CI y compose. Falta crear la cuenta y poner las cadenas |
| 2 | Re-sembrar catálogo real | ❌ | ✅ **Hecho**: 1 marca, 1 categoría, 1 producto (`Estuche PomAss Día + Noche`, $89.900), 2 imágenes |
| 3 | `PaymentMethod` → `WOMPI` | ❌ | ✅ **Hecho**: enum + migración `0003_wompi_payments` |
| 4 | Reescribir `payments` para Wompi | ❌ | ✅ **Hecho**: `WompiGateway`, stubs eliminados, 35 tests |
| 5 | `GET /orders/track` público | ❌ | ✅ **Hecho**: con rate limit propio y 5 tests |
| 6 | Widget de Wompi en el frontend | ❌ | ✅ **Hecho**: `PaymentStep` abre el widget y verifica contra el backend. 12 tests |
| 7 | Vista de seguimiento de pedido | ❌ | ❌ **Pendiente** (el endpoint y `api.trackOrder` ya existen) |
| 8 | Landing → checkout real | ⚠️ ~60 % | ⚠️ Sin cambios. Ver [abajo](#step-8-está-hecho-a-medias) |
| 9 | Imágenes a Supabase Storage | ❌ | ⚠️ **Código listo**: el seed ya crea 2 `ProductImage` con base configurable por `PRODUCT_IMAGE_BASE_URL`. Falta el bucket |
| 10 | Variables de entorno de producción | ❌ | ⚠️ **Declaradas y validadas** en `env.ts` y `.env.example`. Faltan los valores reales |
| 11 | Desplegar backend en Railway | ❌ | ❌ **Pendiente** |
| 12 | Desplegar frontend en Vercel | ❌ | ❌ **Pendiente** |
| 13 | QA end-to-end en sandbox | ❌ | ❌ **Pendiente** |
| 14 | Wompi a llaves de producción | ❌ | ❌ **Pendiente** |
| 15 | Emails transaccionales (opcional) | ❌ | ❌ **Pendiente** |
| — | **Transiciones de estado del pedido** (hueco ②) | ❌ | ✅ **Hecho**: `PATCH /admin/orders/:id/status` + `GET /admin/orders` |

### Comprobación de ausencia

```
grep "wompi"     → solo docs/pomass-tiendavirtual-blueprint.md
grep "supabase"  → sin coincidencias en backend/
grep "track"     → sin coincidencias en backend/src
grep "resend"    → sin coincidencias
grep "DIRECT_URL"→ sin coincidencias
```

---

## Errores de origen del blueprint

Tres afirmaciones del blueprint que eran incorrectas ya cuando se generó.
Conviene corregirlas en el propio blueprint para que quien lo ejecute no
trabaje sobre supuestos falsos.

### 1. El CTA "Comprar" ya no abre WhatsApp

El item #3 de la tabla de auditoría (§2) y el Step 8 (§9) dicen que el botón de
compra de la landing abre WhatsApp y no llama a la API. **No es así desde antes
del blueprint.**

[`App.jsx`](../frontend/src/App.jsx) define:

```js
const buy = () => {
  setToast(true)
  toastTimer.current = setTimeout(() => {
    window.location.href = '/checkout.html'
  }, 900)
}
```

Ese `buy` es el `onBuy` que reciben `OfferCard` y `StickyBar`.

### 2. "69+ tests unitarios"

§0 dice 69. **Son 96 tests en 16 suites**, más 16 de integración en 3 archivos.
El blueprint tomó el número de `ARCHITECTURE.md`, que estaba desactualizado.

```
Test Suites: 16 passed, 16 total
Tests:       96 passed, 96 total
Time:        12.466 s
```

### 3. La ruta de las imágenes de producto

§5.6 indica subir a Supabase Storage «las fotos reales del estuche (las que ya
existen en `frontend/src/assets/products/`)». **Esa carpeta no existe.** Las
imágenes están en [`frontend/public/images/`](../frontend/public/images/) y se
referencian como assets estáticos por ruta absoluta (`/images/...`) desde el
objeto `products` de `App.jsx`.

---

## Step 8 está hecho a medias

El blueprint lo trata como pendiente completo. En realidad falta menos de la
mitad.

| Elemento | Componente | Destino actual | ¿Cambiar? |
|---|---|---|---|
| «🛒 COMPRAR AHORA» | [`OfferCard.jsx`](../frontend/src/components/OfferCard.jsx) | `onBuy` → `/checkout.html` | ✅ Ya correcto |
| «🛒 Comprar» (barra inferior) | [`StickyBar.jsx`](../frontend/src/components/StickyBar.jsx) | `onBuy` → `/checkout.html` | ✅ Ya correcto |
| Píldora del hero «CLIC AQUÍ →» | [`FloatingCta.jsx`](../frontend/src/components/FloatingCta.jsx) | `whatsappUrl()` | ❌ **Falta** |
| «COMPRAR POR WHATSAPP» | `OfferCard.jsx` | `whatsappUrl()` | ⚠️ Decisión pendiente |
| «WhatsApp» (barra inferior) | `StickyBar.jsx` | `whatsappUrl()` | ⚠️ Decisión pendiente |

**Trabajo real del Step 8**: cambiar un componente (`FloatingCta.jsx`) y decidir
qué pasa con los dos botones que dicen *explícitamente* «WhatsApp». El blueprint
(§8) sugiere dejar WhatsApp como canal de soporte, pero eso exige recopiar los
botones: hoy dicen «COMPRAR por WhatsApp», que es exactamente el flujo de venta
que se quiere retirar.

---

## Huecos que el blueprint no cubre

Cuatro problemas reales, detectados leyendo el código, que el blueprint no
menciona y que afectan a funcionalidad que él mismo da por hecha.

### ① El seed no crea ninguna imagen de producto

§4.3 pide «2 `ProductImage` apuntando a Supabase Storage», redactado como si se
reemplazaran unas existentes. **El seed actual no crea ni una sola fila en
`ProductImage`**: los 7 productos se siembran sin imágenes.

Consecuencias:

- El Step 9 no es «migrar imágenes», es **crearlas por primera vez**.
- `ShopStep.jsx` tampoco renderiza imágenes hoy, aunque `CartView` sí expone un campo `image`. Si quieres que el estuche se vea en el checkout, es trabajo adicional de frontend no contemplado.

### ② La línea de tiempo de seguimiento no se puede mover

§7 especifica una vista con la línea de tiempo *«Pendiente → Pagado → En
preparación → Enviado → Entregado»*.

**No existe ningún endpoint que mueva un pedido más allá de `PAID`.** Repasando
todo lo que toca `Order.status`:

| Origen | Transición |
|---|---|
| `CheckoutUseCase` | → `PENDING` |
| Webhook de pago aprobado (`markPaid`) | `PENDING` → `PAID` |
| `CancelOrderUseCase` | `PENDING`/`PAID` → `CANCELLED` |

`PREPARING`, `SHIPPED` y `DELIVERED` existen en el enum y **nada los asigna**.
La página de seguimiento mostraría `PAID` indefinidamente.

**Falta un paso en el Build Order**: endpoint de administración para avanzar el
estado del pedido (`PATCH /admin/orders/:id/status` o similar), con su validación
de transiciones permitidas y sus tests. Sin él, el Step 7 entrega una vista que
no refleja nada.

### ③ Las reseñas quedan inalcanzables en producción

Consecuencia directa del hueco ②. `CreateReviewUseCase` exige un pedido propio
en estado `DELIVERED`:

```ts
const orderId = await this.purchases.findDeliveredOrderId(input.userId, input.productId)
if (!orderId) throw new BadRequestError('Solo puedes reseñar productos que hayas recibido')
```

Como ningún pedido llega nunca a `DELIVERED`, el módulo `reviews` — completo,
con sus tests y sus endpoints — **no se puede ejecutar jamás**. Se resuelve solo
si se cierra el hueco ②.

Nota adicional: con la decisión de «sin cuentas obligatorias» (§3), las reseñas
requieren `authGuard` y un `userId`, así que solo podrían dejarlas quienes sí se
registren.

### ④ Redis pasa a ser dependencia crítica sin tolerancia a fallos

§12 argumenta que el backend escala bien porque el carrito de invitado vive en
Redis y no en memoria del proceso. Es cierto, pero hay una contrapartida que no
se menciona.

En una tienda **solo de invitados**, *todos* los carritos viven en Redis. Y a
diferencia de la caché de catálogo — que envuelve cada operación en `try/catch` y
degrada a «sin caché» —
[`RedisCartStore`](../backend/src/modules/cart/infrastructure/redisCartStore.ts)
no tiene ninguna tolerancia a fallos:

```ts
async getItems(): Promise<CartLine[]> {
  const raw = await this.redis.get(this.key)   // sin try/catch
  return raw ? (JSON.parse(raw) as CartLine[]) : []
}
```

**Si Redis cae, la tienda entera deja de poder vender.** El catálogo seguiría
sirviéndose desde Postgres, pero nadie podría añadir al carrito ni hacer
checkout.

Es una decisión deliberada del diseño original (un carrito que pierde productos
en silencio es peor que un error visible), pero cambia de categoría cuando Redis
pasa a estar en el camino crítico de todas las ventas. Al desplegar en Railway
(Step 11) conviene tratarlo como servicio crítico: monitoreo, alertas y un plan
para su indisponibilidad.

### ⑤ Los cupones por usuario no son exigibles sin cuentas

`perUserLimit` se hace valer contando filas de `CouponRedemption`, que se
vinculan a un `userId`. En el checkout de invitado ese `userId` es `null` y el
código lo omite explícitamente:

```ts
// checkout.usecase.ts
const uses = owner.type === 'user' ? await this.coupons.countUserRedemptions(coupon.id, owner.id) : 0
```

```ts
// prismaOrderRepository.ts — el canje solo se registra si hay usuario
if (data.userId) {
  await tx.couponRedemption.create({ ... })
}
```

En una tienda de invitados **solo funciona `maxUses`** (el tope global). El
cupón sembrado `BIENVENIDA10` tiene `perUserLimit: 1`, que en la práctica no
limita nada: cualquiera puede usarlo tantas veces como quiera.

Si el negocio quiere promociones de «uno por cliente», hace falta otro
mecanismo (por ejemplo, unicidad sobre `guestEmail` + cupón), que no está
contemplado.

---

## Avisos operativos

### Las skills de §13 no existen en este entorno

| Skill del blueprint | Disponible | Alternativa |
|---|---|---|
| `/frontend-design` | ❌ | `/design-review` (auditoría visual) o `/design-consultation` |
| `/playwright-cli` | ❌ | `/qa` o `/browse` para el QA del Step 13 |
| `/seo-audit` | ❌ | Sin equivalente instalado |

### Ambigüedad: ¿se queda `AuthStep`? — **resuelta**

§3 decide «ninguna cuenta obligatoria» y §2 (item 2) confirma que el backend ya
lo soporta. Pero la demo de checkout **ya tenía** un `AuthStep` completo con
login y registro, y el blueprint no decía si eliminarlo.

**Decisión del dueño: se mantiene**, y se arregló la renovación de token.
«Ninguna cuenta obligatoria» significa que se puede comprar sin cuenta (el botón
«Continuar como invitado»), no que no exista la opción de tenerla.

El defecto asociado ya está corregido: el cliente guardaba el `refreshToken`
pero nunca llamaba a `POST /auth/refresh`, así que la sesión moría a los 15
minutos. Ver [lo ejecutado](#lo-ejecutado-desde-este-análisis).

### Firma del webhook de Wompi

§6.2 acierta al señalar que hay que adaptar `verifySignature`/`parseWebhook` al
formato de Wompi. Un detalle de implementación que conviene tener presente: el
código actual firma sobre `JSON.stringify(req.body)`, es decir sobre el cuerpo
**ya parseado**. El checksum de eventos de Wompi se calcula sobre campos
concatenados, así que esto no estorba — pero si en algún momento hiciera falta
firmar sobre el cuerpo **crudo**, habría que añadir un callback `verify` a
`express.json()` en [`app.ts`](../backend/src/app.ts) para conservar el buffer
original.

---

## Lo que ya está listo y no hay que tocar

Verificado ejecutando los comandos, no por lectura:

| Comprobación | Resultado |
|---|---|
| `npm run test:unit` | 96 tests, 16 suites, 12.5 s ✅ |
| `npm run typecheck` | limpio ✅ |
| `npm run lint` | limpio ✅ |
| `npm run build` (frontend) | genera `index.html` **y** `checkout.html` ✅ |

Y coincide con lo que el blueprint da por bueno:

- **`Dockerfile` listo para Railway** (Step 11): multietapa, poda dependencias de desarrollo, fija `NODE_ENV=production` y corre como el usuario no-root `node`.
- **Build multipágina listo para Vercel** (Step 12): las dos entradas ya están declaradas en `vite.config.js`, sin cambios de configuración.
- **`env.ts` rechaza secretos por defecto en producción** (§5.7): confirmado, incluidos `PAYMENTS_WEBHOOK_SECRET`, `ADMIN_PASSWORD` y `CORS_ORIGIN=*`.
- **Checkout de invitado completo** (§2 item 2): `Order.userId` nullable + `guestEmail`, `optionalAuth` en `POST /orders` y `POST /payments`.
- **Concurrencia resuelta** (§12): stock con `UPDATE ... WHERE stock >= cantidad` y cupones con incremento condicional, ambos dentro de la transacción del pedido.

---

## Camino crítico sugerido

El grueso del trabajo y el único riesgo de cumplimiento están concentrados en
dos pasos:

```
Step 4 (Wompi backend)  →  Step 6 (widget en el frontend)
```

Hoy el backend **acepta número de tarjeta y CVV en crudo**
([`payments.dto.ts`](../backend/src/modules/payments/interfaces/http/payments.dto.ts)),
que es justo lo que §14 regla 1 marca como no negociable eliminar.

Ajuste propuesto al Build Order, insertando el paso que falta:

| Orden | Paso | Nota |
|---|---|---|
| 1 | Step 3 — enum → `WOMPI` | Barato, desbloquea el Step 4 |
| 2 | **Step 4 — backend Wompi** | El bloque más grande. Elimina el riesgo PCI |
| 3 | **Nuevo — transiciones de estado del pedido** | Hueco ②. **Antes** del Step 5, o el seguimiento nace inútil |
| 4 | Step 5 — `GET /orders/track` | |
| 5 | Step 6 — widget de Wompi | |
| 6 | Step 7 — vista de seguimiento | Ya con estados reales que mostrar |
| 7 | Step 8 — landing → checkout | Solo `FloatingCta.jsx` + decisión sobre los botones de WhatsApp |
| 8 | Steps 1, 2, 9 — Supabase, seed real, imágenes | Independientes; se pueden adelantar en paralelo |
| 9 | Steps 10-12 — env, Railway, Vercel | |
| 10 | Steps 13-14 — QA sandbox y llaves reales | |
| 11 | Step 15 — emails | Opcional, pero ver nota abajo |

**Sobre el Step 15 (emails).** El blueprint lo marca opcional. Con la decisión
de tienda sin cuentas, sube de prioridad: el único sitio donde el cliente ve su
link de seguimiento es la pantalla de confirmación. Si la cierra, pierde el
acceso a su pedido para siempre. Además, sin envío de correos la recuperación de
contraseña del admin **no funciona en producción** — el token se genera pero no
llega a nadie, y `devResetToken` solo se expone fuera de producción.

---

## Lo ejecutado desde este análisis

Rama `feat/wompi-seguimiento-pedido`. Solo backend: el frontend sigue intacto.

### Steps 3 y 4 — Wompi

- `PaymentMethod` pasa a `WOMPI`; migración `0003_wompi_payments` (reemplaza el tipo enum, que Postgres no deja editar).
- `Payment.wompiTransactionId` nuevo e indexado.
- `WompiGateway` implementa los dos algoritmos reales: firma de integridad del widget y checksum de eventos, con comparación en tiempo constante.
- **Eliminados** `NequiProvider`, `DaviplataProvider`, `CreditCardProvider`, la validación Luhn y el `ProviderRegistry`.
- **`POST /payments` ya no acepta datos de tarjeta**: el DTO solo tiene `orderId`. Esto cierra el riesgo PCI-DSS que señalaba el blueprint (§2 item 4).
- Webhook unificado en `POST /payments/webhook/wompi`.
- Idempotencia corregida: la versión anterior comparaba solo el estado, lo que habría **bloqueado los reintentos legítimos** (tras un rechazo, el pago correcto se habría descartado como "ya procesado"). Ahora se compara también `wompiTransactionId`.

### Hueco ② — transiciones de estado

Insertado antes del Step 5, como recomendaba este análisis:

- `PATCH /admin/orders/:id/status` con la regla de transiciones como dominio puro.
- `GET /admin/orders` y `GET /admin/orders/:id`, necesarios para operar.
- **`PAID` no se puede marcar a mano**: solo lo produce el webhook.
- Cancelar antes del despacho devuelve el stock en la misma transacción.
- Con esto, el módulo `reviews` deja de ser código inalcanzable (hueco ③).

### Step 5 — seguimiento público

- `GET /orders/track?orderNumber=…&email=…`, sin sesión.
- Exige ambos parámetros; responde 404 (no 403) si el correo no coincide.
- Rate limit propio: 30 peticiones / 15 min por IP.
- Subconjunto seguro: sin dirección completa, teléfono, datos de pago ni ids internos.

### Step 2 — catálogo real

- 1 marca, 1 categoría, 1 producto (`Estuche PomAss Día + Noche`, $89.900) con el copy de `site.js`.
- **2 `ProductImage`**, que antes no se sembraban (hueco ①).
- Los 7 productos de ejemplo se **desactivan**, no se borran (podrían tener pedidos asociados).
- El cupón lleva ahora `maxUses: 100`, porque `perUserLimit` no es exigible sin cuentas (hueco ⑤).

### Renovación de token en el frontend

Decidido mantener `AuthStep`, se arregló el defecto que arrastraba.

- `checkout/api.js` renueva el access token al recibir un `401` y **reintenta la petición original una sola vez**.
- **Las renovaciones concurrentes se deduplican.** Es el punto delicado: el backend rota el refresh token y rechaza reutilizar uno consumido, así que tres peticiones caducando a la vez habrían gastado el token tres veces y **matado la sesión recién renovada**. Todas esperan la misma promesa en vuelo.
- Si la renovación falla de verdad, se limpia la sesión y `CheckoutApp` devuelve al paso 0 con un aviso.
- Efecto visible: recargar la página ya no cierra sesión, y comprar durante más de 15 minutos tampoco.

Se añadió **Vitest** al frontend (antes no tenía tests) con 10 pruebas sobre
este cliente, incluidas la deduplicación y el límite de un solo reintento. No
necesitan backend: `fetch` va simulado.

### Step 6 — widget de Wompi en el frontend

- `PaymentStep` ya **no pide datos de tarjeta**: obtiene la configuración firmada de `POST /payments` y abre el widget de Wompi, donde el cliente elige tarjeta, Nequi, PSE o Bancolombia.
- **No se cree lo que informa el widget.** Al cerrarse, consulta `GET /orders/track` cada 3 s (hasta ~60 s) esperando que el pedido deje de estar `PENDING`. La fuente de verdad sigue siendo el webhook, tal como exige §14.5 del blueprint.
- `ConfirmationStep` distingue tres desenlaces: pagado, rechazado, y aún sin confirmar.
- Con la llave de ejemplo el widget no se abre: se muestra qué configurar, en vez de fallar de forma confusa.
- El correo de contacto se propaga desde el formulario de envío, porque es lo que permite consultar el seguimiento.

Verificado en el navegador recorriendo el flujo completo con un backend
simulado: la configuración llega al widget con la firma anidada como
`signature.integrity`, el monto en centavos y la referencia correctos, y la
confirmación muestra «¡Pago confirmado!» tras leer el estado real.

De paso se corrigió un defecto menor: en `ShopStep`, el banner de error seguía
visible tras un reintento exitoso.

### Verificación

| | Antes | Ahora |
|---|---|---|
| Tests backend (unitarios) | 96 en 16 suites | **138 en 18** |
| Tests frontend | 0 | **22 en 2** |
| Endpoints | 48 | **52** |
| Typecheck · lint · builds | limpios | limpios |

> `npm run typecheck` **no cubre los tests**: `tsconfig` los excluye. Los errores
> de compilación de tests solo salen al correr jest.

**Sin verificar en ejecución**: los tests de integración del backend necesitan
Postgres y Docker no arranca en esta máquina. Compilan sin errores; se validarán
en CI.

### Lo que sigue

**Step 7** (vista `track.html`) es ahora el más urgente: `WOMPI_REDIRECT_URL`
apunta ahí y PSE y Bancolombia sacan al cliente del sitio, así que sin esa
página esos dos medios devuelven a un 404. Luego **Step 8** (`FloatingCta.jsx`)
→ Supabase → despliegue.

Para probar de verdad hace falta lo que este entorno no puede dar: una base de
datos viva y credenciales de Wompi. Ver
[cómo montar el entorno local](howto-entorno-local.md).

---

## Relacionado

- [Blueprint original](pomass-tiendavirtual-blueprint.md)
- [Referencia: API REST](referencia-api.md) — el estado actual de los 48 endpoints
- [Referencia: modelo de datos](referencia-modelo-datos.md#huecos-conocidos)
- [Referencia: frontend](referencia-frontend.md#huecos-conocidos)
- [Explicación: modelo de seguridad](explicacion-seguridad.md#lo-que-no-cubre)
- [Cómo desplegar a producción](howto-desplegar.md#antes-de-aceptar-dinero-real)
