# Menú Digital — Fenlora (plantilla multitenant)

Menú digital **multitenant** para restaurantes, bares y cafés. Un solo
código sirve a todos los negocios: cada uno tiene su propio slug, tema,
productos y configuración. No es un sitio estático ni Cloudflare Pages:
es un **Cloudflare Worker** que sirve las páginas y la API, con base de
datos en **D1** e imágenes en **R2**.

> Nota histórica: este proyecto arrancó desde una plantilla que se
> llamaba "FREEZE". Ese **no** es el nombre del proyecto; si aparece la
> palabra "FREEZE" en algún archivo, es un residuo y debe cambiarse.

## Arquitectura

- **Backend real:** `src/worker.js` — es el único que se usa
  (`wrangler.toml` apunta ahí con `main = "src/worker.js"`). Si aparece un
  `worker.js` suelto fuera de `src/`, es sobrante y hay que borrarlo.
- **Nichos preset:** `src/niches.js` — 11 rubros (granizados, sushi,
  comida rápida, food court, tacos, food truck, waffles/brunch,
  bar/coctelería, panadería, heladería, cafetería), cada uno con su tema
  (colores + tipografía) y contenido de ejemplo.
- **Base de datos (D1 `fenlora-menus`):** tablas `tenants`, `productos`,
  `pedidos`, `config`, `visitas`. Las migraciones están en los `schema*.sql`
  (fase 1, 3, 4 y 6) y se ejecutan **una sola vez** cada una sobre D1.
- **Imágenes (R2 `fenlora-menus-digitales`):** logos y fotos de producto,
  servidas por la URL pública del bucket.

## Estructura de archivos

```
/
├── src/
│   ├── worker.js        # backend real (router + API + páginas públicas)
│   └── niches.js        # catálogo de nichos preset
├── negocio.html         # plantilla del home, UNA sola para todos los negocios
├── menu.html            # página de menú completo
├── checkout.html        # página de checkout
├── carrito.js           # lógica del carrito
├── admin/
│   └── index.html       # panel de administración
├── schema.sql           # migración fase 1 (tenants, visitas)
├── schema-fase3.sql     # migración fase 3 (productos)
├── schema-fase4.sql     # migración fase 4 (pedidos, pago)
├── schema-fase6.sql     # migración fase 6 (cobranza, config)
├── wrangler.toml        # config del Worker (D1, R2, assets)
└── .assetsignore        # qué NO se publica como asset público
```

## Rutas

- `/` → redirige a `/admin` (panel, protegido por Cloudflare Access).
- `/<slug>` → home del negocio.
- `/<slug>/menu` → menú completo.
- `/<slug>/checkout` → checkout.
- `/admin/api/...` → API del panel (negocios, productos, pedidos, cobranza,
  métricas, subida de imágenes).
- `/menu/<slug>` y `/menu/<slug>/pedido` → API pública del menú.

## Los dos tipos de menú

El proyecto contempla **dos modalidades** del menú, según cómo maneja el
negocio sus productos:

### 1. Menú autónomo (independiente)

- Los productos, precios y todo el contenido se crean y editan **desde el
  panel de este proyecto** — como funciona hoy.
- Ideal para negocios que **ya tienen su propio POS** y solo quieren el
  menú digital como vitrina.
- Incluye el **botón de menú hamburguesa** con la información del negocio
  (ubicación y horarios con mapa de Google, métodos de pago, sobre
  nosotros, ayuda y soporte).

### 2. Menú enlazado al POS (por API)

- Se **alimenta por API** del sistema POS propio de Fenlora (proyecto
  aparte, en desarrollo): los **productos y precios vienen del POS**, no se
  editan a mano aquí.
- Incluye el **botón "Llamar al mesero"** y **no** lleva menú hamburguesa.
- Cada **mesa tiene su propio QR y su propio NFC**; los pedidos y las
  llamadas al mesero quedan etiquetados por mesa.
- La conexión es **por API, no fusionando bases de datos**: cada proyecto
  (menú y POS) sigue siendo independiente, se despliega y corrige por
  separado, y solo comparten datos a través de un endpoint autenticado.

El modo de cada negocio ya se elige en el panel (Datos → "¿Cómo se usa
este menú?": Ambos / Solo en el local / Solo a domicilio). La alimentación
por API y el sistema de mesas (QR + NFC) están **pendientes de construir**.

## Flujo para subir cambios (SIEMPRE los dos pasos)

```powershell
git add .
git commit -m "mensaje"
git push
npx wrangler deploy
```

`git push` **solo respalda** el código en GitHub. `npx wrangler deploy` es
el que **publica de verdad** en Cloudflare. Los dos son obligatorios cada
vez que cambie algo que se sirve (por ejemplo `negocio.html`, `admin/`,
`src/`). Comandos siempre en **PowerShell** (Windows).

> Archivos que **no** se publican (ver `.assetsignore`): `.git/`,
> `.wrangler/`, `node_modules/`, `mnt/`, los `*.sql`, los `README*.md` y
> `wrangler.toml`. Cualquier archivo que **no** esté en `.assetsignore` se
> sube como asset público.

## Migraciones de base de datos

Los `schema*.sql` van **directo a D1**, no a git como parte del sitio. Se
ejecutan una sola vez cada uno (por ejemplo con
`npx wrangler d1 execute fenlora-menus --file=schema-faseX.sql`).

## Datos de la cuenta

- **Cuenta Cloudflare:** Fenlorastudiovisual@gmail.com
- **Dominio:** `menudigital.fenloravisual.com`
- **Repo:** `fenlorastudiovisual-pixel/fenlora-menu-digital`
- **D1:** `fenlora-menus` · **R2:** `fenlora-menus-digitales`

## Reglas que no hay que romper

- Nunca renombrar `negocio.html` a `index.html` (causaba conflictos con el
  admin).
- El código real está **solo** en `src/worker.js`.
- Verificar con `findstr /C:"texto único del cambio" archivo` antes de cada
  deploy.
- Comandos siempre en PowerShell, no bash.
