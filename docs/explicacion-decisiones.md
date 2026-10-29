# Explicación · Decisiones de diseño

Este documento responde a *por qué* el backend está hecho así. Si buscas *qué*
hace cada endpoint, ve a la [referencia de API](referencia-api.md); si buscas
cómo están organizadas las capas, ve a [ARCHITECTURE.md](../ARCHITECTURE.md).

Cada sección tiene la misma forma: el problema concreto, la solución adoptada y
**qué se sacrificó a cambio**. Ninguna decisión es gratis.

---

## Arquitectura hexagonal en una tienda de dos productos

### El problema

Un e-commerce mezcla dos tipos de código con vidas muy distintas. Las reglas de
negocio (cómo se calcula un descuento, cuándo un cupón es válido, cuándo hay
envío gratis) cambian poco y hay que poder verificarlas rápido. La
infraestructura (Postgres, Redis, la pasarela de pago) cambia por razones que no
tienen nada que ver con el negocio: un cambio de proveedor, una migración de
base de datos.

Cuando esos dos tipos de código se mezclan, probar "¿el cupón del 10 % descuenta
bien?" exige levantar Postgres, Redis y un servidor HTTP. Un ciclo de un minuto
donde debería ser de un segundo.

### El enfoque

Cuatro capas por dominio, con una regla de dependencia que no se rompe:

```
interfaces/http  →  application  →  domain  ←  infrastructure
     (Express)      (casos de uso)  (reglas)   (Prisma, Redis, JWT…)
```

`domain/` no importa nada de framework. Contiene tipos, reglas puras y
**puertos** (interfaces). `application/` recibe sus dependencias por
constructor, nunca las instancia. `infrastructure/` implementa los puertos.
`<dominio>.module.ts` es el único archivo que conoce las cuatro capas y las
cablea.

El resultado medible: **96 tests unitarios que corren en 12 segundos sin base de
datos**, usando dobles en memoria (`tests/unit/<dominio>/fakes.ts`). Cubren
stock, checkout, precios, cupones, pagos, rotación de tokens, reseñas y
reportes: exactamente lo que más caro sale equivocar.

### Trade-offs

- **Más archivos.** Un endpoint trivial ("lista de marcas") atraviesa cuatro capas y ~6 archivos. Para un CRUD plano es sobreingeniería visible.
- **Indirección al leer.** Seguir una petición exige saltar entre carpetas. `ARCHITECTURE.md` incluye una traza completa de `POST /api/cart/items` precisamente porque hace falta.
- **Mapeadores duplicados.** Los enums de dominio se traducen a los de Prisma en `infrastructure/*Mapper.ts`. `orders/domain/couponType.ts` y `coupons/domain/couponType.ts` son el mismo tipo declarado dos veces — el precio de que los módulos no dependan entre sí.

Vale la pena aquí porque el checkout es genuinamente delicado: stock,
concurrencia, dinero. Para el catálogo, honestamente, es más ceremonia que valor.

---

## Descuento de stock a prueba de concurrencia, sin bloqueos

### El problema

Dos personas compran a la vez el último frasco. La secuencia ingenua es:

```
Cliente A: lee stock = 1  →  1 ≥ 1, ok  →  escribe stock = 0
Cliente B: lee stock = 1  →  1 ≥ 1, ok  →  escribe stock = 0
```

Ambos compran. El stock queda en 0 pero se vendieron dos unidades. Es una
condición de carrera clásica y no se arregla comprobando más veces: la ventana
entre leer y escribir siempre existe.

La solución típica es un bloqueo pesimista (`SELECT ... FOR UPDATE`), que
funciona pero serializa las compras del mismo producto y puede provocar
interbloqueos si dos pedidos tocan los mismos productos en distinto orden.

### El enfoque

Mover la comprobación **dentro** de la escritura, para que la base de datos la
resuelva atómicamente
([`prismaOrderRepository.ts:56`](../backend/src/modules/orders/infrastructure/prismaOrderRepository.ts)):

