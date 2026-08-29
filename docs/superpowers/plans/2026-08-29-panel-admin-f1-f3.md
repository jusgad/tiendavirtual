# Panel de administración · Plan de implementación (F1–F3)

> **Para trabajadores agénticos:** SUB-SKILL REQUERIDA: usa
> `superpowers:subagent-driven-development` (recomendado) o
> `superpowers:executing-plans` para ejecutar este plan tarea por tarea. Los
> pasos usan casillas (`- [ ]`) para seguimiento.

**Objetivo:** Construir el panel de administración hasta el punto en que la
tienda se puede operar: iniciar sesión, ver pedidos, abrir el detalle con la
dirección de envío y avanzar o cancelar el estado, registrando la guía de la
transportadora al despachar.

**Arquitectura:** El backend gana el snapshot de envío en el detalle de pedido y
dos columnas de rastreo; la regla «la guía solo se registra al pasar a
`SHIPPED`, y ahí es obligatoria» vive como función pura junto a las transiciones
existentes. El frontend añade una tercera entrada de Vite (`admin.html`) que
reutiliza el cliente HTTP del checkout —extraído a `src/shared/`— y navega con
un enrutador hash propio.

**Stack:** Backend Node + TypeScript + Express + Prisma (PostgreSQL), tests con
Jest y fakes en memoria. Frontend React 18 + Vite + Tailwind, tests con Vitest.

**Especificación:** [2026-08-29-panel-administracion-design.md](../specs/2026-08-29-panel-administracion-design.md)

**Alcance de este plan:** F1 (backend), F2 (shell del panel) y F3 (pedidos).
El catálogo, los cupones y los reportes van en un plan posterior.

## Restricciones globales

- **Idioma:** comentarios, mensajes de error y textos de interfaz en **español**.
  Los identificadores de código siguen el estilo del repo (inglés en tipos y
  funciones del dominio, español en variables locales donde ya se usa).
- **Imports relativos siempre.** No hay alias de rutas configurados y es
  deliberado (mantiene simple la resolución en tsx/jest/tsc/docker).
- **Sin dependencias nuevas** en `frontend/package.json` ni en
  `backend/package.json`. Ni enrutador, ni librería de gráficas, ni
  `@testing-library/react`.
- **Errores de dominio:** los casos de uso y el dominio lanzan las clases de
  `backend/src/shared/errors/AppError` (`BadRequestError`, `ConflictError`,
  `NotFoundError`). Nunca códigos HTTP directos.
- **Regla de dependencias del backend:** `interfaces/http → application →
  domain ← infrastructure`. El dominio no importa Express ni Prisma.
- **Los tests actuales del checkout no se modifican.** Son la red de seguridad
  de la extracción del cliente HTTP: si hay que tocarlos, la extracción está mal.
- **Comandos de verificación** (desde `backend/` y `frontend/` respectivamente):
  `npm run test:unit`, `npm run typecheck`, `npm run lint`, `npm test`.
- **Docker no arranca en esta máquina**: los tests de integración no se pueden
  ejecutar localmente. Se validan en CI. Todo lo de este plan se cubre con
  tests unitarios.

## Estructura de archivos

**Backend — se modifican:**

| Archivo | Responsabilidad tras el cambio |
|---|---|
| `src/modules/admin/domain/orderTransitions.ts` | Suma la regla de datos de despacho |
| `src/modules/admin/domain/ports.ts` | `AdminOrderDetail` con envío y rastreo; `updateStatus` recibe el despacho |
| `src/modules/admin/application/orderAdminUseCases.ts` | `UpdateOrderStatusUseCase` valida y propaga el despacho |
| `src/modules/admin/infrastructure/prismaAdminOrderRepository.ts` | Mapea el snapshot de envío y escribe la guía |
| `src/modules/admin/interfaces/http/admin.dto.ts` | `updateOrderStatusSchema` acepta `carrier` y `trackingNumber` |
| `src/modules/admin/interfaces/http/admin.controller.ts` | Arma el objeto de despacho desde el cuerpo |
| `src/modules/admin/interfaces/http/admin.openapi.ts` | Documenta los campos nuevos |
| `src/modules/orders/domain/ports.ts` | `OrderTrackingView` con guía |
| `src/modules/orders/infrastructure/prismaOrderRepository.ts` | Devuelve la guía en el seguimiento |
| `src/modules/orders/interfaces/http/orders.openapi.ts` | Documenta la guía en el seguimiento |
| `prisma/schema.prisma` | Columnas `carrier` y `trackingNumber` |
| `prisma/migrations/0004_order_tracking/migration.sql` | Nueva |
| `tests/unit/admin/fakes.ts` | El fake refleja los campos nuevos |

**Frontend — se crean:**

| Archivo | Responsabilidad |
|---|---|
| `src/shared/httpClient.js` | Motor HTTP: sesión, renovación de token, reintento |
| `src/shared/format.js` | `formatCOP`, `formatFecha` |
| `src/shared/ui.jsx` | `Card`, `Field`, `Input`, `PrimaryButton`, `SecondaryButton`, `ErrorBanner` |
| `admin.html` | Tercera entrada de Vite |
| `src/admin-main.jsx` | Punto de montaje |
| `src/admin/AdminApp.jsx` | Shell: gate de sesión, barra lateral, enrutado |
| `src/admin/LoginGate.jsx` | Formulario de acceso y verificación de rol |
| `src/admin/router.js` | Enrutador hash |
| `src/admin/api.js` | Cliente de los endpoints `/admin` |
| `src/admin/components/ui.jsx` | `Table`, `Badge`, `Modal`, `Toolbar` |
| `src/admin/orders/OrdersPage.jsx` | Lista de pedidos |
| `src/admin/orders/OrderDetailPage.jsx` | Detalle de pedido |
| `src/admin/orders/ShipDialog.jsx` | Diálogo de despacho |
| `src/admin/orders/CancelDialog.jsx` | Diálogo de cancelación |
| `src/admin/orders/ordersModel.js` | Lógica pura: etiquetas, query, paginación, acciones |

**Frontend — se modifican:** `vite.config.js` (entrada `admin`),
`tailwind.config.js` (contenido `./admin.html`), `src/checkout/api.js`
(reexporta desde `shared/`), `src/checkout/components/ui.jsx` (reexporta desde
`shared/`).

---

# F1 · Backend

### Task 1: Regla de datos de despacho en el dominio

**Archivos:**
- Modificar: `backend/src/modules/admin/domain/orderTransitions.ts`
- Test: `backend/tests/unit/admin/orderTransitions.test.ts`

**Interfaces:**
- Consume: `OrderStatus` de `./orderStatus`, `BadRequestError` de `shared/errors/AppError`.
- Produce: `export interface ShipmentData { carrier: string; trackingNumber: string }`
  y `export function assertShipmentDataFor(to: OrderStatus, shipment?: Partial<ShipmentData>): void`.
  La usan la Task 4 (caso de uso) y la Task 5 (controlador, indirectamente).

- [ ] **Paso 1: Escribir el test que falla**

Añadir al final de `backend/tests/unit/admin/orderTransitions.test.ts`, **antes**
del bloque `expect.extend` que cierra el archivo:

```ts
describe('assertShipmentDataFor', () => {
  it('exige transportadora y guía al marcar como enviado', () => {
    expect(() =>
      assertShipmentDataFor(OrderStatus.SHIPPED, { carrier: 'Servientrega', trackingNumber: 'ABC123' }),
    ).not.toThrow()
  })

  it('rechaza (400) despachar sin datos de despacho', () => {
    expect(() => assertShipmentDataFor(OrderStatus.SHIPPED)).toMatchErrorStatus(400)
    expect(() => assertShipmentDataFor(OrderStatus.SHIPPED, {})).toMatchErrorStatus(400)
  })

  it('rechaza (400) despachar con solo uno de los dos campos', () => {
    expect(() => assertShipmentDataFor(OrderStatus.SHIPPED, { carrier: 'Servientrega' })).toMatchErrorStatus(400)
    expect(() => assertShipmentDataFor(OrderStatus.SHIPPED, { trackingNumber: 'ABC123' })).toMatchErrorStatus(400)
  })

  it('rechaza (400) datos de despacho en cualquier otra transición', () => {
    expect(() =>
      assertShipmentDataFor(OrderStatus.PREPARING, { carrier: 'Servientrega', trackingNumber: 'ABC123' }),
    ).toMatchErrorStatus(400)
    expect(() =>
      assertShipmentDataFor(OrderStatus.CANCELLED, { trackingNumber: 'ABC123' }),
    ).toMatchErrorStatus(400)
  })

  it('acepta transiciones sin datos de despacho', () => {
    expect(() => assertShipmentDataFor(OrderStatus.PREPARING)).not.toThrow()
    expect(() => assertShipmentDataFor(OrderStatus.DELIVERED)).not.toThrow()
  })
})
```

Y ampliar la línea de importación del archivo:

```ts
import {
  allowedTransitionsFrom,
  assertShipmentDataFor,
  assertTransitionAllowed,
  cancellationRestoresStock,
} from '../../../src/modules/admin/domain/orderTransitions'
```

- [ ] **Paso 2: Ejecutar el test para verificar que falla**

Ejecutar desde `backend/`:

```bash
npx jest tests/unit/admin/orderTransitions.test.ts
```

Esperado: FALLA con `assertShipmentDataFor is not a function` (o error de
compilación de TypeScript: el módulo no exporta ese símbolo).

- [ ] **Paso 3: Implementar**

Añadir al final de `backend/src/modules/admin/domain/orderTransitions.ts`:

```ts
/** Datos del despacho. Solo existen a partir de que el pedido se envía. */
export interface ShipmentData {
  carrier: string
  trackingNumber: string
}

/**
 * Valida los datos de despacho contra la transición destino.
 *
 * Son obligatorios al pasar a SHIPPED —un pedido enviado sin guía deja al
 * cliente sin nada que rastrear— y están prohibidos en cualquier otra
 * transición: la guía se conoce al despachar, no antes ni después.
 */
export function assertShipmentDataFor(to: OrderStatus, shipment?: Partial<ShipmentData>): void {
  const tieneDatos = Boolean(shipment?.carrier || shipment?.trackingNumber)

  if (to !== OrderStatus.SHIPPED) {
    if (tieneDatos) {
      throw new BadRequestError(
        'La transportadora y el número de guía solo se registran al marcar el pedido como enviado',
      )
    }
    return
  }

  if (!shipment?.carrier || !shipment?.trackingNumber) {
    throw new BadRequestError(
      'Para marcar el pedido como enviado debes registrar la transportadora y el número de guía',
    )
  }
}
```

- [ ] **Paso 4: Ejecutar los tests para verificar que pasan**

```bash
npx jest tests/unit/admin/orderTransitions.test.ts
```

Esperado: PASAN todos, incluidos los que ya existían.

- [ ] **Paso 5: Confirmar**

```bash
git add backend/src/modules/admin/domain/orderTransitions.ts backend/tests/unit/admin/orderTransitions.test.ts
git commit -m "feat(admin): exige transportadora y guía al despachar un pedido"
```

---

### Task 2: Migración de las columnas de rastreo

**Archivos:**
- Modificar: `backend/prisma/schema.prisma` (modelo `Order`, tras `guestEmail`)
- Crear: `backend/prisma/migrations/0004_order_tracking/migration.sql`

**Interfaces:**
- Produce: las columnas `carrier` y `trackingNumber` en la tabla `orders`, que
  la Task 3 lee y escribe vía Prisma.

- [ ] **Paso 1: Añadir los campos al esquema**

En `backend/prisma/schema.prisma`, dentro de `model Order`, justo después de la
línea de `guestEmail`:

