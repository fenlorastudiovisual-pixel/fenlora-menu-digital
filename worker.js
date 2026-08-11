import { NICHOS, listaNichos } from "./niches.js";

// URL pública del bucket R2 (la que activaste en Settings -> Public Development URL).
const PUBLIC_R2_URL = "https://pub-6509f754158640c68cc33a2321f3387e.r2.dev";

// Rutas reservadas: ningún negocio puede usar estos slugs.
const RESERVADOS = new Set(["admin", "menu", "assets", "carrito.js", "logo.png", "favicon.ico", "negocio.html", "menu.html", "checkout.html"]);

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
  if (RESERVADOS.has(id)) id = `${id}-negocio`;
  const existe = await env.DB.prepare("SELECT id FROM tenants WHERE id = ?").bind(id).first();
  if (existe) id = `${id}-${Date.now().toString(36)}`;

  const contenido = { ...preset.contenido_ejemplo, nombre_negocio: nombre };

  await env.DB.prepare(
    `INSERT INTO tenants (id, nombre, nicho, whatsapp, logo_url, tema, contenido, pago_url, moneda)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    id, nombre, nicho, whatsapp || null, null,
    JSON.stringify(preset.tema), JSON.stringify(contenido), pago_url || null, moneda || "COP"
  ).run();

  return json({ id, url: `/${id}` }, 201);
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
  const precio_mensual = body.precio_mensual ?? row.precio_mensual;
  const dia_cobro = body.dia_cobro ?? row.dia_cobro;
  const tema = body.tema ? JSON.stringify(body.tema) : row.tema;
  const contenido = body.contenido ? JSON.stringify(body.contenido) : row.contenido;

  await env.DB.prepare(
    `UPDATE tenants SET nombre=?, whatsapp=?, logo_url=?, tema=?, contenido=?, activo=?, pago_url=?, moneda=?, precio_mensual=?, dia_cobro=? WHERE id=?`
  ).bind(nombre, whatsapp, logo_url, tema, contenido, activo, pago_url, moneda, precio_mensual, dia_cobro, id).run();

  return json({ ok: true });
}

// ---------- /admin/api/tenants/:id/pago (marcar pagado el mes actual) ----------
async function marcarPago(id, env) {
  const hoy = new Date().toISOString().slice(0, 10);
  await env.DB.prepare("UPDATE tenants SET fecha_ultimo_pago = ? WHERE id = ?").bind(hoy, id).run();
  return json({ ok: true, fecha_ultimo_pago: hoy });
}

async function deleteTenant(id, env) {
  await env.DB.prepare("DELETE FROM tenants WHERE id = ?").bind(id).run();
  return json({ ok: true });
}

// ---------- /admin/api/demos ----------
async function listDemos(env) {
  const { results } = await env.DB.prepare(
    "SELECT id, nombre, nicho, activo FROM tenants WHERE id LIKE 'demo-%' ORDER BY nicho"
  ).all();
  return json({ demos: results });
}

// Crea (si no existe) un negocio de muestra por cada nicho del catálogo,
// con slug fijo "demo-<nicho>", para mostrarle a un prospecto cómo se ve
// su rubro sin tener que crear un negocio real todavía.
async function generarDemos(env) {
  const creados = [];
  for (const [nichoId, preset] of Object.entries(NICHOS)) {
    const id = `demo-${nichoId.replace(/_/g, "-")}`;
    const existe = await env.DB.prepare("SELECT id FROM tenants WHERE id = ?").bind(id).first();
    if (existe) continue;

    const contenido = { ...preset.contenido_ejemplo, nombre_negocio: `Demo — ${preset.label}` };
    await env.DB.prepare(
      `INSERT INTO tenants (id, nombre, nicho, whatsapp, logo_url, tema, contenido, moneda)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      id, `Demo — ${preset.label}`, nichoId, null, null,
      JSON.stringify(preset.tema), JSON.stringify(contenido), "COP"
    ).run();
    creados.push(id);
  }
  return json({ creados });
}