```ts
const res = await tx.product.updateMany({
  where: { id: item.productId, stock: { gte: item.quantity } },
  data:  { stock: { decrement: item.quantity } },
})
if (res.count === 0) {
  throw new ConflictError(`Stock insuficiente para "${item.productName}"`)
}
```

No hay hueco entre leer y escribir: es un solo `UPDATE ... WHERE stock >=
cantidad`. Si `count` es 0, alguien se adelantó. Como está dentro de
`$transaction`, lanzar el error revierte los decrementos ya aplicados a otros
productos del mismo pedido.

Hay una validación de stock **antes**, en el caso de uso
([`checkout.usecase.ts:66`](../backend/src/modules/orders/application/checkout.usecase.ts)),
pero no es la que garantiza la corrección: existe para dar un mensaje claro con
el nombre del producto en el caso normal. La garantía real está en el `WHERE`.

### Trade-offs

- **La comprobación previa puede parecer redundante.** Lo es en el caso feliz, pero borrarla degradaría el mensaje de error. Si la borras, el `409` seguirá llegando; solo será menos claro.
- **La cancelación no usa el mismo patrón.** `cancel()` hace `increment` incondicional: devolver stock nunca puede fallar por falta de stock, así que no necesita guarda.
- **No hay reserva temporal.** Nada retiene el stock entre "agregar al carrito" y "pagar". Si el producto se agota mientras alguien llena el formulario de envío, se entera al confirmar. Para este catálogo es aceptable; para un lanzamiento con demanda alta, no.

---

## Canje de cupones con la misma técnica

### El problema

`maxUses` sufre exactamente la misma carrera. Un cupón con 100 usos y 200
compras simultáneas podría canjearse 150 veces si se lee `usedCount` y luego se
incrementa.

### El enfoque

Incremento condicional, dentro de la misma transacción del pedido
([`prismaOrderRepository.ts:118`](../backend/src/modules/orders/infrastructure/prismaOrderRepository.ts)):

```ts
const res = await tx.coupon.updateMany({
  where: { id, usedCount: { lt: maxUses } },
  data:  { usedCount: { increment: 1 } },
})
if (res.count === 0) throw new ConflictError('El cupón alcanzó su límite de usos')
```

Como comparte transacción con el pedido, o se crean pedido y canje juntos, o no
se crea ninguno. Nunca queda un cupón consumido sin pedido.

### Trade-offs

- **`perUserLimit` no goza de la misma garantía.** Se resuelve contando filas de `CouponRedemption` dentro de la transacción, que es más débil que un incremento condicional. Bajo el nivel de aislamiento por defecto de Postgres (`READ COMMITTED`), dos checkouts realmente simultáneos del mismo usuario podrían pasar ambos. En la práctica una persona no dispara dos checkouts en el mismo milisegundo; si importara, la solución sería un `@@unique([couponId, userId])` en el esquema.
- **`perUserLimit` no aplica a invitados.** Sin cuenta no hay identidad persistente que contar, así que solo se hace valer `maxUses`. Es una decisión consciente, documentada en el código: el checkout de invitado prioriza fricción baja sobre control de abuso.
- **El descuento se calcula dos veces conceptualmente**: `assertCouponUsable` valida contra el `usedCount` leído antes de la transacción, y el `updateMany` vuelve a comprobar. La primera da el mensaje bonito; la segunda es la que manda.

---

## Caché de catálogo con versionado de namespace

### El problema

El listado de productos es la consulta más frecuente y la más cara: filtros,
orden, paginación, joins con marca y categoría. Cachearla es evidente.
Invalidarla, no tanto.

La forma obvia es borrar las claves afectadas cuando cambia un producto. Pero
las claves de listado incorporan el filtro completo
(`products:list:{"search":"crema","page":1,...}`), así que hay una explosión
combinatoria: no se puede saber cuáles borrar sin recorrerlas. Y recorrerlas
significa `KEYS *`, que **bloquea Redis entero** mientras escanea el keyspace.
En producción es una forma fiable de provocar una caída.

### El enfoque

