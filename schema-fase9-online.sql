-- FASE 9 · Pedidos ONLINE (sin mesa) para negocios "Con POS"
-- recoger / domicilio activables por separado. 0 = apagado, 1 = encendido.
-- Se aplica con:
--   npx wrangler d1 execute fenlora-menus --remote --file=schema-fase9-online.sql
ALTER TABLE tenants ADD COLUMN pos_online_recoger INTEGER NOT NULL DEFAULT 0;
ALTER TABLE tenants ADD COLUMN pos_online_domicilio INTEGER NOT NULL DEFAULT 0;
