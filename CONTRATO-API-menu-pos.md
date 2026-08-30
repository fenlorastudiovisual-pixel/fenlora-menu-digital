# Contrato de API — Menú Digital ↔ POS (FENLORA CLOUD)

**Versión:** v1 (borrador — pendiente de aprobar por ambos lados)
**Objetivo:** que un negocio en modo **"Con POS"** del Menú Digital se
alimente del POS y le mande pedidos, sin fusionar bases de datos.

- **Menú Digital:** Cloudflare Worker + D1 + R2 · `menudigital.fenloravisual.com`
- **POS (FENLORA CLOUD):** Supabase + Worker `sistemaspos` · `pos.fenloravisual.com`
- **Regla de oro:** cada proyecto es independiente; solo se hablan por estos
  endpoints autenticados. El POS es la **fuente de la verdad** de productos,
  mesas y comandas.

---

## 1. Quién llama a quién (seguridad)

Todas las llamadas son **servidor a servidor**: el navegador del cliente
habla con el **Worker del Menú**, y el **Worker del Menú** habla con el
**POS**. La clave de API **nunca** viaja al navegador (se guarda en D1, lado
servidor). Esto evita exponer credenciales del POS.

```
Cliente (celular) ──► Worker Menú (D1: guarda la api_key) ──► API POS (Supabase)
```

## 2. Identidad y autenticación

- El **POS genera una API key por negocio** enlazado (una cadena secreta).
- Esa key **identifica al negocio** en el POS (mapea a su ruta/negocio_id),
  así el Menú no necesita mandar el id del negocio en cada llamada.
- El **Menú guarda esa key** en su tenant (D1), en el campo `pos_api_key`,
  junto con `modo_negocio = 'pos'` (ya existe).
- Autenticación en cada request: header `Authorization: Bearer <api_key>`.
- La key da permisos **solo de menú** (leer catálogo, crear comanda, llamar
  mesero) para **ese** negocio. Nada más.

**Base URL propuesta (a confirmar por el POS):**
`https://pos.fenloravisual.com/api/menu/v1`

---

## 3. Endpoints

### (d) Catálogo — `GET /catalogo`

El Menú pide el catálogo del negocio para pintarlo (en vez de leer de su
propio D1).

**Respuesta 200:**
```json
{
  "negocio": { "nombre": "Dulce Café", "moneda": "COP" },
  "categorias": ["Cafés", "Postres"],
  "productos": [
    {
      "id": "uuid-o-id-del-POS",
      "categoria": "Cafés",
      "nombre": "Latte",
      "descripcion": "Espresso con leche",
      "precio": 9000,
      "imagen_url": "https://.../latte.jpg",
      "disponible": true,
      "destacado": false,
      "orden": 1
    }
  ]
}
```
- Solo productos con la flag de "visible en menú" activa.
- `id` es el **id del producto en el POS**; el Menú lo reusa tal cual al
  mandar la comanda (así no hay que mapear nada).
- Cacheable unos segundos del lado del Menú (a definir; ej. 30–60s).

#### Producto principal (recomendado) por categoría — PENDIENTE lado POS

El Menú, en modo **Listado**, muestra arriba de cada categoría un **plato
recomendado con foto grande**, y usa esa misma foto para el cuadro de la
categoría. Hoy el Menú lo elige así: primer producto con `destacado:true`
(y foto) de esa categoría; si ninguno, el primero con foto.

Para que el negocio pueda **elegirlo a propósito**, el **POS** debe permitir,
por producto: (a) marcarlo como **recomendado de su categoría** y (b) que tenga
**foto** (`imagen_url`). Basta con seguir mandando `destacado`/`imagen_url` en
`/catalogo` como ya se hace — el Menú no necesita un campo nuevo, solo que el
POS tenga la UI para marcar el recomendado y subir su foto.

> El lado autónomo (negocios NO POS) tendrá esta misma opción en el admin del
> Menú Digital (la construye el chat Visual). Ambos lados alimentan el mismo
> concepto: un recomendado con foto por categoría.

### (e) Comanda — `POST /comanda`

El Menú manda el pedido; el POS lo inserta en su módulo de Comandas.

**Body:**
```json
{
  "mesa": "id-o-numero-de-mesa-del-POS",
  "items": [
    { "producto_id": "uuid-del-POS", "nombre": "Latte", "precio": 9000, "cantidad": 2, "notas": "sin azúcar" }
  ],
  "total": 18000,
  "nota": "Cliente en mesa 5",
  "canal": "menu_qr"
}
```
**Respuesta 201:** `{ "comanda_id": "...", "estado": "recibida" }`
- El POS decide en qué estado entra (ej. "recibida"/"en cocina").
- Si la mesa no existe o la caja está cerrada, responde error claro
  (ej. 409 `{ "error": "caja_cerrada" }`) para que el Menú avise al cliente.

### (b) Llamar al mesero — `POST /mesero`

**Body:** `{ "mesa": "id-o-numero-de-mesa-del-POS", "motivo": "cuenta" }`
**Respuesta 200:** `{ "ok": true }`
- El POS dispara el aviso a su panel/app de meseros (Supabase Realtime) y/o
  el canal que definan. *(Cómo se entrega el aviso lo decide el POS.)*

### (c) Mesas (QR + NFC)

Las mesas **viven en el POS** (módulo Mesas/QR/NFC ya existe). El Menú solo
**recibe** la mesa por la URL y la reenvía en `/comanda` y `/mesero`.

- **Formato de URL del QR/NFC** (lo genera el POS, apuntando al Menú):
  `https://menudigital.fenloravisual.com/<slug>?mesa=<id_mesa>`
- El Menú lee `?mesa=` y lo usa como el campo `mesa` de los endpoints.
- El `id_mesa` debe ser el **mismo** que usa el POS internamente.

---

## 4. Qué construye cada lado

**Lado POS (otra conversación):**
1. Generar/guardar una API key por negocio enlazado (y mostrarla para
   copiarla al Menú).
2. Endpoints `GET /catalogo`, `POST /comanda`, `POST /mesero` con auth por key.
3. Que el QR/NFC de cada mesa apunte a la URL del Menú con `?mesa=`.
4. Entrega del aviso de mesero (Realtime/WhatsApp/lo que definan).

**Lado Menú (esta conversación):**
1. Campo `pos_api_key` por tenant en el panel (para negocios "Con POS").
2. En modo POS, leer el catálogo del endpoint en vez de D1.
3. Leer `?mesa=` y mandarlo en comanda y mesero.
4. Botón "Llamar al mesero" → `POST /mesero`; checkout → `POST /comanda`.

---

## 5. Decisiones abiertas (a cerrar entre los dos)

1. **Host de los endpoints:** ¿rutas dentro del Worker `sistemaspos`
   (`/api/menu/v1/...`), o un Worker aparte? (propuesta: dentro de sistemaspos).
2. **Formato del `id_mesa`** que usa el POS (número, uuid, clave tipo
   `mesa_5`). El Menú lo trata como texto opaco.
3. **Entrega del aviso de mesero** (Realtime en el panel, WhatsApp, sonido en
   caja).
4. **Caché del catálogo** (cada cuánto refresca el Menú) y qué pasa si el POS
   está caído (¿el Menú muestra "no disponible" o un último catálogo cacheado?).
5. **Versión/errores:** formato común de error `{ "error": "codigo" }` y
   prefijo `/v1` para poder cambiar sin romper.
