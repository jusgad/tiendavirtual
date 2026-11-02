# Documentación de PomAss

Documentación completa del monorepo. Está organizada según el marco
[Diataxis](https://diataxis.fr/): cada documento sirve a un lector en un momento
distinto.

| Si quieres… | Ve a |
|---|---|
| **Aprender** cómo funciona el sistema haciéndolo funcionar | [Tutorial](#tutorial) |
| **Resolver** una tarea concreta | [Guías how-to](#guías-how-to) |
| **Consultar** un dato exacto | [Referencia](#referencia) |
| **Entender** por qué está hecho así | [Explicación](#explicación) |

---

## Empieza aquí

**¿Primera vez con el proyecto?** Lee el [README raíz](../README.md) para la
visión general (dos aplicaciones independientes en un repo) y luego haz el
[tutorial](tutorial-primer-pedido.md).

**¿Vas a escribir código en el backend?** Lee [ARCHITECTURE.md](../ARCHITECTURE.md)
y después [Cómo agregar un módulo nuevo](howto-agregar-modulo.md).

**¿Vas a desplegar?** [Cómo desplegar a producción](howto-desplegar.md) y
[Modelo de seguridad](explicacion-seguridad.md).

**¿Qué falta para llegar a producción?** Empieza por el
[análisis de brechas](analisis-brechas-blueprint.md), que contrasta el
[blueprint de finalización](pomass-tiendavirtual-blueprint.md) contra el código
real, paso por paso.

Los huecos conocidos también están documentados por área:

- [Huecos del modelo de datos y de la API](referencia-modelo-datos.md#huecos-conocidos)
- [Huecos del frontend](referencia-frontend.md#huecos-conocidos)
- [Lo que el modelo de seguridad no cubre](explicacion-seguridad.md#lo-que-no-cubre)
- [Pendientes antes de aceptar dinero real](howto-desplegar.md#antes-de-aceptar-dinero-real)

---

## Tutorial

Orientado a aprender. Te lleva de la mano desde cero hasta algo funcionando.

| Documento | Qué consigues |
|---|---|
| [Tu primer pedido, de punta a punta](tutorial-primer-pedido.md) | Un pedido real en estado `PAID`, pasando por carrito, cupón, checkout transaccional y webhook firmado |

---

## Guías how-to

Orientadas a tareas. Asumen que ya conoces lo básico.

| Documento | Qué resuelve |
|---|---|
| [Cómo montar el entorno local](howto-entorno-local.md) | Tres caminos según tengas Docker o no, con verificación y resolución de problemas |
| [Cómo agregar un módulo nuevo al backend](howto-agregar-modulo.md) | Las cuatro capas, el cableado, los tests y la lista de comprobación |
| [Cómo probar el flujo de pagos](howto-probar-pagos.md) | Firmar y enviar un webhook HMAC a mano; comprobar la idempotencia |
| [Cómo desplegar a producción](howto-desplegar.md) | Secretos, migraciones, publicación y checklist de producción |
| [Cómo desplegar en Render + Vercel, con tu dominio](howto-desplegar-render-vercel.md) | Instructivo detallado paso a paso: base de datos en Supabase, variables de Render y Vercel, DNS y webhook de Wompi |

---

## Referencia

Orientada a consultar. Descripción exacta, derivada del código.

| Documento | Cubre |
|---|---|
| [API REST](referencia-api.md) | Los 49 endpoints: autenticación, contratos de entrada y salida, códigos de error, límites |
| [Modelo de datos](referencia-modelo-datos.md) | 12 modelos Prisma, 5 enums, relaciones, índices, migraciones y seed |
| [Configuración](referencia-configuracion.md) | Todas las variables de entorno, scripts npm, Docker, CI y puertos |
| [Frontend](referencia-frontend.md) | Landing y demo de checkout, componentes, cliente de API, sistema de diseño |

---

## Explicación

Orientada a entender. El *porqué* y qué se sacrificó a cambio.

| Documento | Cubre |
|---|---|
| [Decisiones de diseño](explicacion-decisiones.md) | Hexagonal, stock a prueba de concurrencia, cupones atómicos, caché versionada, rotación de tokens, webhooks idempotentes, checkout de invitado, snapshots |
| [Modelo de seguridad](explicacion-seguridad.md) | Qué protege, cómo, y — con detalle — **qué no protege** |
| [ARCHITECTURE.md](../ARCHITECTURE.md) *(en la raíz)* | Las cuatro capas y la traza completa de una petición |

---

## Planificación

Documentos sobre el estado del proyecto y lo que falta. No describen cómo
funciona el sistema, sino hacia dónde va.

| Documento | Cubre |
|---|---|
| [Blueprint de finalización](pomass-tiendavirtual-blueprint.md) | Plan de 15 pasos hasta producción: Wompi, Supabase, Render, Vercel, seguimiento de pedido sin cuenta |
| [Análisis de brechas](analisis-brechas-blueprint.md) | Contraste del blueprint contra el código real: qué está hecho, qué falta, qué el blueprint no cubre |

---

## Documentación generada automáticamente

Con el backend corriendo, **<http://localhost:3000/api/docs>** sirve Swagger UI.
Se ensambla a partir de los fragmentos `*.openapi.ts` de cada módulo, así que
sale del mismo código que las rutas y no se desactualiza.

---

## Mapa del repositorio

```
PomAss_Paola/
├── README.md               visión general del monorepo
├── ARCHITECTURE.md         diseño del backend (capas + traza de petición)
├── CLAUDE.md               guía para agentes de código
├── docs/                   estás aquí
│
├── frontend/               React + Vite + Tailwind
│   ├── index.html          landing (venta por WhatsApp)
│   ├── checkout.html       demo de checkout (consume la API)
│   └── src/
│       ├── App.jsx         estado de la landing
│       ├── site.js         precio, WhatsApp, beneficios
│       ├── components/     componentes de la landing
│       └── checkout/       cliente de API + 5 pasos del checkout
│
└── backend/                Node + TypeScript + Express + Prisma + Redis
    ├── src/
    │   ├── modules/        auth, catalog, cart, orders, payments,
    │   │                   coupons, reviews, admin
    │   ├── shared/         config, DB, caché, errores, logger, middlewares, docs
    │   ├── routes.ts       monta todos los módulos
    │   ├── app.ts          ensambla Express
    │   └── main.ts         arranque
    ├── prisma/             schema, migraciones, seed
    └── tests/              unit/ (96, sin DB) · integration/ (16, con DB)
```
