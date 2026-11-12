# Gastos invisibles - Beta privada

Beta web para detectar pagos recurrentes de archivos PDF con texto, PDF escaneados mediante OCR, Excel XLS/XLSX y CSV. El análisis se realiza en memoria en el dispositivo; no hay conexión bancaria ni persistencia de movimientos.

## Publicación verificada el 12 de noviembre de 2026

- URL: https://gastos-invisibles-beta.netlify.app
- Proyecto Netlify: `gastos-invisibles-beta`.
- Project ID: `71422b3f-e43c-47ce-862f-10c8706cb594`.
- Repositorio: `LIBREYLOCO/GASTOS-INVISIBLES`, rama `main`.
- Producción y Deploy Previews: **Private**, con acceso mediante la cuenta del equipo Netlify.
- Una solicitud sin autenticación a la raíz devolvió HTTP 401. Chrome con la sesión del propietario abrió la aplicación.
- El primer build se bloqueó deliberadamente antes de configurar la privacidad; después se publicó con comprobación de sintaxis `node --check app.js`.
- No se modificaron otros proyectos ni se utilizaron datos bancarios reales.

## Pruebas con datos ficticios

En Importar están disponibles archivos ficticios CSV, XLSX y PDF con los mismos movimientos. Usar EUR y cargos negativos.

Los tres archivos pasaron las pruebas automatizadas de lectura y detección usando las funciones de `app.js` y los lectores correspondientes. Resultado por archivo: 10 movimientos leídos, 9 cargos, 3 recurrencias (Netflix, ChatGPT y Spotify), proyección de 575,76 EUR/año. El CSV también pasó la comprobación de duplicados y de escape de HTML. El PDF de prueba contiene texto; no es un escaneo.

La prueba automatizada de PDF se ejecutó con el worker local equivalente a la misma versión de la dependencia. Estas pruebas no sustituyen las pruebas del selector de archivos y worker servido por HTTPS en cada navegador.

Verificación posterior del 12 de noviembre de 2026: en Chrome, sobre la URL HTTPS privada, el CSV y el PDF con texto pasaron el selector, vista previa y confirmación de importación con 10 movimientos, 9 cargos y 3 recurrencias.

Corrección OCR publicada en `d139c97c594dedd3bba3376afb19496c8be4e831`: la CSP bloqueaba tanto la compilación WebAssembly como la lectura de los bytes WASM embebidos de Tesseract. Se permite únicamente `wasm-unsafe-eval` en `script-src` y `data:` en `connect-src`; siguen bloqueados JavaScript eval, scripts inline y hosts de conexión arbitrarios. Las cinco pruebas de `node --test` pasan y se ejecutan en cada build.

En esa versión desplegada se verificó dos veces en Chrome un PDF ficticio de una página compuesto exclusivamente por imagen, sin texto extraíble. El OCR reconoció correctamente sus 10 fechas, conceptos e importes; al confirmar incorporó los 9 cargos y detectó Netflix, ChatGPT y Spotify, con 575,76 EUR/año. También se comprobó desde una sesión independiente que Netlify mantiene el sitio privado. Esto no valida todos los formatos bancarios, documentos malformados o escaneos de baja calidad. No se usaron extractos reales en estas pruebas.

**Safari en iPhone real: pendiente.** No había un iPhone/Safari conectado. Una ventana estrecha de Chrome no equivale a Safari de iPhone.

## Restricciones de seguridad

### Adaptación de formatos del 12 de noviembre de 2026

El lector de texto PDF también reconoce fechas con mes escrito (`25 de Junio`) y fechas abreviadas sin año (`03/SEP`). El año se obtiene del período explícito del documento; no se adivina a partir de la fecha actual. En tablas de cargos, abonos y dos saldos se usa la posición de cada columna para separar débitos y créditos, sin importar los saldos como movimientos. En los estados de importe único se reconoce la marca `CR`, incluso en la línea inmediatamente siguiente.

Se añadieron cinco pruebas de regresión con datos inventados para estos formatos, créditos, períodos entre diciembre y enero y rechazo de fechas fuera del período o sin año verificable. La lectura del PDF con texto utiliza esa estructura antes de recurrir al OCR. Los escaneos y otros diseños de tablas requieren su propia validación; esta adaptación no demuestra que todos los formatos bancarios estén cubiertos. Los documentos bancarios proporcionados se inspeccionan localmente y no se incorporan al repositorio ni a los fixtures públicos.

**Usar exclusivamente datos ficticios hasta completar la revisión de seguridad.** Los lectores PDF.js 3.11.174 y SheetJS 0.18.5 se cargan desde CDN externos. Todavía deben revisarse/actualizarse y empaquetarse las dependencias, verificarse los encabezados de seguridad efectivos y completarse pruebas de archivos malformados y de Safari real. No se ha completado una auditoría de seguridad y esta publicación no acredita aptitud para documentos bancarios reales.

El repositorio de código conserva su visibilidad pública existente; la aplicación alojada y sus vistas previas están restringidas por Netlify. Nunca guardar archivos reales, secretos o credenciales en este repositorio.

Los resultados se pierden al recargar. Los PDF escaneados se procesan mediante OCR, con un máximo de 20 páginas por documento y revisión humana de fechas, signos e importes. La detección es orientativa. Los enlaces de baja ayudan a acudir al proveedor; la app no cancela suscripciones automáticamente.

## Desarrollo

`python3 -m http.server 8080`

Netlify publica el directorio `site` con la Function `/auth` y la Edge Function `guard`. El build ejecuta `node --test` y las comprobaciones de sintaxis de la aplicación y las funciones. Conservar la privacidad tanto de producción como de previews y no usar Make public para esta beta.
