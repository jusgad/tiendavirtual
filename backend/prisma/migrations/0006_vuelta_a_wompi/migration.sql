-- Vuelta atrás: Mercado Pago -> Wompi.
--
-- Deshace exactamente lo que hizo la 0005, y por el mismo motivo: con
-- `RENAME` las filas se conservan. Recrear el tipo obligaría a remapear
-- pagos que a estas alturas ya pueden ser reales.
--
-- No se borra la 0005 ni se edita: una migración ya aplicada en una base es
-- historia, y reescribirla deja a Prisma comparando contra algo que allí no
-- ocurrió nunca. Las bases que nunca llegaron a ver la 0005 aplican las dos
-- seguidas y acaban igual.

-- AlterEnum: MERCADO_PAGO -> WOMPI.
ALTER TYPE "PaymentMethod" RENAME VALUE 'MERCADO_PAGO' TO 'WOMPI';

-- AlterTable: el id de transacción vuelve a llevar el nombre de la pasarela.
ALTER TABLE "payments" RENAME COLUMN "providerTransactionId" TO "wompiTransactionId";

-- El índice sigue al nombre de la columna para que Prisma no lo vea como uno
-- de más y proponga recrearlo en la siguiente migración.
ALTER INDEX "payments_providerTransactionId_idx" RENAME TO "payments_wompiTransactionId_idx";
