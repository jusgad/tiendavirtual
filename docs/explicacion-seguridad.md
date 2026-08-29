# Explicación · Modelo de seguridad

Qué protege el backend de PomAss, cómo, y **qué no protege**. Escrito para que
puedas decidir si es suficiente para tu caso antes de exponerlo a internet.

Contexto que importa: es una tienda de productos de cuidado íntimo. Los datos
que maneja son sensibles no por su valor económico sino por su naturaleza — qué
compró alguien y a dónde se lo enviaron. Eso cambia las prioridades: la
privacidad del pedido pesa tanto como la protección del pago.

---

## Superficie expuesta

| Zona | Endpoints | Quién entra |
|---|---|---|
| Pública sin identidad | catálogo, reseñas (lectura), `/health`, `/api/docs` | cualquiera |
| Pública con identidad opcional | carrito, checkout, iniciar pago | cualquiera, con o sin cuenta |
| Autenticación | registro, login, refresh, logout, recuperación | cualquiera, con rate limit reforzado |
| Sesión requerida | pedidos, direcciones, consultar pago, crear reseña | usuario con access token |
| Solo administración | escritura de catálogo, cupones, reportes | usuario con rol `ADMIN` |
| Webhook | `POST /payments/webhook/:provider` | cualquiera, pero exige firma HMAC válida |

