# PomAss · Tienda virtual de cuidado íntimo

Proyecto de **PomAss by Pao Díaz** (cremas y productos de cuidado/higiene íntima),
compuesto por dos aplicaciones independientes en el mismo repositorio:

| | Qué es | Dónde vive | Stack |
|---|---|---|---|
| **Frontend** | Landing de producto (Día/Noche) orientada a venta por WhatsApp | [`frontend/`](frontend/) | React + Vite + Tailwind CSS |
| **Backend** | API REST completa de e-commerce (catálogo, carrito, checkout, pagos...) | [`backend/`](backend/) | Node + TypeScript + Express + Prisma + Redis |

> ⚠️ **Importante para entender el proyecto**: el frontend y el backend **son
> independientes hoy**. El frontend es una landing estática que vende por
> WhatsApp (no llama a ninguna API); el backend es una API headless de tienda
> virtual construida por separado. Están en el mismo repo por conveniencia,
> no porque uno consuma al otro — ver [¿Por qué están separados?](#por-qué-están-separados) más abajo.

## Estructura del repositorio

```
PomAss_Paola/
├── README.md                 ← estás aquí (visión general del monorepo)
├── ARCHITECTURE.md           ← cómo está diseñado el backend (capas, flujo de una petición)
├── package.json              ← script raíz para levantar frontend + backend con un solo comando
│
├── frontend/                 ── FRONTEND (landing de venta por WhatsApp)
│   ├── src/
│   │   ├── App.jsx              estado global (modo día/noche, toast), composición
│   │   ├── site.js              precio, WhatsApp, textos de beneficios (config rápida)
│   │   ├── index.css            estilos base, keyframes, responsive
│   │   ├── assets/               logo e imágenes reales (assets/products/ = fotos del combo)
│   │   └── components/           Header, Hero, ProductStage, OfferCard, StickyBar...
│   ├── index.html
│   └── package.json
│
└── backend/                  ── BACKEND (API REST)
    ├── src/
    │   ├── modules/              un módulo por dominio (auth, catalog, cart, orders, payments...)
    │   └── shared/                config, DB, caché, errores, middlewares, Swagger
    ├── prisma/                   schema.prisma, migraciones, seed
    ├── tests/                    unit/ (sin DB) e integration/ (con DB real)
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
comandos, tests, endpoints) en **[backend/README.md](backend/README.md)**.
Ver [detalles del frontend](#frontend--landing-pomass-díanoche) más abajo.

---

## Frontend — landing PomAss Día/Noche

Landing de una sola página implementada en **React + Vite + Tailwind CSS** a
partir del diseño `PomAss.dc.html` (Claude Design). Vende el combo Día + Noche
dirigiendo al comprador a WhatsApp; no tiene backend propio ni carrito real.
Vive en [`frontend/`](frontend/) y es un proyecto npm independiente (su propio
`package.json`, `node_modules` y `dist`).

**Qué incluye:**

- **Toggle Día / Noche** con crossfade de colores, fondo (degradado cálido ↔
  noche estrellada), copys, mascota, tubo y CTA. Se alterna desde el switch
  del header, el botón sol/luna de la esquina (solo escritorio), o con swipe
  horizontal en móvil.
- **Hero** de 3 columnas (beneficios · producto en podio · CTA flotante a WhatsApp),
  que colapsa a 1 columna en móvil (< 920px).
- **Tarjeta de oferta** con precio ($79.900 COP), botones *Comprar ahora* y
  *Comprar por WhatsApp*, sellos de confianza y redes.
- **Barra sticky** inferior con precio y accesos de compra, y un **toast** de
  confirmación al pulsar *Comprar*.

**Configuración rápida:**

- Precio, teléfono/URL de WhatsApp y textos de beneficios → [`frontend/src/site.js`](frontend/src/site.js)
- Enlaces de redes (Instagram, TikTok, Facebook) → `href="#"` en `OfferCard.jsx`
- Fotos reales de producto → `frontend/src/assets/products/` (mascota día, tubo día,
  tubo noche), importadas en el objeto `products` de `frontend/src/App.jsx`. La mascota
  de noche sigue en placeholder: su original excede el límite de lectura del import
  de Claude Design y no hay una versión más liviana en el proyecto; para completarla,
  agrega un archivo más pequeño en esa misma carpeta y referéncialo igual que las demás.

```bash
cd frontend
npm run build      # build de producción en frontend/dist
npm run preview    # sirve el build de producción
```

## Backend — API de la tienda

API REST completa para operar la tienda: autenticación con roles, catálogo con
búsqueda/filtros y caché, carrito (usuario + invitado), checkout transaccional
con cupones y envío, y pagos con adaptadores por proveedor colombiano
(Nequi/Daviplata/tarjeta) vía webhook firmado.

Construida en **arquitectura limpia/hexagonal**, modular por dominio, con
Postgres + Prisma, Redis, JWT, validación con Zod, tests con Jest/Supertest y
documentación Swagger. El detalle de diseño está en **[ARCHITECTURE.md](ARCHITECTURE.md)**;
la guía operativa (instalación, `.env`, comandos, referencia de endpoints) está
en **[backend/README.md](backend/README.md)**.

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
Hoy son proyectos independientes que conviven en el mismo repo, cada uno en su
propia carpeta (`frontend/` y `backend/`) con su propio `package.json`; conectar
el frontend al backend (reemplazar el flujo de WhatsApp por login/carrito/checkout
reales) es trabajo futuro, no algo que ya esté hecho.
