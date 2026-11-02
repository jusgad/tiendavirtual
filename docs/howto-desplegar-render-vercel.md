# Cómo desplegar en Render + Vercel, con tu dominio

Instructivo paso a paso para esta combinación concreta: **base de datos en
Supabase, backend + Redis en Render, frontend estático en Vercel, el dominio
propio (`pomassoficial.com`) apuntando a los dos, y Wompi cobrando de
verdad**. Es la versión detallada de [howto-desplegar.md](howto-desplegar.md),
que cubre varias plataformas a la vez; este documento asume que ya elegiste
Render, Vercel y Supabase, y no se desvía de ahí.

> Este documento reemplaza a una versión anterior que usaba Railway. Si
> llegaste aquí por eso: Render cubre lo mismo (backend en Docker, Redis
> gestionado, dominio propio) con una cuenta nueva y sin depender de la
> aprobación de Railway.

Cada paso dice **qué botón tocar**, no solo qué variable poner. Donde una
pantalla puede cambiar de un día para otro (valores de un registro DNS, por
ejemplo), el documento te dice qué copiar de dónde en vez de un valor fijo
que podría quedar desactualizado.

Este documento ya usa tu dominio real, **`pomassoficial.com`**, en cada
ejemplo. Los únicos dos marcadores que quedan son `TU-REF` (la referencia de
tu proyecto de Supabase) y `TU-BACKEND.onrender.com` (el subdominio que
genera Render solo al crear el servicio): ninguno de los dos se puede saber
de antemano.

## 0. Antes de empezar

Reúne esto en una pestaña aparte:

