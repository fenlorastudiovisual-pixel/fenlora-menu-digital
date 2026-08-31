-- FASE 8 · Autopedido on/off para negocios "Con POS"
-- 1 = el cliente puede pedir desde la mesa (autopedido)  ·  0 = solo ver carta + llamar al mesero
-- Se aplica con:
--   npx wrangler d1 execute fenlora-menus --remote --file=schema-fase8-autopedido.sql
ALTER TABLE tenants ADD COLUMN pos_autopedido INTEGER NOT NULL DEFAULT 1;
