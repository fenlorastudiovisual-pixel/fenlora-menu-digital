import { NICHOS, listaNichos } from "./niches.js";

// URL pública del bucket R2 (la que activaste en Settings -> Public Development URL).
const PUBLIC_R2_URL = "https://pub-6509f754158640c68cc33a2321f3387e.r2.dev";

// Rutas reservadas: ningún negocio puede usar estos slugs.
const RESERVADOS = new Set(["admin", "menu", "assets", "carrito.js", "logo.png", "favicon.ico", "negocio.html", "menu.html", "checkout.html"]);

// Límites anti-abuso del pedido público
const MAX_ITEMS = 60;        // renglones distintos por pedido
const MAX_QTY   = 99;        // cantidad máxima por renglón
const MAX_NOTA  = 300;       // caracteres de la nota del cliente
const MAX_ITEM_NOTA = 200;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

// ────────────────────────────────────────────────────────────────────
// ENLACE con el POS (contrato v1). El Worker llama a las funciones (RPC) del
// Supabase del POS con la api_key del negocio, que vive SOLO aquí (servidor);
// el navegador del cliente nunca la ve.
//   Vars necesarias: SUPABASE_URL, SUPABASE_ANON_KEY.
// ────────────────────────────────────────────────────────────────────
async function posRpc(env, fn, args) {
  const base = env.SUPABASE_URL, key = env.SUPABASE_ANON_KEY;
  if (!base || !key) throw new Error("POS_SIN_CONFIG");
  const r = await fetch(base.replace(/\/$/, "") + "/rest/v1/rpc/" + fn, {
    method: "POST",
    headers: { "Content-Type": "application/json", "apikey": key, "Authorization": "Bearer " + key },
    body: JSON.stringify(args)
  });
  const txt = await r.text();
  let data; try { data = txt ? JSON.parse(txt) : null; } catch { data = txt; }
  if (!r.ok) throw new Error((data && (data.message || data.error)) || ("POS_HTTP_" + r.status));
  return data;
}

// ────────────────────────────────────────────────────────────────────
// SEGURIDAD · Cabeceras defensivas en TODAS las respuestas
// ────────────────────────────────────────────────────────────────────
function harden(res) {
  const h = new Headers(res.headers);
  h.set("X-Content-Type-Options", "nosniff");
  h.set("Referrer-Policy", "strict-origin-when-cross-origin");
  h.set("X-Frame-Options", "SAMEORIGIN");            // el admin usa iframe del MISMO origen (preview)
  h.set("Permissions-Policy", "geolocation=(), microphone=(), camera=()");
  h.set("Cross-Origin-Opener-Policy", "same-origin");
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers: h });
}

// ────────────────────────────────────────────────────────────────────
// SEGURIDAD · Verificación del token de Cloudflare Access (JWT RS256)
// Segunda capa por si Access se desconfigura o alguien intenta saltárselo.
// Requiere dos variables en el Worker:
//   ACCESS_TEAM_DOMAIN  ej: "fenlora.cloudflareaccess.com"
//   ACCESS_AUD          el "Application Audience (AUD) Tag" de la app de Access
// ────────────────────────────────────────────────────────────────────
let _jwks = { keys: [], exp: 0 };

function b64urlToBytes(s) {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
function b64urlToString(s) { return new TextDecoder().decode(b64urlToBytes(s)); }

async function getJwks(teamDomain) {
  const now = Date.now();
  if (_jwks.keys.length && _jwks.exp > now) return _jwks.keys;
  const r = await fetch(`https://${teamDomain}/cdn-cgi/access/certs`);
  if (!r.ok) throw new Error("no se pudo leer JWKS de Access");
  const data = await r.json();
  _jwks = { keys: data.keys || [], exp: now + 10 * 60 * 1000 }; // cache 10 min
  return _jwks.keys;
}

async function verifyAccessJwt(token, env) {
  const teamDomain = env.ACCESS_TEAM_DOMAIN;
  let aud = env.ACCESS_AUD;
  // El dominio de equipo es obligatorio; el AUD es opcional (más estricto si se pone).
  if (!teamDomain || teamDomain.includes("REEMPLAZAR")) throw new Error("SIN_CONFIG");
  if (aud && aud.includes("REEMPLAZAR")) aud = "";
  const parts = String(token || "").split(".");
  if (parts.length !== 3) return false;

  const header = JSON.parse(b64urlToString(parts[0]));
  const payload = JSON.parse(b64urlToString(parts[1]));
  if (header.alg !== "RS256" || !header.kid) return false;

  // Claims
  const now = Math.floor(Date.now() / 1000);
  if (payload.iss !== `https://${teamDomain}`) return false;
  if (aud) {
    const auds = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
    if (!auds.includes(aud)) return false;
  }
  if (payload.exp && now >= payload.exp) return false;
  if (payload.nbf && now < payload.nbf - 60) return false;

  // Firma
  const keys = await getJwks(teamDomain);
  const jwk = keys.find(k => k.kid === header.kid);
  if (!jwk) return false;
  const key = await crypto.subtle.importKey(
    "jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]
  );
  const data = new TextEncoder().encode(`${parts[0]}.${parts[1]}`);
  const sig = b64urlToBytes(parts[2]);
  return await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, sig, data);
}

