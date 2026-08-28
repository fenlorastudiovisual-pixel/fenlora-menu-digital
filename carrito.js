// carrito.js — carrito simple por negocio, guardado en el navegador del
// cliente (localStorage). No requiere cuenta ni login: el carrito vive
// mientras no borre datos del navegador. Lo usan index.html, menu.html
// y checkout.html.

const SIMBOLO_MONEDA = { COP: '$', PEN: 'S/', USD: '$', MXN: '$', CLP: '$', ARS: '$' };

function formatearPrecio(valor, moneda) {
  const simbolo = SIMBOLO_MONEDA[moneda] || '$';
  const numero = Number(valor).toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  return `${simbolo} ${numero}`;
}

const Carrito = {
  _key(slug) { return `fenlora_carrito_${slug}`; },

  obtener(slug) {
    try { return JSON.parse(localStorage.getItem(this._key(slug))) || []; }
    catch { return []; }
  },

  guardar(slug, items) {
    localStorage.setItem(this._key(slug), JSON.stringify(items));
    this.actualizarBadges(slug);
  },

  agregar(slug, producto) {
    const items = this.obtener(slug);
    const existente = items.find(i => i.producto_id === producto.producto_id);
    if (existente) existente.cantidad += 1;
    else items.push({ ...producto, cantidad: 1 });
    this.guardar(slug, items);
    return items;
  },

  cambiarCantidad(slug, producto_id, delta) {
    let items = this.obtener(slug);
    const item = items.find(i => i.producto_id === producto_id);
    if (!item) return items;
    item.cantidad += delta;
    items = item.cantidad <= 0 ? items.filter(i => i.producto_id !== producto_id) : items;
    this.guardar(slug, items);
    return items;
  },

  vaciar(slug) { this.guardar(slug, []); },

  totalItems(slug) { return this.obtener(slug).reduce((s, i) => s + i.cantidad, 0); },
  totalPrecio(slug) { return this.obtener(slug).reduce((s, i) => s + i.cantidad * i.precio, 0); },

  actualizarBadges(slug) {
    const n = this.totalItems(slug);
    document.querySelectorAll('.badge-nav').forEach(b => {
      b.textContent = n;
      b.style.display = n > 0 ? 'flex' : 'none';
    });
    document.querySelectorAll('.carrito-flotante-count').forEach(b => { b.textContent = n; });
  },

  // ── Mesa (modo POS): se lee del QR (?mesa=) y se recuerda entre páginas ──
  _mesaKey(slug) { return `fenlora_mesa_${slug}`; },
  setMesa(slug, mesa) { try { if (mesa) localStorage.setItem(this._mesaKey(slug), String(mesa)); } catch (e) {} },
  getMesa(slug) { try { return localStorage.getItem(this._mesaKey(slug)) || ''; } catch (e) { return ''; } },
  // Llama en cada página: si la URL trae ?mesa=, la guarda.
  captarMesa(slug) {
    try { const m = new URLSearchParams(location.search).get('mesa'); if (m) this.setMesa(slug, m); } catch (e) {}
  }
};