```prisma
  // Rastreo del envío. Nullables: un pedido solo tiene guía a partir de SHIPPED.
  carrier           String? // transportadora (Servientrega, Interrapidísimo, …)
  trackingNumber    String? // número de guía que el cliente usa para rastrear
```

- [ ] **Paso 2: Verificar que el esquema es válido**

```bash
npx prisma validate
```

Esperado: `The schema at prisma\schema.prisma is valid 🚀`

- [ ] **Paso 3: Escribir la migración**

Crear `backend/prisma/migrations/0004_order_tracking/migration.sql`:

```sql
-- Rastreo del envío en el pedido.
--
-- Ambas columnas son nullables a propósito: un pedido solo tiene guía a partir
-- del momento en que se despacha (SHIPPED), y los pedidos ya existentes no la
-- tienen. La obligatoriedad se impone en la transición de estado, no aquí.
ALTER TABLE "orders" ADD COLUMN "carrier" TEXT;
ALTER TABLE "orders" ADD COLUMN "trackingNumber" TEXT;
```

- [ ] **Paso 4: Verificar que la migración coincide con el esquema**

Esta es la técnica que ya se usó para las migraciones anteriores y **no
necesita base de datos**:

```bash
npx prisma migrate diff --from-migrations prisma/migrations --to-schema-datamodel prisma/schema.prisma --shadow-database-url "prisma://none" --exit-code
```

Esperado: código de salida `0` y sin diferencias. Si reporta diferencias, la
migración escrita a mano no coincide con el esquema: corrige el SQL.

> Si ese comando falla por no poder crear la base de datos sombra, la
> alternativa sin BD es revisar a ojo que el SQL añada exactamente las dos
> columnas del esquema. No inventes otra técnica ni levantes Docker.

- [ ] **Paso 5: Regenerar el cliente de Prisma**

```bash
npx prisma generate
```

Esperado: `Generated Prisma Client`. Sin esto, TypeScript no conoce los campos
nuevos y la Task 3 no compila.

- [ ] **Paso 6: Confirmar**

```bash
git add backend/prisma/schema.prisma backend/prisma/migrations/0004_order_tracking
git commit -m "feat(db): agrega carrier y trackingNumber al pedido"
```

---

### Task 3: El detalle de pedido expone envío y rastreo

**Archivos:**
- Modificar: `backend/src/modules/admin/domain/ports.ts` (interfaz `AdminOrderDetail`)
- Modificar: `backend/src/modules/admin/infrastructure/prismaAdminOrderRepository.ts` (`toDetail`)
- Modificar: `backend/tests/unit/admin/fakes.ts` (función `detalle`)
- Test: `backend/tests/unit/admin/orderAdminUseCases.test.ts`

**Interfaces:**
- Consume: `ShipmentData` de la Task 1.
- Produce: `AdminOrderDetail` con ocho campos nuevos (`shipFullName`,
  `shipPhone`, `shipLine1`, `shipLine2`, `shipDepartment`, `shipPostalCode`,
  `carrier`, `trackingNumber`), todos `string | null`. Los consumen la Task 4,
  la Task 5 y la pantalla de detalle (Task 13).

- [ ] **Paso 1: Escribir el test que falla**

Añadir a `backend/tests/unit/admin/orderAdminUseCases.test.ts`, dentro de un
`describe` nuevo al final del archivo:

```ts
describe('GetOrderUseCase · datos de despacho', () => {
  it('expone el snapshot de envío completo, necesario para empacar', async () => {
    const repo = repoConPedido(OrderStatus.PAID)

    const order = await new GetOrderUseCase(repo).execute('order-1')

    expect(order).toMatchObject({
      shipFullName: 'Ana Gómez',
      shipPhone: '3001234567',
      shipLine1: 'Calle 10 # 20-30',
      shipDepartment: 'Antioquia',
    })
  })

  it('un pedido sin despachar no tiene transportadora ni guía', async () => {
    const repo = repoConPedido(OrderStatus.PAID)

    const order = await new GetOrderUseCase(repo).execute('order-1')

    expect(order.carrier).toBeNull()
    expect(order.trackingNumber).toBeNull()
  })
})
```

- [ ] **Paso 2: Ejecutar el test para verificar que falla**

```bash
npx jest tests/unit/admin/orderAdminUseCases.test.ts
```

Esperado: FALLA — el fake no devuelve esos campos y TypeScript no los conoce.

- [ ] **Paso 3: Ampliar el puerto**

En `backend/src/modules/admin/domain/ports.ts`, reemplazar la interfaz
`AdminOrderDetail` por:

```ts
export interface AdminOrderDetail extends AdminOrderSummary {
  subtotal: number
  discountTotal: number
  shippingTotal: number
  discreetPackaging: boolean
  // Snapshot de envío: es lo que se necesita para empacar y despachar.
  shipFullName: string | null
  shipPhone: string | null
  shipLine1: string | null
  shipLine2: string | null
  shipDepartment: string | null
  shipPostalCode: string | null
  // Rastreo: se llenan al pasar el pedido a SHIPPED.
  carrier: string | null
  trackingNumber: string | null
  items: AdminOrderItem[]
}
```

- [ ] **Paso 4: Mapear los campos en el repositorio**

En `backend/src/modules/admin/infrastructure/prismaAdminOrderRepository.ts`,
reemplazar la función `toDetail` por:

```ts
function toDetail(o: OrderRow): AdminOrderDetail {
  return {
    ...toSummary(o),
    subtotal: Number(o.subtotal),
    discountTotal: Number(o.discountTotal),
    shippingTotal: Number(o.shippingTotal),
    discreetPackaging: o.discreetPackaging,
    shipFullName: o.shipFullName,
    shipPhone: o.shipPhone,
    shipLine1: o.shipLine1,
    shipLine2: o.shipLine2,
    shipDepartment: o.shipDepartment,
    shipPostalCode: o.shipPostalCode,
    carrier: o.carrier,
    trackingNumber: o.trackingNumber,
    items: o.items.map((it) => ({
      productId: it.productId,
      productName: it.productName,
      quantity: it.quantity,
      lineTotal: Number(it.lineTotal),
    })),
  }
}
```

- [ ] **Paso 5: Actualizar el fake**

En `backend/tests/unit/admin/fakes.ts`, reemplazar la función `detalle` por:

```ts
function detalle(base: { id: string; orderNumber: string; status: OrderStatus }): AdminOrderDetail {
  return {
    ...base,
    total: 79900,
    currency: 'COP',
    contactEmail: 'ana@correo.com',
    shipCity: 'Medellín',
    createdAt: new Date('2026-08-01T10:00:00Z'),
    subtotal: 79900,
    discountTotal: 0,
    shippingTotal: 0,
    discreetPackaging: false,
    shipFullName: 'Ana Gómez',
    shipPhone: '3001234567',
    shipLine1: 'Calle 10 # 20-30',
    shipLine2: 'Apto 501',
    shipDepartment: 'Antioquia',
    shipPostalCode: '050001',
    carrier: null,
    trackingNumber: null,
    items: [{ productId: 'prod-1', productName: 'Estuche PomAss Día + Noche', quantity: 1, lineTotal: 79900 }],
  }
}
```

- [ ] **Paso 6: Ejecutar los tests y el typecheck**

```bash
npx jest tests/unit/admin
```

Esperado: PASAN.

```bash
npm run typecheck
```

Esperado: sin errores.

- [ ] **Paso 7: Confirmar**

```bash
git add backend/src/modules/admin backend/tests/unit/admin/fakes.ts backend/tests/unit/admin/orderAdminUseCases.test.ts
git commit -m "feat(admin): el detalle de pedido expone la dirección de envío y el rastreo"
```

---

### Task 4: El caso de uso registra el despacho

**Archivos:**
- Modificar: `backend/src/modules/admin/domain/ports.ts` (firma de `updateStatus`)
- Modificar: `backend/src/modules/admin/application/orderAdminUseCases.ts`
- Modificar: `backend/src/modules/admin/infrastructure/prismaAdminOrderRepository.ts`
- Modificar: `backend/tests/unit/admin/fakes.ts`
- Test: `backend/tests/unit/admin/orderAdminUseCases.test.ts`

**Interfaces:**
- Consume: `assertShipmentDataFor` y `ShipmentData` (Task 1); `AdminOrderDetail`
  ampliado (Task 3).
- Produce:
  `UpdateOrderStatusUseCase.execute(id: string, to: OrderStatus, shipment?: ShipmentData): Promise<AdminOrderDetail>`
  y el puerto
  `AdminOrderRepository.updateStatus(id: string, status: OrderStatus, restoreStock: boolean, shipment?: ShipmentData): Promise<AdminOrderDetail>`.
  Los consume la Task 5.

- [ ] **Paso 1: Escribir el test que falla**

Añadir a `backend/tests/unit/admin/orderAdminUseCases.test.ts` dentro del
`describe('UpdateOrderStatusUseCase', ...)` existente:

```ts
  it('guarda transportadora y guía al despachar', async () => {
    const repo = repoConPedido(OrderStatus.PREPARING)

    const res = await new UpdateOrderStatusUseCase(repo, new SpyCatalogCache()).execute(
      'order-1',
      OrderStatus.SHIPPED,
      { carrier: 'Servientrega', trackingNumber: 'ABC123' },
    )

    expect(res.status).toBe(OrderStatus.SHIPPED)
    expect(res.carrier).toBe('Servientrega')
    expect(res.trackingNumber).toBe('ABC123')
  })

  it('rechaza (400) despachar sin guía', async () => {
    const useCase = new UpdateOrderStatusUseCase(repoConPedido(OrderStatus.PREPARING), new SpyCatalogCache())

    await expect(useCase.execute('order-1', OrderStatus.SHIPPED)).rejects.toMatchObject({ statusCode: 400 })
  })

  it('rechaza (400) datos de despacho en una transición que no es el envío', async () => {
    const useCase = new UpdateOrderStatusUseCase(repoConPedido(OrderStatus.PAID), new SpyCatalogCache())

    await expect(
      useCase.execute('order-1', OrderStatus.PREPARING, { carrier: 'Servientrega', trackingNumber: 'ABC123' }),
    ).rejects.toMatchObject({ statusCode: 400 })
  })

  it('valida la transición ANTES que los datos de despacho', async () => {
    // PAID → SHIPPED se salta un paso: debe dar 409 aunque falte también la guía.
    const useCase = new UpdateOrderStatusUseCase(repoConPedido(OrderStatus.PAID), new SpyCatalogCache())

    await expect(useCase.execute('order-1', OrderStatus.SHIPPED)).rejects.toMatchObject({ statusCode: 409 })
  })
```

- [ ] **Paso 2: Ejecutar el test para verificar que falla**

```bash
npx jest tests/unit/admin/orderAdminUseCases.test.ts
```

Esperado: FALLA — `execute` todavía no acepta un tercer argumento.

- [ ] **Paso 3: Ampliar el puerto del repositorio**

En `backend/src/modules/admin/domain/ports.ts`, reemplazar el método
`updateStatus` de `AdminOrderRepository` por:

```ts
  /**
   * Cambia el estado del pedido. `restoreStock` devuelve las unidades al
   * catálogo (cancelaciones antes del despacho); debe ocurrir en la misma
   * transacción que el cambio de estado. `shipment` solo llega al despachar.
   */
  updateStatus(
    id: string,
    status: OrderStatus,
    restoreStock: boolean,
    shipment?: ShipmentData,
  ): Promise<AdminOrderDetail>
```

Y añadir el import al principio del archivo:

```ts
import { ShipmentData } from './orderTransitions'
```

- [ ] **Paso 4: Implementar en el caso de uso**

En `backend/src/modules/admin/application/orderAdminUseCases.ts`, ampliar el
import de transiciones y reemplazar el método `execute` de
`UpdateOrderStatusUseCase`:

