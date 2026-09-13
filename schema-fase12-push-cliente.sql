-- ════════════════════════════════════════════════════════════════════
-- FENLORA MENÚ · FASE 12 · Aviso PUSH al cliente cuando su pedido está
-- listo, AUNQUE haya cerrado el menú (el "beeper de KFC" en segundo plano).
--
-- Guarda la suscripción push del celular del cliente, asociada a su pedido.
-- Un cron del Worker (cada minuto) revisa los pedidos pendientes contra el
-- POS y, cuando quedan "listos", le manda el aviso al celular.
--
-- Se aplica con:
--   npx wrangler d1 execute fenlora-menus --remote --file=schema-fase12-push-cliente.sql
-- Seguro re-correr: usa IF NOT EXISTS.
-- ════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS push_pedidos (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  slug      TEXT NOT NULL,              -- negocio (tenant id)
  clave     TEXT NOT NULL,              -- clave del pedido en el POS (online_..., delivery_...)
  endpoint  TEXT NOT NULL,              -- endpoint push del navegador del cliente
  creado    TEXT NOT NULL DEFAULT (datetime('now')),
  entregado INTEGER NOT NULL DEFAULT 0  -- 0 pendiente · 1 ya avisado · 2 expirado (>3h)
);

-- Evita duplicar la misma suscripción para el mismo pedido.
CREATE UNIQUE INDEX IF NOT EXISTS ux_push_pedidos_clave_ep ON push_pedidos(clave, endpoint);
-- Para que el cron encuentre rápido los pendientes.
CREATE INDEX IF NOT EXISTS ix_push_pedidos_pend ON push_pedidos(entregado);
