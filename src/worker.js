import { NICHOS, listaNichos } from "./niches.js";

// URL pública del bucket R2 (la que activaste en Settings -> Public Development URL).
const PUBLIC_R2_URL = "https://pub-6509f754158640c68cc33a2321f3387e.r2.dev";

// Rutas reservadas: ningún negocio puede usar estos slugs.
const RESERVADOS = new Set(["admin", "menu", "assets", "carrito.js", "logo.png", "favicon.ico", "negocio.html", "menu.html", "checkout.html", "chat.html", "chat"]);

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
function bytesToB64url(bytes) {
  let bin = "";
  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  for (let i = 0; i < b.length; i++) bin += String.fromCharCode(b[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// ────────────────────────────────────────────────────────────────────
// AVISOS PUSH · el Worker "toca el timbre" del celular del superadmin
// (Web Push sin payload: no requiere cifrado. Solo firma VAPID ES256.)
// Secrets necesarios en el Worker:
//   VAPID_PUBLIC       (clave pública, base64url del punto sin comprimir)
//   VAPID_PRIVATE_JWK  (clave privada como JSON JWK)
// El detalle del aviso lo pide el Service Worker a GET /avisos/pendientes.
// ────────────────────────────────────────────────────────────────────
const CORS_AVISOS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};
function jsonCors(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { "Content-Type": "application/json", ...CORS_AVISOS }
  });
}
async function vapidJwt(endpoint, env) {
  const aud = new URL(endpoint).origin;
  const now = Math.floor(Date.now() / 1000);
  const enc = (o) => bytesToB64url(new TextEncoder().encode(JSON.stringify(o)));
  const unsigned = enc({ typ: "JWT", alg: "ES256" }) + "." +
                   enc({ aud, exp: now + 12 * 3600, sub: "mailto:fenlorastudiovisual@gmail.com" });
  const key = await crypto.subtle.importKey(
    "jwk", JSON.parse(env.VAPID_PRIVATE_JWK),
    { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" }, key, new TextEncoder().encode(unsigned));
  return unsigned + "." + bytesToB64url(new Uint8Array(sig));
}
async function enviarPush(endpoint, env) {
  const jwt = await vapidJwt(endpoint, env);
  const r = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Authorization": "vapid t=" + jwt + ", k=" + env.VAPID_PUBLIC,
      "TTL": "86400",
      "Urgency": "normal",
      "Content-Length": "0"
    }
  });
  return r.status;
}
// Envía el "timbre" a TODOS los celulares suscritos. Limpia los que ya no existen.
async function dispararAvisos(env) {
  if (!env.VAPID_PRIVATE_JWK || !env.VAPID_PUBLIC) return { ok: false, motivo: "SIN_VAPID" };
  let subs = [];
  try { subs = await posRpc(env, "avisos_listar_subs", {}); } catch (e) { return { ok: false, motivo: String(e) }; }
  if (!Array.isArray(subs) || !subs.length) return { ok: true, enviados: 0, motivo: "SIN_SUSCRIPTORES" };
  let enviados = 0, borrados = 0;
  for (const endpoint of subs) {
    try {
      const st = await enviarPush(endpoint, env);
      if (st === 404 || st === 410) { await posRpc(env, "avisos_borrar_sub", { p_endpoint: endpoint }).catch(() => {}); borrados++; }
      else if (st >= 200 && st < 300) enviados++;
    } catch (_) {}
  }
  return { ok: true, enviados, borrados, total: subs.length };
}

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
      t.id, t.nombre, t.nicho, t.whatsapp, t.logo_url, t.activo, t.creado_en, t.es_demo,
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
  // El Resumen cuenta SOLO negocios reales (los demos = id demo-* no cuentan).
  const totales = await env.DB.prepare(`
    SELECT
      (SELECT COUNT(*) FROM tenants WHERE id NOT LIKE 'demo-%') AS negocios_total,
      (SELECT COUNT(*) FROM tenants WHERE id NOT LIKE 'demo-%' AND activo = 1) AS negocios_activos,
      (SELECT COUNT(*) FROM productos WHERE tenant_id NOT LIKE 'demo-%') AS productos_total,
      (SELECT COUNT(*) FROM pedidos WHERE tenant_id NOT LIKE 'demo-%') AS pedidos_total,
      (SELECT COUNT(*) FROM pedidos WHERE tenant_id NOT LIKE 'demo-%' AND estado = 'pendiente_pago') AS pedidos_pendientes
  `).first();

  const { results: sinProductos } = await env.DB.prepare(`
    SELECT t.id, t.nombre FROM tenants t
    WHERE t.activo = 1 AND t.id NOT LIKE 'demo-%' AND (SELECT COUNT(*) FROM productos p WHERE p.tenant_id = t.id) = 0
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
  const pos_online_recoger = (body.pos_online_recoger != null) ? (body.pos_online_recoger ? 1 : 0) : (row.pos_online_recoger ? 1 : 0);
  const pos_online_domicilio = (body.pos_online_domicilio != null) ? (body.pos_online_domicilio ? 1 : 0) : (row.pos_online_domicilio ? 1 : 0);
  // Límite de pedidos del bot por mes ("" o null = sin límite / ilimitado)
  const bot_limite_pedidos = (body.bot_limite_pedidos !== undefined)
    ? ((body.bot_limite_pedidos === null || body.bot_limite_pedidos === "" || Number(body.bot_limite_pedidos) <= 0) ? null : parseInt(body.bot_limite_pedidos, 10))
    : (row.bot_limite_pedidos == null ? null : row.bot_limite_pedidos);

  await env.DB.prepare(
    `UPDATE tenants SET nombre=?, whatsapp=?, logo_url=?, tema=?, contenido=?, activo=?, pago_url=?, moneda=?, precio_mensual=?, dia_cobro=?, modo_pos=?, pos_api_key=?, pos_autopedido=?, pos_online_recoger=?, pos_online_domicilio=?, bot_limite_pedidos=? WHERE id=?`
  ).bind(nombre, whatsapp, logo_url, tema, contenido, activo, pago_url, moneda, precio_mensual, dia_cobro, modo_pos, pos_api_key, pos_autopedido, pos_online_recoger, pos_online_domicilio, bot_limite_pedidos, id).run();

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
// Un "demo" es: un negocio con id demo-*  O  cualquier menú marcado con es_demo=1
// (así puedes mostrar como demo tus menús reales con fotos, ej: cero-absoluto).
async function listDemos(env) {
  const { results } = await env.DB.prepare(
    `SELECT t.id, t.nombre, t.nicho, t.activo, t.es_demo,
            (SELECT COUNT(*) FROM productos p WHERE p.tenant_id = t.id) AS total_productos
       FROM tenants t
      WHERE t.id LIKE 'demo-%' OR t.es_demo = 1
      ORDER BY t.nicho`
  ).all();
  return json({ demos: results });
}

// Marca / desmarca cualquier menú como demo (para mostrarlo en la sección Demos).
async function toggleDemo(id, request, env) {
  const row = await env.DB.prepare("SELECT id FROM tenants WHERE id = ?").bind(id).first();
  if (!row) return json({ error: "No encontrado" }, 404);
  let body = {}; try { body = await request.json(); } catch (_) {}
  const val = body.es_demo ? 1 : 0;
  await env.DB.prepare("UPDATE tenants SET es_demo = ? WHERE id = ?").bind(val, id).run();
  return json({ ok: true, es_demo: val });
}

// Palabras clave de fotos por nicho (fotos reales temáticas para los demos).
const NICHO_FOTOS = {
  restaurante:   ["steak", "pasta", "grilled-meat", "gourmet-food"],
  granizados:    ["slushie", "smoothie", "iced-drink", "milkshake"],
  sushi:         ["sushi", "sashimi", "nigiri", "ramen"],
  comida_rapida: ["burger", "fries", "hotdog", "fried-chicken"],
  food_court:    ["pizza", "burger", "tacos", "noodles"],
  tacos:         ["tacos", "burrito", "quesadilla", "nachos"],
  food_truck:    ["street-food", "burger", "tacos", "hotdog"],
  brunch_waffle: ["waffle", "pancakes", "brunch", "french-toast"],
  bar_coctel:    ["cocktail", "beer", "wine", "whiskey"],
  panaderia:     ["cake", "pastry", "cheesecake", "cupcake"],
  heladeria:     ["ice-cream", "gelato", "popsicle", "sundae"],
  cafeteria:     ["coffee", "latte", "cappuccino", "croissant"]
};
// Foto temática, estable (lock = misma foto siempre) y editable después.
function demoFoto(nichoId, i) {
  const ks = NICHO_FOTOS[nichoId] || ["food"];
  const kw = ks[i % ks.length];
  let h = 0; for (const c of nichoId) h = (h * 31 + c.charCodeAt(0)) & 0xffff;
  const lock = (h % 900) + i * 13 + 1;
  return `https://loremflickr.com/640/480/${encodeURIComponent(kw)}?lock=${lock}`;
}
// Productos de muestra CON foto para que cada demo se vea completo y bonito.
function demoSampleProducts(nichoId, preset) {
  const cats = (preset.contenido_ejemplo && preset.contenido_ejemplo.categorias) || ["Menú"];
  const plantillas = [
    { suf: "de la casa", desc: "El favorito de la casa, listo para antojarte.", precio: 12000 },
    { suf: "especial",   desc: "Nuestra versión especial, con el toque de la casa.", precio: 16000 }
  ];
  const items = [];
  let idx = 0;
  cats.forEach((cat, ci) => {   // TODAS las categorías del nicho (10), 2 productos c/u
    plantillas.forEach((p, pi) => {
      items.push({
        categoria: cat,
        nombre: `${cat} ${p.suf}`,
        descripcion: p.desc,
        precio: p.precio + (ci % 6) * 1000 + pi * 1000,
        destacado: (ci === 0 && pi === 0) ? 1 : 0,
        orden: ci * 10 + pi,
        imagen_url: demoFoto(nichoId, idx++)
      });
    });
  });
  return items;
}
// Siembra productos SOLO en las categorías del demo que aún no tienen ninguno.
async function sembrarProductosFaltantes(env, id, nichoId, preset) {
  const { results } = await env.DB.prepare("SELECT DISTINCT categoria FROM productos WHERE tenant_id = ?").bind(id).all();
  const existentes = new Set((results || []).map(r => (r.categoria || "").toLowerCase()));
  const faltan = demoSampleProducts(nichoId, preset).filter(p => !existentes.has((p.categoria || "").toLowerCase()));
  if (!faltan.length) return 0;
  await env.DB.batch(faltan.map(pr =>
    env.DB.prepare(
      `INSERT INTO productos (tenant_id, categoria, nombre, descripcion, precio, destacado, orden, imagen_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(id, pr.categoria, pr.nombre, pr.descripcion, pr.precio, pr.destacado, pr.orden, pr.imagen_url)
  ));
  return faltan.length;
}
// Rellena fotos en productos de un demo que aún no tengan imagen (idempotente).
async function asegurarFotosDemo(env, id, nichoId) {
  const { results } = await env.DB.prepare(
    "SELECT id FROM productos WHERE tenant_id = ? AND (imagen_url IS NULL OR imagen_url = '') ORDER BY orden, id"
  ).bind(id).all();
  if (!results || !results.length) return 0;
  let i = 0;
  await env.DB.batch(results.map(p =>
    env.DB.prepare("UPDATE productos SET imagen_url = ? WHERE id = ?").bind(demoFoto(nichoId, i++), p.id)
  ));
  return results.length;
}

async function generarDemos(env) {
  const creados = [], actualizados = [];
  for (const [nichoId, preset] of Object.entries(NICHOS)) {
    const id = `demo-${nichoId.replace(/_/g, "-")}`;
    const existe = await env.DB.prepare("SELECT id FROM tenants WHERE id = ?").bind(id).first();
    const contenido = { ...preset.contenido_ejemplo, nombre_negocio: `Demo — ${preset.label}` };

    if (existe) {
      // Ya existía (es un DEMO): refresca categorías al set nuevo (10) y REEMPLAZA
      // sus productos de muestra por los nuevos con foto. (Solo afecta demos, no
      // negocios reales; el botón solo toca los id demo-*.)
      const prods0 = demoSampleProducts(nichoId, preset);
      await env.DB.batch([
        env.DB.prepare("UPDATE tenants SET contenido = ?, es_demo = 1 WHERE id = ?").bind(JSON.stringify(contenido), id),
        env.DB.prepare("DELETE FROM productos WHERE tenant_id = ?").bind(id),
        ...prods0.map(pr => env.DB.prepare(
          `INSERT INTO productos (tenant_id, categoria, nombre, descripcion, precio, destacado, orden, imagen_url)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(id, pr.categoria, pr.nombre, pr.descripcion, pr.precio, pr.destacado, pr.orden, pr.imagen_url))
      ]);
      actualizados.push(id);
      continue;
    }

    await env.DB.prepare(
      `INSERT INTO tenants (id, nombre, nicho, whatsapp, logo_url, tema, contenido, moneda, es_demo)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`
    ).bind(
      id, `Demo — ${preset.label}`, nichoId, null, null,
      JSON.stringify(preset.tema), JSON.stringify(contenido), "COP"
    ).run();

    // Productos de muestra CON foto temática, en las 10 categorías
    const prods = demoSampleProducts(nichoId, preset);
    if (prods.length) {
      await env.DB.batch(prods.map(pr =>
        env.DB.prepare(
          `INSERT INTO productos (tenant_id, categoria, nombre, descripcion, precio, destacado, orden, imagen_url)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(id, pr.categoria, pr.nombre, pr.descripcion, pr.precio, pr.destacado, pr.orden, pr.imagen_url)
      ));
    }
    creados.push(id);
  }
  return json({ creados, actualizados });
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
  const tenant = await env.DB.prepare("SELECT id, modo_pos, pos_api_key, pos_autopedido, pos_online_recoger, pos_online_domicilio FROM tenants WHERE id = ? AND activo = 1").bind(slug).first();
  if (!tenant) return json({ error: "Negocio no encontrado" }, 404);

  let body;
  try { body = await request.json(); } catch { return json({ error: "JSON inválido" }, 400); }
  const items = body && body.items;
  if (!Array.isArray(items) || items.length === 0) return json({ error: "Pedido vacío" }, 400);
  if (items.length > MAX_ITEMS) return json({ error: "Demasiados productos en el pedido" }, 400);

  // ── Modo POS: dos caminos según cómo entró el cliente ──
  if (tenant.modo_pos && tenant.pos_api_key) {
    const mesa = (body.mesa != null ? String(body.mesa) : "").trim();
    const itemsPos = items.map(it => ({ producto_id: it.producto_id, cantidad: parseInt(it.cantidad, 10) || 0 }));

    if (mesa) {
      // (A) EN LA MESA (?mesa=) → comanda de esa mesa. Requiere autopedido en mesa activado.
      if (tenant.pos_autopedido === 0) return json({ error: "autopedido_desactivado" }, 403);
      try {
        const r = await posRpc(env, "menu_crear_comanda", {
          p_api_key: tenant.pos_api_key, p_mesa: mesa, p_items: itemsPos,
          p_nota: (typeof body.cliente_nota === "string" ? body.cliente_nota.slice(0, MAX_NOTA) : null)
        });
        return json({ id: r.comanda_id, total: r.total, modo: "pos", tipo: "mesa" }, 201);
      } catch (e) {
        return json({ error: "pos_error", detalle: String(e.message || e) }, 502);
      }
    }

    // (B) SIN MESA → pedido ONLINE (recoger / domicilio) → cae en "Fuera" del POS.
    const tipo = (body.tipo === "domicilio") ? "domicilio" : "recoger";
    if (tipo === "recoger" && !tenant.pos_online_recoger) return json({ error: "online_recoger_off" }, 403);
    if (tipo === "domicilio" && !tenant.pos_online_domicilio) return json({ error: "online_domicilio_off" }, 403);
    if (tipo === "domicilio" && !(body.direccion && String(body.direccion).trim())) return json({ error: "direccion_requerida" }, 400);
    try {
      const r = await posRpc(env, "menu_crear_pedido_online", {
        p_api_key: tenant.pos_api_key, p_tipo: tipo, p_items: itemsPos,
        p_cliente: (typeof body.cliente === "string" ? body.cliente.slice(0, 80) : null),
        p_telefono: (typeof body.telefono === "string" ? body.telefono.slice(0, 30) : null),
        p_direccion: (typeof body.direccion === "string" ? body.direccion.slice(0, 200) : null),
        p_nota: (typeof body.cliente_nota === "string" ? body.cliente_nota.slice(0, MAX_NOTA) : null)
      });
      return json({ id: r.pedido_id, numero: r.numero, total: r.total, modo: "pos", tipo }, 201);
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

// ────────────────────────────────────────────────────────────────────
// CEREBRO DEL BOT (IA) · POST /menu/:slug/bot
// El cliente escribe libre; una IA (Cloudflare Workers AI) entiende el
// mensaje LEYENDO el catálogo REAL del negocio y arma el pedido.
// REGLA DE ORO: la IA NO decide precios ni total. El servidor los recalcula
// desde el catálogo. La IA solo escoge productos (por id) y cantidades.
// ────────────────────────────────────────────────────────────────────
const BOT_MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";
const BOT_MAX_TURNS = 24;   // tope de mensajes de historial que aceptamos

function botMoneda(n) { return "$" + Number(n || 0).toLocaleString("es-CO"); }

// Algunos modelos (la IA gratis) dejan las tildes como código literal "í".
// Esto las convierte de vuelta a la letra real (í, ñ, ¿, etc.).
function decodeEscapes(s) {
  if (typeof s !== "string") return s;
  return s.replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
}

// Extrae el primer objeto JSON {...} de un texto (por si el modelo mete prosa).
function extraerJSON(txt) {
  if (!txt) return null;
  txt = String(txt).replace(/```json/gi, "").replace(/```/g, "").trim();
  try { return JSON.parse(txt); } catch {}
  const i = txt.indexOf("{"); const j = txt.lastIndexOf("}");
  if (i >= 0 && j > i) { try { return JSON.parse(txt.slice(i, j + 1)); } catch {} }
  return null;
}

// Esquema JSON que ambas IAs deben devolver.
const BOT_SCHEMA = {
  type: "object",
  properties: {
    respuesta: { type: "string" },
    items: {
      type: "array",
      items: {
        type: "object",
        properties: { n: { type: "integer" }, cantidad: { type: "integer" }, nota: { type: "string" } },
        required: ["n", "cantidad"]
      }
    },
    entrega: { type: ["string", "null"] },
    direccion: { type: ["string", "null"] },
    cliente: { type: ["string", "null"] },
    telefono: { type: ["string", "null"] },
    confirmar: { type: "boolean" }
  },
  required: ["respuesta", "items", "confirmar"]
};

// Claude (Anthropic Messages API). El mejor "mesero". Devuelve el objeto parseado o null.
async function botClaude(env, system, chatMessages) {
  const model = env.BOT_CLAUDE_MODEL || "claude-3-5-haiku-latest";
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model, max_tokens: 900, temperature: 0.3,
        system: system + "\n\nResponde ÚNICAMENTE con el objeto JSON pedido, sin texto adicional ni comillas triples.",
        // Prefill con "{" para forzar que la salida sea JSON desde el primer carácter.
        messages: [...chatMessages, { role: "assistant", content: "{" }]
      })
    });
    const data = await r.json();
    if (!r.ok) { console.warn("Claude HTTP", r.status, JSON.stringify(data).slice(0, 300)); return null; }
    const cont = (data.content && data.content[0] && data.content[0].text) || "";
    return extraerJSON("{" + cont);
  } catch (e) { console.warn("Claude fetch fail:", String(e)); return null; }
}

// Workers AI (incluida en Cloudflare). Respaldo gratis. Devuelve el objeto parseado o null.
async function botWorkersAI(env, system, chatMessages) {
  try {
    const ia = await env.AI.run(BOT_MODEL, {
      messages: [{ role: "system", content: system }, ...chatMessages],
      temperature: 0.2, max_tokens: 800,
      response_format: { type: "json_schema", json_schema: BOT_SCHEMA }
    });
    let parsed = ia && ia.response;
    if (typeof parsed === "string") parsed = extraerJSON(parsed);
    if (!parsed || typeof parsed !== "object") parsed = extraerJSON(ia && (ia.result || "")) || null;
    return parsed;
  } catch (e) { console.warn("WorkersAI fail:", String(e)); return null; }
}

async function botChat(slug, request, env) {
  // 1) Negocio + que sea modo POS con key
  const t = await env.DB.prepare(
    "SELECT id, nombre, modo_pos, pos_api_key, pos_online_recoger, pos_online_domicilio, moneda FROM tenants WHERE id = ? AND activo = 1"
  ).bind(slug).first();
  if (!t) return json({ error: "Negocio no encontrado" }, 404);
  // Límite de pedidos del bot (columnas de fase 10). Se leen aparte y con protección:
  // si esas columnas aún no existen en la base, el bot igual funciona (sin límite).
  let botLim = { bot_limite_pedidos: null, bot_pedidos_mes: 0, bot_mes: null };
  try {
    const bl = await env.DB.prepare("SELECT bot_limite_pedidos, bot_pedidos_mes, bot_mes FROM tenants WHERE id = ?").bind(slug).first();
    if (bl) botLim = bl;
  } catch (_) { /* columnas no existen aún → sin límite */ }
  // Los DEMOS (id demo-*) usan el bot GRATIS (Workers AI) con el catálogo local, sin POS.
  const esDemo = /^demo-/.test(slug);
  if (!esDemo && (!t.modo_pos || !t.pos_api_key)) return json({ error: "no_pos" }, 400);
  if (!env.AI && !env.ANTHROPIC_API_KEY) return json({ error: "ia_sin_config", detalle: "Falta la IA: ni [ai] ni ANTHROPIC_API_KEY están configurados." }, 503);

  // 2) Cuerpo del request
  let body; try { body = await request.json(); } catch { return json({ error: "JSON inválido" }, 400); }
  const mensaje = (typeof body.mensaje === "string" ? body.mensaje : "").slice(0, 500).trim();
  if (!mensaje) return json({ error: "mensaje_vacio" }, 400);
  let historial = Array.isArray(body.historial) ? body.historial.slice(-BOT_MAX_TURNS) : [];

  // 3) Catálogo: del POS si está enlazado; si es demo, del catálogo local (D1).
  let productos = [];
  const usarPos = t.modo_pos && t.pos_api_key;
  if (usarPos) {
    try {
      const cat = await posRpc(env, "menu_catalogo", { p_api_key: t.pos_api_key });
      productos = (cat && Array.isArray(cat.productos)) ? cat.productos : [];
    } catch (e) {
      return json({ error: "pos_error", detalle: String(e.message || e) }, 502);
    }
  } else {
    const { results } = await env.DB.prepare(
      "SELECT id, nombre, descripcion, precio, categoria FROM productos WHERE tenant_id = ? AND activo = 1 ORDER BY categoria, orden, id"
    ).bind(slug).all();
    productos = (results || []).map(p => ({ id: p.id, nombre: p.nombre, descripcion: p.descripcion, precio: p.precio, categoria: p.categoria, disponible: true }));
  }
  const disponibles = productos.filter(p => p && p.disponible !== false && p.id != null);
  if (!disponibles.length) return json({ error: "sin_catalogo" }, 409);

  // 4) Menú compacto con índices CORTOS. Un número (1,2,3…) es muchísimo más
  //    fácil de copiar sin error para la IA que un UUID largo. Mapeamos de vuelta.
  const menuTxt = disponibles.map((p, i) =>
    `${i + 1}. ${p.nombre} (${p.categoria || "General"})${p.descripcion ? " — " + String(p.descripcion).slice(0, 120) : ""} — ${botMoneda(p.precio)}`
  ).join("\n");

  // En un demo dejamos las dos opciones activas para mostrar la experiencia completa.
  const recoger = (esDemo || t.pos_online_recoger) ? "sí" : "no";
  const domicilio = (esDemo || t.pos_online_domicilio) ? "sí" : "no";

  // Info del negocio que el bot DEBE saber para responder dudas normales de un pedido.
  // (Por ahora valores por defecto sensatos para Colombia; luego se vuelven configurables por negocio.)
  const modosEntrega = [recoger === "sí" ? "recoger en el local" : null, domicilio === "sí" ? "domicilio" : null].filter(Boolean).join(" y ") || "recoger en el local";
  const formasPago = "efectivo y transferencia (Nequi, Daviplata o Bancolombia). El pago se coordina al recoger el pedido o al recibir el domicilio.";

  // 5) Instrucciones (system) — personalidad de mesero colombiano cálido y buen vendedor
  const sys =
`Eres el mesero virtual de "${t.nombre}", un negocio de café/comida en Colombia. Hablas como un colombiano cálido, amable y con chispa: cercano, buena energía y BREVE. Usa como máximo 1 emoji de vez en cuando (no en cada frase). Tu meta: que el cliente se sienta bien atendido, tomar bien el pedido y, con gracia, vender un poquito más.

TONO Y PERSONALIDAD:
- Saluda natural y cálido. Si el cliente solo da las gracias, respóndele con cariño (algo como "¡Con muchísimo gusto! Para nosotros en ${t.nombre} es un placer atenderte 🙌") y NO repitas el pedido.
- Si el cliente bromea o escribe "jajaja", suéltale una frase corta y divertida pero con sentido, sin exagerar.
- Si pregunta algo casual (el clima, cómo va el día), contéstale con buena onda y, si cabe, conéctalo suave con un producto ("Por acá está calientico, perfecto para refrescarse con un frappe 😎"). No inventes datos exactos que no sepas (como la temperatura precisa); habla en general.
- Si el cliente es grosero o está de mal genio, NO te lo tomes personal ni contestes feo: baja la tensión con amabilidad y ofrécele algo rico ("Tranquilo, aquí estoy para ayudarte 🙏 ¿Qué tal un té aromático para relajar el día?").

CÓMO TOMAR EL PEDIDO:
- SOLO ofreces y agregas productos del CATÁLOGO de abajo. Nunca inventes productos ni precios.
- Si el cliente pregunta qué lleva o cómo es un producto, descríbelo con la DESCRIPCIÓN que trae el catálogo (después del "—"). Si un producto no tiene descripción, dilo con naturalidad y ofrécele igual probarlo, sin inventar ingredientes.
- El catálogo trae un número interno al inicio de cada línea. Ese número es SECRETO: úsalo solo en "items" (campo "n"). JAMÁS lo menciones al cliente; el cliente solo ve NOMBRES.
- Si el cliente pide algo con una preferencia ("poco dulce", "sin azúcar", "bien caliente", "sin cebolla"), guárdala TAL CUAL en el campo "nota" de ese item, para que la cocina la vea.
- NUNCA escribas precios ni el total en tu texto; el recuadro del pedido ya se los muestra. Solo di un precio si el cliente lo pregunta directamente.
- NO repitas el resumen del pedido en cada mensaje. En los pasos intermedios sé breve ("¡Listo! ¿Algo más?"). El resumen completo va UNA sola vez, al final.

VENDER UN POQUITO MÁS (sin ser intenso):
- Cuando el cliente agregue algo, UNA sola vez sugiere con gracia un acompañante del catálogo que combine ("¿Te provoca una empanadita para acompañar ese frappe? 😋"). Si dice que no, no insistas.
- Antes de cerrar, pregunta una vez "¿Se te ofrece algo más?". Si dice que no, avanza a cerrar.

PARA CERRAR:
- Necesitas: al menos 1 producto, si es para recoger o domicilio, y si es domicilio la dirección. Pregunta SOLO lo que falte, una cosa a la vez, sin repetir lo que ya tienes.
- Cuando tengas todo, haz UN resumen corto (productos + entrega) y pregunta si confirma. "confirmar" pasa a true solo cuando el cliente diga que sí a ese resumen.

REGLAS DE SALIDA:
- "items" es SIEMPRE el pedido COMPLETO acumulado (no solo lo nuevo). Si aún no pide nada, [].
- SIEMPRE llena "respuesta" con algo para el cliente; nunca vacío.
- Escribe en español natural con tildes normales (á, é, í, ó, ú, ñ). NUNCA uses códigos tipo \\u00ed.

INFO DEL NEGOCIO (úsala para responder dudas; no inventes lo que no esté):
- Formas de pago: ${formasPago}
- Entrega disponible: ${modosEntrega}.
- Datos que no tengas (horario exacto, dirección del local): dilo con amabilidad y ofrece confirmarlo.

CATÁLOGO (uso interno "n". nombre — precio (categoría) — NO revelar n):
${menuTxt}`;

  // 6) Mensajes del chat (sin system; el system va aparte)
  const chatMessages = [];
  for (const h of historial) {
    const rol = (h && h.rol === "bot") ? "assistant" : "user";
    const c = (h && typeof h.texto === "string") ? h.texto.slice(0, 800) : "";
    if (c) chatMessages.push({ role: rol, content: c });
  }
  chatMessages.push({ role: "user", content: mensaje });

  // 7) Llamar a la IA. Preferimos Claude (mejor mesero); si no hay key, usamos la IA
  //    incluida en Cloudflare (Workers AI) como respaldo. Ambas devuelven el mismo JSON.
  let parsed = null;
  if (esDemo) {
    // Demo: usa la IA GRATIS de Cloudflare (Workers AI); Claude solo como respaldo.
    if (env.AI) parsed = await botWorkersAI(env, sys, chatMessages);
    if (!parsed && env.ANTHROPIC_API_KEY) parsed = await botClaude(env, sys, chatMessages);
  } else {
    if (env.ANTHROPIC_API_KEY) parsed = await botClaude(env, sys, chatMessages);
    if (!parsed && env.AI) parsed = await botWorkersAI(env, sys, chatMessages);
  }
  if (!parsed) parsed = {};

  // 8) Validar items contra el catálogo REAL (por número) y recalcular total (regla de oro)
  const itemsIA = Array.isArray(parsed.items) ? parsed.items : [];
  const carrito = [];
  let total = 0;
  for (const it of itemsIA) {
    const n = parseInt(it && it.n, 10);
    if (!(n >= 1 && n <= disponibles.length)) continue;   // número fuera de rango → se ignora
    const p = disponibles[n - 1];
    let qty = parseInt(it.cantidad, 10); if (!(qty > 0)) qty = 1; if (qty > MAX_QTY) qty = MAX_QTY;
    const nota = (typeof it.nota === "string") ? it.nota.slice(0, MAX_ITEM_NOTA) : "";
    const sub = Number(p.precio) * qty;
    total += sub;
    carrito.push({ producto_id: p.id, nombre: p.nombre, precio: Number(p.precio), cantidad: qty, nota, subtotal: sub });
    if (carrito.length >= MAX_ITEMS) break;
  }

  // Texto para el cliente: usa el de la IA; si viene vacío, lo armamos del carrito (nunca "Perdón")
  let respuesta = (typeof parsed.respuesta === "string" && parsed.respuesta.trim())
    ? decodeEscapes(parsed.respuesta.trim())
    : (carrito.length
        ? "Listo, llevo: " + carrito.map(c => `${c.cantidad}× ${c.nombre}`).join(", ") + ". ¿Se te ofrece algo más?"
        : "¿Qué te provoca? Dime el producto y te lo agrego 🙂");

  const entrega = (parsed.entrega === "domicilio" || parsed.entrega === "recoger") ? parsed.entrega : null;
  const direccion = (typeof parsed.direccion === "string") ? parsed.direccion.slice(0, 200) : null;
  const cliente = (typeof parsed.cliente === "string") ? parsed.cliente.slice(0, 80) : null;
  const telefono = (typeof parsed.telefono === "string") ? parsed.telefono.slice(0, 30) : null;

  // 9) ¿Confirmar? → intentar meter el pedido REAL en el POS (canal "Fuera")
  //    Aquí también se aplica el LÍMITE DE PEDIDOS del plan del negocio.
  const mesActual = new Date().toISOString().slice(0, 7);               // "YYYY-MM"
  const usoMes = (botLim.bot_mes === mesActual) ? (botLim.bot_pedidos_mes || 0) : 0;  // reinicia solo cada mes
  const limite = (esDemo || botLim.bot_limite_pedidos == null) ? null : Number(botLim.bot_limite_pedidos); // demo o sin límite = null
  const sinCupo = (limite != null && usoMes >= limite);

  let pedido = null;
  let limiteAlcanzado = false;
  const quiereConfirmar = parsed.confirmar === true && carrito.length > 0 && entrega;
  if (quiereConfirmar && esDemo) {
    // DEMO: no toca ningún POS real; simula el cierre para mostrar la experiencia completa.
    pedido = { id: "demo", numero: "DEMO-" + Math.floor(Math.random() * 900 + 100), total, simulado: true };
    respuesta = "¡Listo! 🎉 Tu pedido quedó tomado. (Es una DEMO: no se cobra ni se envía nada.) Así de fácil sería en tu propio negocio con Fenlora.";
  } else if (quiereConfirmar) {
    const flagOk = (entrega === "recoger") ? t.pos_online_recoger : t.pos_online_domicilio;
    const faltaDir = (entrega === "domicilio") && !(direccion && direccion.trim());
    if (sinCupo) {
      // El negocio ya llegó al tope de pedidos de su plan este mes.
      limiteAlcanzado = true;
      respuesta = "¡Gracias por tu pedido! 🙏 En este momento no puedo cerrarlo por el chat. Por favor escríbenos directamente y con gusto te lo tomamos.";
    } else if (!flagOk) {
      respuesta += `\n\n(Nota Fenlora: el pedido está completo, pero "${entrega}" está apagado en el admin del negocio, así que no entró al POS todavía.)`;
    } else if (faltaDir) {
      respuesta = "¿A qué dirección te lo enviamos? 📍";
    } else {
      try {
        const r = await posRpc(env, "menu_crear_pedido_online", {
          p_api_key: t.pos_api_key, p_tipo: entrega,
          p_items: carrito.map(c => ({ producto_id: c.producto_id, cantidad: c.cantidad })),
          p_cliente: cliente, p_telefono: telefono,
          p_direccion: entrega === "domicilio" ? direccion : null,
          p_nota: carrito.filter(c => c.nota).map(c => `${c.nombre}: ${c.nota}`).join(" · ").slice(0, MAX_NOTA) || null
        });
        pedido = { id: r.pedido_id, numero: r.numero, total: r.total };
        // Sumar 1 al contador de pedidos del bot de este negocio (y fijar el mes).
        try {
          await env.DB.prepare("UPDATE tenants SET bot_pedidos_mes = ?, bot_mes = ? WHERE id = ?")
            .bind(usoMes + 1, mesActual, t.id).run();
        } catch (e) { console.warn("no pude actualizar contador bot:", String(e)); }
      } catch (e) {
        respuesta += `\n\n(No pude enviarlo al POS: ${String(e.message || e)})`;
      }
    }
  }

  return json({
    respuesta,
    carrito,
    total,
    total_texto: botMoneda(total),
    entrega, direccion, cliente, telefono,
    confirmado: !!pedido,
    pedido,
    limite_alcanzado: limiteAlcanzado,
    uso_mes: usoMes + (pedido ? 1 : 0),
    limite: limite
  });
}

async function getMenuPublico(slug, env) {
  const row = await env.DB.prepare(
    "SELECT nombre, nicho, whatsapp, logo_url, tema, contenido, pago_url, moneda, modo_pos, pos_api_key, pos_autopedido, pos_online_recoger, pos_online_domicilio FROM tenants WHERE id = ? AND activo = 1"
  ).bind(slug).first();
  if (!row) return json({ error: "Negocio no encontrado" }, 404);

  const base = {
    nombre: row.nombre, nicho: row.nicho, whatsapp: row.whatsapp, logo_url: row.logo_url,
    tema: JSON.parse(row.tema), contenido: JSON.parse(row.contenido),
    pago_url: row.pago_url, moneda: row.moneda || "COP",
    // 1 = el cliente puede pedir desde la mesa (autopedido) · 0 = solo ver carta + llamar al mesero
    pos_autopedido: (row.pos_autopedido == null ? 1 : (row.pos_autopedido ? 1 : 0)),
    // Pedidos online (sin mesa): recoger / domicilio, activables por separado.
    pos_online_recoger: (row.pos_online_recoger ? 1 : 0),
    pos_online_domicilio: (row.pos_online_domicilio ? 1 : 0)
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

  // ── AVISOS PUSH (públicos con CORS; los llama el POS y su Service Worker) ──
  if (path.startsWith("/avisos/")) {
    if (method === "OPTIONS") return new Response(null, { status: 204, headers: CORS_AVISOS });
    // Clave pública VAPID para que el POS pueda suscribir el celular
    if (path === "/avisos/vapidkey" && method === "GET") {
      return jsonCors({ key: env.VAPID_PUBLIC || "" });
    }
    // Guardar la suscripción de un celular (el POS envía {endpoint})
    if (path === "/avisos/sub" && method === "POST") {
      let body = {}; try { body = await request.json(); } catch (_) {}
      const ep = (body && body.endpoint) || "";
      if (!ep || ep.length < 20) return jsonCors({ error: "endpoint invalido" }, 400);
      try { await posRpc(env, "avisos_guardar_sub", { p_endpoint: ep }); return jsonCors({ ok: true }); }
      catch (e) { return jsonCors({ error: String(e) }, 500); }
    }
    // Borrar la suscripción (cuando el celular desactiva avisos)
    if (path === "/avisos/sub" && method === "DELETE") {
      let body = {}; try { body = await request.json(); } catch (_) {}
      const ep = (body && body.endpoint) || "";
      try { await posRpc(env, "avisos_borrar_sub", { p_endpoint: ep }); return jsonCors({ ok: true }); }
      catch (e) { return jsonCors({ error: String(e) }, 500); }
    }
    // El detalle del aviso: lo pide el Service Worker al recibir el "timbre"
    if (path === "/avisos/pendientes" && method === "GET") {
      try {
        const r = await posRpc(env, "avisos_por_vencer", { p_dias: 3 });
        const d = (r && typeof r === "object") ? r : {};
        return jsonCors({ title: d.title || "🔔 Fenlora", body: d.body || "Sin cobros pendientes.", n: d.n || 0, tag: "cobros" });
      } catch (e) { return jsonCors({ title: "🔔 Fenlora", body: "Revisa tus cobros en el panel.", tag: "cobros" }); }
    }
    // Botón "Probar aviso ahora" del POS → dispara el push de inmediato
    if (path === "/avisos/probar" && method === "POST") {
      const r = await dispararAvisos(env);
      return jsonCors(r, r.ok ? 200 : 500);
    }
    return jsonCors({ error: "ruta de avisos no encontrada" }, 404);
  }

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

  const demoMatch = path.match(/^\/admin\/api\/tenants\/([^/]+)\/demo$/);
  if (demoMatch && method === "POST") return await toggleDemo(decodeURIComponent(demoMatch[1]), request, env);

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

  // ── Cerebro del bot (IA) ──
  const botMatch = path.match(/^\/menu\/([^/]+)\/bot$/);
  if (botMatch && method === "POST") {
    return await botChat(decodeURIComponent(botMatch[1]), request, env);
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

  // Página del chat/bot: /<slug>/chat → sirve chat.html
  const chatPageMatch = path.match(/^\/([^/]+)\/chat$/);
  if (chatPageMatch && method === "GET" && !RESERVADOS.has(chatPageMatch[1])) {
    const plantilla = await env.ASSETS.fetch(new URL("/chat.html", request.url));
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
  },
  // Cron diario: revisa negocios por vencer y "toca el timbre" del celular del superadmin.
  // Solo dispara si de verdad hay algo por cobrar (así no molesta con avisos vacíos).
  async scheduled(event, env, ctx) {
    ctx.waitUntil((async () => {
      try {
        const r = await posRpc(env, "avisos_por_vencer", { p_dias: 3 });
        if (r && r.n && r.n > 0) await dispararAvisos(env);
      } catch (_) {}
    })());
  }
};