No borrar nunca. Cambiar el espacio de nombres
([`redisCatalogCache.ts`](../backend/src/modules/catalog/infrastructure/redisCatalogCache.ts)):

```
catalog:v1:products:list:{...}
catalog:v1:products:slug:pomass-dia
```

Invalidar es un solo `INCR catalog:version`. A partir de ese instante todas las
lecturas buscan bajo `catalog:v2:` y encuentran vacío. Las claves de `v1` ya no
las lee nadie y **expiran solas por su TTL** (120 s los listados, 300 s el
detalle).

Una operación O(1) en lugar de un escaneo del keyspace.

La caché además es **tolerante a fallos**: cada operación va en `try/catch` y
registra un aviso. Si Redis se cae, el catálogo degrada a "sin caché" y sigue
sirviendo desde Postgres. Un fallo de caché nunca es un fallo de la API.

Se invalida en: crear, actualizar o borrar producto, categoría o marca; y
también al **hacer checkout o cancelar un pedido**, porque ambos cambian el
stock, que forma parte de la respuesta cacheada.

### Trade-offs

- **Se paga memoria por un rato.** Las claves de versiones viejas siguen ocupando Redis hasta que expiran. Con TTLs de 2–5 minutos es despreciable; con TTLs de horas no lo sería.
- **Invalidación con brocha gorda.** Cambiar el precio de un producto tira la caché del catálogo entero. Correcto y simple; poco eficiente si el catálogo fuera grande y volátil. Con 7 productos, irrelevante.
- **Acoplamiento cruzado entre módulos.** `orders` necesita invalidar la caché de `catalog`. Se resuelve con un puerto segregado de un solo método (`CatalogCacheInvalidator`) que `orders/domain/ports.ts` declara y que la composición de `orders.module.ts` satisface reutilizando `RedisCatalogCache`. El dominio de pedidos no sabe que existe Redis; solo sabe que hay algo que invalidar.
- **El carrito de invitado no es tolerante a fallos.** `RedisCartStore` no tiene `try/catch`: si Redis se cae, los carritos de invitado fallan de verdad. Es deliberado — un carrito que "degrada" perdiendo productos en silencio es peor que un error visible.

---

## Refresh tokens con rotación y detección de reuso

### El problema

Un access token JWT de vida corta reduce la ventana de un robo, pero obliga a
renovarlo. El refresh token que lo renueva es el activo valioso: si alguien lo
roba, tiene acceso indefinido y no hay forma de saberlo.

### El enfoque

Tres decisiones que se refuerzan:

**1. El refresh token no es un JWT.** Es un valor opaco, bytes aleatorios. No
lleva información y no se puede verificar sin consultar la base. Eso permite
revocarlo — algo imposible con un JWT autocontenido.

**2. Se guarda hasheado.** La tabla `refresh_tokens` guarda `tokenHash`, nunca
el valor en claro. Una filtración de base de datos no entrega sesiones usables.

**3. Rota en cada uso.**
([`tokenFlows.usecase.ts:32`](../backend/src/modules/auth/application/tokenFlows.usecase.ts)):

```ts
await this.refreshTokens.revoke(stored.id)
const tokens = await issueTokens(user, this.tokens, this.refreshTokens)
```

Cada refresh revoca el token usado y emite uno nuevo. Reutilizar uno ya
consumido se rechaza con `401` — y ese rechazo es la señal de que algo va mal:
o el atacante usó el token robado antes que la víctima, o al revés.

El access token se verifica con el **algoritmo fijado**:

```ts
jwt.verify(token, env.JWT_ACCESS_SECRET, { algorithms: ['HS256'] })
```

Sin ese pin, un atacante podría enviar un token con `alg: none` o forzar
confusión de algoritmo. Es una línea que cierra una familia entera de ataques.

Al restablecer la contraseña se revocan **todos** los refresh tokens del
usuario: si te la roban, cambiarla te devuelve el control de verdad.

### Trade-offs

