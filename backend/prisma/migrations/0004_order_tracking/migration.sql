-- Rastreo del envío en el pedido.
--
-- Ambas columnas son nullables a propósito: un pedido solo tiene guía a partir
-- del momento en que se despacha (SHIPPED), y los pedidos ya existentes no la
-- tienen. La obligatoriedad se impone en la transición de estado, no aquí.
ALTER TABLE "orders" ADD COLUMN "carrier" TEXT;
ALTER TABLE "orders" ADD COLUMN "trackingNumber" TEXT;
