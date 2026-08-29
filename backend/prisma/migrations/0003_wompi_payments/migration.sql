-- Migración a Wompi como única pasarela de pago.
--
-- Wompi es un solo proveedor que internamente ofrece tarjeta, Nequi, PSE y
-- Bancolombia. El medio concreto que eligió el cliente llega en el evento del
-- webhook y se guarda en `payments.rawPayload`; deja de modelarse como enum.

-- AlterEnum: PaymentMethod pasa de (NEQUI, DAVIPLATA, CREDIT_CARD) a (WOMPI).
-- Postgres no permite quitar valores de un enum, así que se crea uno nuevo y se
-- reemplaza. Los pagos que existieran se remapean a WOMPI: en desarrollo son
-- datos simulados y en producción todavía no hay pagos reales.
CREATE TYPE "PaymentMethod_new" AS ENUM ('WOMPI');

ALTER TABLE "payments"
  ALTER COLUMN "method" TYPE "PaymentMethod_new"
  USING ('WOMPI'::text::"PaymentMethod_new");

DROP TYPE "PaymentMethod";

ALTER TYPE "PaymentMethod_new" RENAME TO "PaymentMethod";

-- AlterTable: id de transacción que asigna Wompi (llega en el evento, no antes).
ALTER TABLE "payments" ADD COLUMN "wompiTransactionId" TEXT;

-- CreateIndex
CREATE INDEX "payments_wompiTransactionId_idx" ON "payments"("wompiTransactionId");
