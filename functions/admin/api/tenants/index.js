// GET  /admin/api/tenants        -> lista todos los negocios
// POST /admin/api/tenants        -> crea un negocio nuevo a partir de un nicho
//
// Requiere el binding D1 "DB" configurado en Cloudflare Pages
// (Settings -> Functions -> D1 database bindings -> variable name: DB)
//
// Esta ruta ya queda protegida por Cloudflare Access si configuras la
// aplicación de Access sobre el path /admin/* (ver README-ADMIN.md).

import { NICHOS } from "../../../_niches.js";

function slugify(texto) {
  return texto
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function onRequestGet({ env }) {
  const { results } = await env.DB.prepare(
    "SELECT id, nombre, nicho, whatsapp, logo_url, activo, creado_en FROM tenants ORDER BY creado_en DESC"
  ).all();
  return Response.json({ tenants: results });
}

export async function onRequestPost({ request, env }) {
  const body = await request.json();
  const { nombre, nicho, whatsapp } = body;

  if (!nombre || !nicho) {
    return Response.json({ error: "Falta 'nombre' o 'nicho'" }, { status: 400 });
  }
  const preset = NICHOS[nicho];
  if (!preset) {
    return Response.json({ error: `Nicho desconocido: ${nicho}` }, { status: 400 });
  }

  let id = slugify(nombre);
  const existe = await env.DB.prepare("SELECT id FROM tenants WHERE id = ?").bind(id).first();
  if (existe) id = `${id}-${Date.now().toString(36)}`;

  const contenido = {
    ...preset.contenido_ejemplo,
    nombre_negocio: nombre
  };

  await env.DB.prepare(
    `INSERT INTO tenants (id, nombre, nicho, whatsapp, logo_url, tema, contenido)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    id,
    nombre,
    nicho,
    whatsapp || null,
    "/assets/logo-placeholder.png",
    JSON.stringify(preset.tema),
    JSON.stringify(contenido)
  ).run();

  return Response.json({ id, url: `/menu/${id}` }, { status: 201 });
}
