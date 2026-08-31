# FENLORA · División de trabajo entre chats (POS ↔ Menú Digital)

Este proyecto lo trabajan **dos conversaciones a la vez**. Para no pisarnos, cada
una tiene su territorio. **Léelo antes de editar cualquier archivo.**

---

## 🟢 Chat POS / Enlace (integración con el sistema POS)

Se encarga de: el POS completo, y toda la **lógica del enlace** POS ↔ menú
(catálogo por API, pedidos como comanda, llamar al mesero, seguridad, modo POS).

**Archivos que son SOLO de este chat — el otro chat NO los edita:**
- `src/worker.js`  (backend: API del menú, modo POS, seguridad Access, cabeceras)
- `wrangler.toml`  (variables: Access + Supabase del POS)
- `schema-*.sql`   (migraciones D1 del enlace, ej. `schema-fase7-pos.sql`)

---

## 🎨 Chat Visual (diseño del menú digital)

Se encarga de: cómo se ve el menú — el diseño, estilos, la pantalla "Ver Menú"
(grid/listado), chips de categoría, fotos, temas, la experiencia del comensal.

**Archivos que lidera este chat:**
- `negocio.html`, `menu.html`  (diseño de la carta y el home)
- estilos, temas, maquetas

---

## ⚠️ Archivos COMPARTIDOS (los dos meten mano — cuidado)

Estos archivos tienen partes de los dos. **Regla: al editarlos, NO borres los
bloques del otro.** Los bloques del enlace van marcados con el comentario
`FENLORA-POS-ENLACE`. Si ves ese comentario, no lo toques.

- `negocio.html`  → visual del otro chat, PERO conserva: `_aplicarModo(...)`,
  `Carrito.captarMesa(...)`, y el `fetch('/menu/<slug>/mesero', ...)` dentro del
  botón "Llamar al mesero".
- `checkout.html` → visual del otro chat, PERO conserva: el `mesa:` en el body del
  pedido (`Carrito.getMesa(...)`) y la confirmación de modo POS.
- `carrito.js`    → conserva: `captarMesa`, `getMesa`, `setMesa`.
- `admin/index.html` → visual del otro chat, PERO conserva: el campo
  `#d-pos-api-key` y el envío de `modo_pos` + `pos_api_key` al guardar.

*(Este bloque del admin ya se borró una vez sin querer — es el más delicado.)*

---

## 📏 Reglas de oro (para los dos chats)

1. **Antes de editar, lee la versión ACTUAL del archivo en la carpeta** (no una
   copia vieja de tu memoria). Los archivos cambian entre chats.
2. **No borres bloques marcados `FENLORA-POS-ENLACE`.** Si necesitas moverlos,
   muévelos, no los elimines.
3. Un solo chat "posee" cada archivo no-compartido. Respeta la lista de arriba.
4. Al terminar un cambio grande, avisa en el otro chat qué archivo tocaste.
5. Flujo de subida siempre: `git add … && git commit && git push && npx wrangler deploy`.

---

## 🔌 Cómo funciona el enlace (contexto para ambos)

- El menú del negocio en **modo "Con POS"** (Tipo de negocio → Con POS + API key)
  **lee la carta del POS** y le **manda los pedidos como comandas** a la mesa; el
  botón "Llamar al mesero" avisa al POS. Todo pasa por `src/worker.js`, que llama
  a las funciones de Supabase del POS con la `pos_api_key` del negocio (guardada
  en D1, nunca en el navegador).
- El **diseño** (grid/listado, fotos, colores) es independiente: solo pinta los
  productos que le llegan, vengan del POS o de la carta propia. Por eso lo visual
  y el enlace **no chocan** — mientras se respeten los bloques marcados.
- Tip: el modo **Listado** es ideal cuando el negocio viene del POS **sin fotos**.
