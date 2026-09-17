-- ════════════════════════════════════════════════════════════════════
-- FENLORA MENÚ · FASE 15 · Bot para negocios SIN POS + espacio para la
-- API de WhatsApp (WhatsApp Business / Cloud API de Meta).
--
--  • bot_activo: 1 = el negocio (sin POS) muestra el bot de pedidos por chat.
--  • wa_api_*: credenciales para enviar por la API de WhatsApp en vez del
--    wa.me nativo. POR AHORA solo se GUARDAN (el envío se cablea después).
--
-- Se aplica con:
--   npx wrangler d1 execute fenlora-menus --remote --file=schema-fase15-bot-autonomo-wa-api.sql
-- Si alguna columna ya existe, SQLite dirá "duplicate column"; corre solo la que falte.
-- ════════════════════════════════════════════════════════════════════

ALTER TABLE tenants ADD COLUMN bot_activo      INTEGER NOT NULL DEFAULT 0;
ALTER TABLE tenants ADD COLUMN wa_api_phone_id TEXT;
ALTER TABLE tenants ADD COLUMN wa_api_token    TEXT;
ALTER TABLE tenants ADD COLUMN wa_api_activo   INTEGER NOT NULL DEFAULT 0;
