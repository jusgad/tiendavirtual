# Panel de administración · especificación de diseño

| | |
|---|---|
| **Fecha** | 2026-08-29 |
| **Rama** | `feat/wompi-seguimiento-pedido` |
| **Punto de la lista** | P0 de [pendientes-lanzamiento.md](../../pendientes-lanzamiento.md) |
| **Estado** | Aprobado — pendiente de plan de implementación |

## Problema

El backend expone la gestión completa de la tienda por HTTP, pero **no existe
ninguna interfaz para usarla**. Hoy, despachar un pedido exige `curl` o Swagger.
Sin panel, la tienda no se puede operar aunque cobre correctamente.

Lo que ya existe y se consume tal cual:

| Área | Endpoints | Estado |
|---|---|---|
| Pedidos | `GET /admin/orders`, `GET /admin/orders/:id`, `PATCH /admin/orders/:id/status` | ✅ con rol ADMIN |
| Reportes | `GET /admin/reports/{sales,top-products,orders-by-status}` | ✅ |
| Catálogo | `POST/PATCH/DELETE` de `/products`, `/categories`, `/brands` | ✅ con rol ADMIN |
| Cupones | `GET/POST/PATCH` de `/coupons` | ✅ |
| Sesión | `POST /auth/login`, `POST /auth/refresh` | ✅ |

## Alcance

**Incluye:** pedidos, catálogo (productos, categorías, marcas), cupones y
reportes. Más el número de guía de transportadora, que se decide aquí porque la
pantalla que lo pide es esta.

**No incluye:** subida de archivos de imagen. Las imágenes se gestionan por URL,
que es lo que el backend acepta hoy (`url`, `alt`, `position`). La subida a un
bucket queda como punto propio de la lista de pendientes.

## Arquitectura

### Ubicación

Tercera entrada del Vite existente, junto a `index.html` y `checkout.html`:

```
frontend/admin.html                 nueva entrada en vite.config.js
frontend/src/admin-main.jsx
frontend/src/admin/
  AdminApp.jsx          shell: gate de sesión, barra lateral, enrutado
  router.js             enrutador hash propio
  api.js                cliente admin sobre el cliente HTTP compartido
  components/           Table, Badge, Modal, Money, Bars (SVG)
  pages/
    OrdersPage.jsx
    OrderDetailPage.jsx
    ProductsPage.jsx
    TaxonomyPage.jsx
    CouponsPage.jsx
    ReportsPage.jsx
frontend/src/shared/
  httpClient.js         extraído de checkout/api.js
  ui.jsx                extraído de checkout/components/ui.jsx
```

Se descartó una aplicación separada (duplicaría Vite, Tailwind, cliente HTTP y
un tercer despliegue) y el renderizado desde Express (rompe el diseño headless
del backend).

### Reutilización del cliente HTTP

El motor de `checkout/api.js` —renovación de token deduplicada, un único
reintento tras `401`, `setOnSessionExpired`— es la parte delicada del frontend y
ya tiene 10 tests. Se **extrae** a `src/shared/httpClient.js`; checkout y admin
lo consumen. El comportamiento del checkout no cambia: sus tests actuales son la
red de seguridad de la extracción y deben seguir pasando sin modificarse.

### Enrutado

Enrutador propio sobre `window.location.hash` (~40 líneas): da enlaces
profundos y botón atrás sin añadir dependencias. Rutas:

```
#/pedidos            #/pedidos/:id        #/productos
#/taxonomia          #/cupones            #/reportes
```

Ruta desconocida o vacía redirige a `#/pedidos`.

### Acceso

`AdminApp` monta un formulario de email y contraseña contra `POST /auth/login`.
Si el rol del usuario no es ADMIN, muestra «no autorizado» y no pinta el panel.

**Este gate es comodidad, no seguridad.** La protección real la impone el
backend con el guard de rol en cada ruta. El bundle del panel se publica en el
mismo dominio y eso es aceptable: no contiene secretos.

## Cambios de backend

Los únicos necesarios. Todo lo demás ya existe.

### 1. El detalle de pedido expone la dirección de envío

`AdminOrderDetail` solo trae `shipCity`. Para empacar y despachar hacen falta
los demás campos del snapshot, que ya están en la tabla `Order`:
`shipFullName`, `shipPhone`, `shipLine1`, `shipLine2`, `shipDepartment`,
`shipPostalCode`.

Cambia `domain/ports.ts` y `prismaAdminOrderRepository.ts`. No cambia el
resumen de la lista (`AdminOrderSummary`): ahí la ciudad basta.

### 2. Número de guía

Migración `0004`: `Order.trackingNumber` y `Order.carrier`, ambas columnas
**nullables** — un pedido solo tiene guía a partir de `SHIPPED`, y los pedidos
ya existentes no la tienen. La obligatoriedad se impone en la transición
(punto 3), no en el esquema.

### 3. La guía se asigna solo al despachar

`PATCH /admin/orders/:id/status` acepta `trackingNumber` y `carrier`
**únicamente** cuando la transición destino es `SHIPPED`; en cualquier otra se
rechazan con `BadRequestError`. La regla vive en `domain/orderTransitions.ts`,
junto a las transiciones permitidas, como función pura.

Al pasar a `SHIPPED` ambos campos son **obligatorios**: sin transportadora y
guía no se despacha. Un intento sin ellos se rechaza con `BadRequestError`, no
se acepta a medias. Esto garantiza que todo pedido en estado `SHIPPED` tenga
información de rastreo que mostrar al cliente.

### 4. El seguimiento público devuelve la guía

