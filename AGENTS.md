# Gastos invisibles

Aplicación vigente: `site/`, HTML/CSS/JS sin framework. Los archivos en raíz son prototipo histórico y no se publican. Netlify publica exclusivamente `site`, protegido por `netlify/edge-functions/guard.js` y `netlify/functions/auth.mjs`. No cambiar otros proyectos ni ampliar acceso.

- Lectura y revisión de importación: `site/app.js`.
- Motor puro de recurrencias y duplicados: `site/recurring.js`.
- Interfaz y seguimiento: `site/product.js`, `site/index.html`, `site/styles.css`.
- Bóveda portable cifrada: `site/vault.js`. No guardar claves, estados reales ni movimientos en Git o servidores.
- Dependencias exactas: `package-lock.json`; `tools/vendor.mjs` empaqueta lectores e idiomas en `site/vendor` (generado, ignorado). No CDN en ejecución.
- Decisiones: `docs/superpowers/specs/2026-11-12-subscription-control-design.md`.
- `npm ci --ignore-scripts`, `npm run build`, `npm run dev`. Node24+. `npm test` para regresiones.
- Validar en Chrome con archivos ficticios: importación, signos, deduplicación, evidencia y alertas. Separar pruebas locales y producción. No afirmar compatibilidad con todos los estados ni ahorro/cancelación real por una decisión de la interfaz.
