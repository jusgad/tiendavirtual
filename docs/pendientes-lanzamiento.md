# Pendientes para lanzar · lista de control

Lista viva de lo que falta para que la tienda venda de verdad. Se marca a
medida que se cierra cada punto. Ordenada por dependencia, no por tamaño.

| | |
|---|---|
| **Creada** | 2026-08-29 |
| **Rama** | `feat/wompi-seguimiento-pedido` |
| **Estado base** | 138 tests unitarios ✅ · typecheck ✅ · lint ✅ · backend completo |

---

## 0. En curso

- [ ] **P0 · Panel de administración (frontend)**
  Los endpoints ya existen (`GET /admin/orders`, `GET /admin/orders/:id`,
  `PATCH /admin/orders/:id/status`, `GET /admin/reports/*`), pero no hay
  interfaz: hoy se opera con Swagger o curl. Sin esto nadie puede despachar
  un pedido.

---

## 1. Bloqueantes — sin esto no se puede vender

- [ ] **B1 · `track.html` no existe**
  `WOMPI_REDIRECT_URL` apunta ahí. PSE y Bancolombia sacan al cliente del
  sitio y lo devuelven a un **404** después de pagar.
  El endpoint (`GET /orders/track`) y `api.trackOrder` ya están listos; falta
  solo la página y registrarla en `vite.config.js`.

- [ ] **B2 · La landing todavía vende por WhatsApp**
  `FloatingCta.jsx` apunta a `whatsappUrl()`. Además hay que decidir qué pasa
  con los dos botones que dicen «COMPRAR POR WHATSAPP» en `OfferCard.jsx` y
  `StickyBar.jsx`.

- [ ] **B3 · El checkout no muestra imágenes del producto**
  El seed ya crea `ProductImage`, pero `ShopStep.jsx` no renderiza ninguna:
  el cliente compra a ciegas. Falta también el alojamiento real de las fotos
  (bucket / CDN).

- [ ] **B4 · Infraestructura viva**
  No hay Postgres ni Redis provisionados, ni backend ni frontend desplegados.
  Las configuraciones sí están listas: `backend/railway.json`,
  `frontend/vercel.json`, Dockerfile multietapa.

- [ ] **B5 · Credenciales reales de Wompi**
  Las cuatro llaves son placeholders (`pub_test_000…`). Falta además registrar
  la URL del webhook en el panel de Wompi.

- [ ] **B6 · QA end-to-end en sandbox**
  Los tests de integración compilan pero nunca se han ejecutado aquí (Docker
  no arranca en esta máquina). El flujo real de pago no se ha probado nunca de
  punta a punta contra una base de datos viva.

---

## 2. Necesario para operar la tienda

- [ ] **O1 · Emails transaccionales**
  No existe **nada**: ni nodemailer, ni Resend, ni SMTP. Consecuencias:
  - Si el cliente cierra la pantalla de confirmación, pierde el acceso a su
    pedido para siempre.
  - No hay aviso de «pedido enviado».
  - La recuperación de contraseña del admin **no funciona en producción**: el
    token se genera pero `devResetToken` solo se expone fuera de producción.

- [ ] **O2 · Número de guía de la transportadora**
  El modelo `Order` no tiene campo de tracking. El cliente ve «Enviado» pero
  no puede rastrear el paquete.
  → **Se cubre dentro de P0**: la pantalla que pide la guía es el detalle de
  pedido del panel. Ver la [especificación](superpowers/specs/2026-08-29-panel-administracion-design.md).

- [ ] **O3 · Textos legales (Colombia)**
  Política de tratamiento de datos (Ley 1581), términos y condiciones,
  política de devoluciones con el retracto de 5 días hábiles (Estatuto del
  Consumidor) y datos del comerciante.

---

## 3. Riesgos a cerrar antes de escalar

- [ ] **R1 · Redis es punto único de fallo de las ventas**
  `RedisCartStore` no tiene `try/catch`, a diferencia de la caché de catálogo.
  Si Redis cae, nadie puede añadir al carrito ni comprar. Mínimo: monitoreo y
  alerta; idealmente, una decisión explícita sobre la degradación.

- [ ] **R2 · `perUserLimit` de cupones no es exigible sin cuentas**
  Solo funciona el tope global `maxUses`. Un cupón «uno por cliente» hoy es
  ilimitado para los pedidos de invitado.

- [ ] **R3 · Sin observabilidad**
  No hay Sentry, ni alertas, ni backups verificados de la base de datos.

---

## Orden sugerido

```
Panel admin (P0)  →  B1 track.html  →  B3 imágenes  →  B2 landing
      →  O1 emails  →  B4 infra  →  B5 llaves sandbox  →  B6 QA
      →  O2 guía + P0 ampliado  →  O3 legales  →  llaves de producción
      →  R1-R3 en paralelo
```

## Relacionado

- [Análisis de brechas](analisis-brechas-blueprint.md) — el detalle técnico de cada hueco
- [Cómo desplegar](howto-desplegar.md)
