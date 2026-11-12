# Gastos invisibles - Beta privada para Netlify

Aplicación PWA de prueba para detectar pagos recurrentes en estados de cuenta PDF con texto, PDF escaneados (OCR), XLSX, XLS y CSV. La interfaz está pensada para navegador y iPhone.

## Estado comprobado

- Código alojado en GitHub.
- Login y control de sesiones implementados mediante Netlify Function y Edge Function; 7 pruebas locales de autenticación superadas.
- Importador OCR y pruebas de interpretación con texto ficticio; el OCR completo con PDF escaneados y iPhone físico sigue pendiente de validación.
- No hay URL Netlify verificada ni despliegue completado desde el asistente.
- No hay Supabase asociado. Las transacciones permanecen en memoria del navegador.

## Despliegue con enlace HTTPS temporal

1. En https://app.netlify.com/start elige **Import an existing project** > **GitHub**.
2. Selecciona `LIBREYLOCO/GASTOS-INVISIBLES` y rama `main`.
3. Netlify debe tomar la configuración de `netlify.toml`:
   - Directorio publicado: `site`.
   - Compilación: validación de sintaxis JS.
   - Netlify Function: `/auth`.
   - Netlify Edge Function: `guard` con ruta `/*`.
4. Antes de lanzar la beta, configura en **Site configuration > Environment variables** para funciones y Edge Functions:
   - `GI_DEMO_EMAIL`: correo de prueba autorizado.
   - `GI_DEMO_PASSWORD`: contraseña **nueva y exclusiva** de al menos 14 caracteres. No utilices contraseñas compartidas en conversaciones ni reutilizadas.
   - `GI_SESSION_SECRET`: valor secreto aleatorio de al menos 32 caracteres (se recomienda 64). Guárdalo solo en las variables privadas de Netlify.
5. Si Netlify ofrece protección adicional de **visibilidad privada / acceso restringido**, actívala y revisa los permisos sobre sitios de producción y vistas previas.
6. Ejecuta el deploy y copia la dirección temporal HTTPS, aún sin dominio propio.
7. Comprueba el aislamiento: sin sesión la raíz y `/app.js` deben redirigir a `/login.html`; credenciales incorrectas deben fallar; salir debe invalidar la cookie. Si faltan variables, debe mostrarse error 503, **no una aplicación abierta**.
8. Sube únicamente `site/ejemplo.csv` y documentos bancarios inventados. Revisa la detección de recurrencias y las fechas/importes.

**No utilices todavía PDF bancarios reales.** La versión web actual carga herramientas JavaScript PDF/Excel/OCR desde CDN externos; su integridad, las solicitudes de red, el OCR completo, la seguridad y la privacidad aún requieren validación. Los resultados del OCR son orientativos y requieren revisión humana. No se solicita el acceso a bancos ni se cancelan servicios automáticamente.

## Privacidad y limitaciones

- Los estados de cuenta se analizan en el dispositivo: no hay backend de almacenamiento de movimientos ni una cuenta Supabase conectada.
- La aplicación puede necesitar descargar desde redes externas bibliotecas de lectura y archivos de idiomas OCR. Es un riesgo de cadena de suministro pendiente de auditoría.
- Se limita el procesamiento OCR a 20 páginas por documento para evitar resultados parciales. Los PDF de algunos bancos pueden requerir adaptaciones de columnas.
- Los movimientos quedan en memoria y desaparecen al cerrar o recargar la aplicación. Exporta el CSV antes de cerrar si necesitas conservar los hallazgos.
- El ahorro potencial no equivale a una cancelación confirmada.
- Solo se ha verificado la lógica básica localmente; hace falta probar la URL desplegada desde Chrome, Safari iPhone y un PDF escaneado ficticio.

## Desarrollo y pruebas de acceso

Desde una copia del repositorio, con Node.js:

```bash
node --check site/app.js
node --check site/login.js
node --check netlify/functions/auth.mjs
node --check netlify/edge-functions/guard.js
```

Los tests de autenticación se pueden ejecutar con `node --test` si se incorpora el archivo de pruebas.
