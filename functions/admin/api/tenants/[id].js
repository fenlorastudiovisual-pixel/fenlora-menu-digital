// GET    /admin/api/tenants/:id  -> detalle de un negocio (incluye tema y contenido)
// PUT    /admin/api/tenants/:id  -> actualiza campos (nombre, whatsapp, logo_url, tema, contenido, activo)
// DELETE /admin/api/tenants/:id  -> elimina el negocio
//
// Fase 1 deja PUT listo para que la Fase 3 (editor por negocio) lo use
// sin tener que tocar esta ruta.

export async function onRequestGet({ params, env }) {
  const row = await env.DB.prepare("SELECT * FROM tenants WHERE id = ?").bind(params.id).first();
  if (!row) return Response.json({ error: "No encontrado" }, { status: 404 });
  return Response.json({
    ...row,
    tema: JSON.parse(row.tema),
    contenido: JSON.parse(row.contenido)
  });
}

export async function onRequestPut({ params, request, env }) {
  const row = await env.DB.prepare("SELECT * FROM tenants WHERE id = ?").bind(params.id).first();
  if (!row) return Response.json({ error: "No encontrado" }, { status: 404 });

  const body = await request.json();
  const nombre = body.nombre ?? row.nombre;
  const whatsapp = body.whatsapp ?? row.whatsapp;
  const logo_url = body.logo_url ?? row.logo_url;
  const activo = body.activo ?? row.activo;
  const tema = body.tema ? JSON.stringify(body.tema) : row.tema;
  const contenido = body.contenido ? JSON.stringify(body.contenido) : row.contenido;

  await env.DB.prepare(
    `UPDATE tenants SET nombre=?, whatsapp=?, logo_url=?, tema=?, contenido=?, activo=? WHERE id=?`
  ).bind(nombre, whatsapp, logo_url, tema, contenido, activo, params.id).run();

  return Response.json({ ok: true });
}

export async function onRequestDelete({ params, env }) {
  await env.DB.prepare("DELETE FROM tenants WHERE id = ?").bind(params.id).run();
  return Response.json({ ok: true });
}
