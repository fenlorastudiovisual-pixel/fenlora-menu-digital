-- Fase 4: carrito real con pago en línea (link genérico por negocio)
-- Ejecutar UNA sola vez sobre la base de datos ya existente (fenlora-menus).
-- No borra ni toca "tenants" ni "productos" que ya tienes.

ALTER TABLE tenants ADD COLUMN pago_url TEXT;         -- link de pago propio del negocio (Wompi, Bold, etc.)
ALTER TABLE tenants ADD COLUMN moneda TEXT DEFAULT 'COP';

CREATE TABLE IF NOT EXISTS pedidos (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id     TEXT NOT NULL,
  items         TEXT NOT NULL,        -- JSON: [{producto_id, nombre, precio, cantidad}]
  total         REAL NOT NULL,
  estado        TEXT NOT NULL DEFAULT 'pendiente_pago', -- pendiente_pago | pagado | cancelado
  cliente_nota  TEXT,                 -- ej: número de mesa u observación
  creado_en     TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

CREATE INDEX IF NOT EXISTS idx_pedidos_tenant ON pedidos(tenant_id);
