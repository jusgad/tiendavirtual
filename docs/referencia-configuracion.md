# Referencia · Configuración, comandos y entornos

Todo lo que se configura en PomAss: variables de entorno, scripts npm, Docker y
CI. Un solo sitio donde mirar cuando algo no arranca.

---

## Variables de entorno del backend

Se validan **todas de golpe al arrancar** con Zod en
[`backend/src/shared/config/env.ts`](../backend/src/shared/config/env.ts). Si
falta o es inválida alguna, el proceso **falla inmediatamente** con la lista de
errores; no arranca a medias.

Plantilla lista para copiar: [`backend/.env.example`](../backend/.env.example).

```bash
cd backend
cp .env.example .env
```

### Aplicación

| Variable | Tipo | Default | Descripción |
|---|---|---|---|
| `NODE_ENV` | `development` \| `test` \| `production` | `development` | En `production` activa comprobaciones extra (ver abajo). En `test` desactiva rate limiting y logs HTTP |
| `PORT` | number | `3000` | Puerto de la API |
| `API_PREFIX` | string | `/api` | Prefijo de todas las rutas. `/health` queda fuera |
| `TRUST_PROXY` | int ≥ 0 | `0` | Nº de saltos de proxy de confianza. `0` local; `1` detrás de ALB/CloudFront. Necesario para que `req.ip` y el rate limiting funcionen bien sin abrir la puerta a spoofing de `X-Forwarded-For` |

### Persistencia

| Variable | Tipo | Default | Descripción |
|---|---|---|---|
| `DATABASE_URL` | URL | — **requerida** | Conexión Postgres que usa la app. En docker-compose el host es `db`. En Supabase, la cadena **agrupada** (PgBouncer, puerto 6543) |
| `DIRECT_URL` | URL | — **requerida por Prisma** | Conexión **directa**, solo para migraciones. En Supabase, puerto 5432. En local puede ser la misma que `DATABASE_URL` |
| `REDIS_URL` | URL | — **requerida** | Conexión Redis. En docker-compose el host es `redis` |

Ejemplos:

```
DATABASE_URL=postgresql://pomass:pomass_pass@localhost:5432/pomass?schema=public
DIRECT_URL=postgresql://pomass:pomass_pass@localhost:5432/pomass?schema=public
REDIS_URL=redis://localhost:6379
```

> **`DIRECT_URL` es obligatoria aunque no uses Supabase.** El `schema.prisma`
> declara `directUrl`, así que Prisma exige la variable para `migrate` y
> `generate`. Si falta, verás `Environment variable not found: DIRECT_URL`.
> Existe porque el pooler en modo transacción no soporta bien los comandos DDL
> de las migraciones.

### Autenticación

| Variable | Tipo | Default | Descripción |
|---|---|---|---|
| `JWT_ACCESS_SECRET` | string ≥ 16 | — **requerida** | Secreto HS256 del access token |
| `JWT_ACCESS_TTL` | string | `15m` | Vigencia del access token |
| `JWT_REFRESH_TTL` | string | `7d` | Vigencia del refresh token. **No hay secreto de refresh**: el refresh token es opaco (bytes aleatorios hasheados en base de datos), no un JWT firmado |
| `BCRYPT_SALT_ROUNDS` | int 10–15 | `12` | Coste de bcrypt |
| `PASSWORD_RESET_TTL_MIN` | number | `30` | Minutos de vigencia del token de recuperación |

### Red

| Variable | Tipo | Default | Descripción |
|---|---|---|---|
| `CORS_ORIGIN` | string | `*` | Orígenes permitidos, separados por coma. Con `*` las credenciales CORS se **desactivan** (reflejar cualquier origen con credenciales es inseguro) |

### Negocio

| Variable | Tipo | Default | Descripción |
|---|---|---|---|
| `SHIPPING_FLAT_RATE` | number ≥ 0 | `12900` | Tarifa plana de envío en COP |
| `FREE_SHIPPING_THRESHOLD` | number ≥ 0 | `150000` | Envío gratis cuando el neto (subtotal − descuento) alcanza este monto. Un `0` desactiva el envío gratis |

### Pagos · Mercado Pago

