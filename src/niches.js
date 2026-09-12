// Catálogo de nichos preset — cada nicho trae 10 categorías reales de su rubro,
// para que los DEMOS se vean completos. Los íconos de cada categoría salen solos
// (iconos.js → iconoIdCategoria), así que cualquier categoría nueva también recibe ícono.

const BENEF = ["Delivery exprés", "Recoge tu pedido", "Pago seguro", "Acumula puntos"];

export const NICHOS = {
  restaurante: {
    label: "Restaurante / Carta",
    tema: { fondo: "#17130f", texto: "#f5efe6", acento1: "#c0392b", acento2: "#d4a24e", fuente: "Playfair Display" },
    contenido_ejemplo: {
      tagline: "COCINA DE AUTOR",
      hero_titulo: "Platos que se disfrutan sin prisa",
      categorias: ["Entradas", "Sopas", "Ensaladas", "Carnes", "Pollo", "Pescados", "Pastas", "Arroces", "Postres", "Bebidas"],
      beneficios: ["Reserva tu mesa", "Domicilio", "Recoge en tienda", "Acumula puntos"]
    }
  },
  granizados: {
    label: "Granizados & Shots",
    tema: { fondo: "#0d0d0d", texto: "#ffffff", acento1: "#ff2fb0", acento2: "#00e5ff", fuente: "Poppins" },
    contenido_ejemplo: {
      tagline: "GRANIZADOS & SHOTS",
      hero_titulo: "FRÍOS. INTENSOS. EXPLOSIVOS.",
      categorias: ["Granizados", "Cholados", "Raspados", "Frappés", "Malteadas", "Shots", "Micheladas", "Limonadas", "Sodas", "Toppings"],
      beneficios: BENEF
    }
  },
  sushi: {
    label: "Sushi Bar",
    tema: { fondo: "#0f0f0f", texto: "#f5efe0", acento1: "#c9a24b", acento2: "#1a1a1a", fuente: "Cormorant Garamond" },
    contenido_ejemplo: {
      tagline: "COCINA QUE SE DESCUBRE",
      hero_titulo: "SABORES AUTÉNTICOS. EXPERIENCIAS ÚNICAS.",
      categorias: ["Entradas", "Rolls", "Rolls especiales", "Nigiri", "Sashimi", "Temaki", "Poke Bowls", "Ramen", "Combos", "Bebidas"],
      beneficios: BENEF
    }
  },
  comida_rapida: {
    label: "Comida rápida / Delivery",
    tema: { fondo: "#141414", texto: "#ffffff", acento1: "#ff7a1a", acento2: "#2be6c8", fuente: "Inter" },
    contenido_ejemplo: {
      tagline: "COCINA OCULTA & DELIVERY",
      hero_titulo: "Sabor sin salón, directo a tu puerta",
      categorias: ["Hamburguesas", "Perros", "Salchipapas", "Alitas", "Papas", "Sándwiches", "Tacos", "Combos", "Postres", "Bebidas"],
      beneficios: ["Entrega rápida", "Retiro en punto", "Seguimiento en tiempo real", "Pago seguro"]
    }
  },
  food_court: {
    label: "Plaza de comidas (multi-marca)",
    tema: { fondo: "#faf7f0", texto: "#1c1c1c", acento1: "#c0392b", acento2: "#1a6d5a", fuente: "Playfair Display" },
    contenido_ejemplo: {
      tagline: "PLAZA DE COMIDAS",
      hero_titulo: "Todo tu antojo en un solo lugar",
      categorias: ["Hamburguesas", "Pizza", "Sushi", "Tacos", "Pollo", "Asados", "Postres", "Helados", "Café", "Bebidas"],
      beneficios: ["Retiro en plaza", "Entrega rápida", "Promos todos los días", "Suma puntos"]
    }
  },
  tacos: {
    label: "Taquería",
    tema: { fondo: "#123528", texto: "#f5efe0", acento1: "#e06a2c", acento2: "#e0b13c", fuente: "Fredoka" },
    contenido_ejemplo: {
      tagline: "TAQUERÍA & STREET FLAVOR",
      hero_titulo: "Tacos que alegran tu antojo",
      categorias: ["Tacos", "Burritos", "Quesadillas", "Nachos", "Birria", "Bowls", "Entradas", "Salsas", "Postres", "Bebidas"],
      beneficios: ["Retiro rápido", "Delivery", "Promos", "Puntos"]
    }
  },
  food_truck: {
    label: "Food Truck",
    tema: { fondo: "#faf3e8", texto: "#1c1c1c", acento1: "#e2521c", acento2: "#1aa39a", fuente: "Anton" },
    contenido_ejemplo: {
      tagline: "FOOD TRUCKS & STREET BITES",
      hero_titulo: "Sabor callejero, hecho para antojos reales",
      categorias: ["Hamburguesas", "Perros", "Salchipapas", "Tacos", "Alitas", "Arepas", "Papas", "Combos", "Postres", "Bebidas"],
      beneficios: ["Envío rápido", "Retiro en punto", "Puntos", "Pago seguro"]
    }
  },
  brunch_waffle: {
    label: "Waffles / Brunch",
    tema: { fondo: "#fbf1e7", texto: "#3a2418", acento1: "#e08a5b", acento2: "#c96b3f", fuente: "Playfair Display" },
    contenido_ejemplo: {
      tagline: "WAFFLERÍA & BRUNCH",
      hero_titulo: "Momentos dulces, recién hechos",
      categorias: ["Waffles", "Pancakes", "Tostadas francesas", "Huevos", "Bowls", "Croissants", "Frutas", "Café", "Jugos", "Bebidas"],
      beneficios: ["Envío rápido", "Retiro en tienda", "Puntos", "Pago seguro"]
    }
  },
  bar_coctel: {
    label: "Bar / Coctelería",
    tema: { fondo: "#0c0c0c", texto: "#f2e6c9", acento1: "#c9a24b", acento2: "#7a8f6b", fuente: "Cormorant Garamond" },
    contenido_ejemplo: {
      tagline: "BUENOS TRAGOS, MEJORES MOMENTOS",
      hero_titulo: "Buenos momentos, mejores bebidas",
      categorias: ["Cócteles", "Sin alcohol", "Cervezas", "Vinos", "Whisky", "Ron", "Aguardiente", "Shots", "Picadas", "Bebidas"],
      beneficios: ["Eventos y reservas", "Happy hour", "Acumula puntos", "Delivery"]
    }
  },
  panaderia: {
    label: "Repostería / Panadería",
    tema: { fondo: "#faf2f5", texto: "#3a2340", acento1: "#8a5aa3", acento2: "#e8a3bb", fuente: "Playfair Display" },
    contenido_ejemplo: {
      tagline: "REPOSTERÍA ARTESANAL",
      hero_titulo: "Hecho con amor, pensado para endulzar tus momentos",
      categorias: ["Panes", "Tortas", "Cheesecakes", "Cupcakes", "Galletas", "Postres en vaso", "Hojaldres", "Croissants", "Café", "Bebidas"],
      beneficios: ["Envíos a domicilio", "Retiro en tienda", "Empaques para regalo", "Pagos seguros"]
    }
  },
  heladeria: {
    label: "Heladería",
    tema: { fondo: "#fdf1ee", texto: "#2b2b2b", acento1: "#e8447b", acento2: "#4ecdc4", fuente: "Baloo 2" },
    contenido_ejemplo: {
      tagline: "HELADERÍA ARTESANAL",
      hero_titulo: "Hecho con amor, para momentos inolvidables",
      categorias: ["Helados", "Conos", "Copas", "Malteadas", "Paletas", "Sundaes", "Waffles", "Toppings", "Postres", "Bebidas"],
      beneficios: ["Envío rápido", "Retiro en tienda", "Acumula puntos", "Pagos seguros"]
    }
  },
  cafeteria: {
    label: "Café de especialidad",
    tema: { fondo: "#faf5ec", texto: "#2b2b2b", acento1: "#b5651d", acento2: "#1f4d3f", fuente: "Playfair Display" },
    contenido_ejemplo: {
      tagline: "CAFÉ DE ESPECIALIDAD",
      hero_titulo: "Disfruta lo simple, disfruta lo extraordinario",
      categorias: ["Cafés calientes", "Cafés fríos", "Espresso", "Filtrados", "Té e infusiones", "Chocolate", "Repostería", "Desayunos", "Sándwiches", "Bebidas"],
      beneficios: ["Envío exprés", "Retiro en tienda", "Granos premium", "Acumula puntos"]
    }
  }
};

export function listaNichos() {
  return Object.entries(NICHOS).map(([id, n]) => ({ id, label: n.label }));
}