```ts
import {
  assertShipmentDataFor,
  assertTransitionAllowed,
  cancellationRestoresStock,
  ShipmentData,
} from '../domain/orderTransitions'
```

```ts
  async execute(id: string, to: OrderStatus, shipment?: ShipmentData): Promise<AdminOrderDetail> {
    const order = await this.orders.findById(id)
    if (!order) throw new NotFoundError('Pedido no encontrado')

    // El orden importa: primero si la transición cabe, después si los datos que
    // la acompañan son los correctos. Al revés, un salto de estado se reportaría
    // como "falta la guía", que despista a quien opera.
    assertTransitionAllowed(order.status, to)
    assertShipmentDataFor(to, shipment)

    const restoreStock = to === OrderStatus.CANCELLED && cancellationRestoresStock(order.status)
    const updated = await this.orders.updateStatus(id, to, restoreStock, shipment)

    // Solo si volvieron unidades al inventario cambia lo que el catálogo
    // muestra; invalidar siempre sería tirar el caché sin motivo.
    if (restoreStock) await this.catalogCache.invalidate()

    return updated
  }
```

- [ ] **Paso 5: Implementar en el repositorio de Prisma**

En `backend/src/modules/admin/infrastructure/prismaAdminOrderRepository.ts`,
reemplazar la firma y el `tx.order.update` del método `updateStatus`:

```ts
  async updateStatus(
    id: string,
    status: OrderStatus,
    restoreStock: boolean,
    shipment?: ShipmentData,
  ): Promise<AdminOrderDetail> {
```

```ts
      return tx.order.update({
        where: { id },
        data: {
          status: toPrismaOrderStatus(status),
          ...(shipment ? { carrier: shipment.carrier, trackingNumber: shipment.trackingNumber } : {}),
        },
        include: INCLUDE,
      })
```

Y añadir a los imports del archivo:

```ts
import { ShipmentData } from '../domain/orderTransitions'
```

- [ ] **Paso 6: Actualizar el fake**

En `backend/tests/unit/admin/fakes.ts`, reemplazar el método `updateStatus` de
`InMemoryAdminOrderRepository`:

```ts
  async updateStatus(
    id: string,
    status: OrderStatus,
    restoreStock: boolean,
    shipment?: ShipmentData,
  ): Promise<AdminOrderDetail> {
    this.lastRestoreStock = restoreStock
    const order = this.orders.find((o) => o.id === id)!
    order.status = status
    if (shipment) {
      order.carrier = shipment.carrier
      order.trackingNumber = shipment.trackingNumber
    }
    return order
  }
```

Y añadir a los imports del fake:

```ts
import { ShipmentData } from '../../../src/modules/admin/domain/orderTransitions'
```

- [ ] **Paso 7: Ejecutar los tests y el typecheck**

```bash
npx jest tests/unit/admin
```

Esperado: PASAN, incluidos los cuatro casos nuevos.

```bash
npm run typecheck
```

Esperado: sin errores.

- [ ] **Paso 8: Confirmar**

```bash
git add backend/src/modules/admin backend/tests/unit/admin
git commit -m "feat(admin): registra transportadora y guía al pasar el pedido a enviado"
```

---

### Task 5: La API acepta los datos de despacho

**Archivos:**
- Modificar: `backend/src/modules/admin/interfaces/http/admin.dto.ts`
- Modificar: `backend/src/modules/admin/interfaces/http/admin.controller.ts`
- Modificar: `backend/src/modules/admin/interfaces/http/admin.openapi.ts`

**Interfaces:**
- Consume: `UpdateOrderStatusUseCase.execute(id, to, shipment?)` (Task 4).
- Produce: `PATCH /admin/orders/:id/status` acepta el cuerpo
  `{ status, carrier?, trackingNumber? }`. Lo consume el cliente del panel
  (Task 11) y el diálogo de despacho (Task 14).

- [ ] **Paso 1: Ampliar el DTO**

En `backend/src/modules/admin/interfaces/http/admin.dto.ts`, reemplazar
`updateOrderStatusSchema` por:

```ts
export const updateOrderStatusSchema = z.object({
  status: z.enum(ORDER_STATUSES),
  // Solo válidos al pasar a SHIPPED; el dominio impone esa regla y la
  // obligatoriedad. Aquí solo se valida la forma.
  carrier: z.string().trim().min(1).max(80).optional(),
  trackingNumber: z.string().trim().min(1).max(80).optional(),
})
```

- [ ] **Paso 2: Propagar desde el controlador**

En `backend/src/modules/admin/interfaces/http/admin.controller.ts`, reemplazar
el método `updateOrderStatus` de `AdminOrdersController`:

```ts
  updateOrderStatus = async (req: Request, res: Response) => {
    const { status, carrier, trackingNumber } = req.body as {
      status: OrderStatus
      carrier?: string
      trackingNumber?: string
    }

    // Se pasa el objeto en cuanto llega CUALQUIERA de los dos campos: así el
    // dominio puede rechazar un despacho a medias en vez de ignorarlo.
    const shipment = carrier || trackingNumber ? { carrier: carrier!, trackingNumber: trackingNumber! } : undefined

    const order = await this.updateStatus.execute(req.params.id, status, shipment)
    res.json({ order, allowedTransitions: allowedTransitionsFrom(order.status) })
  }
```

- [ ] **Paso 3: Documentar en OpenAPI**

En `backend/src/modules/admin/interfaces/http/admin.openapi.ts`, el
`requestBody` del `PATCH /admin/orders/{id}/status` está en la línea ≈107.
Reemplazar su bloque `properties` por:

```ts
              properties: {
                status: {
                  type: 'string',
                  enum: ['PREPARING', 'SHIPPED', 'DELIVERED', 'CANCELLED'],
                },
                carrier: {
                  type: 'string',
                  description:
                    'Transportadora. Obligatoria junto con trackingNumber al pasar a SHIPPED; ' +
                    'prohibida en cualquier otra transición.',
                  example: 'Servientrega',
                },
                trackingNumber: {
                  type: 'string',
                  description: 'Número de guía. Obligatorio junto con carrier al pasar a SHIPPED.',
                  example: 'ABC123456789',
                },
              },
```

Y ampliar la descripción del `400` que hay en `responses` (línea ≈126):

```ts
        400: {
          description:
            'Ya está en ese estado, se intentó marcar PAID a mano, se despachó sin transportadora ' +
            'o guía, o se enviaron datos de despacho en una transición que no es el envío',
        },
```

- [ ] **Paso 4: Verificar**

```bash
npm run typecheck && npm run lint && npm run test:unit
```

Esperado: los tres limpios.

- [ ] **Paso 5: Confirmar**

```bash
git add backend/src/modules/admin/interfaces/http
git commit -m "feat(admin): PATCH de estado acepta transportadora y guía"
```

---

### Task 6: El seguimiento público devuelve la guía

**Archivos:**
- Modificar: `backend/src/modules/orders/domain/ports.ts` (`OrderTrackingView`)
- Modificar: `backend/src/modules/orders/infrastructure/prismaOrderRepository.ts` (`findForTracking`)
- Modificar: `backend/src/modules/orders/interfaces/http/orders.openapi.ts`
- Test: `backend/tests/unit/orders/orderQueries.test.ts`

**Interfaces:**
- Produce: `OrderTrackingView` con `carrier: string | null` y
  `trackingNumber: string | null`. Lo consume la futura página de seguimiento
  (punto B1 de la lista de pendientes), fuera de este plan.

- [ ] **Paso 1: Escribir el test que falla**

En `backend/tests/unit/orders/orderQueries.test.ts`, el objeto `seguimiento`
(línea ~75) es el `OrderTrackingView` que devuelve el fake `FakeTrackingRepo`.
Añadirle los dos campos nuevos:

```ts
const seguimiento: OrderTrackingView = {
  orderNumber: 'PA-2026-000001',
  status: 'SHIPPED',
  total: 58800,
  currency: 'COP',
  shipCity: 'Medellín',
  carrier: 'Servientrega',
  trackingNumber: 'ABC123',
  items: [{ productName: 'Estuche PomAss Día + Noche', quantity: 1, lineTotal: 79900 }],
  createdAt: new Date('2026-08-01T10:00:00Z'),
}
```

Y añadir el caso dentro del `describe('TrackOrderUseCase', …)` existente:

```ts
  it('devuelve la guía cuando el pedido ya se despachó', async () => {
    const repo = new FakeTrackingRepo(seguimiento)

    const res = await new TrackOrderUseCase(repo).execute('PA-2026-000001', 'ana@correo.com')

    expect(res).toMatchObject({ carrier: 'Servientrega', trackingNumber: 'ABC123' })
  })
```

- [ ] **Paso 2: Ejecutar el test para verificar que falla**

```bash
npx jest tests/unit/orders/orderQueries.test.ts
```

Esperado: FALLA — `carrier` y `trackingNumber` no existen en el tipo.

- [ ] **Paso 3: Ampliar la vista de seguimiento**

En `backend/src/modules/orders/domain/ports.ts`, reemplazar `OrderTrackingView`:

```ts
export interface OrderTrackingView {
  orderNumber: string
  status: OrderStatus
  total: number
  currency: string
  /** Solo la ciudad de destino: suficiente para reconocer el pedido. */
  shipCity: string | null
  /** Rastreo: null mientras el pedido no se haya despachado. */
  carrier: string | null
  trackingNumber: string | null
  items: { productName: string; quantity: number; lineTotal: number }[]
  createdAt: Date
}
```

- [ ] **Paso 4: Devolverlos desde el repositorio**

En `backend/src/modules/orders/infrastructure/prismaOrderRepository.ts`, dentro
del objeto que retorna `findForTracking`, añadir tras `shipCity`:

```ts
      carrier: order.carrier,
      trackingNumber: order.trackingNumber,
```

El comentario de «subconjunto seguro» que hay encima sigue siendo cierto: la
guía es información del propio pedido de quien ya demostró conocer su número y
su correo; no se añade dirección, teléfono ni datos de pago.

- [ ] **Paso 5: Documentar en OpenAPI**

En `backend/src/modules/orders/interfaces/http/orders.openapi.ts`, dentro de
`'/orders/track'` → `get` → `responses` → `200` → el objeto `order`, añadir tras
la línea de `shipCity` (≈ línea 101):

```ts
                      carrier: { type: 'string', nullable: true },
                      trackingNumber: { type: 'string', nullable: true },
```

Y ampliar la última frase de la `description` del endpoint, que hoy enumera lo
que NO devuelve, para que mencione lo que sí:

```ts
        'sin datos de pago y sin ids internos. Incluye la transportadora y el número de guía ' +
        'una vez que el pedido se despacha. Limitado a 30 peticiones cada 15 minutos por IP.',
```

- [ ] **Paso 6: Verificar todo el backend**

```bash
npm run test:unit && npm run typecheck && npm run lint
```

Esperado: los tres limpios. **El total de tests debe haber subido** respecto a
los 138 de partida.

- [ ] **Paso 7: Confirmar**

```bash
git add backend/src/modules/orders backend/tests/unit/orders
git commit -m "feat(orders): el seguimiento público devuelve la guía del envío"
```

---

# F2 · Shell del panel

### Task 7: Extraer el cliente HTTP a `shared/`

**Archivos:**
- Crear: `frontend/src/shared/httpClient.js`
- Crear: `frontend/src/shared/format.js`
- Modificar: `frontend/src/checkout/api.js`
- Test: `frontend/src/checkout/api.test.js` — **no se modifica** (es la prueba
  de que la extracción no cambió nada)

