# Cómo montar el entorno local

Al terminar tendrás el backend respondiendo en `http://localhost:3000` y el
frontend en `http://localhost:5173`, con datos de ejemplo cargados.

Hay tres caminos según lo que tengas disponible. Elige el primero que puedas.

| Camino | Necesita Docker | Levanta |
|---|---|---|
| [A — Todo con Docker](#camino-a--todo-con-docker) | sí | Postgres + Redis + API |
| [B — Node local, servicios en Docker](#camino-b--node-local-servicios-en-docker) | sí (solo servicios) | Postgres + Redis en contenedor, API con recarga en caliente |
| [C — Sin Docker](#camino-c--sin-docker) | no | Instalas Postgres y Redis a mano |

> **En esta máquina Windows, Docker Desktop no arranca**: WSL2 no tiene ninguna
> distribución Linux instalada. Si estás en ella, ve al [camino C](#camino-c--sin-docker),
> o mira [qué funciona sin nada de esto](#qué-funciona-sin-base-de-datos).

## Requisitos previos

- **Node.js 20** o superior (CI usa la 20). Comprueba con `node --version`.
- **npm** (viene con Node).
- Para los caminos A y B: **Docker Desktop** funcionando (`docker ps` responde).
- Para el camino C: **PostgreSQL 16** y **Redis 7** instalados en la máquina.

---

## Camino A — todo con Docker

El más rápido si Docker funciona.

### 1. Prepara el entorno

```bash
cd backend
cp .env.example .env
```

Los valores por defecto ya sirven para desarrollo. `docker-compose.yml`
sobreescribe `DATABASE_URL` y `REDIS_URL` para apuntar a los nombres de servicio
de la red de compose (`db` y `redis`).

### 2. Levanta todo

```bash
docker compose up --build
```

Verás cómo Postgres y Redis pasan el healthcheck y entonces el servicio `api`
ejecuta, en orden: `prisma migrate deploy` → seed → arranque.

### 3. Comprueba que responde

```bash
curl http://localhost:3000/health
```

```json
{"status":"ok","timestamp":"2026-08-08T14:22:03.114Z"}
```

Ve a **<http://localhost:3000/api/docs>** para la documentación interactiva.

### 4. Levanta el frontend

En otra terminal:

```bash
cd frontend
npm install
npm run dev
```

- Landing: <http://localhost:5173/>
- Checkout demo: <http://localhost:5173/checkout.html>

Salta a [verificación](#verificación).

---

## Camino B — Node local, servicios en Docker

Recomendado para desarrollar el backend: tienes recarga en caliente y la
depuración es directa.

### 1. Prepara el entorno

```bash
cd backend
cp .env.example .env
```

Los valores de la plantilla ya apuntan a `localhost`, que es lo correcto aquí.

### 2. Levanta solo base de datos y caché

```bash
docker compose up -d db redis
```

### 3. Instala, migra y siembra

```bash
npm install
npm run prisma:migrate
npm run prisma:seed
```

`prisma:migrate` es interactivo la primera vez; pedirá un nombre para la
migración si detecta cambios. Como el esquema ya está migrado, solo las aplica.

### 4. Arranca la API

```bash
npm run dev
```

`tsx watch` recarga a cada cambio en `src/`.

### 5. Levanta el frontend

```bash
cd ../frontend
npm install
npm run dev
```

**Atajo**: desde la raíz del repo, `npm run dev` levanta backend y frontend a la
vez con logs prefijados `[backend]` / `[frontend]`. Sigue necesitando que
Postgres y Redis estén arriba.

Salta a [verificación](#verificación).

---

## Camino C — sin Docker

Cuando Docker no está disponible. Instalas los servicios directamente.

### 1. Instala PostgreSQL 16

**Windows** — descarga el instalador de <https://www.postgresql.org/download/windows/>
o usa winget:

```powershell
winget install PostgreSQL.PostgreSQL.16
```

**macOS**:

```bash
brew install postgresql@16 && brew services start postgresql@16
```

**Linux (Debian/Ubuntu)**:

```bash
sudo apt install postgresql-16 && sudo systemctl start postgresql
```

### 2. Crea la base y el usuario

```bash
psql -U postgres -c "CREATE USER pomass WITH PASSWORD 'pomass_pass';"
```

```bash
psql -U postgres -c "CREATE DATABASE pomass OWNER pomass;"
```

### 3. Instala Redis 7

**Windows** — Redis no tiene build oficial. Dos opciones:

- **Memurai** (<https://www.memurai.com/>), compatible con Redis y pensado para Windows.
- **Redis Cloud** (<https://redis.io/try-free/>), plan gratuito. Copia la URL de conexión con credenciales a `REDIS_URL`.

**macOS**:

```bash
brew install redis && brew services start redis
```

**Linux**:

```bash
sudo apt install redis-server && sudo systemctl start redis-server
```

### 4. Configura el entorno

```bash
cd backend
cp .env.example .env
```

Edita `.env` y ajusta las dos URLs a tu instalación:

```
DATABASE_URL=postgresql://pomass:pomass_pass@localhost:5432/pomass?schema=public
REDIS_URL=redis://localhost:6379
```

Si usas Redis Cloud, `REDIS_URL` será algo como
`redis://default:<password>@<host>:<puerto>`.

### 5. Instala, migra, siembra y arranca

```bash
npm install
npm run prisma:migrate
npm run prisma:seed
npm run dev
```

### 6. Levanta el frontend

```bash
cd ../frontend
npm install
npm run dev
```

---

## Verificación

Cuatro comprobaciones, de más simple a más completa.

**1. La API está viva**

```bash
curl http://localhost:3000/health
```

**2. La base está migrada y sembrada** — debe devolver 7 productos:

```bash
curl -s "http://localhost:3000/api/products"
```

Si `total` es `0`, falta el seed: `npm run prisma:seed`.

**3. Redis funciona** — pide un carrito de invitado:

```bash
curl -s http://localhost:3000/api/cart
```

Debe devolver un carrito vacío **y un `guestId`**. Si falla, Redis no está
accesible.

**4. El frontend habla con la API** — abre
<http://localhost:5173/checkout.html>, pulsa *Continuar como invitado* y
comprueba que el paso "Tienda" muestra los 7 productos. Si ves un banner rojo con
*"No se pudo conectar con la API"*, el backend no está corriendo o `VITE_API_URL`
apunta a otro sitio.

---

## Qué funciona sin base de datos

Si no puedes levantar Postgres ni Redis, todavía tienes bastante margen:

```bash
cd backend
npm run test:unit    # 96 tests, ~12 s, sin DB ni Redis
npm run typecheck
npm run lint
npm run build
```

```bash
cd frontend
npm run build
```

Lo único que **sí** exige base de datos es la API viva y
`npm run test:integration`.

---

## Resolución de problemas

### `Configuración de entorno inválida. Revisa tu archivo .env`

La validación Zod de `env.ts` rechazó algo. El mensaje anterior en consola lista
los campos exactos. Las causas más comunes:

- Falta `.env` — copia `.env.example`.
- `JWT_ACCESS_SECRET` tiene menos de 16 caracteres.
- `DATABASE_URL` o `REDIS_URL` no son URLs válidas.

Referencia completa: [configuración](referencia-configuracion.md#variables-de-entorno-del-backend).

### `Can't reach database server at localhost:5432`

Postgres no está corriendo o escucha en otro puerto.

- Camino A/B: `docker compose ps` — el servicio `db` debe estar `healthy`.
- Camino C: comprueba el servicio del sistema (`services.msc` en Windows, `brew services list`, `systemctl status postgresql`).

### La API arranca pero el carrito falla

Redis no está accesible. El **catálogo seguirá funcionando** (su caché degrada a
"sin caché" a propósito), pero el carrito de invitado no: `RedisCartStore` no
tiene tolerancia a fallos, deliberadamente, porque un carrito que pierde
productos en silencio es peor que un error visible.

### `Error: P3009` o migraciones fallidas

Hay una migración a medio aplicar. En desarrollo, lo más limpio es empezar de
cero:

```bash
cd backend && npx prisma migrate reset
```

**Borra todos los datos** y vuelve a migrar y sembrar. No lo ejecutes contra una
base con datos que te importen.

### Puerto 3000 o 5173 ocupado

Ya tienes una instancia corriendo. Ciérrala, o cambia `PORT` en `backend/.env`
(y entonces `VITE_API_URL` en `frontend/.env` para que coincida).

### El frontend no ve la API pese a que responde

Es CORS. `CORS_ORIGIN` en `backend/.env` debe incluir `http://localhost:5173`.
La plantilla ya lo trae.

### `npm run dev` desde la raíz solo arranca uno

`concurrently` no aborta si uno de los dos falla. Mira los logs con prefijo
`[backend]`: casi siempre es la validación de entorno o la conexión a base de
datos.

---

## Credenciales de ejemplo

Tras el seed:

| Dato | Valor |
|---|---|
| Admin | `admin@pomass.co` / `Admin123*` |
| Cupón | `BIENVENIDA10` — 10 %, compra mínima $50.000, un uso por usuario |
| Productos | 7, entre $24.900 y $45.900 COP |

Configurables con `ADMIN_EMAIL` y `ADMIN_PASSWORD`. El seed es idempotente:
volver a correrlo no duplica nada.

---

## Relacionado

- [Tutorial: tu primer pedido de punta a punta](tutorial-primer-pedido.md)
- [Referencia: configuración y comandos](referencia-configuracion.md)
- [Cómo probar el flujo de pagos](howto-probar-pagos.md)
- [Cómo desplegar a producción](howto-desplegar.md)