// ---------- /admin/api/cobranza ----------
// Un negocio está "vencido" si tiene precio_mensual y dia_cobro configurados,
// ya pasó ese día en el mes actual, y no hay un pago registrado este mes.
async function getCobranza(env) {
  const { results } = await env.DB.prepare(`
    SELECT id, nombre, precio_mensual, dia_cobro, fecha_ultimo_pago, moneda
    FROM tenants
    WHERE activo = 1 AND precio_mensual IS NOT NULL AND dia_cobro IS NOT NULL
    ORDER BY nombre
  `).all();

  const hoy = new Date();
  const diaHoy = hoy.getDate();
  const mesHoy = hoy.toISOString().slice(0, 7); // YYYY-MM

  const negocios = results.map(t => {
    const pagoEsteMes = t.fecha_ultimo_pago && t.fecha_ultimo_pago.slice(0, 7) === mesHoy;
    const vencido = !pagoEsteMes && diaHoy >= t.dia_cobro;
    const diasVencido = vencido ? diaHoy - t.dia_cobro : 0;
    return { ...t, al_dia: pagoEsteMes, vencido, dias_vencido: diasVencido };
  });

  const ingresoRecurrente = results.reduce((s, t) => s + (t.precio_mensual || 0), 0);

  return json({
    ingreso_recurrente: ingresoRecurrente,
    negocios: negocios.sort((a, b) => (b.vencido - a.vencido) || (b.dias_vencido - a.dias_vencido))
  });
}

// ---------- /admin/api/config ----------
async function getConfig(env) {
  const row = await env.DB.prepare("SELECT * FROM config WHERE id = 1").first();
  return json(row || { moneda_default: "COP", whatsapp_mensaje_default: "", url_publica_r2: "" });
}

async function updateConfig(request, env) {
  const body = await request.json();
  await env.DB.prepare(`
    INSERT INTO config (id, moneda_default, whatsapp_mensaje_default, url_publica_r2)
    VALUES (1, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET moneda_default=excluded.moneda_default,
      whatsapp_mensaje_default=excluded.whatsapp_mensaje_default, url_publica_r2=excluded.url_publica_r2
  `).bind(body.moneda_default || "COP", body.whatsapp_mensaje_default || "", body.url_publica_r2 || "").run();
  return json({ ok: true });
}