**Interfaces:**
- Produce, desde `frontend/src/shared/httpClient.js`:
  `ApiError`, `request(path, { method, body, auth })`, `getStoredUser`,
  `getAccessToken`, `getRefreshToken`, `storeTokens`, `storeSession`,
  `clearSession`, `getGuestId`, `setGuestId`, `clearGuestId`,
  `setOnSessionExpired`.
  Desde `frontend/src/shared/format.js`: `formatCOP(amount)` y
  `formatFecha(valor)`.
  Los consume la Task 11 (cliente admin) y todas las pantallas.

- [ ] **Paso 1: Crear `shared/httpClient.js`**

Mover a `frontend/src/shared/httpClient.js` **todo** el contenido actual de
`frontend/src/checkout/api.js` **excepto** el objeto `api` y la función
`formatCOP`. Es decir: `BASE_URL`, `STORAGE_KEYS`, `ApiError`, los getters y
setters de sesión e invitado, el bloque de renovación (`refreshInFlight`,
`onSessionExpired`, `setOnSessionExpired`, `doRefresh`,
`refreshAccessToken`), `attempt` y `request`.

**Exportar `request`** (hoy es privada) además de lo que ya se exportaba.
Cambiar la primera línea del comentario de cabecera a:

```js
// Cliente HTTP contra la API real del backend PomAss. Sin dependencias externas
// (fetch nativo). Lo comparten el checkout y el panel de administración: guarda
// tokens en localStorage, renueva el access token vencido y reintenta una vez.
```

- [ ] **Paso 2: Crear `shared/format.js`**

```js
// Formato de moneda y fecha para Colombia. Lo comparten checkout y panel.

export function formatCOP(amount) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(amount)
}

/** Fecha corta legible: "1 ago 2026, 10:00". Acepta Date o string ISO. */
export function formatFecha(valor) {
  const fecha = valor instanceof Date ? valor : new Date(valor)
  return new Intl.DateTimeFormat('es-CO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(fecha)
}
```

- [ ] **Paso 3: Reducir `checkout/api.js` a lo suyo**

`frontend/src/checkout/api.js` queda solo con el objeto `api` y las
reexportaciones que sus consumidores actuales ya importan de él:

```js
// Endpoints que consume el checkout. El motor HTTP (sesión, renovación de
// token, reintento) vive en `shared/httpClient.js` y lo comparte con el panel.

import { request } from '../shared/httpClient.js'

export {
  ApiError,
  clearGuestId,
  clearSession,
  getAccessToken,
  getGuestId,
  getRefreshToken,
  getStoredUser,
  setGuestId,
  setOnSessionExpired,
  storeSession,
  storeTokens,
} from '../shared/httpClient.js'

export { formatCOP } from '../shared/format.js'

export const api = {
  register: (payload) => request('/auth/register', { method: 'POST', body: payload, auth: false }),
  login: (payload) => request('/auth/login', { method: 'POST', body: payload, auth: false }),
  me: () => request('/auth/me'),

  listProducts: (params = {}) => {
    const qs = new URLSearchParams(params).toString()
    return request(`/products${qs ? `?${qs}` : ''}`, { auth: false })
  },

  getCart: () => request('/cart'),
  addCartItem: (productId, quantity = 1) =>
    request('/cart/items', { method: 'POST', body: { productId, quantity } }),
  updateCartItem: (productId, quantity) =>
    request(`/cart/items/${productId}`, { method: 'PATCH', body: { quantity } }),
  removeCartItem: (productId) => request(`/cart/items/${productId}`, { method: 'DELETE' }),
  mergeCart: (guestId) => request('/cart/merge', { method: 'POST', body: { guestId } }),

  checkout: (payload) => request('/orders', { method: 'POST', body: payload }),
  getOrder: (id) => request(`/orders/${id}`),

  // Seguimiento público: sin sesión, con nº de pedido + correo.
  trackOrder: ({ orderNumber, email }) =>
    request(`/orders/track?${new URLSearchParams({ orderNumber, email })}`, { auth: false }),

  initiatePayment: (payload) => request('/payments', { method: 'POST', body: payload }),
}
```

- [ ] **Paso 4: Ejecutar los tests existentes SIN tocarlos**

Desde `frontend/`:

```bash
npm test
```

Esperado: los 22 tests actuales PASAN sin haber modificado ni una línea de
`api.test.js` ni de `wompi.test.js`.

> Si algún test falla, **la extracción está mal, no el test**. El caso más
> probable: `api.test.js` hace `vi.resetModules()` e importa `./api.js`; el
> estado de módulo (`refreshInFlight`) ahora vive en `httpClient.js`, que se
> reimporta en cascada — debe funcionar. Si no, revisa que no hayas dejado una
> copia del estado en los dos archivos.

- [ ] **Paso 5: Confirmar**

```bash
git add frontend/src/shared frontend/src/checkout/api.js
git commit -m "refactor(frontend): extrae el cliente HTTP y el formato a shared/"
```

---

### Task 8: Extraer los componentes de interfaz compartidos

**Archivos:**
- Crear: `frontend/src/shared/ui.jsx`
- Modificar: `frontend/src/checkout/components/ui.jsx`

**Interfaces:**
- Produce, desde `frontend/src/shared/ui.jsx`: `Card`, `Field`, `Input`,
  `PrimaryButton`, `SecondaryButton`, `ErrorBanner`. Los consumen las Tasks 10,
  12, 13 y 14.

- [ ] **Paso 1: Mover el contenido**

Copiar **íntegro** el contenido actual de
`frontend/src/checkout/components/ui.jsx` a `frontend/src/shared/ui.jsx`, sin
cambios en los estilos.

- [ ] **Paso 2: Convertir el archivo del checkout en reexportación**

`frontend/src/checkout/components/ui.jsx` queda:

```jsx
// Estos componentes ahora se comparten con el panel de administración.
export { Card, Field, Input, PrimaryButton, SecondaryButton, ErrorBanner } from '../../shared/ui.jsx'
```

- [ ] **Paso 3: Verificar que el checkout sigue compilando**

```bash
npm run build
```

Esperado: genera `index.html` y `checkout.html` sin errores.

```bash
npm test
```

Esperado: 22 tests pasan.

- [ ] **Paso 4: Confirmar**

```bash
git add frontend/src/shared/ui.jsx frontend/src/checkout/components/ui.jsx
git commit -m "refactor(frontend): comparte los componentes de interfaz en shared/"
```

---

### Task 9: Enrutador hash

**Archivos:**
- Crear: `frontend/src/admin/router.js`
- Test: `frontend/src/admin/router.test.js`

**Interfaces:**
- Produce: `parseHash(hash: string): { name: string, params: object }`,
  `useRoute(): { name, params }` (hook de React) y `navigate(path: string): void`.
  Nombres de ruta válidos: `'pedidos'`, `'pedido'`, `'productos'`,
  `'taxonomia'`, `'cupones'`, `'reportes'`. Los consumen las Tasks 10, 12 y 13.

- [ ] **Paso 1: Escribir el test que falla**

Crear `frontend/src/admin/router.test.js`:

```js
import { describe, expect, it } from 'vitest'
import { parseHash } from './router.js'

describe('parseHash', () => {
  it('reconoce las secciones simples', () => {
    expect(parseHash('#/pedidos')).toEqual({ name: 'pedidos', params: {} })
    expect(parseHash('#/productos')).toEqual({ name: 'productos', params: {} })
    expect(parseHash('#/taxonomia')).toEqual({ name: 'taxonomia', params: {} })
    expect(parseHash('#/cupones')).toEqual({ name: 'cupones', params: {} })
    expect(parseHash('#/reportes')).toEqual({ name: 'reportes', params: {} })
  })

  it('extrae el id del detalle de pedido', () => {
    expect(parseHash('#/pedidos/abc-123')).toEqual({ name: 'pedido', params: { id: 'abc-123' } })
  })

  it('cae en pedidos cuando el hash está vacío o no se reconoce', () => {
    expect(parseHash('')).toEqual({ name: 'pedidos', params: {} })
    expect(parseHash('#/')).toEqual({ name: 'pedidos', params: {} })
    expect(parseHash('#/inventado')).toEqual({ name: 'pedidos', params: {} })
    expect(parseHash('#/pedidos/abc/de-mas')).toEqual({ name: 'pedidos', params: {} })
  })

  it('tolera la barra final y el hash sin barra inicial', () => {
    expect(parseHash('#/pedidos/')).toEqual({ name: 'pedidos', params: {} })
    expect(parseHash('#pedidos')).toEqual({ name: 'pedidos', params: {} })
  })
})
```

- [ ] **Paso 2: Ejecutar el test para verificar que falla**

```bash
npx vitest run src/admin/router.test.js
```

Esperado: FALLA — no existe `./router.js`.

- [ ] **Paso 3: Implementar**

Crear `frontend/src/admin/router.js`:

```js
// Enrutador mínimo sobre el hash de la URL. Da enlaces profundos y botón atrás
// sin añadir dependencias. Si el panel creciera mucho, migrar a react-router
// es directo: `useRoute` es el único punto de contacto de las pantallas.

import { useEffect, useState } from 'react'

// Cada ruta es una lista de segmentos; los que empiezan por ":" son parámetros.
const RUTAS = [
  { name: 'pedidos', segmentos: ['pedidos'] },
  { name: 'pedido', segmentos: ['pedidos', ':id'] },
  { name: 'productos', segmentos: ['productos'] },
  { name: 'taxonomia', segmentos: ['taxonomia'] },
  { name: 'cupones', segmentos: ['cupones'] },
  { name: 'reportes', segmentos: ['reportes'] },
]

const POR_DEFECTO = { name: 'pedidos', params: {} }

/** Traduce un hash a `{ name, params }`. Lo desconocido cae en la lista de pedidos. */
export function parseHash(hash) {
  const partes = String(hash).replace(/^#/, '').split('/').filter(Boolean)
  if (partes.length === 0) return POR_DEFECTO

  for (const ruta of RUTAS) {
    if (ruta.segmentos.length !== partes.length) continue

    const params = {}
    const coincide = ruta.segmentos.every((segmento, i) => {
      if (segmento.startsWith(':')) {
        params[segmento.slice(1)] = partes[i]
        return true
      }
      return segmento === partes[i]
    })

    if (coincide) return { name: ruta.name, params }
  }

  return POR_DEFECTO
}

/** Cambia de ruta. Acepta "pedidos" o "pedidos/abc-123". */
export function navigate(path) {
  window.location.hash = `#/${String(path).replace(/^#?\/?/, '')}`
}

/** Ruta actual, reactiva a la navegación del usuario y al botón atrás. */
export function useRoute() {
  const [route, setRoute] = useState(() => parseHash(window.location.hash))

  useEffect(() => {
    const alCambiar = () => setRoute(parseHash(window.location.hash))
    window.addEventListener('hashchange', alCambiar)
    return () => window.removeEventListener('hashchange', alCambiar)
  }, [])

  return route
}
```

- [ ] **Paso 4: Ejecutar el test para verificar que pasa**

```bash
npx vitest run src/admin/router.test.js
```

Esperado: PASAN los 4 tests.

- [ ] **Paso 5: Confirmar**

```bash
git add frontend/src/admin/router.js frontend/src/admin/router.test.js
git commit -m "feat(admin): enrutador hash del panel"
```

---

### Task 10: Entrada de Vite, shell y acceso

**Archivos:**
- Crear: `frontend/admin.html`
- Crear: `frontend/src/admin-main.jsx`
- Crear: `frontend/src/admin/AdminApp.jsx`
- Crear: `frontend/src/admin/LoginGate.jsx`
- Modificar: `frontend/vite.config.js`
- Modificar: `frontend/tailwind.config.js`

**Interfaces:**
- Consume: `useRoute` (Task 9); `storeSession`, `getStoredUser`, `clearSession`,
  `setOnSessionExpired` de `shared/httpClient.js` (Task 7); `api.login` y
  `api.me` de `checkout/api.js`; `Card`, `Field`, `Input`, `PrimaryButton`,
  `ErrorBanner` de `shared/ui.jsx` (Task 8).
- Produce: `AdminApp` monta la pantalla que corresponda a la ruta. Las Tasks 12
  y 13 se enchufan en su `switch`.

- [ ] **Paso 1: Registrar la entrada en Vite y Tailwind**

En `frontend/vite.config.js`, añadir la tercera entrada:

```js
      input: {
        main: resolve(__dirname, 'index.html'),
        checkout: resolve(__dirname, 'checkout.html'),
        admin: resolve(__dirname, 'admin.html'),
      },
