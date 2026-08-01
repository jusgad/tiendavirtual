-- Permite pedidos de invitado: userId pasa a ser opcional y se agrega un
-- correo de contacto para poder identificar/contactar al invitado.
ALTER TABLE "orders" ALTER COLUMN "userId" DROP NOT NULL;
ALTER TABLE "orders" ADD COLUMN "guestEmail" TEXT;
