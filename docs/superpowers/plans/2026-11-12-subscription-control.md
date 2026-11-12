# Subscription Control Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. El usuario delegó ejecución directa; no hay preguntas de diseño pendientes.

**Goal:** Convertir la beta en un control privado de suscripciones y pagos recurrentes con evidencia e historial cifrado.

**Architecture:** Mantener importadores y presentación existentes, separar motor puro `site/recurring.js` y bóveda `site/vault.js`. Fijar lectores locales con build reproducible y mantener acceso privado.

**Tech Stack:** JavaScript, WebCrypto, HTML/CSS, Node test, Netlify Functions/Edge.

**Spec:** `docs/superpowers/specs/2026-11-12-subscription-control-design.md`.

## Global Constraints
- Exclusivamente fixtures ficticios en pruebas de navegador, cero extractos o secretos en Git.
- Conservar cuentas/monedas y parsers existentes. Sin cancelaciones externas ni ahorro realizado por inferencia.
- Historial cifrado portable, secreto no persistido; sesión en memoria hasta guardar.
- Lectores con lockfile servidos desde el sitio; producción privada en el proyecto existente.

## Review Focus
- Dos cargos legítimos iguales el mismo día: preservar multiplicidad, deduplicar solapamientos.
- Dos servicios del mismo intermediario: no fusionar importes diferentes en una sola suscripción.
- Enero 31/febrero y extractos faltantes: cadencia y confianza conservadoras.
- Bóveda manipulada/sobredimensionada: rechazo antes de reemplazar sesión, sin polución de prototipos.
- Error de lectura/OCR: mensaje y salida, sin truncamiento ni importaciones simultáneas.

## Task 1: Motor e identidad de importaciones
Files: `site/recurring.js`, `tests/recurring.test.mjs`.
Interfaces: `GIRecurring.analyze(records, decisions) -> candidates[]`; `mergeTransactions(existing,incoming) -> {transactions,added,duplicates}`.
- [ ] Escribir pruebas de alias, calendario, compras, intermediarios, cambios de precio, moneda/cuenta, créditos y bajas.
- [ ] Ver fallos. Implementar normalización/cadencias/evidencia/duplicados.
- [ ] Ejecutar suite, registrar resultado y commit.

## Task 2: Historial cifrado
Files: `site/vault.js`, `tests/vault.test.mjs`.
Interfaces: `GIVault.seal(payload,password) -> envelope`, `open(envelope,password) -> validatedPayload`, `validate(payload)`.
- [ ] Pruebas de ida/vuelta, clave equivocada, manipulación, versión/límites/atributos peligrosos.
- [ ] Ver fallos. Implementar WebCrypto y validación de listas/campos permitidos.
- [ ] Ejecutar suite y commit.

## Task 3: Lectores locales e integración de producto
Files: `package.json`, lockfile, `tools/vendor.mjs`, `site/app.js`, `site/index.html`, `site/styles.css`, `netlify.toml`, `.gitignore`, tests de integración y fixtures ficticios.
Interfaces: consumir motor y bóveda; `ensureReaders()` inicializa PDF/Excel/OCR locales.
- [ ] Fijar versiones y copiar solo distribución/licencias/modelos al build, nunca node_modules al sitio.
- [ ] Integrar resultados, revisión, movimientos, filtros, evidencia, decisiones, próximas fechas y subidas.
- [ ] Integrar exportar/abrir archivo cifrado y CSV, manteniendo contraseña solo durante operación.
- [ ] Cubrir límites, errores/concurrencia, copia de seguridad y deduplicación con pruebas; suite completa y build.
- [ ] Pruebas Chrome con datos ficticios, revisión independiente del diff completo, correcciones importantes con RED→GREEN.

## Task 4: Entrega privada
Files: `AGENTS.md`, `README.md`, registro de verificación.
- [ ] Documentar arquitectura/criterios/límites/verificación.
- [ ] Verificar remoto actual y diff, commit limpio, publicar solo el commit guardado remoto al mismo proyecto.
- [ ] Confirmar versión Netlify, acceso privado, flujo de suscripciones y fixtures desde HTTPS; registrar hechos y pendientes.
