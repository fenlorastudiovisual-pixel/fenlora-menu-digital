// GET /menu/:slug  -> config pública (tema + contenido) de un negocio activo.
// No requiere Access: esta ruta la va a leer el menú del cliente, que es público.
// Se deja lista para la Fase 2, cuando index.html deje de tener datos quemados
// y pida su configuración aquí según el slug de la URL.

export async function onRequestGet({ params, env }) {
  const row = await env.DB.prepare(
    "SELECT nombre, nicho, whatsapp, logo_url, tema, contenido FROM tenants WHERE id = ? AND activo = 1"
  ).bind(params.slug).first();

  if (!row) return Response.json({ error: "Negocio no encontrado" }, { status: 404 });

  return Response.json({
    nombre: row.nombre,
    nicho: row.nicho,
    whatsapp: row.whatsapp,
    logo_url: row.logo_url,
    tema: JSON.parse(row.tema),
    contenido: JSON.parse(row.contenido)
  });
}
