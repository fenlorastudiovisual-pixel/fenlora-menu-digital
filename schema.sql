-- Base de datos: fenlora-menus (Cloudflare D1)
-- Fase 1: solo lo necesario para crear y listar negocios (tenants)

CREATE TABLE IF NOT EXISTS tenants (
  id            TEXT PRIMARY KEY,        -- slug único, ej: "cero-absoluto"
  nombre        TEXT NOT NULL,           -- nombre real del negocio
  nicho         TEXT NOT NULL,           -- id del nicho preset, ej: "sushi", "granizados"
  whatsapp      TEXT,                    -- número en formato 51999999999
  logo_url      TEXT,                    -- URL pública en R2
  tema          TEXT NOT NULL,           -- JSON: colores/tipografía (parte del preset del nicho)
  contenido     TEXT NOT NULL,           -- JSON: hero, categorías, promo, productos, beneficios
  activo        INTEGER NOT NULL DEFAULT 1,
  creado_en     TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Fase 4 la usará para métricas simples de visitas por negocio
CREATE TABLE IF NOT EXISTS visitas (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id     TEXT NOT NULL,
  fecha         TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

CREATE INDEX IF NOT EXISTS idx_visitas_tenant ON visitas(tenant_id);