// Devuelve null si el admin está autenticado; o una Response de error si no.
async function requireAdmin(request, env) {
  const token = request.headers.get("Cf-Access-Jwt-Assertion") || _cookie(request, "CF_Authorization");
  try {
    const ok = await verifyAccessJwt(token, env);
    if (ok) return null;
    return json({ error: "no_autorizado" }, 403);
  } catch (e) {
    if (String(e.message) === "SIN_CONFIG") {
      // Falla cerrada: la API del panel NO responde hasta configurar la seguridad.
      return json({ error: "panel_sin_seguridad", detalle: "Configura ACCESS_TEAM_DOMAIN y ACCESS_AUD en el Worker antes de usar el panel." }, 503);
    }
    return json({ error: "no_autorizado" }, 403);
  }
}
function _cookie(request, name) {
  const c = request.headers.get("Cookie") || "";
  const m = c.match(new RegExp("(?:^|;\\s*)" + name + "=([^;]+)"));
  return m ? m[1] : null;
}

function slugify(texto) {
  return texto
    .toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
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
  const modo_pos = (body.modo_pos != null) ? (body.modo_pos ? 1 : 0) : row.modo_pos;
  const pos_api_key = (body.pos_api_key !== undefined) ? (body.pos_api_key || null) : row.pos_api_key;
  const pos_autopedido = (body.pos_autopedido != null) ? (body.pos_autopedido ? 1 : 0) : (row.pos_autopedido == null ? 1 : row.pos_autopedido);

  await env.DB.prepare(
    `UPDATE tenants SET nombre=?, whatsapp=?, logo_url=?, tema=?, contenido=?, activo=?, pago_url=?, moneda=?, precio_mensual=?, dia_cobro=?, modo_pos=?, pos_api_key=?, pos_autopedido=? WHERE id=?`
  ).bind(nombre, whatsapp, logo_url, tema, contenido, activo, pago_url, moneda, precio_mensual, dia_cobro, modo_pos, pos_api_key, pos_autopedido, id).run();

  return json({ ok: true });
}

// ---------- /admin/api/tenants/:id/pago (marcar pagado el mes actual) ----------
async function marcarPago(id, env) {
  const hoy = new Date().toISOString().slice(0, 10);
  await env.DB.prepare("UPDATE tenants SET fecha_ultimo_pago = ? WHERE id = ?").bind(hoy, id).run();
  return json({ ok: true, fecha_ultimo_pago: hoy });
}

async function deleteTenant(id, env) {
  // Borrado EN CASCADA — evita productos/pedidos/visitas huérfanos (D1 no fuerza FKs).
  await env.DB.batch([
    env.DB.prepare("DELETE FROM productos WHERE tenant_id = ?").bind(id),
    env.DB.prepare("DELETE FROM pedidos WHERE tenant_id = ?").bind(id),
    env.DB.prepare("DELETE FROM visitas WHERE tenant_id = ?").bind(id),
    env.DB.prepare("DELETE FROM tenants WHERE id = ?").bind(id)
  ]);
  return json({ ok: true });
}