Las credenciales salen del [panel de desarrolladores](https://www.mercadopago.com.co/developers/panel),
en *Tus integraciones* > tu aplicación. Empieza con las de prueba (`TEST-…`) y
cámbialas por las de producción (`APP_USR-…`) al lanzar.

| Variable | Tipo | Default | Descripción |
|---|---|---|---|
| `MERCADO_PAGO_ACCESS_TOKEN` | string | `TEST-0000…-000000-0` | **Credencial privada.** Firma todas las llamadas a la API. Con el valor por defecto el backend ni llama a Mercado Pago: devuelve el checkout marcado `configured: false` |
| `MERCADO_PAGO_PUBLIC_KEY` | string | `TEST-00000000-…` | Llave pública. Puede viajar al navegador; no es secreta |
| `MERCADO_PAGO_WEBHOOK_SECRET` | string ≥ 8 | `dev_mercadopago_webhook_change_me` | Verifica la firma de los webhooks. Con el valor por defecto se podrían **falsificar confirmaciones de pago** |
| `MERCADO_PAGO_NOTIFICATION_URL` | URL | — | URL **pública** de nuestro webhook. Vacía = se usa la del panel de Mercado Pago; si tampoco hay ninguna, **ningún pago se confirma nunca** |
| `MERCADO_PAGO_BACK_URL` | URL | `FRONTEND_URL/track.html` | A dónde vuelve la clienta tras pagar |
| `MERCADO_PAGO_STATEMENT_DESCRIPTOR` | string ≤ 16 | `POMASS` | Lo que verá en el extracto de su tarjeta |
| `MERCADO_PAGO_API_URL` | URL | `https://api.mercadopago.com` | **Solo para pruebas.** Apunta el backend a un doble local (ver [cómo probar los pagos](howto-probar-pagos.md)). En producción solo se admite la API real |

> Las tres URL opcionales toleran venir vacías (`VAR=`), que es como las trae
> `.env.example`: vacío significa «no configurada», no «URL inválida».

> `PAYMENTS_WEBHOOK_SECRET` y las variables `WOMPI_*` **ya no existen**. Si las
> tienes en tu `.env`, puedes borrarlas.

### Seed

| Variable | Tipo | Default | Descripción |
|---|---|---|---|
| `ADMIN_EMAIL` | email | `admin@pomass.co` | Admin inicial |
| `ADMIN_PASSWORD` | string ≥ 8 | `Admin123*` | Contraseña del admin inicial |

### Solo para docker-compose

No las lee la aplicación; las consume `docker-compose.yml` para construir el
servicio de Postgres.

| Variable | Default |
|---|---|
| `POSTGRES_USER` | `pomass` |
| `POSTGRES_PASSWORD` | `pomass_pass` |
| `POSTGRES_DB` | `pomass` |

### Endurecimiento en producción

Cuando `NODE_ENV=production`, el arranque **falla** si:

| Condición | Por qué |
|---|---|
| `MERCADO_PAGO_WEBHOOK_SECRET` sigue siendo el de ejemplo | Permitiría falsificar confirmaciones de pago |
| `MERCADO_PAGO_ACCESS_TOKEN` sigue siendo el de ejemplo | El checkout ni siquiera abriría |
| `MERCADO_PAGO_ACCESS_TOKEN` empieza por `TEST-` | Es una credencial de prueba: ningún pago real entraría |
| `MERCADO_PAGO_API_URL` apunta a algo que no es la API real | Le estaría entregando el access token a ese host |
| `ADMIN_PASSWORD` sigue siendo `Admin123*` | Es una credencial pública conocida |
| `CORS_ORIGIN` es `*` | Hay que especificar los orígenes permitidos |

Es a propósito: es imposible desplegar a producción con estos agujeros abiertos
sin darse cuenta. La comprobación de llaves de sandbox es la que evita el error
más caro de todos: lanzar la tienda cobrando contra el entorno de pruebas.

---

## Variables de entorno del frontend

Plantilla: [`frontend/.env.example`](../frontend/.env.example).

| Variable | Default | Descripción |
|---|---|---|
| `VITE_API_URL` | `http://localhost:3000/api` | URL base de la API que consume la **demo de checkout**. La landing no la usa |

Vite solo expone al navegador las variables con prefijo `VITE_`. Se leen en
tiempo de **build**, no de ejecución: cambiarla exige reconstruir.

---

## Scripts npm

### Raíz del repo

| Comando | Qué hace |
|---|---|
| `npm run install:all` | Instala dependencias de `backend/` y `frontend/` |
| `npm run dev` | Levanta ambos dev servers en paralelo con `concurrently`, con logs prefijados `[backend]` / `[frontend]` |

Es conveniencia de desarrollo: **no** conecta las dos aplicaciones entre sí.

### Backend (`cd backend`)

| Comando | Qué hace | Necesita DB |
|---|---|---|
| `npm run dev` | API con recarga en caliente (`tsx watch`) en `:3000` | sí |
| `npm run build` | Compila TypeScript a `dist/` | no |
| `npm start` | Ejecuta el build de `dist/main.js` | sí |
| `npm run lint` | ESLint sobre `src/**/*.ts` | no |
| `npm run typecheck` | `tsc --noEmit` | no |
| `npm test` | Todos los tests (unit + integración) | sí |
| `npm run test:unit` | Solo unitarios — rápido, sin DB ni Redis | **no** |
| `npm run test:integration` | Solo integración, con Supertest contra la app real | sí |
| `npm run test:watch` | Jest en modo watch | según |
| `npm run prisma:generate` | Regenera el cliente Prisma | no |
| `npm run prisma:migrate` | Crea + aplica migraciones (dev, interactivo) | sí |
| `npm run prisma:deploy` | Aplica migraciones (CI/prod, no interactivo) | sí |
| `npm run prisma:seed` | Siembra datos de ejemplo (idempotente) | sí |
| `npm run prisma:studio` | Explorador visual de la base | sí |

**Ejecutar un test suelto:**

```bash
npx jest tests/unit/orders/checkout.test.ts
```

```bash
npx jest -t "aplica cupón porcentual"
```

### Frontend (`cd frontend`)

| Comando | Qué hace |
|---|---|
| `npm run dev` | Vite dev server en `:5173`, abre el navegador |
| `npm run build` | Build de producción a `dist/` — genera **las dos páginas** |
| `npm run preview` | Sirve el build de producción |
| `npm test` | Tests con Vitest (no necesitan backend: `fetch` va simulado) |
| `npm run test:watch` | Vitest en modo watch |

---

## Cobertura de tests

| Suite | Cantidad | Requisitos |
|---|---|---|
| Backend `tests/unit/` | 229 tests en 22 suites | Ninguno — dobles en memoria |
| Backend `tests/integration/` | 16 tests en 3 archivos (`auth`, `catalog`, `checkout`) | Postgres migrado |
| Frontend `src/**/*.test.js` | 106 tests en 10 archivos | Ninguno — `fetch` y navegación simulados |

Los unitarios del backend cubren la lógica crítica: stock, checkout, precios,
cupones, pagos (firma e idempotencia de Mercado Pago), transiciones de estado del
pedido, seguimiento, tokens, reseñas y reportes. Los del frontend cubren la
renovación de token del cliente de API.

> **`npm run typecheck` no cubre los tests del backend**: `tsconfig` los excluye.
> Los errores de compilación de tests solo aparecen al correr jest.

---

## Docker

[`backend/docker-compose.yml`](../backend/docker-compose.yml) levanta el entorno
completo:

| Servicio | Imagen | Puerto | Healthcheck |
|---|---|---|---|
| `api` | build local (`backend/Dockerfile`) | `3000` | — |
| `db` | `postgres:16-alpine` | `5432` | `pg_isready` |
| `redis` | `redis:7-alpine` | `6379` | `redis-cli ping` |

```bash
cd backend
docker compose up --build
```

El servicio `api` espera a que `db` y `redis` estén sanos, y entonces ejecuta:

```
npx prisma migrate deploy && node dist/prisma/seed.js && node dist/main.js
```

Es decir: migra, siembra y arranca, en ese orden. Los datos de Postgres
persisten en el volumen `pgdata`.

Levantar **solo** base de datos y caché, para correr Node en la máquina:

```bash
docker compose up -d db redis
```

> **En esta máquina Windows, Docker Desktop no arranca**: WSL2 no tiene ninguna
> distribución Linux instalada. Sin Docker todavía funcionan los tests
> unitarios, `typecheck`, `lint` y los builds de frontend y backend. Lo que
> necesita Docker es la API viva y los tests de integración. Alternativas en
> [Cómo montar el entorno local](howto-entorno-local.md).

---

## Integración continua

[`.github/workflows/backend-ci.yml`](../.github/workflows/backend-ci.yml) corre
en cada push y PR que toque `backend/**`.

**Servicios**: `postgres:16-alpine` y `redis:7-alpine` con healthchecks.

**Entorno del job**:

```
DATABASE_URL=postgresql://pomass:pomass_pass@localhost:5432/pomass_test?schema=public
REDIS_URL=redis://localhost:6379
JWT_ACCESS_SECRET=ci_access_secret_change_me_0123456789
NODE_ENV=test
```

**Pasos**: `npm ci` → `prisma generate` → `prisma migrate deploy` → `lint` →
`test` (unit + integración) → `build`.

Si añades una variable de entorno obligatoria, tienes que añadirla también aquí
o CI romperá al arrancar la app.

> **El frontend no tiene pipeline de CI.** No se hace lint ni build automático
> de `frontend/**` en ningún push.

---

## Puertos usados

| Puerto | Servicio |
|---|---|
| `3000` | API backend |
| `5173` | Vite dev server (frontend) |
| `5432` | PostgreSQL |
| `6379` | Redis |

`npm run dev` desde la raíz ocupa 3000 y 5173 a la vez. Si ya tienes una
instancia corriendo, ciérrala antes.

---

## Relacionado

- [Cómo montar el entorno local](howto-entorno-local.md)
- [Cómo desplegar a producción](howto-desplegar.md)
- [Referencia: modelo de datos](referencia-modelo-datos.md)
- [Explicación: modelo de seguridad](explicacion-seguridad.md)
