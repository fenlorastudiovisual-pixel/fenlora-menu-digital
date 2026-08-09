import { NICHOS, listaNichos } from "./niches.js";

// URL pública del bucket R2 (la que activaste en Settings → Public Development URL).
// Si más adelante conectas un dominio propio tipo cdn.fenlora.com, cámbiala aquí
// y todas las fotos (logos y productos) de todos los negocios se sirven desde ahí.
const PUBLIC_R2_URL = "https://pub-6509f754158640c68cc33a2321f3387e.r2.dev";

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

function slugify(texto) {
  return texto
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function nombreArchivoSeguro(nombre) {
  const partes = nombre.split(".");
  const ext = partes.length > 1 ? partes.pop().toLowerCase().replace(/[^a-z0-9]/g, "") : "jpg";
  const base = slugify(partes.join(".")) || "img";
  return `${base}-${Date.now().toString(36)}.${ext || "jpg"}`;
}

// ---------- /admin/api/nichos ----------
function getNichos() {
  return json({ nichos: listaNichos() });
}

// ---------- /admin/api/tenants ----------
async function listTenants(env) {
  const { results } = await env.DB.prepare(`
    SELECT
      t.id, t.nombre, t.nicho, t.whatsapp, t.logo_url, t.activo, t.creado_en,
      (SELECT COUNT(*) FROM productos p WHERE p.tenant_id = t.id) AS total_productos,
      (SELECT COUNT(*) FROM pedidos pe WHERE pe.tenant_id = t.id) AS total_pedidos,
      (SELECT COUNT(*) FROM pedidos pe WHERE pe.tenant_id = t.id AND pe.estado = 'pendiente_pago') AS pedidos_pendientes
    FROM tenants t
    ORDER BY t.creado_en DESC
  `).all();
  return json({ tenants: results });
}

// ---------- /admin/api/resumen ----------
async function getResumen(env) {
  const totales = await env.DB.prepare(`
    SELECT
      (SELECT COUNT(*) FROM tenants) AS negocios_total,
      (SELECT COUNT(*) FROM tenants WHERE activo = 1) AS negocios_activos,
      (SELECT COUNT(*) FROM productos) AS productos_total,
      (SELECT COUNT(*) FROM pedidos) AS pedidos_total,
      (SELECT COUNT(*) FROM pedidos WHERE estado = 'pendiente_pago') AS pedidos_pendientes
  `).first();

  const { results: sinProductos } = await env.DB.prepare(`
    SELECT t.id, t.nombre FROM tenants t
    WHERE t.activo = 1 AND (SELECT COUNT(*) FROM productos p WHERE p.tenant_id = t.id) = 0
    ORDER BY t.creado_en DESC
  `).all();

  return json({ ...totales, negocios_sin_productos: sinProductos });
}

async function createTenant(request, env) {
  const body = await request.json();
  const { nombre, nicho, whatsapp, pago_url, moneda } = body;

  if (!nombre || !nicho) return json({ error: "Falta 'nombre' o 'nicho'" }, 400);
  const preset = NICHOS[nicho];
  if (!preset) return json({ error: `Nicho desconocido: ${nicho}` }, 400);

  let id = slugify(nombre);
  const existe = await env.DB.prepare("SELECT id FROM tenants WHERE id = ?").bind(id).first();
  if (existe) id = `${id}-${Date.now().toString(36)}`;

  const contenido = { ...preset.contenido_ejemplo, nombre_negocio: nombre };

  await env.DB.prepare(
    `INSERT INTO tenants (id, nombre, nicho, whatsapp, logo_url, tema, contenido, pago_url, moneda)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    id, nombre, nicho, whatsapp || null, "/assets/logo-placeholder.png",
    JSON.stringify(preset.tema), JSON.stringify(contenido), pago_url || null, moneda || "COP"
  ).run();

  return json({ id, url: `/t/${id}` }, 201);
}

// ---------- /admin/api/tenants/:id ----------
async function getTenant(id, env) {
  const row = await env.DB.prepare("SELECT * FROM tenants WHERE id = ?").bind(id).first();
  if (!row) return json({ error: "No encontrado" }, 404);
  return json({ ...row, tema: JSON.parse(row.tema), contenido: JSON.parse(row.contenido) });
}

async function updateTenant(id, request, env) {
  const row = await env.DB.prepare("SELECT * FROM tenants WHERE id = ?").bind(id).first();
  if (!row) return json({ error: "No encontrado" }, 404);

  const body = await request.json();
  const nombre = body.nombre ?? row.nombre;
  const whatsapp = body.whatsapp ?? row.whatsapp;
  const logo_url = body.logo_url ?? row.logo_url;
  const activo = body.activo ?? row.activo;
  const pago_url = body.pago_url ?? row.pago_url;
  const moneda = body.moneda ?? row.moneda;
  const tema = body.tema ? JSON.stringify(body.tema) : row.tema;
  const contenido = body.contenido ? JSON.stringify(body.contenido) : row.contenido;

  await env.DB.prepare(
    `UPDATE tenants SET nombre=?, whatsapp=?, logo_url=?, tema=?, contenido=?, activo=?, pago_url=?, moneda=? WHERE id=?`
  ).bind(nombre, whatsapp, logo_url, tema, contenido, activo, pago_url, moneda, id).run();

  return json({ ok: true });
}

async function deleteTenant(id, env) {
  await env.DB.prepare("DELETE FROM tenants WHERE id = ?").bind(id).run();
  return json({ ok: true });
}

// ---------- /admin/api/tenants/:id/products ----------
async function listProducts(tenantId, env) {
  const { results } = await env.DB.prepare(
    "SELECT * FROM productos WHERE tenant_id = ? ORDER BY categoria, orden, id"
  ).bind(tenantId).all();
  return json({ productos: results });
}

async function createProduct(tenantId, request, env) {
  const body = await request.json();
  const { categoria, nombre, precio } = body;
  if (!categoria || !nombre || precio == null) {
    return json({ error: "Faltan 'categoria', 'nombre' o 'precio'" }, 400);
  }
  const r = await env.DB.prepare(
    `INSERT INTO productos (tenant_id, categoria, nombre, descripcion, precio, imagen_url, destacado, orden)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    tenantId, categoria, nombre, body.descripcion || "", precio,
    body.imagen_url || null, body.destacado ? 1 : 0, body.orden || 0
  ).run();
  return json({ id: r.meta.last_row_id }, 201);
}

// ---------- /admin/api/products/:id ----------
async function updateProduct(id, request, env) {
  const row = await env.DB.prepare("SELECT * FROM productos WHERE id = ?").bind(id).first();
  if (!row) return json({ error: "No encontrado" }, 404);
  const body = await request.json();
  await env.DB.prepare(
    `UPDATE productos SET categoria=?, nombre=?, descripcion=?, precio=?, imagen_url=?, destacado=?, orden=?, activo=?
     WHERE id=?`
  ).bind(
    body.categoria ?? row.categoria,
    body.nombre ?? row.nombre,
    body.descripcion ?? row.descripcion,
    body.precio ?? row.precio,
    body.imagen_url ?? row.imagen_url,
    body.destacado != null ? (body.destacado ? 1 : 0) : row.destacado,
    body.orden ?? row.orden,
    body.activo != null ? (body.activo ? 1 : 0) : row.activo,
    id
  ).run();
  return json({ ok: true });
}

async function deleteProduct(id, env) {
  await env.DB.prepare("DELETE FROM productos WHERE id = ?").bind(id).run();
  return json({ ok: true });
}

// ---------- /menu/:slug/pedido (público: el cliente registra su pedido) ----------
async function crearPedido(slug, request, env) {
  const tenant = await env.DB.prepare("SELECT id FROM tenants WHERE id = ? AND activo = 1").bind(slug).first();
  if (!tenant) return json({ error: "Negocio no encontrado" }, 404);

  const body = await request.json();
  const { items, total, cliente_nota } = body;
  if (!items || !Array.isArray(items) || items.length === 0 || total == null) {
    return json({ error: "Pedido vacío o incompleto" }, 400);
  }

  const r = await env.DB.prepare(
    `INSERT INTO pedidos (tenant_id, items, total, cliente_nota) VALUES (?, ?, ?, ?)`
  ).bind(slug, JSON.stringify(items), total, cliente_nota || null).run();

  return json({ id: r.meta.last_row_id }, 201);
}

// ---------- /admin/api/tenants/:id/pedidos (admin: ver pedidos de un negocio) ----------
async function listPedidos(tenantId, env) {
  const { results } = await env.DB.prepare(
    "SELECT * FROM pedidos WHERE tenant_id = ? ORDER BY creado_en DESC LIMIT 100"
  ).bind(tenantId).all();
  const pedidos = results.map(p => ({ ...p, items: JSON.parse(p.items) }));
  return json({ pedidos });
}

// ---------- /admin/api/pedidos/:id (admin: marcar pagado/cancelado) ----------
async function updatePedidoEstado(id, request, env) {
  const body = await request.json();
  if (!body.estado) return json({ error: "Falta 'estado'" }, 400);
  await env.DB.prepare("UPDATE pedidos SET estado=? WHERE id=?").bind(body.estado, id).run();
  return json({ ok: true });
}

// ---------- /admin/api/upload (foto de producto o logo -> R2) ----------
async function uploadFile(request, env) {
  const form = await request.formData();
  const file = form.get("file");
  const tenantId = form.get("tenant_id");
  if (!file || !tenantId) return json({ error: "Falta 'file' o 'tenant_id'" }, 400);

  const carpeta = form.get("carpeta") === "logo" ? "" : "productos/";
  const nombreArchivo = nombreArchivoSeguro(file.name || "imagen.jpg");
  const key = `${tenantId}/${carpeta}${nombreArchivo}`;

  await env.BUCKET.put(key, file.stream(), {
    httpMetadata: { contentType: file.type || "image/jpeg" }
  });

  const url = `${PUBLIC_R2_URL}/${key}`;
  return json({ url, key }, 201);
}

async function getMenuPublico(slug, env) {
  const row = await env.DB.prepare(
    "SELECT nombre, nicho, whatsapp, logo_url, tema, contenido, pago_url, moneda FROM tenants WHERE id = ? AND activo = 1"
  ).bind(slug).first();
  if (!row) return json({ error: "Negocio no encontrado" }, 404);

  const { results: productos } = await env.DB.prepare(
    "SELECT id, categoria, nombre, descripcion, precio, imagen_url, destacado, orden FROM productos WHERE tenant_id = ? AND activo = 1 ORDER BY categoria, orden, id"
  ).bind(slug).all();

  return json({
    nombre: row.nombre, nicho: row.nicho, whatsapp: row.whatsapp, logo_url: row.logo_url,
    tema: JSON.parse(row.tema), contenido: JSON.parse(row.contenido),
    pago_url: row.pago_url, moneda: row.moneda || "COP",
    productos,
    destacados: productos.filter(p => p.destacado)
  });
}

// ---------- Router principal ----------
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    try {
      // /admin/api/nichos
      if (path === "/admin/api/nichos" && method === "GET") {
        return getNichos();
      }

      // /admin/api/resumen
      if (path === "/admin/api/resumen" && method === "GET") {
        return await getResumen(env);
      }

      // /admin/api/tenants
      if (path === "/admin/api/tenants" && method === "GET") {
        return await listTenants(env);
      }
      if (path === "/admin/api/tenants" && method === "POST") {
        return await createTenant(request, env);
      }

      // /admin/api/tenants/:id
      const tenantMatch = path.match(/^\/admin\/api\/tenants\/([^/]+)$/);
      if (tenantMatch) {
        const id = decodeURIComponent(tenantMatch[1]);
        if (method === "GET") return await getTenant(id, env);
        if (method === "PUT") return await updateTenant(id, request, env);
        if (method === "DELETE") return await deleteTenant(id, env);
      }

      // /admin/api/tenants/:id/products
      const productsMatch = path.match(/^\/admin\/api\/tenants\/([^/]+)\/products$/);
      if (productsMatch) {
        const tenantId = decodeURIComponent(productsMatch[1]);
        if (method === "GET") return await listProducts(tenantId, env);
        if (method === "POST") return await createProduct(tenantId, request, env);
      }

      // /admin/api/products/:id
      const productMatch = path.match(/^\/admin\/api\/products\/([^/]+)$/);
      if (productMatch) {
        const id = decodeURIComponent(productMatch[1]);
        if (method === "PUT") return await updateProduct(id, request, env);
        if (method === "DELETE") return await deleteProduct(id, env);
      }

      // /admin/api/upload  (sube foto de producto o logo a R2)
      if (path === "/admin/api/upload" && method === "POST") {
        return await uploadFile(request, env);
      }

      // /admin/api/tenants/:id/pedidos
      const pedidosMatch = path.match(/^\/admin\/api\/tenants\/([^/]+)\/pedidos$/);
      if (pedidosMatch && method === "GET") {
        return await listPedidos(decodeURIComponent(pedidosMatch[1]), env);
      }

      // /admin/api/pedidos/:id
      const pedidoMatch = path.match(/^\/admin\/api\/pedidos\/([^/]+)$/);
      if (pedidoMatch && method === "PUT") {
        return await updatePedidoEstado(decodeURIComponent(pedidoMatch[1]), request, env);
      }

      // /menu/:slug/pedido  (público: el cliente registra su pedido)
      const crearPedidoMatch = path.match(/^\/menu\/([^/]+)\/pedido$/);
      if (crearPedidoMatch && method === "POST") {
        return await crearPedido(decodeURIComponent(crearPedidoMatch[1]), request, env);
      }

      // /menu/:slug  (API pública: config del negocio + productos, en JSON)
      const menuMatch = path.match(/^\/menu\/([^/]+)$/);
      if (menuMatch && method === "GET") {
        return await getMenuPublico(decodeURIComponent(menuMatch[1]), env);
      }

      // /t/:slug/checkout  (página pública: carrito y confirmación de pedido)
      const checkoutMatch = path.match(/^\/t\/([^/]+)\/checkout$/);
      if (checkoutMatch && method === "GET") {
        const plantilla = await env.ASSETS.fetch(new URL("/checkout.html", request.url));
        return new Response(plantilla.body, plantilla);
      }

      // /t/:slug/menu  (página pública ligera: catálogo completo por categoría)
      const menuPageMatch = path.match(/^\/t\/([^/]+)\/menu$/);
      if (menuPageMatch && method === "GET") {
        const plantilla = await env.ASSETS.fetch(new URL("/menu.html", request.url));
        return new Response(plantilla.body, plantilla);
      }

      // /t/:slug  (página del negocio: sirve la misma plantilla index.html;
      // el propio index.html lee el slug de la URL y pide su config a /menu/:slug)
      if (path.startsWith("/t/") && method === "GET") {
        const plantilla = await env.ASSETS.fetch(new URL("/index.html", request.url));
        return new Response(plantilla.body, plantilla);
      }

      return json({ error: "Ruta no encontrada" }, 404);
    } catch (err) {
      return json({ error: "Error interno", detalle: String(err) }, 500);
    }
  }
};