// ---------- /admin/api/demos ----------
async function listDemos(env) {
  const { results } = await env.DB.prepare(
    "SELECT id, nombre, nicho, activo FROM tenants WHERE id LIKE 'demo-%' ORDER BY nicho"
  ).all();
  return json({ demos: results });
}

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
  const precioNum = Number(precio);
  if (!isFinite(precioNum) || precioNum < 0) return json({ error: "Precio inválido" }, 400);
  const r = await env.DB.prepare(
    `INSERT INTO productos (tenant_id, categoria, nombre, descripcion, precio, imagen_url, destacado, orden)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    tenantId, categoria, nombre, body.descripcion || "", precioNum,
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
// BLINDADO: el servidor recalcula precios y total desde la base. NO confía en el
// precio ni el total que manda el navegador (evita "pedido por $0").
async function crearPedido(slug, request, env) {
  const tenant = await env.DB.prepare("SELECT id, modo_pos, pos_api_key, pos_autopedido FROM tenants WHERE id = ? AND activo = 1").bind(slug).first();
  if (!tenant) return json({ error: "Negocio no encontrado" }, 404);

  // ── Negocio POS SIN autopedido: el cliente solo ve la carta y llama al mesero.
  //    No se aceptan pedidos desde el celular (blindaje aunque el botón no exista). ──
  if (tenant.modo_pos && (tenant.pos_autopedido === 0)) {
    return json({ error: "autopedido_desactivado" }, 403);
  }

  let body;
  try { body = await request.json(); } catch { return json({ error: "JSON inválido" }, 400); }
  const items = body && body.items;
  if (!Array.isArray(items) || items.length === 0) return json({ error: "Pedido vacío" }, 400);
  if (items.length > MAX_ITEMS) return json({ error: "Demasiados productos en el pedido" }, 400);

  // ── Modo POS: el pedido entra como COMANDA en la mesa del POS ──
  if (tenant.modo_pos && tenant.pos_api_key) {
    const mesa = (body.mesa != null ? String(body.mesa) : "").trim();
    if (!mesa) return json({ error: "mesa_requerida" }, 400);
    const itemsPos = items.map(it => ({ producto_id: it.producto_id, cantidad: parseInt(it.cantidad, 10) || 0 }));
    try {
      const r = await posRpc(env, "menu_crear_comanda", {
        p_api_key: tenant.pos_api_key, p_mesa: mesa, p_items: itemsPos,
        p_nota: (typeof body.cliente_nota === "string" ? body.cliente_nota.slice(0, MAX_NOTA) : null)
      });
      return json({ id: r.comanda_id, total: r.total, modo: "pos" }, 201);
    } catch (e) {
      return json({ error: "pos_error", detalle: String(e.message || e) }, 502);
    }
  }

  // Normaliza y valida cantidades; junta ids para buscarlos en la base
  const pedido = [];
  for (const it of items) {
    const pid = parseInt(it && it.producto_id, 10);
    const qty = parseInt(it && it.cantidad, 10);
    if (!Number.isInteger(pid) || pid <= 0) return json({ error: "Producto inválido en el pedido" }, 400);
    if (!Number.isInteger(qty) || qty <= 0 || qty > MAX_QTY) return json({ error: "Cantidad inválida" }, 400);
    const notas = typeof (it && it.notas) === "string" ? it.notas.slice(0, MAX_ITEM_NOTA) : "";
    pedido.push({ pid, qty, notas });
  }

  // Precios REALES desde la base (solo productos activos de ESTE negocio)
  const ids = [...new Set(pedido.map(p => p.pid))];
  const placeholders = ids.map(() => "?").join(",");
  const { results: prods } = await env.DB.prepare(
    `SELECT id, nombre, precio FROM productos WHERE tenant_id = ? AND activo = 1 AND id IN (${placeholders})`
  ).bind(slug, ...ids).all();
  const mapa = new Map(prods.map(p => [p.id, p]));

  let total = 0;
  const itemsSeguros = [];
  for (const p of pedido) {
    const prod = mapa.get(p.pid);
    if (!prod) return json({ error: "Un producto del pedido ya no está disponible" }, 409);
    const sub = Number(prod.precio) * p.qty;
    total += sub;
    itemsSeguros.push({ producto_id: prod.id, nombre: prod.nombre, precio: Number(prod.precio), cantidad: p.qty, notas: p.notas });
  }

  const nota = typeof (body && body.cliente_nota) === "string" ? body.cliente_nota.slice(0, MAX_NOTA) : null;

  const r = await env.DB.prepare(
    `INSERT INTO pedidos (tenant_id, items, total, cliente_nota) VALUES (?, ?, ?, ?)`
  ).bind(slug, JSON.stringify(itemsSeguros), total, nota).run();

  return json({ id: r.meta.last_row_id, total }, 201);
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
  const estados = new Set(["pendiente_pago", "pagado", "cancelado"]);
  if (!body.estado || !estados.has(body.estado)) return json({ error: "Estado inválido" }, 400);
  await env.DB.prepare("UPDATE pedidos SET estado=? WHERE id=?").bind(body.estado, id).run();
  return json({ ok: true });
}

// ---------- /admin/api/upload ----------
async function uploadFile(request, env) {
  const form = await request.formData();
  const file = form.get("file");
  const tenantId = form.get("tenant_id");
  if (!file || !tenantId) return json({ error: "Falta 'file' o 'tenant_id'" }, 400);

  // Solo imágenes y con tope de tamaño
  const tipo = file.type || "";
  if (!tipo.startsWith("image/")) return json({ error: "Solo se permiten imágenes" }, 400);
  if (file.size && file.size > 6 * 1024 * 1024) return json({ error: "Imagen demasiado grande (máx 6MB)" }, 400);

  const carpeta = form.get("carpeta") === "logo" ? "" : "productos/";
  const nombreArchivo = nombreArchivoSeguro(file.name || "imagen.jpg");
  const key = `${tenantId}/${carpeta}${nombreArchivo}`;

  await env.BUCKET.put(key, file.stream(), {
    httpMetadata: { contentType: tipo || "image/jpeg" }
  });

  const url = `${PUBLIC_R2_URL}/${key}`;
  return json({ url, key }, 201);
}

// ---------- /menu/:slug/mesero (público, solo modo POS) ----------
async function llamarMesero(slug, request, env) {
  const t = await env.DB.prepare("SELECT id, modo_pos, pos_api_key FROM tenants WHERE id = ? AND activo = 1").bind(slug).first();
  if (!t) return json({ error: "Negocio no encontrado" }, 404);
  if (!t.modo_pos || !t.pos_api_key) return json({ error: "no_pos" }, 400);
  let body = {}; try { body = await request.json(); } catch {}
  const mesa = (body.mesa != null ? String(body.mesa) : "").trim();
  if (!mesa) return json({ error: "mesa_requerida" }, 400);
  const motivo = (typeof body.motivo === "string" && body.motivo) ? body.motivo.slice(0, 40) : "llamado";
  try {
    await posRpc(env, "menu_llamar_mesero", { p_api_key: t.pos_api_key, p_mesa: mesa, p_motivo: motivo });
    return json({ ok: true });
  } catch (e) {
    return json({ error: "pos_error", detalle: String(e.message || e) }, 502);
  }
}

async function getMenuPublico(slug, env) {
  const row = await env.DB.prepare(
    "SELECT nombre, nicho, whatsapp, logo_url, tema, contenido, pago_url, moneda, modo_pos, pos_api_key, pos_autopedido FROM tenants WHERE id = ? AND activo = 1"
  ).bind(slug).first();
  if (!row) return json({ error: "Negocio no encontrado" }, 404);

  const base = {
    nombre: row.nombre, nicho: row.nicho, whatsapp: row.whatsapp, logo_url: row.logo_url,
    tema: JSON.parse(row.tema), contenido: JSON.parse(row.contenido),
    pago_url: row.pago_url, moneda: row.moneda || "COP",
    // 1 = el cliente puede pedir desde la mesa (autopedido) · 0 = solo ver carta + llamar al mesero
    pos_autopedido: (row.pos_autopedido == null ? 1 : (row.pos_autopedido ? 1 : 0))
  };

  // ── Modo POS: la carta viene del POS (el diseño/tema sigue siendo del menú) ──
  if (row.modo_pos && row.pos_api_key) {
    try {
      const cat = await posRpc(env, "menu_catalogo", { p_api_key: row.pos_api_key });
      if (cat && Array.isArray(cat.productos)) {
        const productos = cat.productos;
        return json({
          ...base,
          nombre: (cat.negocio && cat.negocio.nombre) || base.nombre,
          moneda: (cat.negocio && cat.negocio.moneda) || base.moneda,
          productos,
          destacados: productos.filter(p => p.destacado),
          modo: "pos"
        });
      }
    } catch (e) {
      // Si el POS está caído, caemos a la carta local como respaldo (mejor eso que nada)
      console.warn("menu_catalogo POS falló, uso respaldo local:", String(e));
    }
  }

  // ── Modo autónomo: la carta es del propio menú (D1) ──
  const { results: productos } = await env.DB.prepare(
    "SELECT id, categoria, nombre, descripcion, precio, imagen_url, destacado, orden FROM productos WHERE tenant_id = ? AND activo = 1 ORDER BY categoria, orden, id"
  ).bind(slug).all();

  return json({
    ...base,
    productos,
    destacados: productos.filter(p => p.destacado),
    modo: (row.modo_pos ? "pos" : "autonomo")
  });
}

// ---------- Enrutador (devuelve Response; la seguridad de cabeceras se aplica afuera) ----------
async function route(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  // La raíz del dominio siempre lleva al admin (protegido por Cloudflare Access)
  if (path === "/" && method === "GET") {
    return Response.redirect(new URL("/admin", url), 302);
  }

  // ── TODA la API del panel exige token de Access válido (2ª capa) ──
  if (path.startsWith("/admin/api/")) {
    const bloqueo = await requireAdmin(request, env);
    if (bloqueo) return bloqueo;
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

  // ── Endpoints públicos del menú ──
  const crearPedidoMatch = path.match(/^\/menu\/([^/]+)\/pedido$/);
  if (crearPedidoMatch && method === "POST") {
    return await crearPedido(decodeURIComponent(crearPedidoMatch[1]), request, env);
  }

  const meseroMatch = path.match(/^\/menu\/([^/]+)\/mesero$/);
  if (meseroMatch && method === "POST") {
    return await llamarMesero(decodeURIComponent(meseroMatch[1]), request, env);
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
}

// ---------- Router principal ----------
export default {
  async fetch(request, env) {
    try {
      const resp = await route(request, env);
      return harden(resp);
    } catch (err) {
      return harden(json({ error: "Error interno", detalle: String(err) }, 500));
    }
  }
};
