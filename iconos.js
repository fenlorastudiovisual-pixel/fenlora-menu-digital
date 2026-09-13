/* ============================================================
   Fenlora Menú Digital — Set de íconos de categoría
   Íconos de línea (stroke = currentColor) en viewBox 0 0 24 24.
   Se usan tanto en el home (negocio.html) como en "Ver menú" (menu.html).
   El color lo controla currentColor (el color del ícono se define en el admin).
   ============================================================ */
(function () {
  const S = 'fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"';
  const svg = (inner) => `<svg viewBox="0 0 24 24" ${S}>${inner}</svg>`;

  const ICONOS = {
    // ---------- Bebidas calientes ----------
    cafe:        { label: 'Café caliente', svg: svg('<path d="M4 8h13v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V8Z"/><path d="M17 9h2.2a2.3 2.3 0 0 1 0 4.6H17"/><path d="M8 3.5c-.6.8-.6 1.7 0 2.5M12 3c-.6.8-.6 1.7 0 2.5"/>') },
    espresso:    { label: 'Espresso', svg: svg('<path d="M6 10h9v3a4 4 0 0 1-4 4H10a4 4 0 0 1-4-4v-3Z"/><path d="M15 11h1.8a1.9 1.9 0 0 1 0 3.8H15"/><path d="M6 20h9"/>') },
    latte:       { label: 'Latte / Capuccino', svg: svg('<path d="M5 9h12v4a5 5 0 0 1-5 5H10a5 5 0 0 1-5-5V9Z"/><path d="M17 10h2a2.2 2.2 0 0 1 0 4.4h-2"/><path d="M11 12.2c.9-.9 2.2-.9 0 1.6-2.2-2.5-.9-2.5 0-1.6Z"/>') },
    te:          { label: 'Té / Aromática', svg: svg('<path d="M5 8h11v4.5a4.5 4.5 0 0 1-4.5 4.5h-2A4.5 4.5 0 0 1 5 12.5V8Z"/><path d="M16 9h2.2a2.2 2.2 0 0 1 0 4.4H16"/><path d="M10.5 8V6.5a1.5 1.5 0 0 1 3 0V8"/><path d="M12 4.2v-.7"/>') },
    chocolate:   { label: 'Chocolate caliente', svg: svg('<path d="M5 9h11v4.5a4.5 4.5 0 0 1-4.5 4.5h-2A4.5 4.5 0 0 1 5 13.5V9Z"/><path d="M16 10h2a2.1 2.1 0 0 1 0 4.2h-2"/><circle cx="9" cy="12" r=".6"/><circle cx="12" cy="13" r=".6"/><path d="M8 4.5c-.5.7-.5 1.5 0 2.2M12 4c-.5.7-.5 1.5 0 2.2"/>') },
    grano:       { label: 'Grano de café', svg: svg('<ellipse cx="12" cy="12" rx="5.5" ry="8" transform="rotate(35 12 12)"/><path d="M8.7 7.2c2.5 2.2 3.8 5.9 2.6 9.6"/>') },

    // ---------- Bebidas frías ----------
    frio:        { label: 'Bebida fría', svg: svg('<path d="M7 7h10l-1 12a2 2 0 0 1-2 1.8H10A2 2 0 0 1 8 19L7 7Z"/><path d="M6 7h12"/><path d="M13 3l-1 4"/><path d="M9.2 11h5.6M9.5 15h5"/>') },
    granizado:   { label: 'Granizado / Frappé', svg: svg('<path d="M7 9h10l-1.2 9.5a2 2 0 0 1-2 1.5h-3.6a2 2 0 0 1-2-1.5L7 9Z"/><path d="M7 9c1.2-1.6 3-2.4 5-2.4S15.8 7.4 17 9"/><path d="M12 6.6V3"/><path d="M10.5 11.5l-.6 3M13.5 11.5l.6 3"/>') },
    jugo:        { label: 'Jugo natural', svg: svg('<path d="M7.5 8h9l-.8 11a2 2 0 0 1-2 1.8h-3.4a2 2 0 0 1-2-1.8L7.5 8Z"/><path d="M6.5 8h11"/><path d="M15 4.5a3 3 0 0 1-3 3 3 3 0 0 1-3-3 6 6 0 0 1 6 0Z"/>') },
    smoothie:    { label: 'Smoothie / Batido', svg: svg('<path d="M8 9h8l-.7 10a2 2 0 0 1-2 1.8h-2.6a2 2 0 0 1-2-1.8L8 9Z"/><path d="M8 12.5c1.3.9 2.7.9 4 0s2.7-.9 4 0"/><path d="M13 9V5.5a2 2 0 0 1 2-2h1"/>') },
    soda:        { label: 'Gaseosa / Soda', svg: svg('<path d="M8 8h8l-.8 11.5a1.6 1.6 0 0 1-1.6 1.5h-3.2A1.6 1.6 0 0 1 8.8 19.5L8 8Z"/><path d="M7 8h10"/><circle cx="11" cy="12" r=".5"/><circle cx="13.5" cy="14" r=".5"/><circle cx="11.5" cy="15.5" r=".5"/><path d="M12 3l3 3-3 2-3-2 3-3Z"/>') },
    agua:        { label: 'Agua / Botella', svg: svg('<path d="M10 2h4M10.5 2v2.2L9 6.2A2 2 0 0 0 8.6 7.4V20a2 2 0 0 0 2 2h2.8a2 2 0 0 0 2-2V7.4a2 2 0 0 0-.4-1.2L13.5 4.2V2"/><path d="M8.6 12h6.8"/>') },
    limonada:    { label: 'Limonada', svg: svg('<path d="M7.5 8h9l-.9 11a2 2 0 0 1-2 1.8h-3.2a2 2 0 0 1-2-1.8L7.5 8Z"/><path d="M6.5 8h11"/><path d="M12 3l-1 5"/><circle cx="15.5" cy="4.5" r="1.6"/>') },

    // ---------- Alcohol ----------
    cerveza:     { label: 'Cerveza', svg: svg('<path d="M7 8h8v11a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V8Z"/><path d="M15 10h2.5A1.5 1.5 0 0 1 19 11.5v4A1.5 1.5 0 0 1 17.5 17H15"/><path d="M7 8c0-1.7 1.3-2.6 2.5-2.6.4-1.2 1.6-1.8 2.8-1.2.9-1 2.6-.6 2.7.9 1.3.1 2 1.2 0 2.9"/>') },
    vino:        { label: 'Vino', svg: svg('<path d="M7.5 3h9l-.6 6a4.9 4.9 0 0 1-9.8 0L7.5 3Z"/><path d="M12 14v5"/><path d="M8.5 21h7"/>') },
    coctel:      { label: 'Cóctel', svg: svg('<path d="M4 5h16l-8 8-8-8Z"/><path d="M12 13v6"/><path d="M8.5 21h7"/><path d="M16 5l3-2.2"/><circle cx="19.4" cy="2.3" r="1"/>') },
    shot:        { label: 'Shot', svg: svg('<path d="M8.5 7h7l-.8 12a1.4 1.4 0 0 1-1.4 1.3h-2.6A1.4 1.4 0 0 1 9.3 19L8.5 7Z"/><path d="M8.7 11h6.6"/>') },
    botella:     { label: 'Botella / Licor', svg: svg('<path d="M10.5 2h3v3.2l1.4 2.3A3 3 0 0 1 15.4 9v10a2 2 0 0 1-2 2h-2.8a2 2 0 0 1-2-2V9a3 3 0 0 1 .5-1.5l1.4-2.3V2Z"/><path d="M8.6 11h6.8"/>') },

    // ---------- Helados / dulces ----------
    helado:      { label: 'Helado cono', svg: svg('<path d="M8 9a4 4 0 0 1 8 0"/><path d="M7.6 9h8.8L12 21 7.6 9Z"/><path d="M9 12.5l6 0M10 16l4 0"/>') },
    copa:        { label: 'Helado copa', svg: svg('<path d="M6.5 10h11l-4 4h-3l-4-4Z"/><path d="M12 14v6M9.5 21h5"/><path d="M8 10a4 4 0 0 1 3.8-4A3 3 0 0 1 17 8.2 2.5 2.5 0 0 1 16.5 10"/><circle cx="12" cy="4.4" r="1"/>') },
    paleta:      { label: 'Paleta / Helado', svg: svg('<rect x="7" y="3" width="10" height="13" rx="5"/><path d="M12 16v5"/><path d="M10 7.5c1-.8 3-.8 4 0"/>') },
    torta:       { label: 'Torta / Pastel', svg: svg('<path d="M4 20h16"/><path d="M5 20v-7a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v7"/><path d="M5 14c1.2 1 2.3 1 3.5 0s2.3-1 3.5 0 2.3 1 3.5 0 2.3-1 3-.4"/><path d="M12 10V6M12 4.5v-1"/>') },
    cupcake:     { label: 'Cupcake', svg: svg('<path d="M6 12h12l-1.2 7a1.6 1.6 0 0 1-1.6 1.4H8.8A1.6 1.6 0 0 1 7.2 19L6 12Z"/><path d="M7 12a3.2 3.2 0 0 1 .3-5A3.4 3.4 0 0 1 12 4.3 3.4 3.4 0 0 1 16.7 7a3.2 3.2 0 0 1 .3 5"/><path d="M12 4.3V3"/>') },
    dona:        { label: 'Dona', svg: svg('<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M6.5 8.5l1 1M14 6l.6 1.2M18 10l-1.1.6M9 17.5l.7-1.1"/>') },
    galleta:     { label: 'Galleta', svg: svg('<circle cx="12" cy="12" r="8.5"/><circle cx="9.5" cy="10" r=".8"/><circle cx="14" cy="9.5" r=".8"/><circle cx="15" cy="14" r=".8"/><circle cx="10" cy="15" r=".8"/><circle cx="12.5" cy="12.5" r=".8"/>') },

    // ---------- Comidas ----------
    hamburguesa: { label: 'Hamburguesa', svg: svg('<path d="M4 9.5a8 8 0 0 1 16 0"/><path d="M4 9.5h16"/><path d="M4 13.5h16"/><path d="M4 13.5v1.5a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-1.5"/><path d="M6 13.5c1.2-1 2.6-1 3.8 0s2.6 1 3.8 0 2.6-1 3.4-.3"/>') },
    pizza:       { label: 'Pizza', svg: svg('<path d="M12 3 3.5 19a1 1 0 0 0 1.3 1.3L21 12 12 3Z"/><path d="M12 3c-3 4-5.7 9-7 15.5"/><circle cx="10.5" cy="9" r="1"/><circle cx="9" cy="13.5" r="1"/><circle cx="14" cy="11.5" r="1"/>') },
    perro:       { label: 'Perro caliente', svg: svg('<path d="M4 14a4 4 0 0 1 4-4h8a4 4 0 0 1 0 8H8a4 4 0 0 1-4-4Z"/><path d="M6.5 13.5c1.2-1 2.4-1 3.6 0s2.4 1 3.6 0 2.4-1 3.3-.4"/>') },
    taco:        { label: 'Taco', svg: svg('<path d="M3 17a9 9 0 0 1 18 0Z"/><path d="M3 17h18"/><path d="M8 13.5c1-.8 2-.8 3 0M13 12.5c1-.8 2-.8 3 0"/>') },
    sandwich:    { label: 'Sándwich', svg: svg('<path d="M4 8l8-4 8 4-8 4-8-4Z"/><path d="M4 8v3l8 4 8-4V8"/><path d="M6.5 11.5 12 14l5.5-2.5"/>') },
    pollo:       { label: 'Pollo', svg: svg('<path d="M14.5 3a5.5 5.5 0 0 0-4 9.3l-6 6a2 2 0 0 0 0 2.8 2 2 0 0 0 2.8 0l6-6A5.5 5.5 0 1 0 14.5 3Z"/><path d="M6.5 17.5 4.5 19.5"/>') },
    carne:       { label: 'Carne / Parrilla', svg: svg('<path d="M4 12a6 6 0 0 1 6-6h4a6 6 0 0 1 0 12h-4a6 6 0 0 1-6-6Z"/><circle cx="14" cy="12" r="2.5"/>') },
    ensalada:    { label: 'Ensalada', svg: svg('<path d="M4 11h16a8 8 0 0 1-16 0Z"/><path d="M6 11c1-2 3-3 5-2M12 9c1.5-2 4-2.5 5.5-1M9 11c-1-2.5.5-4.5 2.5-5"/>') },
    sopa:        { label: 'Sopa', svg: svg('<path d="M4 11h16a8 8 0 0 1-16 0Z"/><path d="M3 21h18"/><path d="M9 7c-.6.8-.6 1.7 0 2.5M12 6.5c-.6.8-.6 1.7 0 2.5M15 7c-.6.8-.6 1.7 0 2.5"/>') },
    waffle:      { label: 'Waffle', svg: svg('<rect x="4.5" y="4.5" width="15" height="15" rx="3"/><path d="M9.5 4.5v15M14.5 4.5v15M4.5 9.5h15M4.5 14.5h15"/>') },
    pan:         { label: 'Pan / Panadería', svg: svg('<path d="M5 10a3.5 3.5 0 0 1 3.5-3.5h7A3.5 3.5 0 0 1 19 10c0 4-2 8-3 8H8c-1 0-3-4-3-8Z"/><path d="M9 9c.7 3 .7 6 0 9M13 9c.7 3 .7 6 0 9"/>') },
    desayuno:    { label: 'Desayuno / Huevo', svg: svg('<path d="M12 4c-3 0-6 3.5-6 7.5a6 6 0 0 0 12 0C18 7.5 15 4 12 4Z"/><circle cx="12" cy="11.5" r="2.6"/>') },
    combo:       { label: 'Combo / Para llevar', svg: svg('<path d="M6 8h12l-1 11.5a1.6 1.6 0 0 1-1.6 1.5H8.6A1.6 1.6 0 0 1 7 19.5L6 8Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>') },
    estrella:    { label: 'Especial / Estrella', svg: svg('<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9 6.8 19.6l1-5.8L3.5 9.7l5.9-.9L12 3.5Z"/>') },

    // ---------- Categorías extra (nichos completos) ----------
    entrada:     { label: 'Entradas / Tapas', svg: svg('<circle cx="12" cy="12" r="8.2"/><circle cx="12" cy="12" r="3.2"/><path d="M12 3.8v1.6M12 18.6v1.6M3.8 12h1.6M18.6 12h1.6"/>') },
    bebida:      { label: 'Bebida', svg: svg('<path d="M8 4h8l-1 15a2 2 0 0 1-2 1.8h-2A2 2 0 0 1 9 19L8 4Z"/><path d="M7 4h10"/><path d="M9.5 9h5"/>') },
    pescado:     { label: 'Pescado / Mariscos', svg: svg('<path d="M4 12c2.4-3.4 6.8-4.4 10.6-2.6 1.7.8 3.3 1.7 4.9 2.6-1.6.9-3.2 1.8-4.9 2.6C10.8 16.4 6.4 15.4 4 12Z"/><path d="M20 8.5 16.5 12 20 15.5"/><circle cx="8" cy="11" r=".7"/>') },
    pasta:       { label: 'Pasta', svg: svg('<path d="M4 12h16a8 8 0 0 1-16 0Z"/><path d="M8 12c0-2 .8-3.2 1.8-4.2M12 12c0-2.2.8-3.4 1.9-4.4M16 12c0-1.6.6-2.7 1.4-3.5"/><path d="M15.5 6.2c.9-.5 1.9-.3 2.3.6"/>') },
    arroz:       { label: 'Arroz', svg: svg('<path d="M4.5 12h15a7.5 7.5 0 0 1-15 0Z"/><path d="M3.5 12h17"/><circle cx="9" cy="9.4" r=".5"/><circle cx="12" cy="8.7" r=".5"/><circle cx="15" cy="9.4" r=".5"/><path d="M14 3.5l4.5 4.5M16 3l4.5 4.5"/>') },
    topping:     { label: 'Toppings', svg: svg('<path d="M4 14a8 8 0 0 1 16 0Z"/><path d="M4 14h16"/><path d="M8 10.2l.8.9M12 9.2v1.3M15.2 10.2l-.8.9"/>') },
    sushi:       { label: 'Sushi / Roll', svg: svg('<rect x="5.5" y="5.5" width="13" height="13" rx="6.5"/><circle cx="12" cy="12" r="2.6"/><path d="M12 5.6v2M12 16.4v2M5.6 12h2M16.4 12h2"/>') },
    bowl:        { label: 'Bowl / Poke', svg: svg('<path d="M4 11h16a8 8 0 0 1-16 0Z"/><path d="M8 11a4 4 0 0 1 8 0"/><circle cx="10" cy="8.6" r=".8"/><circle cx="13.6" cy="8.9" r=".8"/>') },
    ramen:       { label: 'Ramen / Sopa', svg: svg('<path d="M4 12h16a8 8 0 0 1-16 0Z"/><path d="M3 12h18"/><path d="M14 4.5l6 3"/><path d="M9 8c-.5.7-.5 1.5 0 2.2M12 7.5c-.5.7-.5 1.5 0 2.2"/>') },
    papas:       { label: 'Papas fritas', svg: svg('<path d="M7 9h10l-1 9.2a2 2 0 0 1-2 1.8h-4a2 2 0 0 1-2-1.8L7 9Z"/><path d="M9.2 9V5M12 9V4M14.8 9V5"/>') },
    alitas:      { label: 'Alitas / Pollo', svg: svg('<path d="M13.2 4a4.6 4.6 0 0 0-3.1 8L5.6 16.5a1.8 1.8 0 0 0 2.5 2.5l4.5-4.5A4.6 4.6 0 1 0 13.2 4Z"/><path d="M7.2 15.2 5.7 16.7"/>') },
    burrito:     { label: 'Burrito', svg: svg('<path d="M6.5 5H15a4.2 4.2 0 0 1 0 9H8"/><path d="M6.5 5 4.3 8.2 6.5 11"/><path d="M18.7 9.6 20.4 12l-1.7 2.4"/>') },
    quesadilla:  { label: 'Quesadilla', svg: svg('<path d="M4 8a10 10 0 0 0 16 0Z"/><path d="M8 8.5v3M12 8.5v3.8M16 8.5v3"/>') },
    nachos:      { label: 'Nachos', svg: svg('<path d="M5 8l4 8 4-8ZM11 8l4 8 4-8Z"/><circle cx="9" cy="11" r=".5"/><circle cx="15" cy="11" r=".5"/>') },
    arepa:       { label: 'Arepa', svg: svg('<circle cx="12" cy="12" r="8.2"/><path d="M4.2 12h15.6"/>') },
    pancake:     { label: 'Pancakes', svg: svg('<ellipse cx="12" cy="8" rx="7" ry="2.4"/><path d="M5 8v3c0 1.3 3.1 2.4 7 2.4s7-1.1 7-2.4V8"/><path d="M5 12v3c0 1.3 3.1 2.4 7 2.4s7-1.1 7-2.4v-3"/><path d="M12 5.6V3.4"/>') },
    croissant:   { label: 'Croissant / Hojaldre', svg: svg('<path d="M4.5 16.5c-1.3-5 2.7-9.5 7.5-9.5s8.8 4.5 7.5 9.5c-2.2-3.2-4.4-4.3-7.5-4.3s-5.3 1.1-7.5 4.3Z"/><path d="M4.5 16.5 3 19M19.5 16.5 21 19"/>') },
    fruta:       { label: 'Fruta', svg: svg('<path d="M12 8.2c-1.1-2-3.1-2.6-4.7-1.6C5.7 7.6 5.7 10.2 6.8 13.2c.7 2 1.8 4 3.2 4s2-1 2-2 1 2 2 2 2.4-2 3.1-4c1.1-3 1.1-5.6-.5-6.6-1.6-1-3.6-.4-4.6 1.2Z"/><path d="M12 8.2V5c0-1 .9-2 2.1-2"/>') },
    whisky:      { label: 'Whisky / Licor', svg: svg('<path d="M7 6h10l-1 12a2 2 0 0 1-2 1.8h-4A2 2 0 0 1 8 18L7 6Z"/><path d="M8 13h8"/><rect x="9.6" y="9.4" width="3" height="3" rx=".5"/>') },
    picada:      { label: 'Picada / Tabla', svg: svg('<rect x="3" y="8" width="18" height="8.5" rx="2"/><circle cx="8" cy="12.3" r="1.5"/><circle cx="13" cy="11.4" r="1.4"/><circle cx="16.5" cy="13.4" r="1.2"/>') },
    salsa:       { label: 'Salsa', svg: svg('<path d="M10 3h4v2.8l1 2V19a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2V7.8l1-2V3Z"/><path d="M9 12h6"/>') }
  };

  window.ICONOS_MENU = ICONOS;
  // Devuelve el SVG de un ícono por id; si no existe, un ícono genérico de cubiertos.
  window.iconoMenuSVG = function (id) {
    if (id && ICONOS[id]) return ICONOS[id].svg;
    return svg('<path d="M6 3v6a2 2 0 0 0 2 2M6 3v18M10 3v6a2 2 0 0 1-2 2"/><path d="M17 3c-1.66 0-3 1.79-3 4s1.34 4 3 4v9"/>');
  };
  // Elige el id de ícono que MEJOR representa el nombre de una categoría.
  // Orden: de lo más específico a lo más general (así "Cafés fríos" cae en frío, etc.).
  window.iconoIdCategoria = function (nombre) {
    var n = (nombre || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    var has = function () { for (var i = 0; i < arguments.length; i++) if (n.indexOf(arguments[i]) >= 0) return true; return false; };
    // — Café / bebidas calientes —
    if (has('granizad', 'cholado', 'raspado', 'frappe', 'frozen', 'slush')) return 'granizado';
    if (has('malteada', 'milkshake', 'batido')) return 'smoothie';
    if (has('espresso')) return 'espresso';
    if (has('capuch', 'capuc', 'latte', 'cappu', 'macchiato', 'mocaccino', 'moka')) return 'latte';
    if (has('aromatic', 'infusion', 'tisana', 'chai') || n === 'te' || n === 'tes' || n === 'tés') return 'te';
    if (has('chocolate', 'chocolat')) return 'chocolate';
    if (has('cafe frio', 'cafes frios', 'iced', 'cold brew')) return 'frio';
    if (has('filtrad', 'metodo', 'prensa', 'pour', 'chemex', 'v60', 'grano', 'tueste', 'origen')) return 'grano';
    if (has('calient', 'cafe', 'tinto', 'americano', 'capsul')) return 'cafe';
    // — Bebidas frías / alcohol —
    if (has('limonad')) return 'limonada';
    if (has('michel', 'cervez', 'beer')) return 'cerveza';
    if (has('vino', 'sangria', 'espumos')) return 'vino';
    if (has('sin alcohol', 'mocktail', 'virgin', 'coctel', 'cocktail', 'trago', 'cantina', 'mojito', 'margarita', 'daiquiri', 'gin ', 'ginebra')) return 'coctel';
    if (has('shot')) return 'shot';
    if (has('aguardiente', 'whisky', 'whiskey', 'tequila', 'vodka', 'destilad', 'licor', 'botella', 'brandy', 'guaro') || n === 'ron' || n === 'rones' || has('ron ')) return 'whisky';
    if (has('smoothie')) return 'smoothie';
    if (has('jugo', 'zumo', 'natural')) return 'jugo';
    if (has('soda', 'gaseosa', 'refresco')) return 'soda';
    if (has('aguas') || n === 'agua') return 'agua';
    if (has('fria', 'frio', 'fresc', 'hielo')) return 'frio';
    // — Entradas / platos —
    if (has('picada', 'tabla', 'charcuteria', 'picoteo')) return 'picada';
    if (has('entrada', 'tapas', 'aperitivo', 'antipast')) return 'entrada';
    if (has('ramen', 'fideo', 'noodle')) return 'ramen';
    if (has('sopa', 'caldo', 'crema', 'ajiaco', 'sancoch', 'consome')) return 'sopa';
    if (has('ensalada', 'saludable', 'veggie', 'vegetari', 'sin azucar', 'light', 'fit', 'keto')) return 'ensalada';
    if (has('sashimi', 'ceviche', 'pescado', 'marisco', 'camaron', 'salmon', 'atun')) return 'pescado';
    if (has('roll', 'nigiri', 'temaki', 'maki', 'sushi', 'handroll')) return 'sushi';
    if (has('poke', 'bowl', 'tazon', 'buddha')) return 'bowl';
    if (has('pasta', 'spaghetti', 'espagueti', 'lasagn', 'lasan', 'fetuccin', 'ravioli', 'macarr', 'canelon')) return 'pasta';
    if (has('arroz', 'arroce', 'risotto', 'paella')) return 'arroz';
    if (has('alita', 'alas', 'wings')) return 'alitas';
    if (has('pollo', 'broaster', 'apanad')) return 'pollo';
    if (has('platos fuertes', 'plato fuerte', 'principales', 'fuertes', 'especialidad', 'de la casa', 'a la carta')) return 'carne';
    if (has('carne', 'asado', 'parrilla', 'lomo', 'churrasco', 'bife', 'costilla', 'punta') || n === 'res') return 'carne';
    if (has('hamburg', 'burger', 'smash')) return 'hamburguesa';
    if (has('pizza')) return 'pizza';
    if (has('perro', 'hotdog', 'hot dog', 'choripan')) return 'perro';
    if (has('empanada')) return 'combo';
    if (has('salchipap', 'papas', 'fritas', 'french fries') || n === 'papa') return 'papas';
    if (has('burrito')) return 'burrito';
    if (has('quesadill')) return 'quesadilla';
    if (has('nacho', 'totopo')) return 'nachos';
    if (has('taco', 'birria')) return 'taco';
    if (has('arepa')) return 'arepa';
    if (has('sandwich', 'sanduch', 'wrap', 'baguette', 'salado')) return 'sandwich';
    // — Dulces / desayuno —
    if (has('waffle', 'wafle')) return 'waffle';
    if (has('pancake', 'panqueque', 'hotcake', 'tostada', 'frances', 'french toast')) return 'pancake';
    if (has('huevo', 'desayuno', 'brunch', 'omelet')) return 'desayuno';
    if (has('croissant', 'hojaldre', 'danesa')) return 'croissant';
    if (has('cupcake', 'muffin')) return 'cupcake';
    if (has('dona', 'donut')) return 'dona';
    if (has('galleta', 'cookie', 'brownie')) return 'galleta';
    if (has('paleta')) return 'paleta';
    if (has('cono', 'barquillo')) return 'helado';
    if (has('helad', 'nieve', 'gelato', 'sorbete')) return 'helado';
    if (has('copa', 'sundae', 'vaso', 'banana split')) return 'copa';
    if (has('cupcake', 'muffin')) return 'cupcake';
    if (has('postre', 'torta', 'pastel', 'ponque', 'cheesecake', 'reposteria', 'tres leches', 'flan', 'dulce')) return 'torta';
    if (n === 'pan' || n === 'panes' || has('panaderia', 'pandeb', 'mogolla', 'bunuelo')) return 'pan';
    if (has('combo', 'para llevar', 'pa comer', 'para comer', 'almuerzo', 'corrientazo', 'ejecutivo', 'menu del dia', 'comida')) return 'combo';
    if (has('fruta', 'frutal')) return 'fruta';
    if (has('topping', 'adicion', 'extra')) return 'topping';
    if (has('salsa', 'aderezo', 'dip')) return 'salsa';
    if (has('bebida', 'liquido')) return 'bebida';
    if (has('regalo', 'merch', 'souvenir', 'mercancia', 'accesorio')) return 'estrella';
    if (has('especial', 'favorito', 'destacad', 'promo', 'recomend', 'estrella', 'clasico', 'premium', 'signature')) return 'estrella';
    return null;
  };
  // SVG del ícono de una categoría (por su nombre). Si no hay match: cubiertos.
  window.iconoCategoriaSVG = function (nombre) {
    return window.iconoMenuSVG(window.iconoIdCategoria(nombre));
  };
  // Igual, pero respeta un ícono elegido a mano en el admin (cfg = {categoria: id}).
  window.iconoIdCategoriaCfg = function (nombre, cfg) {
    if (cfg && typeof cfg === 'object') {
      var id = cfg[nombre];
      if (id && ICONOS[id]) return id;
    }
    return window.iconoIdCategoria(nombre);
  };
  window.iconoCategoriaSVGCfg = function (nombre, cfg) {
    return window.iconoMenuSVG(window.iconoIdCategoriaCfg(nombre, cfg));
  };
})();
