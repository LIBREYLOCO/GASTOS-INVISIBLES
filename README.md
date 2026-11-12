# Gastos invisibles — control de suscripciones

Reingeniería de la beta privada: identifica suscripciones y pagos recurrentes a partir de estados importados, con evidencia por cargo y revisión humana. Sin conexión bancaria ni solicitudes de baja automáticas.

## Comportamiento

- PDF con texto, CSV, Excel y OCR de PDF escaneado; vista previa completa antes de confirmar.
- Fechas con mes escrito y columnas cargo/abono/saldo en los formatos adaptados. Los abonos y saldos no se suman como gasto.
- Proveedores conocidos, pagos periódicos desconocidos, cadencias de calendario, separación por cuenta y moneda, candidatos con un solo cargo sin proyección anual.
- Historial de cargos, aumentos, fechas estimadas y seguimiento de bajas con aviso de cobros posteriores. La detección no acredita contratos vigentes ni ahorro realizado.
- Reimportación por multiplicidad: conserva cargos iguales legítimos y evita añadirlos de nuevo al cargar otro archivo.
- Bóveda portable `.gi-vault`: AES-256-GCM, PBKDF2-SHA256 (310 000 iteraciones), sal e IV aleatorios. Guardar/abrir explícitamente con frase propia (mínimo14 caracteres). No hay recuperación de frase ni sincronización automática. Sin copia, cerrar/recargar pierde el historial.
- Lectores e idiomas empaquetados con versiones exactas; documentos procesados en el navegador. El CSV de hallazgos se exporta sin cifrar.

## Desarrollo y pruebas

Node24+. `npm ci --ignore-scripts`, `npm run build`, `npm run dev` (http://127.0.0.1:8743). Directorio vigente: `site/`; prototipo histórico de raíz no publicado. El build genera `site/vendor/` con manifiesto de versiones y SHA256 y ejecuta pruebas/sintaxis. No subir `node_modules`, bóvedas, estados reales ni secretos.

Pruebas automatizadas: cadencias, cuentas/monedas, intermediarios, compras no recurrentes, subida de precio, bajas, duplicados, parsing bancario y OCR, política de red, cifrado y rechazo de claves/archivos manipulados.

Comprobación local Chrome del12/11/2026, rama `reengineer/subscription-control`: CSV ficticio10movimientos9cargos3suscripciones,575,76EUR/año; PDF meses3movimientos2cargos; PDF columnas4movimientos2cargos (sin saldos); PDF exclusivamente imagen10movimientos9cargos, reimportación0nuevos9duplicados; baja ficticia Netflix genera alerta por cargo posterior. No se usaron documentos reales en navegador.

PDF mixto con páginas sin texto se rechaza explícitamente. Las páginas sin movimientos reconocidos generan advertencia que requiere revisión y aceptación; no asumir que se han analizado por completo.

Límites: 15MB/archivo,80páginasPDFtexto,20páginasOCR,20 000cargos/bóveda. Escaneos de mala calidad y otros formatos requieren validación; la adaptación de PDF con texto no acredita su equivalente escaneado. Safari/iPhone real y auditoría de seguridad integral pendientes. No declarar aptitud universal para datos confidenciales.

## Publicación

Destino exclusivo: https://gastos-invisibles-beta.netlify.app — Netlify `gastos-invisibles-beta`, ID `71422b3f-e43c-47ce-862f-10c8706cb594`; repositorio `LIBREYLOCO/GASTOS-INVISIBLES`, rama `main`. Conservar producción y previews privados. Las credenciales se configuran en Netlify, nunca en Git/chat.

Antes de esta reingeniería, Netlify confirmó publicado `6640e850d9f43dba617b6e3a080e5e14da8109c4`. Consultar el registro de verificación de la entrega para la nueva versión; un test local no prueba producción.
