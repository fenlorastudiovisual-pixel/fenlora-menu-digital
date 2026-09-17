-- ════════════════════════════════════════════════════════════════════
-- FENLORA MENÚ · FASE 14 · Número de pedido que se REINICIA cada día.
-- Guarda por cada pedido su número del día (#1, #2, …) y el día (hora
-- Colombia), para que el panel del dueño no muestre IDs enormes.
--
-- Se aplica con:
--   npx wrangler d1 execute fenlora-menus --remote --file=schema-fase14-num-dia.sql
-- Si alguna columna ya existe, SQLite dirá "duplicate column"; corre solo la que falte.
-- ════════════════════════════════════════════════════════════════════

ALTER TABLE pedidos ADD COLUMN num_dia INTEGER;
ALTER TABLE pedidos ADD COLUMN dia     TEXT;

-- Índice para contar rápido los pedidos del día por negocio.
CREATE INDEX IF NOT EXISTS ix_pedidos_dia ON pedidos(tenant_id, dia);
