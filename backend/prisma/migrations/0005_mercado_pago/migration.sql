-- Cambio de pasarela: Wompi -> Mercado Pago.
--
-- No se pierde nada. Mercado Pago cumple el mismo papel (un solo proveedor que
-- por dentro ofrece tarjeta, PSE, Efecty y saldo), así que el modelo no cambia:
-- solo se renombran el valor del enum y la columna del id de transacción, que
-- ahora es del proveedor en general y no de una marca concreta.

-- AlterEnum: WOMPI -> MERCADO_PAGO.
-- `RENAME VALUE` conserva las filas existentes; recrear el tipo (como hizo la
-- migración 0003) obligaría a remapear pagos que ahora sí pueden ser reales.
ALTER TYPE "PaymentMethod" RENAME VALUE 'WOMPI' TO 'MERCADO_PAGO';

-- AlterTable: el id de transacción deja de llevar el nombre de la pasarela.
ALTER TABLE "payments" RENAME COLUMN "wompiTransactionId" TO "providerTransactionId";

-- El índice sigue al nombre de la columna para que Prisma no lo vea como
-- un índice de más y proponga recrearlo en la siguiente migración.
ALTER INDEX "payments_wompiTransactionId_idx" RENAME TO "payments_providerTransactionId_idx";
