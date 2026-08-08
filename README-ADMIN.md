# Fenlora Admin — Fase 1

Esta carpeta se copia **dentro de tu proyecto `fenlora-menu-digital` ya existente**,
en la raíz (junto a tu `index.html` actual). No reemplaza nada de lo que ya tienes.

```
fenlora-menu-digital/
├── index.html              # (ya existe, no se toca en esta fase)
├── assets/logo.png         # (ya existe)
├── admin/
│   └── index.html          # <- nuevo: panel de administración
├── functions/
│   ├── _niches.js          # <- nuevo: catálogo de nichos preset
│   ├── admin/api/
│   │   ├── nichos.js
│   │   └── tenants/
│   │       ├── index.js
│   │       └── [id].js
│   └── menu/[slug].js      # <- nuevo: config pública por negocio (para Fase 2)
└── schema.sql               # <- nuevo: estructura de la base de datos
```

## 1. Crear la base de datos D1

En la terminal de VS Code, dentro de tu carpeta del proyecto:

```
npx wrangler d1 create fenlora-menus
```

Esto te va a mostrar un bloque como:

```
[[d1_databases]]
binding = "DB"
database_name = "fenlora-menus"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

Copia ese `database_id`, lo vas a necesitar en el paso 3.

## 2. Cargar el esquema (crear las tablas)

```
npx wrangler d1 execute fenlora-menus --remote --file=./schema.sql
```

## 3. Conectar la base de datos a tu proyecto de Pages

Dashboard de Cloudflare → **Workers & Pages** → tu proyecto → **Settings** →
**Functions** → **D1 database bindings** → **Add binding**:

- Variable name: `DB`
- D1 database: `fenlora-menus`

Guarda. (Esto también se puede hacer en un archivo `wrangler.toml`, pero por
ahora el dashboard es más simple porque ya estás desplegando por Git.)

## 4. Subir los archivos nuevos

```
git add .
git commit -m "admin: fase 1 (login, D1, crear negocios por nicho)"
git push
```

Cloudflare Pages redepliega solo al hacer push (ya lo tienes conectado a Git).

## 5. Proteger /admin con Cloudflare Access (login por código al correo)

Esto es exactamente el mecanismo que ya usas para otras cosas:

1. Dashboard de Cloudflare → **Zero Trust** → **Access** → **Applications** →
   **Add an application** → **Self-hosted**.
2. Nombre: `Fenlora Admin`.
3. Domain: tu dominio + path `/admin*` (ej: `menudigital.fenloravisual.com/admin*`).
   Importante: el path debe cubrir también `/admin/api/*`, para que la API
   quede protegida igual que la pantalla.
4. Session duration: la que prefieras (ej. 24h).
5. En la política (**Policy**): Action = **Allow**, Include = **Emails** →
   agrega tu correo (y el de quien más deba entrar).
6. Authentication method: deja **One-time PIN** (código al correo) — es el
   que ya conoces: abres el link, pones tu correo, te llega un código, lo
   pegas y entras.
7. Guardar.

Desde ese momento, entrar a `tudominio.com/admin` te va a pedir el correo y
el código antes de mostrar nada — nadie más puede llegar a la pantalla ni a
la API sin pasar por ahí.

## 6. Probar

- Entra a `tudominio.com/admin` → deberías ver el login de Access → panel vacío.
- Crea un negocio de prueba eligiendo un nicho (ej. "Sushi Bar").
- Debería aparecer en la tabla con su link `/menu/<slug>`. Ese link **todavía
  no muestra nada real** — el menú dinámico que lee esa config es la Fase 2.

## Qué NO se tocó

- Tu `index.html` de Cero Absoluto sigue funcionando exactamente igual que
  hoy, con sus datos quemados. La Fase 2 es justamente convertirlo en la
  plantilla dinámica que lee `/menu/cero-absoluto` en vez de tener el texto
  fijo adentro — y ahí Cero Absoluto pasa a ser un tenant real en la base de
  datos, con su nicho `granizados`.

## Siguiente paso

Cuando confirmes que el login y la creación de negocios funcionan, seguimos
con la **Fase 2** (menú dinámico) para que Cero Absoluto ya viva de la base
de datos y el link `/menu/cero-absoluto` muestre su menú real.
