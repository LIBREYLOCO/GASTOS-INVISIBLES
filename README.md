# Gastos invisibles - Beta web local v0.2

App web (PWA) para iPhone y navegadores. Detecta pagos recurrentes de estados de cuenta PDF con texto, Excel XLS/XLSX y CSV, sin conectar bancos ni enviar los archivos a un backend.

## Como desplegar en Netlify

1. En Netlify: Add new project > Import an existing project > GitHub.
2. Selecciona `LIBREYLOCO/GASTOS-INVISIBLES`.
3. Build command: vacio. Publish directory: `.` (raiz).
4. Deploy. Abre la URL HTTPS resultante desde Safari iPhone y utiliza Compartir > Anadir a pantalla de inicio.

**No se ha conectado ni desplegado desde esta sesion de ChatGPT.** La URL debera verificarse tras la publicacion.

## Privacidad y limites

- Se usan JavaScript y librerias de terceros servidas desde cdnjs y jsdelivr; no transmitimos los archivos bancarios deliberadamente, pero hay un riesgo de cadena de suministro por dependencias CDN. Para datos financieros reales, recomendamos empaquetar y auditar dependencias localmente antes de la distribucion comercial.
- Los movimientos permanecen solo en memoria; recargar la pagina borra los resultados. No usar como archivo permanente ni subir datos no autorizados.
- PDF escaneado sin texto no soportado en esta version de navegador (la beta Python v0.1 si admitia OCR).
- El sistema no cancela suscripciones: presenta enlaces de ayuda para ciertos proveedores y seguimiento manual.
- No hay cuentas ni sincronizacion Supabase. Se necesita un proyecto Supabase separado y politicas RLS validadas para activar persistencia y autenticacion comercial.
- Esta beta no tiene controles multiusuario ni acceso restringido por cuenta: es un cliente estatico local, por tanto quien conozca el sitio puede abrirlo, pero no leer sesiones de otros usuarios.
- Para producir un sistema comercial debe completarse evaluacion de privacidad, validacion de formatos reales, pruebas de seguridad, SRI o empaquetado de librerias, y pruebas en iPhone real.

## Desarrollo local

`python3 -m http.server 8080` y abre `http://localhost:8080`.

## Pruebas

Importa `ejemplo.csv` con `signo: Cargos negativos` y comprueba Netflix/ChatGPT/Spotify. No hay datos reales.