- **Cada refresh son dos escrituras en base de datos.** Un JWT de refresh no tocaría la base. A este volumen no importa; a escala habría que medirlo.
- **La detección de reuso no cierra la sesión.** Al detectar un token reutilizado se devuelve `401`, pero no se revoca toda la familia de tokens del usuario. La implementación completa cerraría todas las sesiones ante esa señal. Es una mejora pendiente, no un defecto de diseño.
- **El frontend no aprovecha nada de esto.** La demo de checkout guarda el `refreshToken` pero nunca llama a `POST /auth/refresh`; a los 15 minutos la sesión simplemente se pierde. La API está lista, el cliente no.

---

## Pagos con Mercado Pago: sacar la tarjeta del backend

### El problema

La primera versión del módulo de pagos aceptaba el número de tarjeta y el CVV
en `POST /payments`, los validaba con Luhn y simulaba el cobro. Como
demostración funcionaba. Como producción era inviable: **cualquier sistema que
toque un PAN (número de tarjeta) entra en el alcance de PCI-DSS**, con todo lo
que eso implica en auditoría, segmentación de red y retención de logs. Para una
tienda de un solo producto, ese coste es prohibitivo.

Había además un problema de forma. El módulo modelaba "un adaptador por método"
(`NequiProvider`, `DaviplataProvider`, `CreditCardProvider`) porque simulaba
proveedores distintos. Mercado Pago es **un solo proveedor** que internamente
ofrece tarjeta, PSE, Efecty y saldo: forzarlo a ese patrón habría dejado tres
clases hablándole a la misma API.

> **Nota histórica.** La primera pasarela real fue Wompi, con su widget
> embebido y su firma de integridad. El cambio a Mercado Pago conservó el
> puerto `PaymentGateway` y toda la lógica de idempotencia; lo que cambió es
> cómo se arma el cobro y cómo se verifica el aviso, y eso vive entero en el
> adaptador. Que el cambio se resolviera sustituyendo una clase de
> infraestructura es, en la práctica, la justificación del puerto.

### El enfoque

**El número de tarjeta nunca llega al servidor.** La clienta lo teclea en el
sitio de Mercado Pago. `POST /payments` solo acepta un `orderId` — el DTO ya no
tiene siquiera un campo donde poner una tarjeta.

Lo que el backend hace es crear el cobro y verificar el aviso
([`mercadoPagoGateway.ts`](../backend/src/modules/payments/infrastructure/mercadoPagoGateway.ts)):

**1. El monto lo fija el servidor.** Se crea una *preferencia* contra
`POST /checkout/preferences` con el total del pedido y su `external_reference`,
y lo único que vuelve al navegador es el `init_point` al que ir. No hace falta
firmar el importe porque el importe nunca viaja con el cliente: vive del lado
de Mercado Pago desde el primer momento.

**2. Firma del aviso** para el webhook:

```
HMAC-SHA256( "id:<data.id>;request-id:<x-request-id>;ts:<ts>;" , MERCADO_PAGO_WEBHOOK_SECRET )
```

Con comparación en tiempo constante (`crypto.timingSafeEqual`), no `===`: una
comparación normal termina en el primer byte distinto, y ese tiempo variable
permite reconstruir la firma correcta byte a byte.

**3. No se cree el aviso.** Aquí está la diferencia de fondo con la pasarela
anterior: el aviso de Mercado Pago **no dice en qué quedó el pago**, solo que
cambió. Verificada la firma, el backend consulta `GET /v1/payments/{id}` y usa
esa respuesta. Un atacante que de algún modo colara un aviso firmado seguiría
sin poder decidir el resultado.

**Un único `PaymentGateway`** sustituye al registro de proveedores. El medio
concreto que eligió la clienta llega en el pago consultado y se guarda en
`Payment.rawPayload`; dejó de ser un valor del enum.

### Idempotencia en dos capas

Los proveedores **reintentan** si no reciben un 200 a tiempo. Pero un cliente al
que le rechazaron la tarjeta también **reintenta**, y esos dos casos hay que
distinguirlos:

