
# PomAss · Tienda virtual de cuidado íntimo

Proyecto de **PomAss by Pao Díaz** (cremas y productos de cuidado/higiene íntima),
compuesto por dos aplicaciones independientes en el mismo repositorio:

| | Qué es | Dónde vive | Stack |
|---|---|---|---|
| **Frontend** | Landing de producto (Día/Noche) + demo de checkout | [`frontend/`](frontend/) | React + Vite + Tailwind CSS |
| **Backend** | API REST completa de e-commerce (catálogo, carrito, checkout, pagos...) | [`backend/`](backend/) | Node + TypeScript + Express + Prisma + Redis |

> ⚠️ **Importante para entender el proyecto**: el frontend son en realidad **dos
> páginas** con propósitos distintos. La **landing** (`index.html`) vende por
> WhatsApp y no llama a ninguna API. La **demo de checkout**
> (`checkout.html`) sí consume el backend completo — es la única parte
> conectada, y es una demostración, no la tienda en producción. Ver
> [¿Por qué están separados?](#por-qué-están-separados) más abajo.

## Documentación

La documentación completa vive en **[`docs/`](docs/)**, organizada por tipo de
lector:

| | |
|---|---|
| 🎓 [Tutorial: tu primer pedido](docs/tutorial-primer-pedido.md) | De cero a un pedido pagado, en 15 minutos |
| 🔧 [Guías how-to](docs/README.md#guías-how-to) | Entorno local · agregar un módulo · probar pagos · desplegar |
| 📖 [Referencia](docs/README.md#referencia) | API (49 endpoints) · modelo de datos · configuración · frontend |
| 💡 [Explicación](docs/README.md#explicación) | Decisiones de diseño · modelo de seguridad |

Índice completo en **[docs/README.md](docs/README.md)**.

## Estructura del repositorio

```
PomAss_Paola/
├── README.md                 ← estás aquí (visión general del monorepo)
├── ARCHITECTURE.md           ← cómo está diseñado el backend (capas, flujo de una petición)
├── docs/                     ← documentación completa (tutorial, how-to, referencia, explicación)
├── package.json              ← script raíz para levantar frontend + backend con un solo comando
│
├── frontend/                 ── FRONTEND (landing + demo de checkout)
│   ├── index.html               landing de venta por WhatsApp
│   ├── checkout.html            demo de checkout (consume la API)
│   ├── public/images/           fotos de producto y logo (assets estáticos)
│   ├── src/
│   │   ├── App.jsx              estado de la landing (modo día/noche, toast), composición
│   │   ├── site.js              precio, WhatsApp, textos de beneficios (config rápida)
│   │   ├── index.css            estilos base, keyframes, responsive
│   │   ├── components/          Header, Hero, ProductStage, OfferCard, StickyBar...
│   │   └── checkout/            cliente de API + los 5 pasos del checkout
│   └── package.json
│
└── backend/                  ── BACKEND (API REST)
    ├── src/
    │   ├── modules/              un módulo por dominio (auth, catalog, cart, orders,
    │   │                         payments, coupons, reviews, admin)
    │   └── shared/                config, DB, caché, errores, middlewares, Swagger
    ├── prisma/                   schema.prisma, migraciones, seed
    ├── tests/                    unit/ (96, sin DB) e integration/ (16, con DB real)
    ├── docker-compose.yml        app + postgres + redis
    └── README.md                 guía completa de instalación, comandos, endpoints
```

## Puesta en marcha rápida

### Las dos apps con un solo comando (desarrollo local)

```bash
npm run install:all   # instala dependencias de backend/ y frontend/
npm run dev           # levanta backend (:3000) y frontend (:5173) en paralelo
```

Usa [`concurrently`](https://www.npmjs.com/package/concurrently) para correr
`npm run dev` de cada proyecto a la vez, con logs prefijados `[backend]` /
`[frontend]`. Esto **no** conecta las dos apps entre sí (siguen siendo
independientes, ver [¿Por qué están separados?](#por-qué-están-separados)) —
solo evita abrir dos terminales para desarrollar en paralelo. El backend
necesita Postgres/Redis vivos para responder correctamente (ver más abajo);
si esos puertos (`3000`/`5173`) ya están ocupados por otra instancia tuya,
ciérrala antes de correr el comando raíz.

### Frontend y backend por separado

```bash
# Frontend (landing)
cd frontend
npm install
npm run dev       # http://localhost:5173

# Backend (API)
cd backend
cp .env.example .env
docker compose up --build   # levanta postgres + redis + api, migra y siembra datos
```

API en `http://localhost:3000/api`, documentación interactiva en
`http://localhost:3000/api/docs`. Guía completa (variables de entorno,
comandos, tests, endpoints) en **[backend/README.md](backend/README.md)** y en
**[docs/referencia-configuracion.md](docs/referencia-configuracion.md)**.

> ¿Docker no arranca en tu máquina? Hay un camino sin Docker en
> **[docs/howto-entorno-local.md](docs/howto-entorno-local.md)**.

---

## Frontend — landing PomAss Día/Noche

Landing de una sola página implementada en **React + Vite + Tailwind CSS** a
partir del diseño `PomAss.dc.html` (Claude Design). Vende el combo Día + Noche
dirigiendo al comprador a WhatsApp; no tiene carrito real ni llama a la API.
Vive en [`frontend/`](frontend/) y es un proyecto npm independiente (su propio
`package.json`, `node_modules` y `dist`).

**Qué incluye:**

- **Toggle Día / Noche** con crossfade de colores, fondo (degradado cálido ↔
  noche estrellada), copys, mascota, tubo y CTA. Se alterna desde el switch
  del header, el botón sol/luna de la esquina (solo escritorio), o con swipe
  horizontal en móvil.
- **Hero** de 3 columnas (beneficios · producto en podio · CTA flotante a WhatsApp),
  que colapsa a 1 columna en móvil (< 920px).
- **Tarjeta de oferta** con precio ($89.900 COP), botones *Comprar ahora* y
  *Comprar por WhatsApp*, sellos de confianza y redes.
- **Barra sticky** inferior con precio y accesos de compra, y un **toast** de
  confirmación al pulsar *Comprar*.

**Configuración rápida:**

- Precio, teléfono/URL de WhatsApp y textos de beneficios → [`frontend/src/site.js`](frontend/src/site.js)
- Enlaces de redes (Instagram, TikTok, Facebook) → siguen en `href="#"` en `OfferCard.jsx`
- Fotos de producto → [`frontend/public/images/`](frontend/public/images/), servidas
  como assets estáticos y referenciadas por ruta absoluta (`/images/...`) en el objeto
  `products` de [`frontend/src/App.jsx`](frontend/src/App.jsx). Para añadir una, ponla
  en esa carpeta y referénciala igual que las demás.

```bash
cd frontend
npm run build      # build de producción en frontend/dist (genera LAS DOS páginas)
npm run preview    # sirve el build de producción
```

Detalle completo de componentes, cliente de API y sistema de diseño en
**[docs/referencia-frontend.md](docs/referencia-frontend.md)**.

## Probarlo en local

```bash
docker compose up --build
```

Levanta base, caché, API y frontend, y deja la tienda en
<http://localhost:5173>. El cobro en sí ocurre dentro del widget de Wompi, que
necesita credenciales de sandbox; la confirmación por webhook sí se prueba
entera y sin internet con `backend/scripts/wompi-falso.mjs`. Detalle en
[cómo probar el flujo de pagos](docs/howto-probar-pagos.md).

Para correr la batería de tests, integración incluida, sin instalar nada:

```bash
docker compose run --rm tests
```

Es un entorno de **pruebas**: los secretos están a la vista en
`docker-compose.yml` y no se cobra nada. Para desplegar de verdad, ver
[cómo desplegar](docs/howto-desplegar.md).

## Frontend — demo de checkout

`checkout.html` es una segunda página, independiente de la landing, que **sí
consume la API del backend**. Implementa el flujo de compra completo en cinco
pasos: Cuenta → Tienda → Envío → Pago → Confirmación, con soporte para comprar
sin crear cuenta.

Es el único punto donde las dos aplicaciones se tocan: el botón *Comprar* de la
landing redirige aquí.

```bash
cd frontend
cp .env.example .env    # VITE_API_URL apunta a la API
npm run dev             # http://localhost:5173/checkout.html
```

Necesita el backend vivo. Recorrido guiado en
**[docs/tutorial-primer-pedido.md](docs/tutorial-primer-pedido.md)**.

## Backend — API de la tienda

API REST completa para operar la tienda: autenticación con roles, catálogo con
búsqueda/filtros y caché, carrito (usuario + invitado), checkout transaccional
con cupones y envío, y pagos con adaptadores por proveedor colombiano
(Nequi/Daviplata/tarjeta) vía webhook firmado.

Construida en **arquitectura limpia/hexagonal**, modular por dominio, con
Postgres + Prisma, Redis, JWT, validación con Zod, tests con Jest/Supertest y
documentación Swagger. El detalle de diseño está en **[ARCHITECTURE.md](ARCHITECTURE.md)**
y en **[docs/explicacion-decisiones.md](docs/explicacion-decisiones.md)**; la
guía operativa (instalación, `.env`, comandos) está en
**[backend/README.md](backend/README.md)**, y la referencia completa de los 48
endpoints en **[docs/referencia-api.md](docs/referencia-api.md)**.

**Estado de los módulos:**

| Módulo | Estado |
|---|---|
| Auth y usuarios (JWT + refresh con rotación, verificación de edad, recuperación de contraseña) | ✅ |
| Catálogo (productos, categorías, marcas, búsqueda/filtros, caché Redis) | ✅ |
| Carrito (persistente por usuario + invitado en Redis, validación de stock, merge) | ✅ |
| Pedidos/Checkout (transaccional, stock atómico, cupones, envío, empaque discreto) | ✅ |
| Pagos (adaptadores Nequi/Daviplata/tarjeta, webhook firmado) | ✅ |
| Cupones (CRUD admin) | ✅ |
| Reseñas (compra verificada, auto-aprobadas) | ✅ |
| Panel de administración/reportes (ventas, top productos, pedidos por estado) | ✅ |

## ¿Por qué están separados?

El frontend nació primero, como una landing de una sola página importada desde
un diseño de Claude Design pensada para vender por WhatsApp sin necesidad de
backend. El backend se construyó después, desde cero, como una API de tienda
virtual de propósito general (multi-producto, con cuentas, carrito, pagos).

Hoy siguen siendo dos proyectos npm independientes, cada uno con su propio
`package.json`, `node_modules` y `dist`. Lo que sí existe ya es la **demo de
checkout** (`checkout.html`): una segunda página del frontend que consume la API
real y demuestra el flujo completo de compra.

Lo que **no** está hecho es reemplazar la landing por una tienda de verdad: la
landing sigue vendiendo por WhatsApp con su precio propio en `site.js`, sin leer
el catálogo del backend. Los dos precios (el combo a $89.900 de la landing y los
productos del catálogo) son fuentes de verdad distintas y nada las sincroniza.

Lista completa de lo que falta, por área:

- [Huecos del modelo de datos y de la API](docs/referencia-modelo-datos.md#huecos-conocidos)
- [Huecos del frontend](docs/referencia-frontend.md#huecos-conocidos)
- [Lo que el modelo de seguridad no cubre](docs/explicacion-seguridad.md#lo-que-no-cubre)
- [Pendientes antes de aceptar dinero real](docs/howto-desplegar.md#antes-de-aceptar-dinero-real)