Ver la lista completa en la [referencia de API](referencia-api.md#mapa-completo-de-endpoints).

---

## Autenticación

### Contraseñas

Se hashean con **bcrypt**, coste configurable `BCRYPT_SALT_ROUNDS` (rango
validado 10–15, por defecto 12). Nunca se guardan ni se registran en claro.

### Access tokens

JWT **HS256** con vigencia corta (`JWT_ACCESS_TTL`, 15 minutos por defecto).

El detalle que importa está en la verificación
([`middlewares/auth.ts:20`](../backend/src/shared/middlewares/auth.ts)):

```ts
jwt.verify(token, env.JWT_ACCESS_SECRET, { algorithms: ['HS256'] })
```

**El algoritmo está fijado.** Sin ese parámetro, `jsonwebtoken` acepta lo que
diga la cabecera del token, y un atacante puede enviar `alg: none` (token sin
firma) o forzar confusión de algoritmo. Una línea que cierra una familia entera
de ataques.

El payload lleva solo `sub` (id) y `role`. `GET /auth/me` devuelve eso mismo, no
una lectura de base de datos.

### Refresh tokens

Tres propiedades combinadas:

1. **Opacos**, no JWT. Bytes aleatorios sin información. Se pueden revocar de verdad.
2. **Guardados hasheados**. La tabla `refresh_tokens` solo tiene `tokenHash`. Una filtración de la base no entrega sesiones usables.
3. **Rotan en cada uso**. Refrescar revoca el token usado y emite uno nuevo; reutilizar uno consumido devuelve `401`.

Restablecer la contraseña revoca **todos** los refresh tokens del usuario.

Detalle completo en [decisiones de diseño](explicacion-decisiones.md#refresh-tokens-con-rotación-y-detección-de-reuso).

### Anti-enumeración de usuarios

Dos flujos podrían filtrar qué correos existen. Los dos están cerrados:

**Login** ([`loginUser.usecase.ts:32`](../backend/src/modules/auth/application/loginUser.usecase.ts)):

```ts
if (!user) {
  await this.hasher.hash(input.password)   // gasta el mismo tiempo
  throw new UnauthorizedError('Credenciales inválidas')
}
```

Mismo mensaje y **mismo tiempo de respuesta** exista o no el correo. Sin ese
hash de relleno, la diferencia de latencia (bcrypt tarda ~100 ms) sería un
oráculo perfecto.

**Recuperación de contraseña**: siempre la misma respuesta —
`"Si el correo existe, enviaremos instrucciones…"` — exista o no la cuenta.

---

## Autorización

Dos niveles, aplicados por middleware:

**Por rol.** `roleGuard('ADMIN')` protege toda la escritura de catálogo, todo el
CRUD de cupones y todos los reportes. Va siempre después de `authGuard`.

**Por pertenencia.** Pedidos, direcciones y pagos comprueban `userId`, y lo
hacen **dos veces**: en el caso de uso y en la consulta del repositorio.

```ts
// orderQueries.usecase.ts
const order = await this.orders.findByIdForUser(id, userId)
if (!order) throw new NotFoundError('Pedido no encontrado')
```

```ts
// prismaOrderRepository.ts
this.prisma.order.findFirst({ where: { id, userId }, include: { items: true } })
```

Es defensa en profundidad: aunque alguien llamara al repositorio saltándose el
caso de uso, la consulta sigue filtrando. Y devuelve **404, no 403**: un pedido
ajeno se comporta como si no existiera, sin confirmar que existe.

---

## Validación de entrada

**Todo endpoint con body, query o params validables pasa por Zod** mediante el
middleware `validate({ body, query, params })`, que además **reemplaza** cada
parte por la versión parseada — con defaults y coerciones ya aplicados. Los
controladores nunca ven la entrada cruda.

Un fallo de validación se convierte en `BadRequestError('Datos de entrada
inválidos', err.flatten())`, es decir `400` con código `BAD_REQUEST` y el
detalle por campo en `details.fieldErrors`.

Reglas destacadas:

| Dato | Regla |
|---|---|
| Contraseña | ≥ 8 caracteres, al menos una letra y un número |
| Correo | Formato email, normalizado a minúsculas |
| `ageConfirmed` | `z.literal(true)` — no basta con enviar cualquier valor |
| Ids | `z.string().uuid()` en todos los params |
| `pageSize` | Tope duro por endpoint (50 en pedidos, 100 en catálogo y reseñas) |
| Celular de pago | `^3\d{9}$` (móvil colombiano) |
| Tarjeta | Algoritmo de **Luhn** + expiración futura + CVV de 3–4 dígitos |
| `x-guest-id` | `^[A-Za-z0-9-]{1,64}$` antes de tocar Redis |

Esa última merece atención: el token de invitado se usa para construir la clave
de Redis (`cart:guest:<token>`). Sin validarlo, un cliente podría inyectar
valores arbitrarios en el keyspace. Cualquier valor que no encaje se descarta y
se genera uno nuevo.

**Inyección SQL**: todo el acceso a datos pasa por Prisma con consultas
parametrizadas. No hay SQL crudo en el proyecto.

---

## Transporte y cabeceras

| Medida | Configuración |
|---|---|
| `helmet()` | Cabeceras de seguridad por defecto |
| CORS con allowlist | `CORS_ORIGIN` separado por comas |
| Credenciales CORS | **Solo** con allowlist explícita: `credentials: !isWildcardOrigin` |
| Tamaño de body | `express.json({ limit: '100kb' })` |
| `trust proxy` | `env.TRUST_PROXY` — número exacto de saltos, no `true` |

Los dos últimos son sutiles y valen la pena:

**El límite de 100 kB** evita agotar memoria con payloads enormes. Es amplio
para cualquier petición legítima de esta API.

**`trust proxy` numérico**: poner `app.set('trust proxy', true)` haría que
Express confíe en toda la cadena `X-Forwarded-For`, y como esa cabecera la puede
falsificar el cliente, el rate limiting pasaría a ser trivial de esquivar
(basta rotar la IP declarada). Con un número, Express solo confía en los N
saltos que realmente controlas.

---

## Limitación de peticiones

| Alcance | Ventana | Límite |
|---|---|---|
| Toda la API | 60 s | 300 peticiones por IP |
| `/api/auth/*` | 15 min | 20 peticiones por IP |

El límite reforzado en `/auth` es lo que hace inviable la fuerza bruta sobre
contraseñas. Ambos devuelven `429` con el formato de error estándar y se
desactivan con `NODE_ENV=test` para no introducir inestabilidad en los tests.

---

## Pagos

**El backend nunca ve un número de tarjeta.** Es la propiedad de seguridad más
importante del sistema: el cliente teclea sus datos dentro del widget de Wompi,
en su navegador, y `POST /payments` solo acepta un `orderId`. El DTO ni siquiera
tiene un campo donde poner una tarjeta.

Esto mantiene el proyecto **fuera del alcance de PCI-DSS**. La versión anterior
recibía PAN y CVV en el propio endpoint, lo que habría sido un problema de
cumplimiento real al llegar a producción.

Lo que sí hace el backend:

- **Firma de integridad** del widget: `SHA256(referencia + montoEnCentavos + moneda + WOMPI_INTEGRITY_SECRET)`. Impide que el cliente altere el importe en el navegador. El secreto nunca viaja; solo el hash.
- **Verifica el checksum** de cada evento (`SHA256(valores + timestamp + WOMPI_EVENTS_SECRET)`) con comparación en tiempo constante (`crypto.timingSafeEqual`), no `===`.
- **Nunca confía en el redirect** del navegador como prueba de pago: la única fuente de verdad es el webhook verificado.
- **Idempotencia en dos capas**: un pago ya `APPROVED` no se degrada jamás, y la reentrega del mismo evento (misma transacción y estado) no reprocesa. Un reintento legítimo con transacción nueva sí se procesa.
- **Secretos obligatorios en producción**: el arranque falla si los secretos de Wompi siguen siendo los de ejemplo, **o si las llaves son de sandbox** (`pub_test_`/`prv_test_`).
- En `Payment.rawPayload` se guarda el payload del **evento**, no el de la petición del cliente.

Detalle en [decisiones de diseño](explicacion-decisiones.md#pagos-con-wompi-sacar-la-tarjeta-del-backend).

## Seguimiento público de pedidos

`GET /orders/track` es el único endpoint que expone datos de un pedido sin
sesión. Cuatro controles:

- **Exige nº de pedido Y correo.** El número por sí solo permitiría recorrer pedidos ajenos.
- **Responde 404, no 403**, cuando el correo no coincide. Un 403 confirmaría que ese número de pedido existe.
- **La comparación va en la consulta**, no después de leer el pedido: una respuesta vacía es indistinguible de "no existe".
- **Rate limit propio**: 30 peticiones cada 15 minutos por IP. Es un objetivo obvio de fuerza bruta.

La respuesta es un subconjunto reducido a propósito: `orderNumber`, `status`,
`total`, `shipCity`, los ítems (solo nombre, cantidad e importe) y la fecha.
**Sin dirección completa, sin teléfono, sin datos de pago y sin ids internos.**

## Gestión de pedidos por administrador

`PATCH /admin/orders/:id/status` exige rol `ADMIN` y respeta una regla que es de
seguridad, no de negocio: **no se puede marcar `PAID` a mano**. Ese estado solo
lo produce el webhook verificado. Si un admin pudiera asignarlo, alguien con esa
sesión podría hacer despachar mercancía sin que hubiera entrado dinero.

---

## Gestión de secretos

- `.env` está en `.gitignore` y **no se versiona**. Solo `.env.example` con valores de ejemplo claramente marcados.
- En producción, tres valores por defecto **impiden el arranque**: `PAYMENTS_WEBHOOK_SECRET`, `ADMIN_PASSWORD` y `CORS_ORIGIN=*`.
- El seed se niega a crear un admin con la contraseña de ejemplo si `NODE_ENV=production`.

> **Ojo**: existe un archivo `backend/.env` en esta copia de trabajo. Está
> ignorado por git, pero conviene confirmar que nunca se subió y que sus valores
> son de desarrollo.

---

## Fuga de información

- Los errores no controlados se registran completos en el servidor y salen como `500 INTERNAL_ERROR` **sin detalles**. Nada de trazas ni nombres de tabla al cliente.
- Recursos ajenos devuelven `404`, no `403`.
- `toSafeUser` filtra el `passwordHash` antes de responder.
- `devResetToken` en `/auth/forgot-password` **solo aparece fuera de producción** (`env.NODE_ENV !== 'production'`).
- El logging usa Pino estructurado. **No hay redacción explícita configurada**: si algún día se registra un body de petición, contraseñas o tarjetas acabarían en el log. Hoy no ocurre, pero es una trampa a la espera.

---

## Privacidad del comprador

Específico de este negocio:

- **Empaque discreto** (`discreetPackaging`) es un campo de primera clase en el pedido, no una nota libre.
- **Reseñas anónimas** (`isAnonymous`) ocultan el nombre públicamente.
- **Checkout de invitado** permite comprar sin dejar cuenta.
- **Verificación de edad** (`ageConfirmed`) es obligatoria en el registro, validada con `z.literal(true)`.

> Limitación conocida: el checkout de invitado exige `guestEmail` y guarda la
> dirección completa en el pedido. "Invitado" significa *sin cuenta*, no
> *anónimo*.

---

## Lo que NO cubre

Sé honesto con esta lista antes de exponer la API.

### Ausencias funcionales

| Hueco | Impacto |
|---|---|
| **Sin verificación de correo** | Cualquiera se registra con un correo que no controla |
| **Sin envío real de correos** | La recuperación de contraseña no entrega el token a nadie. Fuera de producción se devuelve en la respuesta; en producción, el flujo **está roto de hecho** |
| **Sin 2FA** | No hay segundo factor para nadie, tampoco para el admin |
| **Sin bloqueo de cuenta** | Solo rate limit por IP. Un atacante distribuido no encuentra tope por cuenta |
| **Sin CSRF** | No hace falta hoy: la autenticación va por header `Authorization`, no por cookie. **Si algún día se cambia a cookies, hace falta protección CSRF** |
| **Sin auditoría** | No hay registro de quién cambió qué. Un admin comprometido no deja rastro |
| **Sin gestión de usuarios** | No hay forma por API de desactivar una cuenta ni de quitar el rol `ADMIN` |
| **Sin política de contraseñas fuerte** | 8 caracteres con una letra y un número admite `password1` |
| **Sin HTTPS forzado** | No hay redirección ni HSTS más allá de lo que ponga `helmet` por defecto. Se asume terminación TLS en el balanceador |

### Ausencias de proceso

| Hueco | Impacto |
|---|---|
| **Sin escaneo de dependencias** | No hay `npm audit`, Dependabot ni Snyk en CI |
| **Sin análisis estático de seguridad** | ESLint corre, pero sin reglas ni herramientas de seguridad |
| **Sin CI para el frontend** | Ningún workflow toca `frontend/**` |
| **Sin pruebas de seguridad** | Los tests cubren lógica de negocio, no vectores de ataque |

### Detalles menores pero reales

- **La detección de reuso de refresh token no cierra la sesión.** Devuelve `401` pero no revoca la familia de tokens, que es la respuesta correcta ante esa señal.
- **`perUserLimit` de cupones no es exigible en compras de invitado**: no hay identidad persistente que contar, así que solo `maxUses` funciona como tope real. El seed lo compensa poniendo un tope global de 100 usos.
- **El webhook no compara el monto** del evento contra el total del pedido. La firma de integridad ya impide alterarlo en el navegador, pero sería una comprobación barata de añadir.
- **Sin auditoría de cambios de estado**: no se registra qué administrador movió un pedido a `SHIPPED` ni cuándo.
- **Sin límite de profundidad ni detección de ciclos** en el árbol de categorías.

---

## Checklist antes de producción

```
[ ] NODE_ENV=production
[ ] JWT_ACCESS_SECRET largo y aleatorio (≥ 32 bytes)
[ ] WOMPI_INTEGRITY_SECRET y WOMPI_EVENTS_SECRET propios, de tu cuenta de Wompi
[ ] WOMPI_PUBLIC_KEY / WOMPI_PRIVATE_KEY de PRODUCCIÓN (pub_prod_/prv_prod_),
    no las de sandbox
[ ] ADMIN_PASSWORD propio, no el de .env.example
[ ] CORS_ORIGIN con la lista real de orígenes, nunca *
[ ] TRUST_PROXY=1 si corre detrás de ALB/CloudFront
[ ] Secretos en el gestor de la plataforma, no en un .env plano
[ ] TLS terminado antes de la app; HTTP redirige a HTTPS
[ ] URL de eventos configurada en el panel de Wompi apuntando al webhook
[ ] Cambiar la contraseña del admin sembrado tras el primer despliegue
[ ] Backups automáticos de Postgres verificados (probar una restauración)
[ ] Rotación y retención de logs configuradas
```

Los seis primeros los hace cumplir el propio código: con `NODE_ENV=production`,
la app **no arranca** si faltan. Los demás son responsabilidad de la
infraestructura.

Pasos concretos en [Cómo desplegar a producción](howto-desplegar.md).

---

## Relacionado

- [Explicación: decisiones de diseño](explicacion-decisiones.md)
- [Referencia: configuración y variables de entorno](referencia-configuracion.md)
- [Cómo desplegar a producción](howto-desplegar.md)
- [Cómo probar el flujo de pagos](howto-probar-pagos.md)