```ts
// Un pago ya aprobado no se degrada nunca, llegue lo que llegue después.
if (payment.status === PaymentStatus.APPROVED) return { status: APPROVED, idempotent: true }

// Reentrega del mismo aviso: mismo pago y mismo estado.
if (payment.status === result.status && payment.providerTransactionId === result.transactionId) {
  return { status: payment.status, idempotent: true }
}
```

La clave es `providerTransactionId`. Comparar solo el estado —como hacía la versión
anterior— habría bloqueado los reintentos legítimos: tras un `DECLINED`, el
`APPROVED` de una transacción nueva se habría descartado como "ya procesado" y
el cliente habría pagado sin recibir su pedido.

### Trade-offs

- **La clienta sale del sitio.** Checkout Pro es una página de Mercado Pago, no un widget embebido: su aspecto y sus mensajes de error no son tuyos, y el checkout de la tienda pierde el paso de confirmación (lo recoge `track.html`). A cambio, no gestionas datos de tarjeta. Mantenerla dentro exigiría Checkout Bricks, que sí toca tokens de tarjeta y es bastante más trabajo.
- **Cobrar pasó a depender de la red.** `buildCheckout` ya no es una función pura: hace una petición HTTP, y por eso el puerto es asíncrono y un fallo de la API responde `503` y no `500`. La pasarela anterior firmaba en local y no podía fallar así.
- **Confirmar un pago cuesta dos saltos**, no uno: el aviso llega y hay que ir a preguntar. Es más lento y más frágil, pero es lo que hace que el contenido del aviso no importe.
- **Dependencia de un proveedor.** Mercado Pago cubre bien Colombia y buena parte de Latinoamérica. El puerto `PaymentGateway` deja la puerta abierta a otro adaptador: cambiar de Wompi a Mercado Pago consistió, de hecho, en sustituir la clase que lo implementa.
- **El backend no compara el monto del pago** con el total del pedido. El monto lo fijó el servidor al crear la preferencia, así que no es un agujero, pero es una comprobación barata que aún no está.

---

## Quién puede mover un pedido

### El problema

Un pedido tiene seis estados, pero durante mucho tiempo solo tres eran
alcanzables: `PENDING` al crearse, `PAID` por el webhook, `CANCELLED` por el
cliente. `PREPARING`, `SHIPPED` y `DELIVERED` existían en el enum y **nada los
asignaba**.

Eso tenía dos consecuencias silenciosas. La página de seguimiento mostraría
`PAID` para siempre, sin importar que el paquete ya estuviera en camino. Y el
módulo de reseñas —completo, con sus tests— era código muerto: exige un pedido
`DELIVERED`, y ningún pedido llegaba nunca ahí.

### El enfoque

Un endpoint de administración (`PATCH /admin/orders/:id/status`) respaldado por
una regla de dominio pura
([`orderTransitions.ts`](../backend/src/modules/admin/domain/orderTransitions.ts)):

```
PENDING   → CANCELLED
PAID      → PREPARING, CANCELLED
PREPARING → SHIPPED, CANCELLED
SHIPPED   → DELIVERED
DELIVERED → (final)
CANCELLED → (final)
```

Dos ausencias son deliberadas y son lo importante del diseño:

- **Nada lleva a `PAID`.** Ese estado solo lo produce el webhook verificado. Si un admin pudiera marcarlo a mano, un empleado —o alguien con su sesión— podría hacer despachar mercancía sin que hubiera entrado dinero. El intento devuelve `400` con esa explicación.
- **`SHIPPED` no se puede cancelar.** El paquete ya salió; cancelarlo devolvería stock que físicamente no está.

Cancelar antes del despacho **devuelve el stock** en la misma transacción que el
cambio de estado, e invalida el caché de catálogo. Avanzar un pedido no toca el
caché, porque el inventario no cambia.

El endpoint devuelve además `allowedTransitions`, para que un panel no tenga que
duplicar la tabla de arriba para decidir qué botones pintar.

### Trade-offs