- [ ] El repositorio en GitHub, con acceso para conectarlo a Render y Vercel.
- [ ] Una cuenta en [supabase.com](https://supabase.com) (puedes entrar con GitHub).
- [ ] Una cuenta en [render.com](https://render.com) (igual, con GitHub).
- [ ] Una cuenta en [vercel.com](https://vercel.com) (igual, con GitHub).
- [ ] Acceso al panel de DNS de tu dominio (donde lo compraste: GoDaddy,
      Namecheap, Donweb, Cloudflare…). No hace falta moverlo de ahí.
- [ ] Las cuatro llaves de **producción** de Wompi (`WOMPI_PUBLIC_KEY`,
      `WOMPI_PRIVATE_KEY`, `WOMPI_INTEGRITY_SECRET`, `WOMPI_EVENTS_SECRET`),
      del panel de comercios de Wompi.
- [ ] El repositorio clonado en tu computador, con `backend/` listo para
      correr (`npm install` ya hecho ahí). Vas a ejecutar un par de comandos
      locales antes de desplegar nada.
- [ ] Opcional pero recomendado: una cuenta en [resend.com](https://resend.com)
      con el dominio verificado, para que los correos de pedido salgan de
      verdad y no se queden solo en el log.
- [ ] Opcional: si quieres que el panel de administración pueda **subir**
      fotos de producto (y no solo pegar un enlace), vas a crear también un
      bucket de almacenamiento — está en el paso 1.6, es cosa de dos minutos
      más dentro del mismo proyecto de Supabase.

---

## 1. La base de datos en Supabase

Por qué Supabase: ya es el plan que sigue este proyecto (ver
`docs/pendientes-lanzamiento.md`), trae un panel propio para mirar las tablas
sin `psql`, y el mismo proyecto te da también el almacenamiento de archivos
para las fotos de producto (paso 1.6), sin abrir una cuenta más. Esta parte
no cambia nada por usar Render en vez de Railway: es la base de datos,
independiente de dónde corra la app.

> **Sobre la contraseña de la base de datos**: las cadenas de conexión la
> llevan dentro. Van a `backend/.env`, que no se sube al repositorio y que
> **solo tú** editas en tu computador — nunca me la pegues a mí, ni en un
> chat, ni en una captura. Si alguna vez se te escapa, cámbiala en
> **Settings → Database → Reset database password** y repite el paso 1.2.

### 1.1 Crea el proyecto (si no lo tienes ya)

1. Entra a [supabase.com/dashboard](https://supabase.com/dashboard/projects)
   → **New project**.
2. Elige una organización (o crea una), nombre del proyecto (`pomass` sirve),
   una contraseña de base de datos **fuerte y sin caracteres raros** (nada de
   `@`, `#`, `/`, `?`: esos rompen la cadena de conexión más adelante — si no
   estás seguro, usa el generador que ofrece la propia pantalla), y una
   región cercana a tus clientas (para Colombia, normalmente `us-east-1`, la
   más próxima entre las que ofrece Supabase).
3. **Create new project**. Tarda uno o dos minutos en aprovisionarse.

Si el proyecto ya existe de antes, sáltate este paso y sigue con el 1.2.

### 1.2 Copia las dos cadenas de conexión

En el panel del proyecto, botón **Connect** (arriba, junto al nombre del
proyecto). Se abre una ventana con varias pestañas; busca **ORMs** o
**Connection string**.

Necesitas dos cadenas **distintas**:

| Para | Cuál | Puerto |
|---|---|---|
| `DATABASE_URL` — la que usa la tienda a diario | **Transaction pooler** | 6543 |
| `DIRECT_URL` — solo para crear y cambiar tablas | **Session pooler** | 5432 |

Las dos tienen el mismo aspecto salvo el puerto:

```
postgresql://postgres.TU-REF:CONTRASEÑA@aws-0-us-east-1.pooler.supabase.com:6543/postgres
```

**No uses la conexión directa** (la que empieza por `db.` y termina en
`.supabase.co`, sin `pooler` en el nombre). Esa solo existe por IPv6 y desde
muchas redes —Render entre ellas, igual que pasaba en esta máquina—
sencillamente no resuelve: el error que da no menciona IPv6 por ningún lado,
así que se pierde mucho rato buscando por el lado equivocado.

### 1.3 Pégalas en `backend/.env` y prepara la base

Abre `backend/.env` en tu computador (no en Render todavía) y reemplaza las
dos líneas que apuntan a `localhost`:

```bash
# La tienda, a través del pooler en modo transacción.
# El ?pgbouncer=true NO es opcional: sin él Prisma intenta usar sentencias
# preparadas, que en ese modo no funcionan, y falla a mitad de una compra.
DATABASE_URL=postgresql://postgres.TU-REF:CONTRASEÑA@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true

# Las migraciones, a través del pooler en modo sesión.
DIRECT_URL=postgresql://postgres.TU-REF:CONTRASEÑA@aws-0-us-east-1.pooler.supabase.com:5432/postgres
```

Supabase entrega la cadena con `[YOUR-PASSWORD]` dentro: reemplázalo por la
contraseña real, **sin los corchetes**.

Con eso puesto, desde `backend/`:

```bash
npm run supabase:setup
```

Revisa las cadenas antes de conectarse (que no apunten a `localhost`, que no
sea la conexión directa, que el puerto y el `pgbouncer=true` estén bien),
aplica las migraciones de Prisma, siembra los datos iniciales (admin, marca,
categoría, un producto, el cupón `BIENVENIDA10`) y comprueba contra la base
que quedó lo que tenía que quedar. Nunca imprime la contraseña. Es seguro
volver a ejecutarlo: las migraciones ya aplicadas se saltan y la siembra usa
`upsert`.

Deberías ver algo así al terminar:

```
✓ 16 tablas creadas en el esquema public
✓ 1 usuario(s) de administración
✓ 1 producto(s) en el catálogo
✓ 1 cupón(es)
```

**Esto siembra la base de PRODUCCIÓN**, la misma que va a usar la tienda
real. Es el único paso de siembra que hace falta: Render, cuando arranque el
backend más adelante, solo va a migrar (`prisma migrate deploy`), y como ya
está todo aplicado, no hace nada — no hace falta repetir la siembra ahí.

### 1.4 Cierra la Data API ⚠️ — no es opcional

Supabase publica automáticamente una API REST sobre las tablas del esquema
`public`. Nuestras tablas guardan contraseñas cifradas, pedidos, direcciones
y teléfonos de las clientas; dejarlas publicadas por HTTP además del backend
es exponerlas sin necesidad ninguna, porque quien habla con la base es el
backend, con su propia autenticación y sus propias reglas.

1. Abre **Data API integration overview**:
   `https://supabase.com/dashboard/project/TU-REF/integrations/data_api/overview`
2. Apaga **Enable Data API**.

Con eso ninguno de los endpoints REST responde, sin importar los permisos ni
las políticas que haya debajo.

**Segunda cerradura (opcional pero recomendada)**, por si algún día alguien
vuelve a activarla sin acordarse de esto: panel → **SQL Editor** → New query
→ pega el contenido de `backend/scripts/supabase-rls.sql` → **Run**. Activa
Row Level Security en todas las tablas sin crear ninguna política — sin
políticas, RLS niega todo a los roles públicos. La tienda no se ve afectada:
se conecta como dueña de las tablas, y a la dueña `ENABLE ROW LEVEL SECURITY`
no le aplica.

### 1.5 Cambia la contraseña del administrador

La siembra del paso 1.3 creó el panel con la contraseña de ejemplo
(`Admin123*`). Antes de seguir, en `backend/.env` pon un `ADMIN_PASSWORD`
propio (genera uno con el comando del paso 2.5 de más abajo) y vuelve a
correr `npm run supabase:setup`: al ser idempotente, actualiza el admin con
la contraseña nueva sin tocar el resto.

En producción el backend **se niega a arrancar** si `ADMIN_PASSWORD` sigue
siendo el de ejemplo, así que este paso no se puede saltar por descuido —
pero mejor dejarlo cerrado ahora que acordarte cuando el arranque falle.

### 1.6 El bucket de Storage, para subir fotos de producto (opcional)

Sin esto, el panel de administración sigue aceptando imágenes **por URL**
como siempre — este paso es solo para que el botón **«Cargar foto»** (subir
el archivo directo desde el computador) funcione.

1. En el panel de Supabase, **Storage** (en el menú de la izquierda) →
   **New bucket**.
2. Nómbralo `product-images`.
3. Márcalo **Public bucket**. Sin esto, la URL que el panel guarda en el
   producto no abriría para quien visita la tienda: Supabase la serviría
   solo a quien esté autenticado contra ese proyecto, que no es el caso de
   una visitante cualquiera.
4. **Save**.
5. Aparte, en **Settings → API → Project API keys**, copia la llave
   `service_role` (**no** la `anon`, que es la pública). Esta es secreta:
   nunca viaja al navegador, solo la usa el backend para poder escribir en el
   bucket. Vas a pegarla en Render en el paso 2.4, junto con la URL del
   proyecto (`Settings → API → Project URL`).

No hace falta tocarla aquí en `backend/.env` salvo que quieras probar la
subida en tu máquina antes de desplegar; las variables que de verdad importan
van en Render.

---

## 2. El backend en Render

Aquí Render solo aloja la **aplicación** y **Redis** (la caché del catálogo
y las sesiones de carrito de invitado) — la base de datos ya quedó resuelta
en el paso 1, en Supabase.

### 2.1 Crea el servicio web

1. Entra a [dashboard.render.com](https://dashboard.render.com) → **New +**
   → **Web Service**.
2. Conecta tu cuenta de GitHub si todavía no lo está, y selecciona el
   repositorio de PomAss.
3. En **Root Directory**, escribe `backend`. Esto es lo que hace que Render
   mire solo esa carpeta —build, Dockerfile y todo lo demás— y no el
   repositorio entero.
4. En **Runtime** (o **Language**, según la versión del panel), elige
   **Docker**. Render detecta `backend/Dockerfile` solo en cuanto fijas el
   Root Directory; no hay que escribir nada de Render aparte, el Dockerfile
   que ya trae el repo es multietapa, compila con dependencias de
   desarrollo, poda con `npm prune --omit=dev` y corre como usuario no-root.
5. **Name**: algo como `pomass-backend`. Con eso, Render arma la URL
   `pomass-backend.onrender.com` (el nombre exacto puede variar un poco si
   ya está tomado; usa el que te confirme la pantalla).
6. **Region**: la más cercana a tus clientas que ofrezca Render — Ohio
   (`us-east`) suele ser la más próxima a Colombia entre las disponibles.
7. **Instance Type**: ver el aviso de abajo antes de elegir.
8. Todavía no pulses **Create Web Service** — primero el comando de arranque
   (2.2) y las variables (2.4), que están en la misma pantalla de creación.

> ⚠️ **Sobre el plan gratuito**: los servicios web gratuitos de Render se
> **duermen tras 15 minutos sin tráfico** y tardan entre 30 y 50 segundos en
> despertar con la primera petición que les llega después. Para una tienda
> que recién arranca y quieres probar sin gastar, sirve. Pero en cuanto
> empiece a entrar dinero de verdad, esos 30-50 segundos los puede sufrir
> justo una clienta pagando, o —peor— el webhook de confirmación de Wompi,
> si llega mientras el servicio está dormido (Wompi reintenta, así que
> probablemente igual confirme, pero tarde). El plan **Starter** de pago
> elimina esto por completo: el servicio queda siempre despierto. Vale la
> pena pasarte a él antes de anunciar la tienda como abierta de verdad.

### 2.2 El comando de arranque

El `Dockerfile` del repo solo trae `CMD node dist/main.js` — no migra ni
siembra por sí mismo; eso es intencional (migrar en cada arranque es un paso
de despliegue, no algo que deba repetirse si el contenedor se reinicia solo).
Hay que decírselo a Render con un comando propio.

En la misma pantalla de creación del servicio (o después, en
**Settings → Build & Deploy**), busca el campo para sobrescribir el comando
del contenedor — en Render suele llamarse **Docker Command** (a veces bajo
una sección **Advanced**) — y pon:

```bash
sh -c "npx prisma migrate deploy && node dist/main.js"
```

Así cada arranque aplica primero cualquier migración pendiente (no debería
haber ninguna: ya las aplicaste en el paso 1.3 desde tu computador) y recién
después levanta el servidor.

### 2.3 Añade Redis

Desde el **Dashboard** de Render, **New +** → **Key Value** (así es como
Render llama hoy a su Redis gestionado; en cuentas más antiguas puede seguir
apareciendo como **Redis** — es el mismo servicio).

1. Dale un nombre (`pomass-redis` sirve) y elige la **misma región** que el
   backend del paso 2.1 — así hablan por red interna, sin salir a internet,
   más rápido y sin contar contra ningún límite de datos.
2. Elige el plan (revisa qué nivel gratuito ofrece Render en el momento; si
   no hay, el más económico alcanza de sobra para esta tienda).
3. **Create**. En la página del servicio ya creado, copia la **Internal
   Connection String** (no la externa: esa es para conectarte desde fuera de
   Render, por ejemplo con `redis-cli` desde tu computador, y añade latencia
   de más que no hace falta aquí).

### 2.4 Variables de entorno del servicio backend

De vuelta en el servicio del backend → pestaña **Environment**, añade estas
(con `< >` lo que cambias; las cadenas de `DATABASE_URL`/`DIRECT_URL` son las
mismas que ya pusiste en `backend/.env` en el paso 1.3 — cópialas de ahí, y
`REDIS_URL` es la Internal Connection String del paso 2.3):

```bash
NODE_ENV=production
PORT=3000
API_PREFIX=/api
TRUST_PROXY=1

# Las mismas dos cadenas de Supabase del paso 1.3, pegadas tal cual.
DATABASE_URL=postgresql://postgres.TU-REF:CONTRASEÑA@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres.TU-REF:CONTRASEÑA@aws-0-us-east-1.pooler.supabase.com:5432/postgres

# La Internal Connection String de Render, del paso 2.3.
REDIS_URL=redis://red-xxxxxxxxxxxx:6379

JWT_ACCESS_SECRET=<genera uno, ver abajo>
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=7d

BCRYPT_SALT_ROUNDS=12
PASSWORD_RESET_TTL_MIN=30

# El dominio real del FRONTEND (Vercel), no el del backend.
CORS_ORIGIN=https://pomassoficial.com,https://www.pomassoficial.com

SHIPPING_FLAT_RATE=12900
FREE_SHIPPING_THRESHOLD=150000

WOMPI_PUBLIC_KEY=<la pub_prod_... de tu cuenta de Wompi>
WOMPI_PRIVATE_KEY=<la prv_prod_... de tu cuenta de Wompi>
WOMPI_INTEGRITY_SECRET=<la de tu cuenta de Wompi>
WOMPI_EVENTS_SECRET=<la de tu cuenta de Wompi>
WOMPI_REDIRECT_URL=https://pomassoficial.com/track.html
PAYMENTS_SANDBOX=false

# El mismo que ya quedó en la base en el paso 1.5 — tienen que coincidir, o
# «Olvidé mi contraseña» será tu única puerta de entrada al panel.
ADMIN_EMAIL=admin@pomassoficial.com
ADMIN_PASSWORD=<el mismo que pusiste en el paso 1.5>

# Opcional: si no lo pones, los correos quedan en el log y la tienda
# funciona igual, pero nadie recibe el «confirmamos tu pedido».
RESEND_API_KEY=<de resend.com → API Keys>
EMAIL_FROM=PomAss <pedidos@pomassoficial.com>
FRONTEND_URL=https://pomassoficial.com

# Opcional (paso 1.6): sin estas dos, el panel sigue aceptando imágenes por
# URL y el botón «Cargar foto» responde con un aviso claro en vez de fallar.
SUPABASE_URL=https://TU-REF.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<la service_role del paso 1.6>
SUPABASE_STORAGE_BUCKET=product-images
```

A diferencia de Railway, Render no tiene una sintaxis especial para
referenciar la variable de otro servicio propio: por eso aquí `REDIS_URL` se
pega como texto, copiado directo de la página del servicio de Redis.

### 2.5 Genera los secretos

**`JWT_ACCESS_SECRET`** (y, si todavía no lo hiciste en el paso 1.5,
`ADMIN_PASSWORD`), con este comando, una vez por cada uno, en tu terminal:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

No reutilices el mismo valor para los dos, y no uses ninguno de los que
aparecen en `backend/.env.example`: el arranque en producción **se niega a
levantar** si detecta un valor de ejemplo, a propósito (ver
`backend/src/shared/config/env.ts`).

### 2.6 Despliega y verifica

Con el comando (2.2) y las variables (2.4) puestas, pulsa **Create Web
Service** (o, si el servicio ya existía, **Manual Deploy → Deploy latest
commit**).

Pestaña **Logs**, en vivo durante el build y el arranque. Busca una línea de
arranque exitoso y ninguna de `❌ Variables de entorno inválidas`. Si algo
falla, el log te dice exactamente qué variable (nunca el valor, por
seguridad). Debería decir algo como `No pending migrations to apply` (porque
ya las aplicaste tú mismo en el paso 1.3) y luego `🚀 API PomAss escuchando`.

**El Health Check**: en **Settings → Health & Alerts** (el nombre exacto de
la sección puede variar), pon como ruta `/health`. Con eso, Render reinicia
el servicio solo si deja de responder, en vez de dejarlo colgado.

### 2.7 Consigue la URL pública del backend

La ves arriba de la página del servicio, algo como
`https://pomass-backend.onrender.com`. **Guárdala**: la necesitas en el
paso 3 (Vercel) y en el paso 6 (Wompi).

Pruébala:

```bash
curl https://TU-BACKEND.onrender.com/health
```

Debe responder `{"status":"ok","timestamp":"…"}`. Si el servicio estaba
dormido (plan gratuito), esta primera petición puede tardar hasta un minuto;
las siguientes, mientras siga despierto, son instantáneas.

> **¿Dominio propio para el backend, tipo `api.pomassoficial.com`?** Es
> opcional: el dominio de Render funciona perfecto para el checkout y para
> el webhook de Wompi, y es un paso de DNS menos. Si igual lo quieres, en
> **Settings → Custom Domains → Add Custom Domain**, escribe
> `api.pomassoficial.com` y Render te muestra el registro CNAME exacto que
> debes crear en tu panel de DNS (cópialo tal cual lo muestra la pantalla,
> no de aquí).

### 2.8 Entra al panel de administración y confirma

El `ADMIN_PASSWORD` que pusiste en las variables es la contraseña del panel.
Entra a `https://pomassoficial.com/admin.html` (una vez el frontend esté
desplegado, paso 3) con `ADMIN_EMAIL` y esa contraseña, y confirma que ves el
catálogo sembrado en el paso 1.3.

---

## 3. El frontend en Vercel

### 3.1 Importa el proyecto

1. [vercel.com/new](https://vercel.com/new) → **Import Git Repository** → el
   mismo repositorio.
2. En **Configure Project**, abre **Root Directory** y selecciona `frontend`.
3. Vercel detecta Vite solo. El `frontend/vercel.json` que ya está en el repo
   fija el comando de build (`npm run build`), la carpeta de salida (`dist`)
   y el de instalación (`npm install`) — no hace falta tocar nada en esta
   pantalla salvo el Root Directory.

### 3.2 Variable de entorno

Antes de desplegar, abre **Environment Variables** y añade una sola:

```
VITE_API_URL = https://TU-BACKEND.onrender.com/api
```

(o `https://api.pomassoficial.com/api` si configuraste el dominio propio del
paso 2.7).

**No definas `VITE_WOMPI_WIDGET_URL`.** Esa variable solo existe para que el
stack de pruebas en Docker cargue el widget simulado
(`backend/scripts/wompi-widget-falso.mjs`); en Vercel, dejarla sin definir es
lo que hace que el checkout cargue el **widget real de Wompi**. Si por error
quedó definida de una prueba anterior, bórrala.

### 3.3 Despliega

Botón **Deploy**. Cuando termine, Vercel te da una URL de prueba tipo
`pomass-xyz.vercel.app`. Ábrela y confirma que la portada carga y que el
precio del combo aparece (si sale el de respaldo fijo en vez del real, revisa
`VITE_API_URL`: seguramente apunta mal, o el backend está dormido y tarda en
responder la primera vez — plan gratuito de Render, ver el aviso del 2.1).

---

## 4. Conectar tu dominio

### 4.1 Añádelo en Vercel

Proyecto → **Settings** → **Domains** → escribe `pomassoficial.com` → **Add**.
Repite con `www.pomassoficial.com` si quieres que ambos funcionen (Vercel
suele ofrecer redirigir uno al otro automáticamente; acepta esa opción —
redirigir `www` hacia el dominio raíz es lo más común).

### 4.2 Configura el DNS

Vercel te muestra, para cada dominio que agregaste, **el registro exacto**
que debes crear: normalmente un registro `A` para el dominio raíz
(`pomassoficial.com`) y un `CNAME` para `www`. **Copia esos valores de la
propia pantalla de Vercel en el momento**, no de ningún valor fijo en este
documento: pueden cambiar.

En el panel de DNS de donde compraste `pomassoficial.com`:

1. Busca la sección de registros DNS (a veces se llama "Administrar DNS",
   "Zonas DNS" o similar).
2. Crea el registro `A` que Vercel te mostró, con el nombre `@` (o vacío,
   según el panel) apuntando al valor que Vercel dio.
3. Crea el registro `CNAME` para `www` apuntando al valor que Vercel dio.
4. Si configuraste el dominio propio del backend en el paso 2.7, crea
   también el `CNAME` de `api` que te mostró Render.
5. Guarda. La propagación puede tardar de minutos a un par de horas; rara
   vez más.

Vercel (y Render, si usaste un dominio propio para la API) marca el dominio
como **Valid**/verificado en su panel en cuanto detecta los registros, y
emite el certificado TLS solo — no hay nada que instalar a mano.

### 4.3 Verifica

```bash
curl -I https://pomassoficial.com
```

Debe responder `200` (o `308`/`301` si redirige `www` ↔ raíz) con un
certificado válido. Ábrelo también en el navegador y confirma el candado.

---

## 5. Ajusta las variables que dependen del dominio real

Si en el paso 2.4 ya pusiste `pomassoficial.com` en todos lados, salta este
paso. Si en algún momento usaste la URL de prueba de Render/Vercel porque el
dominio no estaba listo todavía, actualiza ahora en Render (servicio del
backend → **Environment**):

```
CORS_ORIGIN=https://pomassoficial.com,https://www.pomassoficial.com
WOMPI_REDIRECT_URL=https://pomassoficial.com/track.html
FRONTEND_URL=https://pomassoficial.com
```

Guardar las variables dispara un redespliegue solo. Confirma en los logs que
arrancó bien (paso 2.6).

Prueba el CORS desde un origen no permitido, para confirmar que de verdad
quedó restringido y no en `*`:

```bash
curl -s -I -H 'Origin: https://sitio-no-permitido.com' \
  https://TU-BACKEND.onrender.com/api/products
```

La respuesta no debe traer el encabezado `Access-Control-Allow-Origin` con
ese origen.

---

## 6. Registra el webhook en Wompi — el paso que falta hoy

Sin esto, un pago se cobra de verdad pero el pedido se queda en `PENDING`
para siempre: el backend nunca se entera de que Wompi lo aprobó.

1. Entra al [panel de comercios de Wompi](https://comercios.wompi.co) con tu
   cuenta.
2. Busca la configuración del comercio → **Eventos** (o **Webhooks**, según
   la versión del panel).
3. En el campo de la URL, pega exactamente:

   ```
   https://TU-BACKEND.onrender.com/api/payments/webhook/wompi
   ```

   (o `https://api.pomassoficial.com/api/payments/webhook/wompi` si usas el
   dominio propio del backend). La ruta termina en `/wompi`, no en
   `/webhook` a secas.

4. Guarda. Wompi suele dejar mandar un evento de prueba desde el propio
   panel: si lo ofrece, úsalo y confirma en los logs de Render que el
   backend respondió `200`.

El secreto con el que Wompi firma esos eventos es el mismo
`WOMPI_EVENTS_SECRET` que ya pusiste en el paso 2.4 — si no coincide con el
que ves en el panel de Wompi, el backend rechaza el webhook por checksum
inválido (lo verás en los logs como una verificación fallida, nunca como un
error ruidoso: es a propósito, para que nadie falsifique una confirmación de
pago).

Si el backend está en el plan gratuito y se durmió, el primer intento de
Wompi puede tardar en confirmarse mientras el servicio despierta — otra
razón más para el plan **Starter** (aviso del paso 2.1) en cuanto la tienda
cobre de verdad.

---

## 7. Prueba de punta a punta

En este orden, con el sitio real:

1. **Salud**: `curl https://TU-BACKEND.onrender.com/health` → `200`.
2. **Catálogo**: abre `https://pomassoficial.com` y confirma que el precio y
   los productos cargan (vienen de la API, no del valor de respaldo).
3. **Checkout de invitado**: agrega el combo, pasa por envío, llega a pago.
4. **El widget que se abre es el real de Wompi** (no el de los tres botones
   verde/rojo/gris del stack de pruebas). Si ves el simulado,
   `VITE_WOMPI_WIDGET_URL` quedó definida en Vercel por error; bórrala y
   vuelve a desplegar.
5. **Un pago real, por un monto bajo**: complétalo con una tarjeta o cuenta
   tuya. El checkout debe pasar solo de «Verificando tu pago…» a la
   confirmación, sin que recargues nada a mano — eso prueba que el webhook
   llegó y el paso 6 quedó bien hecho.
6. **Correo**: si configuraste Resend, debe llegar el de «recibimos tu
   pedido» y, poco después, el de «pago confirmado».
7. **Seguimiento**: `https://pomassoficial.com/track.html` con el número de
   pedido y el correo usado, y debe mostrar el pedido en `PAID`.
8. **Panel de administración**: `https://pomassoficial.com/admin.html`, entra
   y confirma que el pedido aparece ahí también.
9. **Si configuraste el bucket del paso 1.6**: en **Productos** → edita uno
   → botón **Cargar foto** → elige un archivo de tu computador. Debe
   devolver la URL pública sola, sin que tengas que pegar nada a mano. Si en
   vez de eso sale «Subir imágenes no está configurado todavía», revisa
   `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` en Render (van juntas: una sin
   la otra, el backend ni arranca).

Si el paso 5 se queda colgado en «Verificando tu pago…» y nunca confirma, el
problema casi siempre es el webhook (paso 6 de esta guía), que
`WOMPI_EVENTS_SECRET` no coincide con el del panel de Wompi, o que el
backend estaba dormido justo cuando Wompi intentó avisar (ver el aviso del
paso 6).

---

## 8. Checklist final

```
# Supabase
[ ] Proyecto creado, en una región cercana a Colombia
[ ] DATABASE_URL (puerto 6543, con ?pgbouncer=true) y DIRECT_URL (puerto 5432)
    copiadas del Transaction/Session pooler, nunca de la conexión directa
[ ] npm run supabase:setup corrido contra esas dos cadenas: tablas creadas
[ ] Data API apagada (Settings → Data API → Enable Data API: OFF)
[ ] RLS aplicado con supabase-rls.sql (segunda cerradura, recomendado)
[ ] ADMIN_PASSWORD propio sembrado (ya no Admin123*)
[ ] Bucket product-images creado y marcado Public (si vas a subir fotos)

# Render
[ ] Root Directory = backend, Runtime = Docker
[ ] Docker Command = sh -c "npx prisma migrate deploy && node dist/main.js"
[ ] NODE_ENV=production
[ ] DATABASE_URL/DIRECT_URL son las de Supabase
[ ] Redis (Key Value) creado en la MISMA región, REDIS_URL = su Internal Connection String
[ ] JWT_ACCESS_SECRET y ADMIN_PASSWORD generados, no los de ejemplo
[ ] WOMPI_PUBLIC_KEY / WOMPI_PRIVATE_KEY son pub_prod_ / prv_prod_ (no _test_)
[ ] WOMPI_INTEGRITY_SECRET y WOMPI_EVENTS_SECRET son los de tu cuenta de Wompi
[ ] PAYMENTS_SANDBOX=false
[ ] CORS_ORIGIN con tu dominio real, nunca *
[ ] WOMPI_REDIRECT_URL y FRONTEND_URL con tu dominio real, no localhost
[ ] SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY puestas si vas a subir fotos
[ ] Health Check Path = /health
[ ] Decidido: plan gratuito (con cold start) o Starter (siempre despierto)

# Vercel
[ ] VITE_API_URL apunta al backend de Render (o a api.pomassoficial.com)
[ ] VITE_WOMPI_WIDGET_URL NO está definida

# Dominio y Wompi
[ ] pomassoficial.com y www verdes («Valid») en Vercel, con TLS
[ ] URL de Eventos registrada en el panel de Wompi, terminando en /wompi

# Verificación
[ ] Compra real de prueba hecha y confirmada sin tocar nada a mano
[ ] Subida de foto probada desde el panel (si configuraste el bucket)
[ ] Contraseña del admin confirmada tras la primera entrada
```

---

## Si algo sale mal

- **Render**: pestaña **Events** o **Deploys** → cualquier despliegue
  anterior tiene la opción de volver a él (**Rollback** o **Redeploy**,
  según la versión del panel), para volver a una versión que sí funcionaba
  mientras investigas. La pestaña **Logs** (en vivo) es la primera parada
  siempre. Para correr un comando suelto con las mismas variables de entorno
  del servicio (por ejemplo, si alguna vez necesitas repetir algo sin pasar
  por tu propia máquina), está la pestaña **Shell**, una consola dentro del
  propio contenedor desplegado.
- **Vercel**: pestaña **Deployments** → cualquier despliegue previo tiene
  **Promote to Production**, con el mismo efecto.
- **El checkout no encuentra el backend** (pantalla con error de conexión):
  revisa `VITE_API_URL` en Vercel y que el backend en Render responda
  `/health`. Si está en el plan gratuito, puede estar dormido: la primera
  petición tarda hasta un minuto.
- **CORS bloqueado en la consola del navegador**: `CORS_ORIGIN` en Render no
  trae exactamente el dominio desde el que estás probando (con o sin `www`
  importa: añade los dos, separados por coma).
- **El pago se cobra pero el pedido no confirma**: ver el final del paso 7, y
  si el backend está en el plan gratuito, revisa si estaba dormido cuando
  Wompi intentó avisar (paso 6).
- **El backend no arranca y el log menciona `DATABASE_URL` o `DIRECT_URL`**:
  alguna de las dos cadenas de Supabase quedó mal pegada — revisa que
  `DATABASE_URL` tenga el puerto `6543` y `?pgbouncer=true` al final, y que
  `DIRECT_URL` tenga el `5432` sin ese parámetro. Si alguna contraseña tiene
  `@`, `#`, `/` o `?`, hay que codificarla o la cadena se parte por la
  mitad: más simple es resetearla sin esos caracteres (**Settings →
  Database → Reset database password** en Supabase).
- **El backend no arranca y menciona `pending migrations` o un error de
  conexión a la base distinto**: prueba primero `npm run supabase:setup`
  desde tu computador, apuntando a las mismas cadenas — sus mensajes son más
  claros que los que da Render, porque valida cada cosa por separado antes
  de tocar la base.
- **El build falla y no encuentra el `Dockerfile`**: revisa el **Root
  Directory** del servicio — debe ser exactamente `backend`, no la raíz del
  repositorio ni `backend/`.
- **La tienda andaba bien y de repente deja de responder, después de varios
  días sin pedidos**: en el plan gratuito de Supabase, los proyectos
  inactivos se pausan. Entra al panel del proyecto — si está en pausa, te
  ofrece reactivarlo con un clic. Si esto empieza a pasar seguido, es señal
  de que ya conviene pasar a un plan con el proyecto siempre activo (lo
  mismo que el aviso del plan Starter de Render, pero del lado de la base
  de datos).
- **El botón «Cargar foto» responde con un error 503**: `SUPABASE_URL` o
  `SUPABASE_SERVICE_ROLE_KEY` no están en las variables de Render, o solo
  una de las dos. Van juntas (ver el checklist).
- **La subida de foto funciona pero la imagen no carga en la tienda**: el
  bucket no quedó marcado como **Public**. Edítalo en Storage y actívalo.

## Relacionado

- [Cómo desplegar a producción](howto-desplegar.md) — la versión
  platform-agnóstica, con más detalle de qué hace cumplir `env.ts`.
- [Montar la base en Supabase](howto-supabase.md) — esta misma parte 1, con
  más contexto y la explicación completa del script de siembra.
- [Cómo probar pagos](howto-probar-pagos.md) — el flujo con el widget
  simulado, para desarrollo.
- [Pendientes para lanzar](pendientes-lanzamiento.md) — lista de control más
  amplia, con lo que falta fuera del despliegue en sí.
