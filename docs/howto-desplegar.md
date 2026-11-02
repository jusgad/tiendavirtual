# Cómo desplegar a producción

Al terminar tendrás el backend sirviendo la API con secretos propios y el
frontend publicado como sitio estático.

Este documento cubre lo que el repositorio soporta hoy. **No hay pipeline de
despliegue automatizado**: el workflow de CI solo prueba y compila. Los pasos de
publicación son manuales o dependen de la plataforma que elijas.

## Requisitos previos

- PostgreSQL 16 accesible desde donde correrá la API.
- Redis 7 accesible desde donde correrá la API.
- Una plataforma para el backend (contenedores o Node): Render, Railway, Fly.io, AWS ECS, un VPS…
- Una plataforma para el frontend (estático): Vercel, Netlify, Cloudflare Pages, S3 + CloudFront…
- TLS terminado antes de la aplicación (balanceador o CDN). **La app no fuerza HTTPS por sí misma.**

---

## Pasos

### 1. Genera los secretos

No reutilices los valores de `.env.example`. Genera cada uno:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Necesitas tres valores distintos:

| Variable | Restricción |
|---|---|
| `JWT_ACCESS_SECRET` | ≥ 16 caracteres. Usa 48 bytes aleatorios |
| `WOMPI_INTEGRITY_SECRET` | ≥ 8 caracteres. El de tu cuenta de Wompi, no uno inventado: firma el monto que ve el widget |
| `WOMPI_EVENTS_SECRET` | ≥ 8 caracteres. El de tu cuenta de Wompi: debe coincidir con el que registres en su panel |
| `ADMIN_PASSWORD` | ≥ 8 caracteres |

### 2. Configura las variables de entorno

En el gestor de secretos de tu plataforma, **no en un `.env` en disco**.

```bash
NODE_ENV=production
PORT=3000
API_PREFIX=/api
TRUST_PROXY=1

DATABASE_URL=postgresql://usuario:password@host:5432/pomass?schema=public
REDIS_URL=redis://:password@host:6379

JWT_ACCESS_SECRET=<el que generaste>
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=7d

BCRYPT_SALT_ROUNDS=12
PASSWORD_RESET_TTL_MIN=30
CORS_ORIGIN=https://tudominio.com,https://www.tudominio.com

SHIPPING_FLAT_RATE=12900
FREE_SHIPPING_THRESHOLD=150000

WOMPI_PUBLIC_KEY=<la de tu cuenta de Wompi>
WOMPI_PRIVATE_KEY=<la de tu cuenta de Wompi>
WOMPI_INTEGRITY_SECRET=<la de tu cuenta de Wompi>
WOMPI_EVENTS_SECRET=<la de tu cuenta de Wompi>
WOMPI_REDIRECT_URL=https://tudominio.com/track.html
PAYMENTS_SANDBOX=false

ADMIN_EMAIL=admin@tudominio.com
ADMIN_PASSWORD=<el que generaste>
```

Tres detalles que la aplicación **hace cumplir por sí misma** con
`NODE_ENV=production` — si te los saltas, no arranca:

- `WOMPI_INTEGRITY_SECRET` y `WOMPI_EVENTS_SECRET` no pueden ser los de ejemplo.
- Con `WOMPI_PUBLIC_KEY`/`WOMPI_PRIVATE_KEY` de sandbox (`pub_test_`/`prv_test_`), hay que declarar `PAYMENTS_SANDBOX=true` — si no, el arranque falla porque ningún pago real entraría.
- `ADMIN_PASSWORD` no puede ser `Admin123*`.
- `CORS_ORIGIN` no puede ser `*`.

Y uno que depende de ti: **`TRUST_PROXY=1`** si corre detrás de un balanceador o
CDN. Sin él, el rate limiting verá la IP del balanceador para todo el tráfico y
bloqueará a todos a la vez. Pon el número exacto de proxies que controlas, nunca
`true`.