```

En `frontend/tailwind.config.js`, añadir el HTML al contenido:

```js
  content: ['./index.html', './checkout.html', './admin.html', './src/**/*.{js,jsx}'],
```

- [ ] **Paso 2: Crear `admin.html`**

```html
<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/jpeg" href="/images/logo.jpeg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="robots" content="noindex, nofollow" />
    <title>Panel · PomAss</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Nunito:ital,wght@0,400;0,600;0,700;0,800;0,900;1,600&display=swap"
      rel="stylesheet"
    />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/admin-main.jsx"></script>
  </body>
</html>
```

- [ ] **Paso 3: Crear `src/admin-main.jsx`**

```jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import AdminApp from './admin/AdminApp.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AdminApp />
  </React.StrictMode>,
)
```

- [ ] **Paso 4: Crear `src/admin/LoginGate.jsx`**

```jsx
import { useState } from 'react'
import { api, storeSession } from '../checkout/api.js'
import { Card, ErrorBanner, Field, Input, PrimaryButton } from '../shared/ui.jsx'

/**
 * Acceso al panel. Este gate es comodidad, no seguridad: quien protege de
 * verdad es el backend, que exige rol ADMIN en cada endpoint.
 */
export default function LoginGate({ onSesionIniciada }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)

  const enviar = async (e) => {
    e.preventDefault()
    setError('')
    setCargando(true)
    try {
      const data = await api.login({ email, password })
      if (data.user?.role !== 'ADMIN') {
        setError('Esta cuenta no tiene permisos de administración.')
        return
      }
      storeSession(data)
      onSesionIniciada(data.user)
    } catch (err) {
      setError(err.message)
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FFF9F0] px-4">
      <Card className="w-full max-w-sm">
        <h1 className="mb-1 font-serif text-2xl text-[#3A2A1A]">Panel PomAss</h1>
        <p className="mb-6 text-sm text-[#8A6A4A]">Ingresa con tu cuenta de administración.</p>

        <form onSubmit={enviar} className="space-y-4">
          <Field label="Correo">
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </Field>
          <Field label="Contraseña">
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </Field>
          <ErrorBanner message={error} />
          <PrimaryButton type="submit" disabled={cargando}>
            {cargando ? 'Entrando…' : 'Entrar'}
          </PrimaryButton>
        </form>
      </Card>
    </div>
  )
}
```

- [ ] **Paso 5: Crear `src/admin/AdminApp.jsx`**

```jsx
import { useEffect, useState } from 'react'
import { clearSession, getStoredUser, setOnSessionExpired } from '../checkout/api.js'
import LoginGate from './LoginGate.jsx'
import { navigate, useRoute } from './router.js'

const SECCIONES = [
  { ruta: 'pedidos', etiqueta: 'Pedidos', rutasActivas: ['pedidos', 'pedido'] },
  { ruta: 'productos', etiqueta: 'Productos', rutasActivas: ['productos'] },
  { ruta: 'taxonomia', etiqueta: 'Categorías y marcas', rutasActivas: ['taxonomia'] },
  { ruta: 'cupones', etiqueta: 'Cupones', rutasActivas: ['cupones'] },
  { ruta: 'reportes', etiqueta: 'Reportes', rutasActivas: ['reportes'] },
]

/** Marcador de las secciones que llegan en el siguiente plan (F4–F6). */
function EnConstruccion({ titulo }) {
  return (
    <div className="rounded-2xl border border-[#E7D9C4] bg-white p-8 text-center text-sm text-[#8A6A4A]">
      <p className="font-bold text-[#3A2A1A]">{titulo}</p>
      <p className="mt-1">Esta sección aún no está construida.</p>
    </div>
  )
}

