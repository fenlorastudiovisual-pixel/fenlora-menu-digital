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
    estrella:    { label: 'Especial / Estrella', svg: svg('<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9 6.8 19.6l1-5.8L3.5 9.7l5.9-.9L12 3.5Z"/>') }
  };

  window.ICONOS_MENU = ICONOS;
  // Devuelve el SVG de un ícono por id; si no existe, un ícono genérico de cubiertos.
  window.iconoMenuSVG = function (id) {
    if (id && ICONOS[id]) return ICONOS[id].svg;
    return svg('<path d="M6 3v6a2 2 0 0 0 2 2M6 3v18M10 3v6a2 2 0 0 1-2 2"/><path d="M17 3c-1.66 0-3 1.79-3 4s1.34 4 3 4v9"/>');
  };
})();
