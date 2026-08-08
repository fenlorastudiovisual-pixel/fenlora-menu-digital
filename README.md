# Menú Digital — FREEZE (plantilla multitenant)

Sitio estático (HTML/CSS/JS puro, sin build) pensado para desplegarse en
**Cloudflare Pages**, con las imágenes (logo, fotos de producto) servidas
desde **Cloudflare R2**.

## Estructura

```
/
├── index.html        # el menú completo (single-file: CSS y JS inline)
├── assets/
│   └── logo.png       # logo de respaldo local (fallback si R2 falla)
└── README.md
```

## Configuración del logo (multitenant)

Dentro de `index.html`, al final, hay un bloque:

```js
const TENANT_CONFIG = {
  logoUrl: "assets/logo.png"
};
```

Cambia `logoUrl` por la URL pública de R2 (o de un futuro endpoint del
admin) y se actualiza el logo en el header y en el drawer al mismo tiempo.

## Despliegue — ver instrucciones paso a paso en la conversación con Claude,
o resumen rápido:

1. `git init && git add . && git commit -m "menu inicial"`
2. Crear repo en GitHub y hacer `git push`
3. `npx wrangler login`
4. `npx wrangler r2 bucket create freeze-assets`
5. Subir `assets/logo.png` al bucket y activar acceso público
6. Reemplazar `logoUrl` en `index.html` por la URL pública de R2
7. Conectar el repo en Cloudflare Pages (Workers & Pages → Create → Pages)
8. Agregar el dominio propio en el proyecto de Pages
