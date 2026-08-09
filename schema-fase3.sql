-- Fase 3: catálogo de productos por negocio
-- Ejecutar UNA sola vez sobre la base de datos ya existente (fenlora-menus).
-- No borra ni toca la tabla "tenants" que ya tienes.

CREATE TABLE IF NOT EXISTS productos (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id     TEXT NOT NULL,           -- a qué negocio pertenece (ej: "cero-absoluto")
  categoria     TEXT NOT NULL,           -- ej: "Granizados", "Shots"
  nombre        TEXT NOT NULL,
  descripcion   TEXT,
  precio        REAL NOT NULL,
  imagen_url    TEXT,                    -- URL pública (R2) de la foto del producto
  destacado     INTEGER NOT NULL DEFAULT 0, -- 1 = aparece en "Nuestros Favoritos" del home
  orden         INTEGER NOT NULL DEFAULT 0, -- para controlar el orden dentro de su categoría
  activo        INTEGER NOT NULL DEFAULT 1, -- 0 = oculto sin borrarlo (ej: agotado)
  creado_en     TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

CREATE INDEX IF NOT EXISTS idx_productos_tenant ON productos(tenant_id);
CREATE INDEX IF NOT EXISTS idx_productos_categoria ON productos(tenant_id, categoria);
