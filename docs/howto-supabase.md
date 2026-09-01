# Montar la base de datos en Supabase

Guía para dejar la base de datos de la tienda funcionando en Supabase. Son
unos quince minutos y hay que hacerla una sola vez.

El proyecto ya está creado (`us-east-1`). Lo que falta es conectar la tienda,
crear las tablas y cerrar la puerta que Supabase deja abierta por defecto.

> **Sobre la contraseña de la base de datos**
>
> Las cadenas de conexión la llevan dentro. Van directamente a
> `backend/.env`, que no se sube al repositorio. No la pegues en un chat, ni
> en un correo, ni en una captura — tampoco a mí. Si alguna vez se te escapa,
> cámbiala en *Settings → Database → Reset database password* y vuelve a
> copiar las cadenas.

---

## 1. Copiar las dos cadenas de conexión

En el panel de Supabase, botón **Connect** (arriba, junto al nombre del
proyecto). Se abre una ventana con varias pestañas; busca las de **ORMs** o
**Connection string**.

Necesitas dos cadenas distintas:

| Para | Cuál | Puerto |
|---|---|---|
| `DATABASE_URL` — la que usa la tienda a diario | **Transaction pooler** | 6543 |
| `DIRECT_URL` — solo para crear y cambiar tablas | **Session pooler** | 5432 |

Las dos tienen el mismo aspecto salvo el puerto:

```
postgresql://postgres.wfsyfltmeounmsmogsof:CONTRASEÑA@aws-0-us-east-1.pooler.supabase.com:6543/postgres
```

**No uses la conexión directa** (la que empieza por `db.` y termina en
`.supabase.co`). Esa solo existe por IPv6 y desde esta máquina —y desde
muchos proveedores de hosting— sencillamente no resuelve: el error que da no
menciona IPv6 por ningún lado, así que se pierde mucho rato buscando. El
script se niega a usarla.

---

## 2. Pegarlas en `backend/.env`

Abre `backend/.env` y reemplaza las dos líneas que hoy apuntan a `localhost`:

```bash
# La tienda, a través del pooler en modo transacción.
# El ?pgbouncer=true NO es opcional: sin él Prisma intenta usar sentencias
# preparadas, que en ese modo no funcionan, y falla a mitad de una compra.
DATABASE_URL=postgresql://postgres.TU-REF:CONTRASEÑA@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true

# Las migraciones, a través del pooler en modo sesión.
DIRECT_URL=postgresql://postgres.TU-REF:CONTRASEÑA@aws-0-us-east-1.pooler.supabase.com:5432/postgres
```

Supabase entrega la cadena con `[YOUR-PASSWORD]` dentro. Reemplázalo por la
contraseña real, **sin los corchetes**.

Si la contraseña tiene caracteres raros (`@`, `#`, `/`, `?`), hay que
codificarlos o la cadena se parte por la mitad. Lo más simple es cambiarla por
una sin ellos: *Settings → Database → Reset database password*.

---

## 3. Crear las tablas

Desde `backend/`:

```bash
npm run supabase:setup
```

El script revisa las cadenas antes de conectarse (que no apunten a
`localhost`, que no sean la conexión directa, que los puertos y el
`pgbouncer=true` estén bien), aplica las cuatro migraciones, siembra los datos
iniciales y después comprueba contra la base que quedó lo que tenía que
quedar. Nunca imprime la contraseña.

Es seguro volver a ejecutarlo: las migraciones ya aplicadas se saltan y la
siembra usa `upsert`.

Al terminar deberías ver algo así:

```
✓ 16 tablas creadas en el esquema public
✓ 1 usuario(s) de administración
✓ 1 producto(s) en el catálogo
✓ 1 cupón(es)
```

---

## 4. Cerrar la Data API ⚠️

**Este paso no es opcional.**

Supabase publica automáticamente una API REST sobre las tablas del esquema
`public`. Eso es cómodo cuando la base la consulta directamente una app móvil,
pero aquí no: quien habla con la base es nuestro backend, con su propia
autenticación y sus propias reglas.

Nuestras tablas guardan contraseñas cifradas, pedidos, direcciones y teléfonos
de las clientas. Dejarlas publicadas por HTTP es exponerlas sin necesidad
ninguna.

1. Abre **Data API integration overview**:
   `https://supabase.com/dashboard/project/TU-REF/integrations/data_api/overview`
2. Apaga **Enable Data API**.

Con eso ninguno de los endpoints REST responde, sin importar los permisos ni
las políticas que haya debajo. La tienda no se entera: se conecta por Postgres,
no por esa API.

### Segunda cerradura (opcional pero recomendada)

Por si algún día alguien vuelve a activar la Data API sin acordarse de esto:

1. Panel → **SQL Editor** → New query.
2. Pega el contenido de `backend/scripts/supabase-rls.sql` y pulsa **Run**.

Activa Row Level Security en todas las tablas y no crea ninguna política, que
es justo lo que se busca: sin políticas, RLS niega todo a los roles públicos.
La tienda no se ve afectada porque se conecta como dueña de las tablas, y a la
dueña `ENABLE ROW LEVEL SECURITY` no le aplica.

Al final el script lista las tablas: todas deben salir con `rowsecurity = true`.

---

## 5. Cambiar la contraseña del administrador

La siembra crea el usuario del panel con la contraseña de ejemplo. Cámbiala
antes de que la tienda sea pública:

- En `backend/.env`, pon un `ADMIN_PASSWORD` propio y vuelve a ejecutar
  `npm run supabase:setup`, **o**
- entra al panel y usa «Olvidé mi contraseña» (necesita los correos
  configurados; ver la sección O1 de [pendientes-lanzamiento.md](pendientes-lanzamiento.md)).

En producción el backend **se niega a arrancar** si `ADMIN_PASSWORD` sigue
siendo el de ejemplo, así que este paso no se puede saltar por descuido.

---

## Si algo sale mal

**«Can't reach database server» o se queda colgado**
Lo más común es que el proyecto esté pausado: los proyectos gratuitos se
pausan tras una semana sin uso y hay que reactivarlos desde el panel. Si no es
eso, comprueba que no estés usando la conexión directa (`db.…supabase.co`).

**«password authentication failed»**
La contraseña de la cadena no es la correcta, o quedó el `[YOUR-PASSWORD]`
sin reemplazar, o tiene un carácter que parte la URL. Resetéala desde
*Settings → Database*.

**«prepared statement already exists» durante una compra**
Falta `?pgbouncer=true` en `DATABASE_URL`.

**Las migraciones fallan pero la aplicación conecta bien**
`DIRECT_URL` está en el puerto 6543. Las migraciones necesitan el 5432.

---

## Relacionado

- [Pendientes para lanzar](pendientes-lanzamiento.md) — qué falta después de esto
- [Cómo desplegar](howto-desplegar.md)
- [Referencia de configuración](referencia-configuracion.md) — todas las variables de entorno
