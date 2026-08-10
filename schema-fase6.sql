-- Fase 6: cobranza por negocio + configuración global del admin
-- Ejecutar UNA sola vez sobre la base de datos ya existente (fenlora-menus).
-- No borra ni toca nada de lo que ya tienes.

ALTER TABLE tenants ADD COLUMN precio_mensual REAL;
ALTER TABLE tenants ADD COLUMN dia_cobro INTEGER;          -- día del mes (1-28) en que se le cobra
ALTER TABLE tenants ADD COLUMN fecha_ultimo_pago TEXT;     -- se actualiza al marcar "pagado"

CREATE TABLE IF NOT EXISTS config (
  id                        INTEGER PRIMARY KEY CHECK (id = 1),
  moneda_default            TEXT NOT NULL DEFAULT 'COP',
  whatsapp_mensaje_default  TEXT,
  url_publica_r2            TEXT
);

INSERT OR IGNORE INTO config (id, moneda_default) VALUES (1, 'COP');
