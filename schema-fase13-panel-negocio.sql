-- ════════════════════════════════════════════════════════════════════
-- FENLORA MENÚ · FASE 13 · Panel del DUEÑO para negocios SIN POS (autónomos)
--
-- Un panel independiente (separado del admin de desarrollador) donde el dueño
-- del negocio recibe y gestiona los autopedidos de su menú digital, con aviso
-- en vivo y push al celular. Acceso por enlace secreto + PIN.
--
-- Se aplica con:
--   npx wrangler d1 execute fenlora-menus --remote --file=schema-fase13-panel-negocio.sql
-- Seguro re-correr: IF NOT EXISTS / columnas nuevas. Si alguna columna ya
-- existe, SQLite dirá "duplicate column"; en ese caso corre solo las que falten.
-- ════════════════════════════════════════════════════════════════════

-- Acceso del dueño al panel: enlace secreto (token) + PIN (hash).
ALTER TABLE tenants ADD COLUMN panel_token   TEXT;
ALTER TABLE tenants ADD COLUMN panel_pin_hash TEXT;

-- Estado de preparación del pedido (flujo tipo cocina), independiente del
-- estado de pago. nuevo → preparando → listo → entregado.
ALTER TABLE pedidos ADD COLUMN estado_prep TEXT NOT NULL DEFAULT 'nuevo';

-- Suscripciones push del celular del dueño (para avisarle de pedidos nuevos
-- aunque tenga el panel cerrado). Sin payload: solo el endpoint.
CREATE TABLE IF NOT EXISTS panel_subs (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  slug     TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  creado   TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_panel_subs ON panel_subs(slug, endpoint);