- **Sin auditoría.** No se registra quién cambió el estado ni cuándo. Para una operación de una persona es asumible; con varios empleados haría falta una bitácora.
- **Sin notificación al cliente.** Pasar a `SHIPPED` no envía ningún correo. Hasta que exista el envío de correos, el cliente solo se entera si consulta el seguimiento.
- **Avance manual.** No hay integración con transportadoras: alguien tiene que marcar cada paso a mano.

---

## Checkout de invitado

### El problema

Obligar a crear cuenta antes de comprar cuesta conversión. Pero medio backend
está construido alrededor de `userId`: el carrito, el pedido, las direcciones,
los cupones por usuario.

### El enfoque

Introducido en la migración `0002_guest_orders`. Tres piezas:

**1. `Order.userId` pasa a opcional**, y aparece `guestEmail` como contacto
alternativo. Un pedido de invitado es una fila con `userId = null`.

**2. Un tipo de dominio que nombra la ambigüedad** en vez de esparcir `if`:

```ts
export type CartOwner = { type: 'user'; id: string } | { type: 'guest'; id: string }
```

El caso de uso decide sobre `owner.type`, no sobre la presencia de un `userId`
nulo.

**3. Middleware `optionalAuth`**: como `authGuard`, pero si el token falta o es
inválido no rechaza — sigue sin `req.user`. Es lo que hace que `/cart`,
`/orders` (POST) y `/payments` (POST) sirvan a los dos públicos con el mismo
código.

El invitado se identifica con `x-guest-id`, **validado contra
`^[A-Za-z0-9-]{1,64}$`** antes de tocar Redis. Sin esa validación, un cliente
podría inyectar valores arbitrarios en las claves de Redis.

### Trade-offs

- **Un invitado no puede consultar su pedido.** `GET /orders/:id` exige sesión y filtra por `userId`. Tras el checkout, la única constancia es la respuesta HTTP. Falta un endpoint de consulta por `orderNumber` + `guestEmail`.
- **`perUserLimit` de cupones no aplica.** Ya explicado arriba: sin identidad persistente no hay nada que contar.
- **El carrito de invitado se limpia fuera de la transacción.** Vive en Redis, no en Postgres, así que no puede participar del `$transaction`. Se borra después de confirmar el pedido ([`checkout.usecase.ts:136`](../backend/src/modules/orders/application/checkout.usecase.ts)). Si el proceso muere justo entre ambas cosas, el pedido existe y el carrito también. Es el orden correcto — al revés se perdería el carrito sin haber creado nada.
- **Los carritos de invitado caducan a los 7 días** (TTL de Redis). No hay aviso.

---

## Snapshots en el pedido

### El problema

Un pedido es un documento histórico. Si dentro de seis meses el precio del
producto cambió, o la persona editó su dirección, o el producto se renombró, el
pedido de hoy tiene que seguir diciendo lo que se compró, a qué precio y a dónde
se envió.

Un pedido que solo guarda referencias (`productId`, `addressId`) **muta con el
tiempo**. Es un error de contabilidad esperando a ocurrir.

### El enfoque

Copiar los datos, no solo referenciarlos:

- `OrderItem` guarda `productName`, `unitPrice` y `lineTotal` además de `productId`.
- `Order` guarda `shipFullName`, `shipPhone`, `shipLine1`, `shipLine2`, `shipCity`, `shipDepartment`, `shipPostalCode` además de `addressId`.

La referencia se conserva para poder navegar ("ver este producto"); la copia es
la que manda para mostrar el pedido.

### Trade-offs

- **Duplicación de datos**, a propósito. Es la forma correcta de modelar un hecho histórico frente a una entidad viva.
- **Los datos copiados no se actualizan.** Si el nombre del producto tenía una errata, el pedido antiguo la conserva para siempre. Es exactamente lo que se quiere.
- **`toOrderView` normaliza `null` a `""`** en los campos de envío, porque son opcionales en el esquema (herencia de la migración) pero el checkout siempre los rellena.

---

## Validación de entorno que falla al arrancar

### El problema

Una variable de entorno mal puesta suele descubrirse tarde: la app arranca
tranquilamente y revienta cuando alguien pega en el código que la usa. Un
`JWT_ACCESS_SECRET` ausente no se nota hasta el primer login.

