-- Defensa adicional: activa Row Level Security en todas las tablas de la
-- tienda, sin políticas.
--
-- Sin políticas, RLS niega todo. Eso es lo que se busca: los roles `anon` y
-- `authenticated` —los que usa la Data API de Supabase por HTTP— no deben
-- poder leer NADA de aquí. Estas tablas guardan contraseñas cifradas, pedidos,
-- direcciones y teléfonos.
--
-- La aplicación no se ve afectada. Se usa `ENABLE`, no `FORCE`: con `ENABLE`,
-- RLS no aplica ni al dueño de la tabla ni a los roles con BYPASSRLS, que es
-- como se conecta la tienda. `FORCE` sí aplicaría al dueño, y ese matiz —el
-- rol que corre este SQL en el editor no tiene por qué ser el mismo con el que
-- se conecta la aplicación— es justo el que dejaría la tienda sin poder leer
-- sus propios datos. Por eso no se usa.
--
-- CÓMO APLICARLO
--   Panel de Supabase → SQL Editor → pegar esto → Run.
--
-- No sustituye a desactivar la Data API: es la segunda cerradura. Si alguna
-- vez se vuelve a activar la Data API por error, esto sigue tapando el hueco.

DO $$
DECLARE
  t  record;
  n  int := 0;
BEGIN
  FOR t IN
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public'
      -- La tabla de historial de Prisma se deja fuera: la lee el propio
      -- Prisma al migrar, y no contiene datos de nadie.
      AND tablename <> '_prisma_migrations'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.tablename);
    n := n + 1;
  END LOOP;

  RAISE NOTICE 'RLS activada en % tablas.', n;
END
$$;

-- Comprobación: todas deben salir con rowsecurity = true.
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'
ORDER BY tablename;
