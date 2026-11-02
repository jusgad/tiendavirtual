# Cómo desplegar en Railway + Vercel, con tu dominio

Instructivo paso a paso para esta combinación concreta: **backend + Postgres +
Redis en Railway, frontend estático en Vercel, el dominio propio apuntando a
los dos, y Wompi cobrando de verdad**. Es la versión detallada de
[howto-desplegar.md](howto-desplegar.md), que cubre varias plataformas a la
vez; este documento asume que ya elegiste Railway y Vercel y no se desvía de
ahí.

Cada paso dice **qué botón tocar**, no solo qué variable poner. Donde una
pantalla puede cambiar de un día para otro (valores de un registro DNS, por
ejemplo), el documento te dice qué copiar de dónde en vez de un valor fijo
que podría quedar desactualizado.

## 0. Antes de empezar

Reúne esto en una pestaña aparte:

- [ ] El repositorio en GitHub, con acceso para conectarlo a Railway y Vercel.
- [ ] Una cuenta en [railway.app](https://railway.app) (puedes entrar con GitHub).
- [ ] Una cuenta en [vercel.com](https://vercel.com) (igual, con GitHub).
- [ ] Acceso al panel de DNS de tu dominio (donde lo compraste: GoDaddy,
      Namecheap, Donweb, Cloudflare…). No hace falta moverlo de ahí.
- [ ] Las cuatro llaves de **producción** de Wompi (`WOMPI_PUBLIC_KEY`,
      `WOMPI_PRIVATE_KEY`, `WOMPI_INTEGRITY_SECRET`, `WOMPI_EVENTS_SECRET`),
      del panel de comercios de Wompi.
- [ ] Opcional pero recomendado: una cuenta en [resend.com](https://resend.com)
      con el dominio verificado, para que los correos de pedido salgan de
      verdad y no se queden solo en el log.

Este documento ya usa tu dominio real, **`pomassoficial.com`**. El único
marcador que queda es `TU-BACKEND.up.railway.app`: ese lo genera Railway
solo cuando creas el servicio (paso 1.6), así que no se puede saber de
antemano.

---

## 1. El backend en Railway

### 1.1 Crea el proyecto

1. Entra a [railway.app](https://railway.app/new) y elige **Deploy from GitHub repo**.
2. Autoriza a Railway a leer tu cuenta de GitHub si te lo pide, y selecciona
   el repositorio de PomAss.
3. Railway crea un primer servicio apuntando a la raíz del repo. Lo vas a
   configurar para que mire solo la carpeta `backend/`: entra al servicio →
   pestaña **Settings** → sección **Source** → **Root Directory** → escribe
   `backend`.
4. En la misma pestaña, baja hasta **Build** y confirma que el **Builder**
   quedó en `Dockerfile` (lo detecta solo por `backend/railway.json`, que ya
   está en el repo). Si por algo quedó en Nixpacks, cámbialo a Dockerfile a
   mano.

> **Qué hace `railway.json` por ti**: construye la imagen con el
> `backend/Dockerfile` (multietapa, corre como usuario no-root), aplica las
> migraciones de base de datos en cada arranque (`prisma migrate deploy`) y
> le dice a Railway que el healthcheck es `GET /health`. No tienes que tocar
> nada de eso.

### 1.2 Añade Postgres

1. Dentro del mismo proyecto, botón **+ New** → **Database** → **Add PostgreSQL**.
2. Railway crea el servicio y le genera credenciales solo. No necesitas
   copiarlas a mano: en el paso de variables (1.4) las referencias con la
   sintaxis `${{Postgres.DATABASE_URL}}`.

### 1.3 Añade Redis

1. Otra vez **+ New** → **Database** → **Add Redis**.
2. Igual que Postgres: se referencia luego como `${{Redis.REDIS_URL}}`.

### 1.4 Variables de entorno del servicio backend

Entra al servicio del backend (no al de Postgres ni al de Redis) → pestaña
**Variables** → **Raw Editor**, y pega esto, cambiando lo que está entre
`< >`:

```bash
NODE_ENV=production
PORT=3000
API_PREFIX=/api
TRUST_PROXY=1

# Railway los resuelve solo a partir de los servicios de Postgres y Redis
# que añadiste arriba: no copies credenciales a mano.
DATABASE_URL=${{Postgres.DATABASE_URL}}
DIRECT_URL=${{Postgres.DATABASE_URL}}
REDIS_URL=${{Redis.REDIS_URL}}

JWT_ACCESS_SECRET=<genera uno, ver abajo>
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=7d

BCRYPT_SALT_ROUNDS=12
PASSWORD_RESET_TTL_MIN=30

# El dominio real del FRONTEND (Vercel), no el del backend. Se ajusta en el
# paso 4 si todavía no sabes el dominio final.
CORS_ORIGIN=https://pomassoficial.com,https://www.pomassoficial.com

SHIPPING_FLAT_RATE=12900
FREE_SHIPPING_THRESHOLD=150000

WOMPI_PUBLIC_KEY=<la pub_prod_... de tu cuenta de Wompi>
WOMPI_PRIVATE_KEY=<la prv_prod_... de tu cuenta de Wompi>
WOMPI_INTEGRITY_SECRET=<la de tu cuenta de Wompi>
WOMPI_EVENTS_SECRET=<la de tu cuenta de Wompi>
WOMPI_REDIRECT_URL=https://pomassoficial.com/track.html
PAYMENTS_SANDBOX=false

ADMIN_EMAIL=admin@pomassoficial.com
ADMIN_PASSWORD=<genera uno, ver abajo>

# Opcional: si no lo pones, los correos quedan en el log y la tienda
# funciona igual, pero nadie recibe el «confirmamos tu pedido».
RESEND_API_KEY=<de resend.com → API Keys>
EMAIL_FROM=PomAss <pedidos@pomassoficial.com>
FRONTEND_URL=https://pomassoficial.com
```

**Genera `JWT_ACCESS_SECRET` y `ADMIN_PASSWORD`** con este comando, una vez
por cada uno, en tu terminal:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

No reutilices el mismo valor para los dos, y no uses ninguno de los que
aparecen en `backend/.env.example`: el arranque en producción **se niega a
levantar** si detecta un valor de ejemplo, a propósito (ver
`backend/src/shared/config/env.ts`).

Pulsa **Deploy** (o espera: Railway redespliega solo al guardar variables).

### 1.5 Verifica que levantó

Pestaña **Deployments** → el último despliegue → **View Logs**. Busca una
línea de arranque exitoso y ninguna de `❌ Variables de entorno inválidas`.
Si algo falla, el log te dice exactamente qué variable (nunca el valor, por
seguridad).

### 1.6 Consigue la URL pública del backend

Pestaña **Settings** → **Networking** → **Generate Domain**. Railway te da
algo como `pomass-backend-production.up.railway.app`. **Guarda esa URL**: la
necesitas en el paso 2 (Vercel) y en el paso 5 (Wompi).

Pruébala:

```bash
curl https://TU-BACKEND.up.railway.app/health
```

Debe responder `{"status":"ok","timestamp":"…"}`.

> **¿Dominio propio para el backend, tipo `api.pomassoficial.com`?** Es opcional:
> el dominio de Railway funciona perfecto para el checkout y para el webhook
> de Wompi, y es un paso de DNS menos. Si igual lo quieres, en la misma
> pantalla **Networking** → **Custom Domain**, escribe `api.pomassoficial.com` y
> Railway te muestra el registro CNAME exacto que debes crear en tu panel de
> DNS (cópialo tal cual lo muestra la pantalla, no de aquí).

### 1.7 Siembra los datos la primera vez

El arranque normal **no** siembra (`railway.json` solo migra). Para crear el
admin, las marcas, categorías, productos y el cupón de bienvenida, se corre
una sola vez con el CLI de Railway, que usa las mismas variables de entorno
que ya configuraste:

```bash
npm install -g @railway/cli
railway login
railway link        # elige este proyecto y el servicio del backend
railway run npm run prisma:seed
```

Es idempotente: si lo corres dos veces no duplica nada, así que no hay drama
si te equivocas de orden con el paso 1.4.

### 1.8 Entra al panel de administración y cambia la contraseña

El `ADMIN_PASSWORD` que pusiste en las variables es la contraseña inicial.
Entra a `https://pomassoficial.com/admin.html` (una vez el frontend esté
desplegado, paso 2) con `ADMIN_EMAIL` y esa contraseña, y considera rotarla
desde el panel si la compartiste con alguien al configurar esto.

---

## 2. El frontend en Vercel

### 2.1 Importa el proyecto

1. [vercel.com/new](https://vercel.com/new) → **Import Git Repository** → el
   mismo repositorio.
2. En **Configure Project**, abre **Root Directory** y selecciona `frontend`.
3. Vercel detecta Vite solo. El `frontend/vercel.json` que ya está en el repo
   fija el comando de build (`npm run build`), la carpeta de salida (`dist`)
   y el de instalación (`npm install`) — no hace falta tocar nada en esta
   pantalla salvo el Root Directory.

### 2.2 Variable de entorno

Antes de desplegar, abre **Environment Variables** y añade una sola:

```
VITE_API_URL = https://TU-BACKEND.up.railway.app/api
```

(o `https://api.pomassoficial.com/api` si configuraste el dominio propio del
paso 1.6).

**No definas `VITE_WOMPI_WIDGET_URL`.** Esa variable solo existe para que el
stack de pruebas en Docker cargue el widget simulado
(`backend/scripts/wompi-widget-falso.mjs`); en Vercel, dejarla sin definir es
lo que hace que el checkout cargue el **widget real de Wompi**. Si por error
quedó definida de una prueba anterior, bórrala.

### 2.3 Despliega

Botón **Deploy**. Cuando termine, Vercel te da una URL de prueba tipo
`pomass-xyz.vercel.app`. Ábrela y confirma que la portada carga y que el
precio del combo aparece (si sale el de respaldo fijo en vez del real, revisa
`VITE_API_URL`: seguramente apunta mal o el backend no responde).

---

## 3. Conectar tu dominio

### 3.1 Añádelo en Vercel

Proyecto → **Settings** → **Domains** → escribe `pomassoficial.com` → **Add**.
Repite con `www.pomassoficial.com` si quieres que ambos funcionen (Vercel suele
ofrecer redirigir uno al otro automáticamente; acepta esa opción).

### 3.2 Configura el DNS

Vercel te muestra, para cada dominio que agregaste, **el registro exacto**
que debes crear: normalmente un registro `A` para el dominio raíz
(`pomassoficial.com`) y un `CNAME` para `www`. **Copia esos valores de la propia
pantalla de Vercel en el momento**, no de ningún valor fijo: pueden cambiar.

En el panel de DNS de donde compraste el dominio:

1. Busca la sección de registros DNS (a veces se llama "Administrar DNS",
   "Zonas DNS" o similar).
2. Crea el registro `A` que Vercel te mostró, con el nombre `@` (o vacío,
   según el panel) apuntando al valor que Vercel dio.
3. Crea el registro `CNAME` para `www` apuntando al valor que Vercel dio.
4. Guarda. La propagación puede tardar de minutos a un par de horas.

Vercel marca el dominio como **Valid** en su panel en cuanto detecta los
registros, y emite el certificado TLS solo — no hay nada que instalar a mano.

### 3.3 Verifica

```bash
curl -I https://pomassoficial.com
```

Debe responder `200` (o `308`/`301` si redirige `www` ↔ raíz) con un
certificado válido. Ábrelo también en el navegador y confirma el candado.

---

## 4. Ajusta las variables que dependen del dominio real

Si en el paso 1.4 ya pusiste el dominio final, salta este paso. Si usaste un
marcador o todavía no lo tenías, actualiza ahora en Railway (servicio del
backend → **Variables**):

```
CORS_ORIGIN=https://pomassoficial.com,https://www.pomassoficial.com
WOMPI_REDIRECT_URL=https://pomassoficial.com/track.html
FRONTEND_URL=https://pomassoficial.com
```

Guardar las variables dispara un redespliegue solo. Confirma en los logs que
arrancó bien (paso 1.5).

Prueba el CORS desde un origen no permitido, para confirmar que de verdad
quedó restringido y no en `*`:

```bash
curl -s -I -H 'Origin: https://sitio-no-permitido.com' \
  https://TU-BACKEND.up.railway.app/api/products
```

La respuesta no debe traer el encabezado `Access-Control-Allow-Origin` con
ese origen.

---

## 5. Registra el webhook en Wompi — el paso que falta hoy

Sin esto, un pago se cobra de verdad pero el pedido se queda en `PENDING`
para siempre: el backend nunca se entera de que Wompi lo aprobó.

1. Entra al [panel de comercios de Wompi](https://comercios.wompi.co) con tu
   cuenta.
2. Busca la configuración del comercio → **Eventos** (o **Webhooks**, según
   la versión del panel).
3. En el campo de la URL, pega exactamente:

   ```
   https://TU-BACKEND.up.railway.app/api/payments/webhook/wompi
   ```

   (o `https://api.pomassoficial.com/api/payments/webhook/wompi` si usas el
   dominio propio del backend). La ruta termina en `/wompi`, no en
   `/webhook` a secas.

4. Guarda. Wompi suele dejar mandar un evento de prueba desde el propio
   panel: si lo ofrece, úsalo y confirma en los logs de Railway que el
   backend respondió `200`.

El secreto con el que Wompi firma esos eventos es el mismo
`WOMPI_EVENTS_SECRET` que ya pusiste en el paso 1.4 — si no coincide con el
que ves en el panel de Wompi, el backend rechaza el webhook por checksum
inválido (lo verás en los logs como una verificación fallida, nunca como un
error ruidoso: es a propósito, para que nadie falsifique una confirmación de
pago).

---

## 6. Prueba de punta a punta

En este orden, con el sitio real:

1. **Salud**: `curl https://TU-BACKEND.up.railway.app/health` → `200`.
2. **Catálogo**: abre `https://pomassoficial.com` y confirma que el precio y los
   productos cargan (vienen de la API, no del valor de respaldo).
3. **Checkout de invitado**: agrega el combo, pasa por envío, llega a pago.
4. **El widget que se abre es el real de Wompi** (no el de los tres botones
   verde/rojo/gris del stack de pruebas). Si ves el simulado, `VITE_WOMPI_WIDGET_URL`
   quedó definida en Vercel por error; bórrala y vuelve a desplegar.
5. **Un pago real, por un monto bajo**: complétalo con una tarjeta o cuenta
   tuya. El checkout debe pasar solo de «Verificando tu pago…» a la
   confirmación, sin que recargues nada a mano — eso prueba que el webhook
   llegó y el paso 5 quedó bien hecho.
6. **Correo**: si configuraste Resend, debe llegar el de «recibimos tu
   pedido» y, poco después, el de «pago confirmado».
7. **Seguimiento**: `https://pomassoficial.com/track.html` con el número de
   pedido y el correo usado, y debe mostrar el pedido en `PAID`.
8. **Panel de administración**: `https://pomassoficial.com/admin.html`, entra y
   confirma que el pedido aparece ahí también.

Si el paso 5 se queda colgado en «Verificando tu pago…» y nunca confirma, el
problema casi siempre es el webhook (paso 5 de esta guía) o que
`WOMPI_EVENTS_SECRET` no coincide con el del panel de Wompi.

---

## 7. Checklist final

```
[ ] NODE_ENV=production en Railway
[ ] JWT_ACCESS_SECRET y ADMIN_PASSWORD generados, no los de ejemplo
[ ] WOMPI_PUBLIC_KEY / WOMPI_PRIVATE_KEY son pub_prod_ / prv_prod_ (no _test_)
[ ] WOMPI_INTEGRITY_SECRET y WOMPI_EVENTS_SECRET son los de tu cuenta de Wompi
[ ] PAYMENTS_SANDBOX=false
[ ] CORS_ORIGIN con tu dominio real, nunca *
[ ] WOMPI_REDIRECT_URL y FRONTEND_URL con tu dominio real, no localhost
[ ] VITE_API_URL en Vercel apunta al backend de Railway
[ ] VITE_WOMPI_WIDGET_URL NO está definida en Vercel
[ ] Dominio verde («Valid») en Vercel, con TLS
[ ] URL de Eventos registrada en el panel de Wompi, terminando en /wompi
[ ] npm run prisma:seed corrido una vez (railway run)
[ ] Compra real de prueba hecha y confirmada sin tocar nada a mano
[ ] Contraseña del admin cambiada tras la primera entrada
```

---

## Si algo sale mal

- **Railway**: pestaña **Deployments** → cada despliegue anterior tiene
  **Redeploy**, para volver a una versión que sí funcionaba mientras
  investigas. Los logs (**View Logs**) son la primera parada siempre.
- **Vercel**: pestaña **Deployments** → cualquier despliegue previo tiene
  **Promote to Production**, con el mismo efecto.
- **El checkout no encuentra el backend** (pantalla con error de conexión):
  revisa `VITE_API_URL` en Vercel y que el backend en Railway responda
  `/health`.
- **CORS bloqueado en la consola del navegador**: `CORS_ORIGIN` en Railway no
  trae exactamente el dominio desde el que estás probando (con o sin `www`
  importa: añade los dos, separados por coma).
- **El pago se cobra pero el pedido no confirma**: ver el final del paso 6.

## Relacionado

- [Cómo desplegar a producción](howto-desplegar.md) — la versión
  platform-agnóstica, con más detalle de qué hace cumplir `env.ts`.
- [Cómo probar pagos](howto-probar-pagos.md) — el flujo con el widget
  simulado, para desarrollo.
- [Pendientes para lanzar](pendientes-lanzamiento.md) — lista de control más
  amplia, con lo que falta fuera del despliegue en sí.
