-- Fase 7: enlace con el POS (contrato v1)
-- Ejecutar UNA sola vez sobre la base D1 del MENÚ (fenlora-menus):
--   npx wrangler d1 execute fenlora-menus --remote --file=schema-fase7-pos.sql
-- No borra ni toca nada de lo que ya tienes.

ALTER TABLE tenants ADD COLUMN modo_pos INTEGER NOT NULL DEFAULT 0;  -- 0 = autónomo, 1 = enlazado al POS
ALTER TABLE tenants ADD COLUMN pos_api_key TEXT;                     -- la clave que genera el POS para este negocio