// ---------- /admin/api/metricas ----------
async function getMetricas(env) {
  const { results: pedidosPorDia } = await env.DB.prepare(`
    SELECT substr(creado_en, 1, 10) AS dia, COUNT(*) AS total
    FROM pedidos
    WHERE creado_en >= date('now', '-13 days')
    GROUP BY dia ORDER BY dia
  `).all();

  const { results: topNegocios } = await env.DB.prepare(`
    SELECT t.nombre, COUNT(*) AS total_pedidos
    FROM pedidos p JOIN tenants t ON t.id = p.tenant_id
    GROUP BY p.tenant_id ORDER BY total_pedidos DESC LIMIT 5
  `).all();

  const { results: porNicho } = await env.DB.prepare(`
    SELECT nicho, COUNT(*) AS total FROM tenants GROUP BY nicho ORDER BY total DESC
  `).all();

  const { results: pedidosRecientes } = await env.DB.prepare(`
    SELECT items FROM pedidos ORDER BY creado_en DESC LIMIT 200
  `).all();
  const conteoProductos = {};
  pedidosRecientes.forEach(p => {
    try {
      JSON.parse(p.items).forEach(it => {
        conteoProductos[it.nombre] = (conteoProductos[it.nombre] || 0) + it.cantidad;
      });
    } catch {}
  });
  const topProductos = Object.entries(conteoProductos)
    .sort((a, b) => b[1] - a[1]).slice(0, 5)
    .map(([nombre, cantidad]) => ({ nombre, cantidad }));

  return json({ pedidosPorDia, topNegocios, porNicho, topProductos });
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

// ---------- /menu/:slug/pedido (público) ----------
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

// ---------- /admin/api/tenants/:id/pedidos ----------
async function listPedidos(tenantId, env) {
  const { results } = await env.DB.prepare(
    "SELECT * FROM pedidos WHERE tenant_id = ? ORDER BY creado_en DESC LIMIT 100"
  ).bind(tenantId).all();
  const pedidos = results.map(p => ({ ...p, items: JSON.parse(p.items) }));
  return json({ pedidos });
}

// ---------- /admin/api/pedidos/:id ----------
async function updatePedidoEstado(id, request, env) {
  const body = await request.json();
  if (!body.estado) return json({ error: "Falta 'estado'" }, 400);
  await env.DB.prepare("UPDATE pedidos SET estado=? WHERE id=?").bind(body.estado, id).run();
  return json({ ok: true });
}

// ---------- /admin/api/upload ----------
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
      // La raíz del dominio siempre lleva al admin (protegido por Cloudflare Access)
      if (path === "/" && method === "GET") {
        return Response.redirect(new URL("/admin", url), 302);
      }

      if (path === "/admin/api/nichos" && method === "GET") return getNichos();
      if (path === "/admin/api/resumen" && method === "GET") return await getResumen(env);

      if (path === "/admin/api/tenants" && method === "GET") return await listTenants(env);
      if (path === "/admin/api/tenants" && method === "POST") return await createTenant(request, env);

      if (path === "/admin/api/demos" && method === "GET") return await listDemos(env);
      if (path === "/admin/api/demos/generar" && method === "POST") return await generarDemos(env);

      if (path === "/admin/api/cobranza" && method === "GET") return await getCobranza(env);

      const pagoMatch = path.match(/^\/admin\/api\/tenants\/([^/]+)\/pago$/);
      if (pagoMatch && method === "POST") return await marcarPago(decodeURIComponent(pagoMatch[1]), env);

      if (path === "/admin/api/config" && method === "GET") return await getConfig(env);
      if (path === "/admin/api/config" && method === "PUT") return await updateConfig(request, env);

      if (path === "/admin/api/metricas" && method === "GET") return await getMetricas(env);

      const tenantMatch = path.match(/^\/admin\/api\/tenants\/([^/]+)$/);
      if (tenantMatch) {
        const id = decodeURIComponent(tenantMatch[1]);
        if (method === "GET") return await getTenant(id, env);
        if (method === "PUT") return await updateTenant(id, request, env);
        if (method === "DELETE") return await deleteTenant(id, env);
      }

      const productsMatch = path.match(/^\/admin\/api\/tenants\/([^/]+)\/products$/);
      if (productsMatch) {
        const tenantId = decodeURIComponent(productsMatch[1]);
        if (method === "GET") return await listProducts(tenantId, env);
        if (method === "POST") return await createProduct(tenantId, request, env);
      }

      const productMatch = path.match(/^\/admin\/api\/products\/([^/]+)$/);
      if (productMatch) {
        const id = decodeURIComponent(productMatch[1]);
        if (method === "PUT") return await updateProduct(id, request, env);
        if (method === "DELETE") return await deleteProduct(id, env);
      }

      if (path === "/admin/api/upload" && method === "POST") return await uploadFile(request, env);

      const pedidosMatch = path.match(/^\/admin\/api\/tenants\/([^/]+)\/pedidos$/);
      if (pedidosMatch && method === "GET") {
        return await listPedidos(decodeURIComponent(pedidosMatch[1]), env);
      }

      const pedidoMatch = path.match(/^\/admin\/api\/pedidos\/([^/]+)$/);
      if (pedidoMatch && method === "PUT") {
        return await updatePedidoEstado(decodeURIComponent(pedidoMatch[1]), request, env);
      }

      const crearPedidoMatch = path.match(/^\/menu\/([^/]+)\/pedido$/);
      if (crearPedidoMatch && method === "POST") {
        return await crearPedido(decodeURIComponent(crearPedidoMatch[1]), request, env);
      }

      const menuMatch = path.match(/^\/menu\/([^/]+)$/);
      if (menuMatch && method === "GET") {
        return await getMenuPublico(decodeURIComponent(menuMatch[1]), env);
      }

      // ---- Páginas públicas del negocio, URLs limpias: /<slug>, /<slug>/menu, /<slug>/checkout ----

      const checkoutMatch = path.match(/^\/([^/]+)\/checkout$/);
      if (checkoutMatch && method === "GET" && !RESERVADOS.has(checkoutMatch[1])) {
        const plantilla = await env.ASSETS.fetch(new URL("/checkout.html", request.url));
        return new Response(plantilla.body, plantilla);
      }

      const menuPageMatch = path.match(/^\/([^/]+)\/menu$/);
      if (menuPageMatch && method === "GET" && !RESERVADOS.has(menuPageMatch[1])) {
        const plantilla = await env.ASSETS.fetch(new URL("/menu.html", request.url));
        return new Response(plantilla.body, plantilla);
      }

      const slugMatch = path.match(/^\/([^/]+)$/);
      if (slugMatch && method === "GET" && !RESERVADOS.has(slugMatch[1]) && !slugMatch[1].includes(".")) {
        const plantilla = await env.ASSETS.fetch(new URL("/negocio.html", request.url));
        return new Response(plantilla.body, plantilla);
      }

      // Cualquier otra cosa: archivos estáticos reales (admin/index.html, carrito.js, logo.png, etc.)
      return env.ASSETS.fetch(request);
    } catch (err) {
      return json({ error: "Error interno", detalle: String(err) }, 500);
    }
  }
};