Referencia completa: [configuración](referencia-configuracion.md#variables-de-entorno-del-backend).

### 3. Aplica las migraciones

Desde una máquina con acceso a la base, y `DATABASE_URL` apuntando a producción:

```bash
cd backend
npm ci
npx prisma generate
npm run prisma:deploy
```

`prisma:deploy` (`prisma migrate deploy`) es la versión **no interactiva**.
Nunca uses `prisma migrate dev` contra producción: puede pedir confirmación y,
en el peor caso, proponer reiniciar la base.

### 4. Siembra los datos iniciales (solo la primera vez)

```bash
npm run prisma:seed
```

Crea el admin, 3 marcas, 6 categorías, 7 productos de ejemplo y el cupón
`BIENVENIDA10`. Es idempotente.

> El seed **aborta** si `NODE_ENV=production` y `ADMIN_PASSWORD` sigue siendo el
> valor de ejemplo.

Si no quieres los productos de ejemplo en producción, salta este paso y crea el
admin a mano, o edita `prisma/seed.ts` antes.

### 5. Publica el backend

#### Opción A — imagen Docker

El [`Dockerfile`](../backend/Dockerfile) es multietapa y ya está listo para
producción: compila con dependencias de desarrollo, poda con `npm prune --omit=dev`,
fija `NODE_ENV=production` y **corre como el usuario no-root `node`**.

```bash
cd backend
docker build -t pomass-api:latest .
docker run -d -p 3000:3000 --env-file /ruta/segura/.env pomass-api:latest
```

Ten en cuenta que el `CMD` de la imagen es solo `node dist/main.js` — **no**
migra ni siembra. Eso lo hace el `command` de `docker-compose.yml`, que es para
desarrollo. En producción, las migraciones son un paso de despliegue aparte
(paso 3).

#### Opción B — Node directamente

```bash
cd backend
npm ci --omit=dev
npx prisma generate
npm run build
npm start
```

Usa un gestor de procesos (systemd, PM2) para reinicios y arranque automático.

En ambos casos, apunta el healthcheck de la plataforma a **`/health`** — está
fuera del prefijo `/api` y no toca base de datos.

### 6. Publica el frontend

```bash
cd frontend
```

Crea `.env` con la URL pública de tu API:

```
VITE_API_URL=https://api.tudominio.com/api
```

```bash
npm ci
npm run build
```

Genera `frontend/dist/` con **las dos páginas**: `index.html` (landing) y
`checkout.html` (demo). Sube esa carpeta a tu hosting estático.

> `VITE_API_URL` se resuelve en **tiempo de build**, no de ejecución. Cambiarla
> exige volver a construir y volver a publicar.

Comprueba que el hosting sirve `/checkout.html` correctamente. Algunas
plataformas configuradas como SPA reescriben todo a `index.html` y romperían la
segunda página — este proyecto es multipágina, no SPA.

### 7. Cierra el círculo de CORS

`CORS_ORIGIN` en el backend debe contener el origen exacto donde publicaste el
frontend, con protocolo y sin barra final:

```
CORS_ORIGIN=https://tudominio.com,https://www.tudominio.com
```

Si sirves el sitio en `www` y sin `www`, incluye los dos: son orígenes distintos
para el navegador.

### 8. Cambia la contraseña del admin

El admin sembrado tiene la contraseña que pusiste en `ADMIN_PASSWORD`, que
también está en tu gestor de secretos y probablemente en algún historial de
terminal. Cámbiala:

```bash
curl -X POST https://api.tudominio.com/api/auth/forgot-password \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@tudominio.com"}'
```

> **Aquí hay un problema real**: **no hay envío de correos implementado**. En
> producción el token no llega a ninguna parte, y `devResetToken` solo se
> devuelve fuera de producción. Hoy la única forma de cambiar la contraseña del
> admin es leer el token directamente de la tabla `password_reset_tokens`, o
> actualizar el hash en base de datos.
>
> Antes de tener usuarios reales, implementa el envío de correo. Sin él, la
> recuperación de contraseña **no funciona para nadie**.

---

## Verificación

**1. La API responde**

```bash
curl https://api.tudominio.com/health
```

**2. El catálogo funciona** (prueba Postgres + caché de una vez)

```bash
curl -s "https://api.tudominio.com/api/products?pageSize=1"
```

**3. Redis funciona** (el carrito de invitado depende de él)

```bash
curl -s https://api.tudominio.com/api/cart
```

Debe traer un `guestId`.

**4. El endurecimiento de producción está activo** — comprueba que
`devResetToken` **no** aparece:

```bash
curl -s -X POST https://api.tudominio.com/api/auth/forgot-password \
  -H 'Content-Type: application/json' \
  -d '{"email":"noexiste@ejemplo.com"}'
```

Debe devolver **solo** `{"message":"Si el correo existe, …"}`. Si aparece
`devResetToken`, `NODE_ENV` no es `production`.

**5. El CORS es restrictivo** — desde un origen no permitido:

```bash
curl -s -I -H 'Origin: https://sitio-no-permitido.com' \
  https://api.tudominio.com/api/products
```

La respuesta no debe traer `Access-Control-Allow-Origin` con ese origen.

**6. El frontend habla con la API** — abre `https://tudominio.com/checkout.html`,
pulsa *Continuar como invitado* y comprueba que carga el catálogo. Si ves el
banner rojo de conexión, revisa `VITE_API_URL` y `CORS_ORIGIN`.

---

## Checklist de producción

```
[ ] NODE_ENV=production
[ ] JWT_ACCESS_SECRET propio, largo y aleatorio
[ ] WOMPI_INTEGRITY_SECRET y WOMPI_EVENTS_SECRET propios, los de tu cuenta de Wompi
[ ] WOMPI_REDIRECT_URL apuntando al dominio real del frontend
[ ] URL de Eventos registrada en el panel de Wompi: https://TU-BACKEND/api/payments/webhook/wompi
[ ] ADMIN_PASSWORD propio
[ ] CORS_ORIGIN con los orígenes reales, nunca *
[ ] TRUST_PROXY=1 si hay balanceador o CDN delante
[ ] Secretos en el gestor de la plataforma, no en un .env en disco
[ ] TLS terminado antes de la app; HTTP redirige a HTTPS
[ ] Migraciones aplicadas con prisma migrate deploy
[ ] Healthcheck de la plataforma apuntando a /health
[ ] Contraseña del admin cambiada tras el despliegue
[ ] Backups automáticos de Postgres, con una restauración probada de verdad
[ ] Rotación y retención de logs configuradas
[ ] Alertas sobre el healthcheck y la tasa de errores 5xx
```

Los cinco primeros los hace cumplir la aplicación. Los demás son tuyos.

---

## Antes de aceptar dinero real

El repositorio está preparado en arquitectura, pero **falta trabajo funcional**
antes de operar con clientes de verdad:

| Pendiente | Por qué bloquea |
|---|---|
| **Widget de Wompi en el frontend** | El backend ya está integrado ([`wompiGateway.ts`](../backend/src/modules/payments/infrastructure/wompiGateway.ts)), pero `PaymentStep.jsx` todavía muestra el formulario antiguo. Sin el widget no se puede cobrar |
| **Credenciales de Wompi** | Crear la cuenta, probar en sandbox y pasar a llaves de producción |
| **Envío de correos** | Sin él, la recuperación de contraseña no funciona y nadie recibe confirmación de pedido |
| **Transiciones de estado del pedido** | No hay endpoint para `PAID → PREPARING → SHIPPED → DELIVERED`. Sin eso el cliente nunca ve avanzar su pedido, y las reseñas (que exigen `DELIVERED`) nunca se habilitan |
| **Panel de administración** | Los endpoints existen; no hay interfaz. Hoy se gestiona con `curl` o Prisma Studio |
| **Escaneo de dependencias** | No hay `npm audit`, Dependabot ni Snyk en CI |
| **Monitoreo de errores** | Pino registra en stdout; no hay agregación ni alertas (Sentry, Datadog…) |
| **CI para el frontend** | Ningún workflow hace lint ni build de `frontend/**` |

Lista completa en
[modelo de seguridad](explicacion-seguridad.md#lo-que-no-cubre) y en los huecos
conocidos de [modelo de datos](referencia-modelo-datos.md#huecos-conocidos) y
[frontend](referencia-frontend.md#huecos-conocidos).

---

## Resolución de problemas

### La app no arranca: "Configuración de entorno inválida"

El log inmediatamente anterior lista los campos exactos. En producción las
causas típicas son los tres valores de ejemplo prohibidos
(`WOMPI_INTEGRITY_SECRET`, `WOMPI_EVENTS_SECRET`, `ADMIN_PASSWORD`, `CORS_ORIGIN=*`).

### Todos los usuarios reciben 429 a la vez

Falta `TRUST_PROXY`. Detrás de un balanceador sin él, Express ve la misma IP para
todo el tráfico y el límite de 300 peticiones/minuto se agota entre todos.

### El frontend recibe errores de CORS

`CORS_ORIGIN` debe contener el origen **exacto**: protocolo incluido, sin barra
final. `https://tudominio.com` y `https://www.tudominio.com` son orígenes
distintos.

### `/checkout.html` devuelve 404 o muestra la landing

El hosting está configurado como SPA y reescribe todo a `index.html`. Este
proyecto es multipágina: desactiva la reescritura o excluye `/checkout.html`.

### El webhook de pago devuelve 401 en producción

`WOMPI_EVENTS_SECRET` no coincide con el de tu cuenta de Wompi. Compruébalo en
el panel de Wompi y confirma que la URL de eventos allí apunta a
`https://api.tudominio.com/api/payments/webhook/wompi`. Ver
[decisiones de diseño](explicacion-decisiones.md#pagos-con-wompi-sacar-la-tarjeta-del-backend).

### El catálogo funciona pero el carrito falla

Redis no es accesible. La caché de catálogo degrada a "sin caché" a propósito;
el carrito de invitado no tiene esa tolerancia.

---

## Relacionado

- [Referencia: configuración y variables de entorno](referencia-configuracion.md)
- [Explicación: modelo de seguridad](explicacion-seguridad.md)
- [Cómo montar el entorno local](howto-entorno-local.md)
- [Cómo probar el flujo de pagos](howto-probar-pagos.md)