`OrderTrackingView` suma `trackingNumber` y `carrier`. Es información del propio
pedido de quien ya demostró conocer su número y correo; no amplía la superficie
de datos sensibles (sigue sin dirección completa, teléfono ni datos de pago).

### Lo que no se toca

Las transiciones permitidas, la prohibición de marcar `PAID` a mano y la
devolución de stock al cancelar. Están hechas y probadas.

## Pantallas

Lenguaje visual: paleta del checkout (crema, acento durazno) con densidad de
herramienta —barra lateral fija, tablas compactas, radios menores—. Cada tabla
resuelve sus tres estados: cargando, vacía y error.

### Pedidos · `#/pedidos`

Tabla: nº de pedido, fecha, correo de contacto, ciudad, total, estado como
distintivo de color. Filtro por estado en píldoras (incluida «Todos»),
paginación servida por el backend (`page`, `pageSize`, máximo 100) y botón de
actualizar. La fila lleva al detalle.

### Detalle de pedido · `#/pedidos/:id`

- Cabecera: nº de pedido y estado.
- Envío: nombre, teléfono, dirección completa, ciudad y departamento. El aviso
  de **empaque discreto** se destaca, porque cambia cómo se empaca.
- Artículos y totales desglosados (subtotal, descuento, envío, total).
- Acciones: **se pintan desde el `allowedTransitions` que devuelve el backend**.
  El panel no duplica la regla de transiciones.

Dos diálogos:

| Acción | Diálogo |
|---|---|
| Marcar enviado | Pide transportadora y guía, **ambas obligatorias**. El botón de confirmar queda inhabilitado hasta que estén completas |
| Cancelar | Confirma e indica si la cancelación devuelve stock (lo decide el backend según el estado) |

### Productos · `#/productos`

Tabla: nombre, SKU, precio, stock, categoría, marca, activo.

Formulario de alta y edición con los campos que acepta el backend: nombre,
**SKU** (obligatorio), descripción, marca, categoría, precio, stock,
presentación, tamaño en ml, tipo de uso, tipo de piel, ingredientes,
advertencias y activo.

> El `slug` **no** es campo del formulario: lo genera el backend desde el
> nombre, y resuelve colisiones añadiendo un sufijo.

Imágenes: lista de URL con vista previa, texto alternativo y reordenar o
borrar. La posición se deriva del orden de la lista.

Al eliminar un producto con pedidos asociados el backend responde con conflicto
(P2003, ya mapeado por el manejador de errores). Se muestra el mensaje y se
sugiere desactivarlo en lugar de borrarlo.

### Categorías y marcas · `#/taxonomia`

Dos tablas con alta y edición en línea. Categorías: nombre, descripción, padre,
activa. Marcas: nombre, descripción, logo (URL), activa.

### Cupones · `#/cupones`

Tabla: código, tipo, valor, usos/máximo, vigencia, activo. Formulario con
código, tipo (porcentual o fijo), valor, compra mínima, máximo de usos, límite
por usuario y fechas de inicio y fin.

**Aviso permanente en la pantalla**: el límite por usuario no se aplica a
compras de invitado —solo el tope global de usos—. Ocultarlo llevaría a confiar
en un límite que no existe (punto R2 de la lista de pendientes).

### Reportes · `#/reportes`

Tarjetas con pedidos e ingresos del periodo, selector de rango y agrupación
(día/mes), tabla de ventas por periodo con barras SVG, top de productos con
barras y conteo de pedidos por estado. El backend ya resuelve el rango por
defecto y el límite del top.

Barras dibujadas con SVG plano (~30 líneas). Se descartó una librería de
gráficas: una dependencia pesada para tres reportes.

### Transversal

- Dinero y fechas con `Intl` en `es-CO`.
- Los mensajes de error del backend ya vienen en español: se muestran tal cual.
- Sesión expirada: `setOnSessionExpired` devuelve al login con aviso.

## Pruebas

**Backend** (Jest, fakes en memoria, como el resto del módulo):

- La guía se acepta al pasar a `SHIPPED` y se rechaza en toda otra transición.
- Pasar a `SHIPPED` sin transportadora o sin guía se rechaza.
- El detalle de pedido expone el snapshot de envío completo.
- El seguimiento público devuelve la guía cuando existe y no filtra nada más.

**Frontend** (Vitest, sin dependencias nuevas):

- Enrutador: parseo del hash, parámetros, ruta desconocida.
- Cliente admin, con `fetch` simulado.
- Lógica pura de las páginas, extraída a funciones: construcción de filtros y
  paginación, mapeo de `allowedTransitions` a botones, validación del
  formulario de producto.

Se mantiene el estilo actual —probar lógica pura y el cliente HTTP— en lugar de
introducir `@testing-library/react`, que hoy no está en el proyecto.

**Verificación en navegador** del flujo completo antes de dar por terminada cada
fase.

## Orden de entrega

| Fase | Contenido | Resultado |
|---|---|---|
| F1 | Backend: envío completo, guía, migración `0004` | API lista |
| F2 | Shell: login, enrutador, extracción del cliente HTTP y la UI compartida | Panel navegable |
| F3 | Pedidos: lista, detalle, transiciones, diálogos | **Ya se puede operar la tienda** |
| F4 | Catálogo: productos, categorías, marcas | |
| F5 | Cupones | |
| F6 | Reportes | |

Al terminar F3 el panel cumple su objetivo; F4–F6 son mejoras acumulativas y
pueden posponerse si otro punto de la lista se vuelve más urgente.

## Relacionado

- [Pendientes para lanzar](../../pendientes-lanzamiento.md)
- [Análisis de brechas](../../analisis-brechas-blueprint.md)
- [Referencia: API REST](../../referencia-api.md)