export default function AdminApp() {
  const [user, setUser] = useState(() => getStoredUser())
  const [aviso, setAviso] = useState('')
  const route = useRoute()

  useEffect(() => {
    // El cliente HTTP avisa cuando el refresh token también caducó.
    setOnSessionExpired(() => {
      setUser(null)
      setAviso('Tu sesión expiró. Vuelve a ingresar.')
    })
  }, [])

  const salir = () => {
    clearSession()
    setUser(null)
    setAviso('')
  }

  if (!user || user.role !== 'ADMIN') {
    return (
      <>
        {aviso && (
          <div className="bg-[#FFF3DE] px-4 py-2 text-center text-sm font-semibold text-[#6A3A1C]">
            {aviso}
          </div>
        )}
        <LoginGate onSesionIniciada={setUser} />
      </>
    )
  }

  return (
    <div className="flex min-h-screen bg-[#FFF9F0] text-[#3A2A1A]">
      <aside className="hidden w-56 shrink-0 border-r border-[#E7D9C4] bg-white/70 p-4 sm:block">
        <p className="mb-6 px-2 font-serif text-xl">PomAss</p>
        <nav className="space-y-1">
          {SECCIONES.map((s) => (
            <button
              key={s.ruta}
              onClick={() => navigate(s.ruta)}
              className={
                'block w-full rounded-lg px-3 py-2 text-left text-sm font-bold transition ' +
                (s.rutasActivas.includes(route.name)
                  ? 'bg-peach-500 text-white'
                  : 'text-[#6A3A1C] hover:bg-[#FFF3DE]')
              }
            >
              {s.etiqueta}
            </button>
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-[#E7D9C4] bg-white/70 px-4 py-3">
          <span className="text-sm font-semibold">{user.email}</span>
          <button onClick={salir} className="text-sm font-bold text-[#6A3A1C] hover:underline">
            Salir
          </button>
        </header>

        <main className="min-w-0 flex-1 p-4 sm:p-6">
          {route.name === 'pedidos' && <EnConstruccion titulo="Pedidos" />}
          {route.name === 'pedido' && <EnConstruccion titulo="Detalle de pedido" />}
          {route.name === 'productos' && <EnConstruccion titulo="Productos" />}
          {route.name === 'taxonomia' && <EnConstruccion titulo="Categorías y marcas" />}
          {route.name === 'cupones' && <EnConstruccion titulo="Cupones" />}
          {route.name === 'reportes' && <EnConstruccion titulo="Reportes" />}
        </main>
      </div>
    </div>
  )
}
```

> Los marcadores `EnConstruccion` de `pedidos` y `pedido` se sustituyen en las
> Tasks 12 y 13. Los otros cuatro se quedan hasta el plan de F4–F6.

- [ ] **Paso 6: Verificar que compila**

```bash
npm run build
```

Esperado: la salida incluye ahora `admin.html` además de `index.html` y
`checkout.html`.

- [ ] **Paso 7: Confirmar**

```bash
git add frontend/admin.html frontend/src/admin-main.jsx frontend/src/admin frontend/vite.config.js frontend/tailwind.config.js
git commit -m "feat(admin): entrada de Vite, shell del panel y acceso con rol ADMIN"
```

---

### Task 11: Cliente de la API de administración

**Archivos:**
- Crear: `frontend/src/admin/api.js`
- Test: `frontend/src/admin/api.test.js`

**Interfaces:**
- Consume: `request` de `shared/httpClient.js` (Task 7).
- Produce: `adminApi.listOrders({ status, page, pageSize })`,
  `adminApi.getOrder(id)`,
  `adminApi.updateOrderStatus(id, { status, carrier, trackingNumber })`.
  Los consumen las Tasks 12, 13 y 14.

- [ ] **Paso 1: Escribir el test que falla**

Crear `frontend/src/admin/api.test.js`:

```js
import { beforeEach, describe, expect, it, vi } from 'vitest'

// localStorage falso: el cliente HTTP lo usa al importarse y en cada petición.
function stubLocalStorage() {
  const store = new Map()
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear(),
  }
}

function json(status, body) {
  return { ok: status >= 200 && status < 300, status, json: async () => body }
}

async function loadAdminApi() {
  vi.resetModules()
  return import('./api.js')
}

beforeEach(() => {
  stubLocalStorage()
  vi.restoreAllMocks()
})

describe('adminApi.listOrders', () => {
  it('omite el estado cuando no hay filtro', async () => {
    const { adminApi } = await loadAdminApi()
    const fetchMock = vi.fn().mockResolvedValue(json(200, { items: [], total: 0 }))
    globalThis.fetch = fetchMock

    await adminApi.listOrders({ page: 1, pageSize: 20 })

    const url = fetchMock.mock.calls[0][0]
    expect(url).toContain('/admin/orders?')
    expect(url).toContain('page=1')
    expect(url).toContain('pageSize=20')
    expect(url).not.toContain('status=')
  })

  it('incluye el estado cuando se filtra', async () => {
    const { adminApi } = await loadAdminApi()
    globalThis.fetch = vi.fn().mockResolvedValue(json(200, { items: [], total: 0 }))

    await adminApi.listOrders({ status: 'PAID', page: 2, pageSize: 20 })

    expect(globalThis.fetch.mock.calls[0][0]).toContain('status=PAID')
  })
})

describe('adminApi.updateOrderStatus', () => {
  it('envía el estado y los datos de despacho en el cuerpo', async () => {
    const { adminApi } = await loadAdminApi()
    globalThis.fetch = vi.fn().mockResolvedValue(json(200, { order: {}, allowedTransitions: [] }))

    await adminApi.updateOrderStatus('order-1', {
      status: 'SHIPPED',
      carrier: 'Servientrega',
      trackingNumber: 'ABC123',
    })

    const [url, opciones] = globalThis.fetch.mock.calls[0]
    expect(url).toContain('/admin/orders/order-1/status')
    expect(opciones.method).toBe('PATCH')
    expect(JSON.parse(opciones.body)).toEqual({
      status: 'SHIPPED',
      carrier: 'Servientrega',
      trackingNumber: 'ABC123',
    })
  })

  it('no manda campos de despacho cuando no los hay', async () => {
    const { adminApi } = await loadAdminApi()
    globalThis.fetch = vi.fn().mockResolvedValue(json(200, { order: {}, allowedTransitions: [] }))

    await adminApi.updateOrderStatus('order-1', { status: 'PREPARING' })

    expect(JSON.parse(globalThis.fetch.mock.calls[0][1].body)).toEqual({ status: 'PREPARING' })
  })
})
```

- [ ] **Paso 2: Ejecutar el test para verificar que falla**

```bash
npx vitest run src/admin/api.test.js
```

Esperado: FALLA — no existe `./api.js` en `src/admin/`.

- [ ] **Paso 3: Implementar**

Crear `frontend/src/admin/api.js`:

```js
// Endpoints de administración. El motor HTTP (sesión, renovación, reintento)
// es el mismo que usa el checkout.

import { request } from '../shared/httpClient.js'

export const adminApi = {
  listOrders: ({ status, page = 1, pageSize = 20 } = {}) => {
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })
    if (status) params.set('status', status)
    return request(`/admin/orders?${params}`)
  },

  getOrder: (id) => request(`/admin/orders/${id}`),

  /** `payload`: { status, carrier?, trackingNumber? }. Los campos vacíos no se envían. */
  updateOrderStatus: (id, { status, carrier, trackingNumber } = {}) => {
    const body = { status }
    if (carrier) body.carrier = carrier
    if (trackingNumber) body.trackingNumber = trackingNumber
    return request(`/admin/orders/${id}/status`, { method: 'PATCH', body })
  },
}
```

- [ ] **Paso 4: Ejecutar el test para verificar que pasa**

```bash
npx vitest run src/admin/api.test.js
```

Esperado: PASAN los 4 tests.

- [ ] **Paso 5: Confirmar**

```bash
git add frontend/src/admin/api.js frontend/src/admin/api.test.js
git commit -m "feat(admin): cliente de los endpoints de administración"
```

---

# F3 · Pedidos

### Task 12: Lista de pedidos

**Archivos:**
- Crear: `frontend/src/admin/orders/ordersModel.js`
- Crear: `frontend/src/admin/orders/ordersModel.test.js`
- Crear: `frontend/src/admin/components/ui.jsx`
- Crear: `frontend/src/admin/orders/OrdersPage.jsx`
- Modificar: `frontend/src/admin/AdminApp.jsx` (sustituir el marcador de `pedidos`)

**Interfaces:**
- Consume: `adminApi.listOrders` (Task 11); `navigate` (Task 9);
  `formatCOP`, `formatFecha` (Task 7).
- Produce, desde `ordersModel.js`: `ESTADOS` (lista de `{ value, label }` con
  `value: ''` para «Todos»), `etiquetaEstado(status)`, `tonoEstado(status)`,
  `totalPaginas(total, pageSize)`. Desde `components/ui.jsx`: `Badge`,
  `Table`, `Modal`. Los consumen las Tasks 13 y 14.

- [ ] **Paso 1: Escribir el test que falla**

Crear `frontend/src/admin/orders/ordersModel.test.js`:

```js
import { describe, expect, it } from 'vitest'
import { ESTADOS, etiquetaEstado, totalPaginas } from './ordersModel.js'

describe('etiquetaEstado', () => {
  it('traduce los estados del backend al español', () => {
    expect(etiquetaEstado('PENDING')).toBe('Pendiente')
    expect(etiquetaEstado('PAID')).toBe('Pagado')
    expect(etiquetaEstado('PREPARING')).toBe('En preparación')
    expect(etiquetaEstado('SHIPPED')).toBe('Enviado')
    expect(etiquetaEstado('DELIVERED')).toBe('Entregado')
    expect(etiquetaEstado('CANCELLED')).toBe('Cancelado')
  })

  it('devuelve el valor crudo si el estado es desconocido', () => {
    expect(etiquetaEstado('LO_QUE_SEA')).toBe('LO_QUE_SEA')
  })
})

describe('ESTADOS', () => {
  it('abre con la opción de no filtrar', () => {
    expect(ESTADOS[0]).toEqual({ value: '', label: 'Todos' })
  })

  it('cubre los seis estados del pedido', () => {
    expect(ESTADOS).toHaveLength(7)
  })
})

describe('totalPaginas', () => {
  it('redondea hacia arriba', () => {
    expect(totalPaginas(0, 20)).toBe(1)
    expect(totalPaginas(1, 20)).toBe(1)
    expect(totalPaginas(20, 20)).toBe(1)
    expect(totalPaginas(21, 20)).toBe(2)
    expect(totalPaginas(41, 20)).toBe(3)
  })
})
```

- [ ] **Paso 2: Ejecutar el test para verificar que falla**

```bash
npx vitest run src/admin/orders/ordersModel.test.js
```

Esperado: FALLA — no existe `./ordersModel.js`.

- [ ] **Paso 3: Implementar el modelo**

Crear `frontend/src/admin/orders/ordersModel.js`:

```js
// Lógica pura de la sección de pedidos: etiquetas, tonos y paginación.
// Se mantiene aparte de los componentes para poder probarla sin montar React.

const ETIQUETAS = {
  PENDING: 'Pendiente',
  PAID: 'Pagado',
  PREPARING: 'En preparación',
  SHIPPED: 'Enviado',
  DELIVERED: 'Entregado',
  CANCELLED: 'Cancelado',
}

const TONOS = {
  PENDING: 'bg-[#FFF3DE] text-[#8A6A4A]',
  PAID: 'bg-emerald-50 text-emerald-700',
  PREPARING: 'bg-sky-50 text-sky-700',
  SHIPPED: 'bg-indigo-50 text-indigo-700',
  DELIVERED: 'bg-emerald-100 text-emerald-800',
  CANCELLED: 'bg-red-50 text-red-700',
}

/** Opciones del filtro. La primera no filtra nada. */
export const ESTADOS = [
  { value: '', label: 'Todos' },
  ...Object.entries(ETIQUETAS).map(([value, label]) => ({ value, label })),
]

export function etiquetaEstado(status) {
  return ETIQUETAS[status] ?? status
}

export function tonoEstado(status) {
  return TONOS[status] ?? 'bg-gray-100 text-gray-700'
}

/** Nº de páginas. Siempre al menos 1, para no mostrar "página 1 de 0". */
export function totalPaginas(total, pageSize) {
  return Math.max(1, Math.ceil(total / pageSize))
}
```

- [ ] **Paso 4: Ejecutar el test para verificar que pasa**

```bash
npx vitest run src/admin/orders/ordersModel.test.js
```

Esperado: PASAN.

- [ ] **Paso 5: Crear los componentes de la interfaz del panel**

Crear `frontend/src/admin/components/ui.jsx`:

```jsx
// Componentes propios del panel: densidad de herramienta, no de landing.

export function Badge({ children, tono }) {
  return (
    <span className={'inline-block rounded-full px-2.5 py-1 text-xs font-bold ' + tono}>
      {children}
    </span>
  )
}

/** Tabla con desbordamiento horizontal propio: el cuerpo de la página nunca se desplaza. */
export function Table({ columnas, children }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-[#E7D9C4] bg-white">
      <table className="w-full min-w-[42rem] text-left text-sm">
        <thead className="border-b border-[#E7D9C4] bg-[#FFF9F0]">
          <tr>
            {columnas.map((c) => (
              <th key={c} className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-[#8A6A4A]">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  )
}

export function Modal({ titulo, onCerrar, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 className="font-serif text-xl text-[#3A2A1A]">{titulo}</h2>
          <button onClick={onCerrar} className="text-xl leading-none text-[#8A6A4A]" aria-label="Cerrar">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

/** Mensaje de estado vacío o de carga dentro de una tabla. */
export function FilaMensaje({ columnas, children }) {
  return (
    <tr>
      <td colSpan={columnas} className="px-4 py-10 text-center text-sm text-[#8A6A4A]">
        {children}
      </td>
    </tr>
  )
}
```

- [ ] **Paso 6: Crear la pantalla de lista**

Crear `frontend/src/admin/orders/OrdersPage.jsx`:

```jsx
import { useEffect, useState } from 'react'
import { adminApi } from '../api.js'
import { navigate } from '../router.js'
import { formatCOP, formatFecha } from '../../shared/format.js'
import { ErrorBanner } from '../../shared/ui.jsx'
import { Badge, FilaMensaje, Table } from '../components/ui.jsx'
import { ESTADOS, etiquetaEstado, tonoEstado, totalPaginas } from './ordersModel.js'

const PAGE_SIZE = 20
const COLUMNAS = ['Pedido', 'Fecha', 'Contacto', 'Ciudad', 'Total', 'Estado']

export default function OrdersPage() {
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [datos, setDatos] = useState({ items: [], total: 0 })
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let vigente = true
    setCargando(true)
    setError('')

    adminApi
      .listOrders({ status, page, pageSize: PAGE_SIZE })
      .then((res) => vigente && setDatos(res))
      .catch((err) => vigente && setError(err.message))
      .finally(() => vigente && setCargando(false))

    // Evita que una respuesta lenta de un filtro anterior pise a la actual.
    return () => {
      vigente = false
    }
  }, [status, page])

  const paginas = totalPaginas(datos.total, PAGE_SIZE)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {ESTADOS.map((e) => (
          <button
            key={e.value || 'todos'}
            onClick={() => {
              setStatus(e.value)
              setPage(1)
            }}
            className={
              'rounded-full px-3.5 py-1.5 text-xs font-bold transition ' +
              (status === e.value
                ? 'bg-peach-500 text-white'
                : 'border border-[#E7D9C4] text-[#6A3A1C] hover:bg-[#FFF3DE]')
            }
          >
            {e.label}
          </button>
        ))}
      </div>

      <ErrorBanner message={error} />

      <Table columnas={COLUMNAS}>
        {cargando && <FilaMensaje columnas={COLUMNAS.length}>Cargando pedidos…</FilaMensaje>}
        {!cargando && datos.items.length === 0 && (
          <FilaMensaje columnas={COLUMNAS.length}>No hay pedidos con este filtro.</FilaMensaje>
        )}
        {!cargando &&
          datos.items.map((o) => (
            <tr
              key={o.id}
              onClick={() => navigate(`pedidos/${o.id}`)}
              className="cursor-pointer border-b border-[#F1E7D8] last:border-0 hover:bg-[#FFF9F0]"
            >
              <td className="px-4 py-3 font-bold">{o.orderNumber}</td>
              <td className="px-4 py-3 text-[#6A5A4A]">{formatFecha(o.createdAt)}</td>
              <td className="px-4 py-3 text-[#6A5A4A]">{o.contactEmail ?? '—'}</td>
              <td className="px-4 py-3 text-[#6A5A4A]">{o.shipCity ?? '—'}</td>
              <td className="px-4 py-3 font-semibold">{formatCOP(o.total)}</td>
              <td className="px-4 py-3">
                <Badge tono={tonoEstado(o.status)}>{etiquetaEstado(o.status)}</Badge>
              </td>
            </tr>
          ))}
      </Table>

      <div className="flex items-center justify-between text-sm">
        <span className="text-[#8A6A4A]">
          {datos.total} pedido{datos.total === 1 ? '' : 's'} · página {page} de {paginas}
        </span>
        <div className="flex gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="rounded-full border border-[#E7D9C4] px-4 py-1.5 font-bold text-[#6A3A1C] disabled:opacity-40"
          >
            Anterior
          </button>
          <button
            onClick={() => setPage((p) => Math.min(paginas, p + 1))}
            disabled={page >= paginas}
            className="rounded-full border border-[#E7D9C4] px-4 py-1.5 font-bold text-[#6A3A1C] disabled:opacity-40"
          >
            Siguiente
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Paso 7: Enchufarla en el shell**

En `frontend/src/admin/AdminApp.jsx`, añadir el import y sustituir la línea del
marcador de `pedidos`:

```jsx
import OrdersPage from './orders/OrdersPage.jsx'
```

```jsx
          {route.name === 'pedidos' && <OrdersPage />}
```

- [ ] **Paso 8: Verificar**

```bash
npm test && npm run build
```

Esperado: todos los tests pasan y la compilación es limpia.

- [ ] **Paso 9: Confirmar**

```bash
git add frontend/src/admin
git commit -m "feat(admin): lista de pedidos con filtro por estado y paginación"
```

---

### Task 13: Detalle de pedido

**Archivos:**
- Crear: `frontend/src/admin/orders/OrderDetailPage.jsx`
- Modificar: `frontend/src/admin/orders/ordersModel.js` (añadir `accionesPara`)
- Modificar: `frontend/src/admin/orders/ordersModel.test.js`
- Modificar: `frontend/src/admin/AdminApp.jsx` (sustituir el marcador de `pedido`)

**Interfaces:**
- Consume: `adminApi.getOrder` (Task 11); `formatCOP`, `formatFecha` (Task 7).
- Produce: `accionesPara(allowedTransitions)` → lista de
  `{ status, label, esEnvio, esCancelacion }`, en `ordersModel.js`. La consume
  la Task 14. `OrderDetailPage` recibe la prop `id`.

- [ ] **Paso 1: Escribir el test que falla**

Añadir a `frontend/src/admin/orders/ordersModel.test.js`:

```js
import { accionesPara } from './ordersModel.js'

describe('accionesPara', () => {
  it('traduce las transiciones que autoriza el backend', () => {
    expect(accionesPara(['PREPARING', 'CANCELLED'])).toEqual([
      { status: 'PREPARING', label: 'Marcar en preparación', esEnvio: false, esCancelacion: false },
      { status: 'CANCELLED', label: 'Cancelar pedido', esEnvio: false, esCancelacion: true },
    ])
  })

  it('marca el envío, que exige transportadora y guía', () => {
    expect(accionesPara(['SHIPPED'])).toEqual([
      { status: 'SHIPPED', label: 'Marcar enviado', esEnvio: true, esCancelacion: false },
    ])
  })

  it('un estado final no ofrece ninguna acción', () => {
    expect(accionesPara([])).toEqual([])
  })
})
```

Recuerda ampliar la línea de import existente del archivo de tests para incluir
`accionesPara`.

- [ ] **Paso 2: Ejecutar el test para verificar que falla**

```bash
npx vitest run src/admin/orders/ordersModel.test.js
```

Esperado: FALLA — `accionesPara` no está exportada.

- [ ] **Paso 3: Implementar `accionesPara`**

Añadir al final de `frontend/src/admin/orders/ordersModel.js`:

```js
const ACCIONES = {
  PREPARING: 'Marcar en preparación',
  SHIPPED: 'Marcar enviado',
  DELIVERED: 'Marcar entregado',
  CANCELLED: 'Cancelar pedido',
}

/**
 * Traduce a botones el `allowedTransitions` que devuelve el backend.
 * La regla de qué transiciones caben NO se duplica aquí: es del servidor.
 */
export function accionesPara(allowedTransitions = []) {
  return allowedTransitions.map((status) => ({
    status,
    label: ACCIONES[status] ?? etiquetaEstado(status),
    esEnvio: status === 'SHIPPED',
    esCancelacion: status === 'CANCELLED',
  }))
}
```

- [ ] **Paso 4: Ejecutar el test para verificar que pasa**

```bash
npx vitest run src/admin/orders/ordersModel.test.js
```

Esperado: PASAN.

- [ ] **Paso 5: Crear la pantalla de detalle**

Crear `frontend/src/admin/orders/OrderDetailPage.jsx`:

```jsx
import { useEffect, useState } from 'react'
import { adminApi } from '../api.js'
import { navigate } from '../router.js'
import { formatCOP, formatFecha } from '../../shared/format.js'
import { ErrorBanner } from '../../shared/ui.jsx'
import { Badge } from '../components/ui.jsx'
import { etiquetaEstado, tonoEstado } from './ordersModel.js'

function Dato({ etiqueta, valor }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wide text-[#8A6A4A]">{etiqueta}</p>
      <p className="text-sm">{valor || '—'}</p>
    </div>
  )
}

function Linea({ etiqueta, valor, fuerte }) {
  return (
    <div className={'flex justify-between py-1 text-sm ' + (fuerte ? 'font-extrabold' : '')}>
      <span className={fuerte ? '' : 'text-[#6A5A4A]'}>{etiqueta}</span>
      <span>{valor}</span>
    </div>
  )
}

export default function OrderDetailPage({ id }) {
  const [order, setOrder] = useState(null)
  const [transiciones, setTransiciones] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let vigente = true
    setCargando(true)
    setError('')

    adminApi
      .getOrder(id)
      .then((res) => {
        if (!vigente) return
        setOrder(res.order)
        setTransiciones(res.allowedTransitions)
      })
      .catch((err) => vigente && setError(err.message))
      .finally(() => vigente && setCargando(false))

    return () => {
      vigente = false
    }
  }, [id])

  if (cargando) return <p className="text-sm text-[#8A6A4A]">Cargando pedido…</p>
  if (error) return <ErrorBanner message={error} />
  if (!order) return null

  return (
    <div className="space-y-5">
      <button onClick={() => navigate('pedidos')} className="text-sm font-bold text-[#6A3A1C] hover:underline">
        ← Volver a pedidos
      </button>

      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-serif text-2xl">{order.orderNumber}</h1>
        <Badge tono={tonoEstado(order.status)}>{etiquetaEstado(order.status)}</Badge>
        <span className="text-sm text-[#8A6A4A]">{formatFecha(order.createdAt)}</span>
      </div>

      {order.discreetPackaging && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">
          📦 Empaque discreto: sin marca visible en el exterior.
        </div>
      )}

      <section className="rounded-2xl border border-[#E7D9C4] bg-white p-5">
        <h2 className="mb-4 font-serif text-lg">Envío</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Dato etiqueta="Destinatario" valor={order.shipFullName} />
          <Dato etiqueta="Teléfono" valor={order.shipPhone} />
          <Dato etiqueta="Dirección" valor={[order.shipLine1, order.shipLine2].filter(Boolean).join(', ')} />
          <Dato etiqueta="Ciudad" valor={[order.shipCity, order.shipDepartment].filter(Boolean).join(', ')} />
          <Dato etiqueta="Código postal" valor={order.shipPostalCode} />
          <Dato etiqueta="Contacto" valor={order.contactEmail} />
          {order.trackingNumber && <Dato etiqueta="Transportadora" valor={order.carrier} />}
          {order.trackingNumber && <Dato etiqueta="Guía" valor={order.trackingNumber} />}
        </div>
      </section>

      <section className="rounded-2xl border border-[#E7D9C4] bg-white p-5">
        <h2 className="mb-4 font-serif text-lg">Artículos</h2>
        <ul className="mb-4 divide-y divide-[#F1E7D8]">
          {order.items.map((it) => (
            <li key={it.productId} className="flex justify-between py-2 text-sm">
              <span>
                {it.productName} <span className="text-[#8A6A4A]">× {it.quantity}</span>
              </span>
              <span className="font-semibold">{formatCOP(it.lineTotal)}</span>
            </li>
          ))}
        </ul>
        <div className="border-t border-[#E7D9C4] pt-3">
          <Linea etiqueta="Subtotal" valor={formatCOP(order.subtotal)} />
          {order.discountTotal > 0 && (
            <Linea etiqueta="Descuento" valor={`- ${formatCOP(order.discountTotal)}`} />
          )}
          <Linea etiqueta="Envío" valor={order.shippingTotal > 0 ? formatCOP(order.shippingTotal) : 'Gratis'} />
          <Linea etiqueta="Total" valor={formatCOP(order.total)} fuerte />
        </div>
      </section>

      {/* Las acciones llegan en la Task 14. */}
      {transiciones.length === 0 && (
        <p className="text-sm text-[#8A6A4A]">Este pedido está en un estado final: no admite más cambios.</p>
      )}
    </div>
  )
}
```

- [ ] **Paso 6: Enchufarla en el shell**

En `frontend/src/admin/AdminApp.jsx`, añadir el import y sustituir el marcador:

```jsx
import OrderDetailPage from './orders/OrderDetailPage.jsx'
```

```jsx
          {route.name === 'pedido' && <OrderDetailPage id={route.params.id} />}
```

- [ ] **Paso 7: Verificar**

```bash
npm test && npm run build
```

Esperado: limpio.

- [ ] **Paso 8: Confirmar**

```bash
git add frontend/src/admin
git commit -m "feat(admin): detalle de pedido con dirección de envío y totales"
```

---

### Task 14: Diálogos de despacho y cancelación

**Archivos:**
- Crear: `frontend/src/admin/orders/ShipDialog.jsx`
- Crear: `frontend/src/admin/orders/CancelDialog.jsx`
- Modificar: `frontend/src/admin/orders/ordersModel.js` (añadir `envioCompleto`)
- Modificar: `frontend/src/admin/orders/ordersModel.test.js`
- Modificar: `frontend/src/admin/orders/OrderDetailPage.jsx` (botones y diálogos)

**Interfaces:**
- Consume: `accionesPara` (Task 13); `adminApi.updateOrderStatus` (Task 11);
  `Modal` (Task 12).
- Produce: `envioCompleto({ carrier, trackingNumber })` en `ordersModel.js`;
  `ShipDialog({ onConfirmar, onCerrar, enviando, error })` y
  `CancelDialog({ devuelveStock, onConfirmar, onCerrar, enviando, error })`.

- [ ] **Paso 1: Escribir el test que falla**

Añadir a `frontend/src/admin/orders/ordersModel.test.js`:

```js
describe('envioCompleto', () => {
  it('exige transportadora y guía, ambas con contenido', () => {
    expect(envioCompleto({ carrier: 'Servientrega', trackingNumber: 'ABC123' })).toBe(true)
  })

  it('rechaza los datos incompletos', () => {
    expect(envioCompleto({ carrier: 'Servientrega', trackingNumber: '' })).toBe(false)
    expect(envioCompleto({ carrier: '', trackingNumber: 'ABC123' })).toBe(false)
    expect(envioCompleto({})).toBe(false)
  })

  it('no acepta espacios en blanco como valor', () => {
    expect(envioCompleto({ carrier: '   ', trackingNumber: 'ABC123' })).toBe(false)
  })
})
```

Amplía la línea de import del archivo para incluir `envioCompleto`.

- [ ] **Paso 2: Ejecutar el test para verificar que falla**

```bash
npx vitest run src/admin/orders/ordersModel.test.js
```

Esperado: FALLA — `envioCompleto` no está exportada.

- [ ] **Paso 3: Implementar `envioCompleto`**

Añadir al final de `frontend/src/admin/orders/ordersModel.js`:

```js
/**
 * ¿Están completos los datos de despacho? El backend los exige al pasar a
 * SHIPPED; esto solo evita mandar una petición que se sabe que va a fallar.
 */
export function envioCompleto({ carrier, trackingNumber } = {}) {
  return Boolean(carrier?.trim() && trackingNumber?.trim())
}
```

- [ ] **Paso 4: Ejecutar el test para verificar que pasa**

```bash
npx vitest run src/admin/orders/ordersModel.test.js
```

Esperado: PASAN.

- [ ] **Paso 5: Crear `ShipDialog.jsx`**

```jsx
import { useState } from 'react'
import { ErrorBanner, Field, Input, PrimaryButton, SecondaryButton } from '../../shared/ui.jsx'
import { Modal } from '../components/ui.jsx'
import { envioCompleto } from './ordersModel.js'

/**
 * Despacho del pedido. Transportadora y guía son obligatorias: un pedido
 * marcado como enviado sin guía deja al cliente sin nada que rastrear.
 */
export default function ShipDialog({ onConfirmar, onCerrar, enviando, error }) {
  const [carrier, setCarrier] = useState('')
  const [trackingNumber, setTrackingNumber] = useState('')
  const completo = envioCompleto({ carrier, trackingNumber })

  return (
    <Modal titulo="Marcar como enviado" onCerrar={onCerrar}>
      <div className="space-y-4">
        <p className="text-sm text-[#6A5A4A]">
          El cliente verá estos datos en el seguimiento de su pedido.
        </p>

        <Field label="Transportadora">
          <Input
            value={carrier}
            onChange={(e) => setCarrier(e.target.value)}
            placeholder="Servientrega"
            maxLength={80}
          />
        </Field>

        <Field label="Número de guía">
          <Input
            value={trackingNumber}
            onChange={(e) => setTrackingNumber(e.target.value)}
            placeholder="ABC123456789"
            maxLength={80}
          />
        </Field>

        <ErrorBanner message={error} />

        <div className="flex items-center gap-3">
          <SecondaryButton type="button" onClick={onCerrar} disabled={enviando}>
            Cancelar
          </SecondaryButton>
          <PrimaryButton
            type="button"
            disabled={!completo || enviando}
            onClick={() => onConfirmar({ carrier: carrier.trim(), trackingNumber: trackingNumber.trim() })}
          >
            {enviando ? 'Guardando…' : 'Confirmar envío'}
          </PrimaryButton>
        </div>
      </div>
    </Modal>
  )
}
```

- [ ] **Paso 6: Crear `CancelDialog.jsx`**

```jsx
import { ErrorBanner, PrimaryButton, SecondaryButton } from '../../shared/ui.jsx'
import { Modal } from '../components/ui.jsx'

/** `devuelveStock` lo decide el backend según el estado; aquí solo se anuncia. */
export default function CancelDialog({ devuelveStock, onConfirmar, onCerrar, enviando, error }) {
  return (
    <Modal titulo="Cancelar pedido" onCerrar={onCerrar}>
      <div className="space-y-4">
        <p className="text-sm text-[#6A5A4A]">
          Esta acción no se puede deshacer: un pedido cancelado no vuelve a ningún otro estado.
        </p>
        <p className="text-sm font-semibold text-[#3A2A1A]">
          {devuelveStock
            ? 'Las unidades del pedido volverán al inventario.'
            : 'El pedido ya fue despachado: las unidades NO vuelven al inventario.'}
        </p>

        <ErrorBanner message={error} />

        <div className="flex items-center gap-3">
          <SecondaryButton type="button" onClick={onCerrar} disabled={enviando}>
            Volver
          </SecondaryButton>
          <PrimaryButton type="button" onClick={onConfirmar} disabled={enviando}>
            {enviando ? 'Cancelando…' : 'Sí, cancelar pedido'}
          </PrimaryButton>
        </div>
      </div>
    </Modal>
  )
}
```

- [ ] **Paso 7: Conectar los botones en el detalle**

En `frontend/src/admin/orders/OrderDetailPage.jsx`:

Ampliar imports:

```jsx
import CancelDialog from './CancelDialog.jsx'
import ShipDialog from './ShipDialog.jsx'
import { accionesPara, etiquetaEstado, tonoEstado } from './ordersModel.js'
```

Añadir estado, junto a los `useState` que ya hay:

```jsx
  // Acción con diálogo abierto: 'SHIPPED', 'CANCELLED' o null.
  const [dialogo, setDialogo] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const [errorAccion, setErrorAccion] = useState('')
```

Añadir el manejador, antes del `return`:

```jsx
  const aplicar = async (status, shipment) => {
    setGuardando(true)
    setErrorAccion('')
    try {
      const res = await adminApi.updateOrderStatus(id, { status, ...shipment })
      setOrder(res.order)
      setTransiciones(res.allowedTransitions)
      setDialogo(null)
    } catch (err) {
      setErrorAccion(err.message)
    } finally {
      setGuardando(false)
    }
  }
```

Reemplazar el bloque final del componente (el comentario «Las acciones llegan
en la Task 14» y el párrafo de estado final) por:

```jsx
      <section className="space-y-3">
        <ErrorBanner message={errorAccion} />
        <div className="flex flex-wrap gap-3">
          {accionesPara(transiciones).map((accion) => (
            <button
              key={accion.status}
              onClick={() =>
                accion.esEnvio || accion.esCancelacion
                  ? setDialogo(accion.status)
                  : aplicar(accion.status)
              }
              disabled={guardando}
              className={
                'rounded-full px-5 py-2.5 text-sm font-extrabold transition disabled:opacity-50 ' +
                (accion.esCancelacion
                  ? 'border border-red-200 text-red-700 hover:bg-red-50'
                  : 'bg-gradient-to-r from-peach-500 to-peach-600 text-white shadow-lg shadow-peach-500/30')
              }
            >
              {accion.label}
            </button>
          ))}
        </div>
        {transiciones.length === 0 && (
          <p className="text-sm text-[#8A6A4A]">
            Este pedido está en un estado final: no admite más cambios.
          </p>
        )}
      </section>

      {dialogo === 'SHIPPED' && (
        <ShipDialog
          enviando={guardando}
          error={errorAccion}
          onCerrar={() => setDialogo(null)}
          onConfirmar={(shipment) => aplicar('SHIPPED', shipment)}
        />
      )}

      {dialogo === 'CANCELLED' && (
        <CancelDialog
          devuelveStock={order.status !== 'SHIPPED'}
          enviando={guardando}
          error={errorAccion}
          onCerrar={() => setDialogo(null)}
          onConfirmar={() => aplicar('CANCELLED')}
        />
      )}
```

- [ ] **Paso 8: Verificar**

```bash
npm test && npm run build
```

Esperado: limpio.

- [ ] **Paso 9: Confirmar**

```bash
git add frontend/src/admin
git commit -m "feat(admin): despacho con guía obligatoria y cancelación de pedidos"
```

---

### Task 15: Verificación en navegador y documentación

**Archivos:**
- Crear (temporal, **fuera del repositorio**): un backend simulado en el
  directorio de scratchpad
- Modificar: `docs/pendientes-lanzamiento.md`
- Modificar: `docs/referencia-frontend.md`
- Modificar: `docs/referencia-api.md`

**Interfaces:**
- Consume: todo lo anterior.
- Produce: evidencia de que el flujo funciona en el navegador y la
  documentación al día.

- [ ] **Paso 1: Levantar un backend simulado**

No hay base de datos en esta máquina, así que el panel se verifica contra un
servidor mínimo. Guardarlo en el **directorio de scratchpad de la sesión**, no
en el repositorio. Contenido:

```js
// Backend simulado para verificar el panel en el navegador. NO va al repo.
import { createServer } from 'node:http'

const pedido = {
  id: '11111111-1111-1111-1111-111111111111',
  orderNumber: 'PA-2026-000123',
  status: 'PAID',
  total: 79900,
  currency: 'COP',
  contactEmail: 'ana@correo.com',
  shipCity: 'Medellín',
  createdAt: '2026-08-01T10:00:00.000Z',
  subtotal: 79900,
  discountTotal: 0,
  shippingTotal: 0,
  discreetPackaging: true,
  shipFullName: 'Ana Gómez',
  shipPhone: '3001234567',
  shipLine1: 'Calle 10 # 20-30',
  shipLine2: 'Apto 501',
  shipDepartment: 'Antioquia',
  shipPostalCode: '050001',
  carrier: null,
  trackingNumber: null,
  items: [{ productId: 'p1', productName: 'Estuche PomAss Día + Noche', quantity: 1, lineTotal: 79900 }],
}

const SIGUIENTES = {
  PAID: ['PREPARING', 'CANCELLED'],
  PREPARING: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
}

const responder = (res, status, body) => {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PATCH,OPTIONS',
  })
  res.end(JSON.stringify(body))
}

createServer((req, res) => {
  if (req.method === 'OPTIONS') return responder(res, 204, {})

  const url = new URL(req.url, 'http://localhost:3000')

  if (url.pathname === '/api/auth/login') {
    return responder(res, 200, {
      user: { id: 'u1', email: 'admin@pomass.co', role: 'ADMIN' },
      tokens: { accessToken: 'access-falso', refreshToken: 'refresh-falso' },
    })
  }

  if (url.pathname === '/api/admin/orders') {
    const status = url.searchParams.get('status')
    const items = !status || status === pedido.status ? [pedido] : []
    return responder(res, 200, { items, total: items.length, page: 1, pageSize: 20 })
  }

  if (url.pathname === `/api/admin/orders/${pedido.id}`) {
    return responder(res, 200, { order: pedido, allowedTransitions: SIGUIENTES[pedido.status] })
  }

  if (url.pathname === `/api/admin/orders/${pedido.id}/status` && req.method === 'PATCH') {
    let cuerpo = ''
    req.on('data', (c) => (cuerpo += c))
    req.on('end', () => {
      const { status, carrier, trackingNumber } = JSON.parse(cuerpo || '{}')
      if (status === 'SHIPPED' && (!carrier || !trackingNumber)) {
        return responder(res, 400, {
          error: { message: 'Para marcar el pedido como enviado debes registrar la transportadora y el número de guía' },
        })
      }
      pedido.status = status
      if (carrier) pedido.carrier = carrier
      if (trackingNumber) pedido.trackingNumber = trackingNumber
      responder(res, 200, { order: pedido, allowedTransitions: SIGUIENTES[status] })
    })
    return
  }

  responder(res, 404, { error: { message: 'No encontrado' } })
}).listen(3000)
```

Ejecutarlo con `node <ruta-del-scratchpad>/mock-api.mjs` en segundo plano.

- [ ] **Paso 2: Abrir el panel en el navegador**

Crear o ampliar `.claude/launch.json` con la configuración del servidor de
desarrollo del frontend (`npm run dev`, puerto 5173) y abrir el panel con las
herramientas del panel Browser. Navegar a `/admin.html`.

**Nunca usar Bash para levantar el servidor de desarrollo.**

- [ ] **Paso 3: Recorrer el flujo completo**

Comprobar, en este orden:

1. Sin sesión, se ve el formulario de acceso.
2. Al entrar con `admin@pomass.co`, aparece la barra lateral y la lista con el
   pedido `PA-2026-000123`.
3. Los filtros por estado cambian la lista (con «Pendiente» queda vacía y se ve
   el mensaje de estado vacío).
4. Al abrir el pedido se ven la dirección completa, el teléfono y el aviso de
   empaque discreto.
5. «Marcar en preparación» funciona sin diálogo y el estado se actualiza.
6. «Marcar enviado» abre el diálogo; **el botón de confirmar está inhabilitado**
   hasta llenar transportadora y guía.
7. Tras confirmar, el detalle muestra la transportadora y la guía.
8. La URL cambia a `#/pedidos/<id>` y el botón atrás del navegador vuelve a la
   lista.

Revisar la consola con `read_console_messages`: no debe haber errores.

- [ ] **Paso 4: Capturar la evidencia**

Tomar una captura de la lista y otra del detalle con el diálogo de envío
abierto, para adjuntarlas al informe.

- [ ] **Paso 5: Detener el backend simulado**

Terminar el proceso de Node y detener el servidor de desarrollo. El archivo del
scratchpad no se confirma.

- [ ] **Paso 6: Actualizar la documentación**

En `docs/pendientes-lanzamiento.md`:
- Marcar **O2** como hecho.
- Reemplazar el punto **P0** por su estado real: pedidos operativos; catálogo,
  cupones y reportes pendientes del plan F4–F6.

En `docs/referencia-frontend.md`: documentar la tercera entrada (`admin.html`),
la estructura de `src/admin/` y la extracción a `src/shared/`.

En `docs/referencia-api.md`: documentar que `PATCH /admin/orders/:id/status`
acepta `carrier` y `trackingNumber`, que son obligatorios al pasar a `SHIPPED`
y están prohibidos en el resto, y que `GET /orders/track` ahora devuelve ambos.

- [ ] **Paso 7: Verificación final completa**

Backend:

```bash
npm run test:unit && npm run typecheck && npm run lint
```

Frontend:

```bash
npm test && npm run build
```

Esperado: todo limpio. Informar el número de tests de cada suite, comparándolo
con el punto de partida (backend: 138 en 18 suites; frontend: 22 en 2).

- [ ] **Paso 8: Confirmar**

```bash
git add docs
git commit -m "docs: documenta el panel de administración y la guía de envío"
```

---

## Qué queda fuera de este plan

Al terminar la Task 15 la tienda se puede operar. Falta, en un plan aparte:

- **F4** · Catálogo: productos con imágenes por URL, categorías y marcas.
- **F5** · Cupones, con el aviso sobre el límite por usuario.
- **F6** · Reportes con barras SVG.

Y los puntos de [pendientes-lanzamiento.md](../../pendientes-lanzamiento.md)
que no toca este trabajo: `track.html` (B1), la landing (B2), las imágenes en
el checkout (B3), la infraestructura (B4–B6) y los emails (O1).