Peor: desplegar a producción con los secretos de ejemplo. `CORS_ORIGIN=*`,
la contraseña de admin de la plantilla, el secreto de webhook del `.env.example`.
Nada falla. Todo está abierto.

### El enfoque

Un schema Zod que valida **todo** al importar el módulo
([`env.ts`](../backend/src/shared/config/env.ts)). Si algo falta o es inválido,
el proceso muere con la lista completa de errores.

Y encima, un `superRefine` que **solo se activa con `NODE_ENV=production`**:

| Comprobación | Por qué |
|---|---|
| `PAYMENTS_WEBHOOK_SECRET` ≠ valor de ejemplo | El valor por defecto permite falsificar pagos |
| `ADMIN_PASSWORD` ≠ valor de ejemplo | Es una credencial pública conocida |
| `CORS_ORIGIN` ≠ `*` | Hay que listar los orígenes reales |

El seed tiene la misma guarda: se niega a sembrar un admin con la contraseña por
defecto en producción.

Además, el CORS es coherente consigo mismo: con `CORS_ORIGIN=*` las
**credenciales se desactivan** (`credentials: !isWildcardOrigin`), porque
reflejar cualquier origen con credenciales es un agujero.

### Trade-offs

- **Añadir una variable obliga a tocar tres sitios**: `env.ts`, `.env.example` y el bloque `env` del workflow de CI. Olvidar el tercero rompe CI con un error de arranque.
- **Se importa por efecto secundario.** `import { env } from './shared/config/env'` valida al cargar el módulo. Es lo que da el fallo temprano, pero significa que importar `env.ts` en un test arrastra la validación completa.
- **`NODE_ENV=production` es la única puerta.** Un entorno de staging con `NODE_ENV=development` se salta las comprobaciones y puede acabar con `CORS_ORIGIN=*`.

---

## Errores de dominio, nunca códigos HTTP

### El problema

Cuando un caso de uso hace `res.status(409)`, deja de ser código de negocio. Ya
no se puede llamar desde una cola, un cron o un test sin simular Express. Y la
lógica de "qué código HTTP corresponde a qué situación" queda esparcida por todo
el proyecto.

### El enfoque

Los casos de uso lanzan clases de
[`shared/errors/AppError`](../backend/src/shared/errors/AppError.ts):
`BadRequestError`, `UnauthorizedError`, `ForbiddenError`, `NotFoundError`,
`ConflictError`, `UnprocessableError`. Cada una lleva su `statusCode` y su
`code` simbólico.

Un **único** middleware (`errorHandler`) los traduce, y de paso normaliza dos
familias más:

- `ZodError` → `400 VALIDATION_ERROR` con `details.fieldErrors`.
- Errores conocidos de Prisma: `P2002` (unicidad) → `409`, `P2025` (no existe) → `404`, `P2003` (clave foránea) → `409`.

Cualquier otra cosa se registra completa en el log y sale como `500
INTERNAL_ERROR` **sin detalles**. El cliente no ve trazas de pila ni nombres de
tabla.

Es también la razón de `asyncHandler`: envuelve los controladores para que un
`await` que rechaza acabe en `next(err)` en vez de en una promesa no capturada.

### Trade-offs

- **Los mensajes de error de negocio están en español y en el dominio.** Internacionalizarlos exigiría códigos y un catálogo de traducciones. Para una tienda colombiana, no hace falta.
- **`UnprocessableError` (422) está definido y no se usa.** Sobra hoy.
- **`P2002` da un mensaje genérico** ("Ya existe un registro con esos datos únicos") que no dice qué campo chocó. Los casos de uso más críticos comprueban antes para dar un mensaje mejor.

---

## Relacionado

- [ARCHITECTURE.md](../ARCHITECTURE.md) — las capas y la traza de una petición
- [Explicación: modelo de seguridad](explicacion-seguridad.md)
- [Referencia: modelo de datos](referencia-modelo-datos.md)
- [Cómo agregar un módulo nuevo](howto-agregar-modulo.md)
