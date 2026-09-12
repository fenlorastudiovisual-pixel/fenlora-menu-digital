-- FASE 11 · Demos: marcar cualquier menú como "demo" para mostrarlo a prospectos.
-- Base D1 del MENÚ (fenlora-menus). Correr con:
--   npx wrangler d1 execute fenlora-menus --remote --file=schema-fase11-demos.sql
-- No borra ni toca nada de lo que ya tienes.

ALTER TABLE tenants ADD COLUMN es_demo INTEGER NOT NULL DEFAULT 0;

-- Marca tus menús que ya tienen fotos como demo:
UPDATE tenants SET es_demo = 1 WHERE id = 'cero-absoluto';   -- granizados
UPDATE tenants SET es_demo = 1 WHERE id = 'dulce-cafe';      -- cafetería
