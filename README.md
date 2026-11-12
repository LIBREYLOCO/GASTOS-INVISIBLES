# Gastos invisibles - Beta privada

Beta web para detectar pagos recurrentes de archivos PDF con texto, Excel XLS/XLSX y CSV. El análisis se realiza en memoria en el dispositivo; no hay conexión bancaria ni persistencia de movimientos.

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

Chrome conectado: carga HTTPS y navegación verificadas; viewport de 390 x 844, ancho del documento 390, sin desbordamiento horizontal en Importar. La prueba de descarga y selección de archivos quedó interrumpida y después se perdió acceso al navegador. No se afirma validación completa de importación en Chrome.

**Safari en iPhone real: pendiente.** No había un iPhone/Safari conectado. Una ventana estrecha de Chrome no equivale a Safari de iPhone.

## Restricciones de seguridad

**Usar exclusivamente datos ficticios hasta completar la revisión de seguridad.** Los lectores PDF.js 3.11.174 y SheetJS 0.18.5 se cargan desde CDN externos. Todavía deben revisarse/actualizarse y empaquetarse las dependencias, verificarse los encabezados de seguridad efectivos y completarse pruebas de archivos malformados y de Safari real. No se ha completado una auditoría de seguridad y esta publicación no acredita aptitud para documentos bancarios reales.

El repositorio de código conserva su visibilidad pública existente; la aplicación alojada y sus vistas previas están restringidas por Netlify. Nunca guardar archivos reales, secretos o credenciales en este repositorio.

Los resultados se pierden al recargar. Los PDF escaneados sin texto no admiten OCR. La detección es orientativa. Los enlaces de baja ayudan a acudir al proveedor; la app no cancela suscripciones automáticamente.

## Desarrollo

`python3 -m http.server 8080`

Publicación estática desde la raíz; Netlify ejecuta `node --check app.js`. Conservar la privacidad tanto de producción como de previews y no usar Make public para esta beta.
