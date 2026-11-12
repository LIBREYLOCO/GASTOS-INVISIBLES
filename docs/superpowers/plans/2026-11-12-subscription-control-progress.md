# SDD ledger — plan: docs/superpowers/plans/2026-11-12-subscription-control.md

Base: 6640e85, rama reengineer/subscription-control, copia existente limpia en /private/tmp/gi-formatos-fix-20261112.
Ruling: ejecutar en esta copia aislada existente y rama nueva, sin crear otro worktree — reutilización indicada por instrucciones; no hay trabajo ajeno en ella.
Ruling: el usuario «Hazlo tú» delega elecciones y ejecución — usar el enfoque de motor separado y bóveda portable descrito en spec, sin otra ronda de preguntas.
Pre-flight: Task 1 produce candidatos y decisiones para Task 3; Task 2 valida el mismo esquema transactions/decisions/imports que consume Task 3. La sesión original guarda importes positivos para cargos, y esa convención se mantiene.
Ruling: el archivo cifrado portable conserva el historial sin introducir custodia de movimientos en un backend; requiere guardar/abrir explícitamente y no promete sincronización entre dispositivos.

Task 1: complete. 13 nuevas pruebas RED→GREEN, 23 totales verdes. Motor puro y deduplicación por multiplicidad. Cadencia usa día mediano para evitar desplazar una renovación por un fin de semana; fin de mes validado.

Task 2: complete. 6 pruebas de cifrado/validación añadidas, 29 totales verdes. Formato portable validado y parámetros KDF fijos.
Task 3: implementado. Chrome local: ambos PDF texto y OCR imagen pasan; se corrigió cierre PDF6 mediante PDFDocumentLoadingTask.destroy. CSV y alerta tras baja pasan, reimportación OCR0nuevos9duplicados. Readers mismaorigen214archivos. No se introducen datos originales en navegador/Git. Prototipo raíz histórico conservado, pruebas apuntan al `site` publicado.
Task 4: revisión independiente en curso; publicación pendiente de revisión y build final. Fuente local, cambios pendientes incluidos; producción aún6640e85.

Revisión final independiente: encontró pérdida de decisión al separar series, infraestimación por multiplicidad y lectura parcial PDF. Corregidos con regresiones RED→GREEN: anclaje a cargo conservado en bóveda, suma por fecha y advertencia explícita con aceptación obligatoria de páginas sin filas. 35/35 pruebas y build verdes. Historial cifrado ficticio restaurado en Chrome con su alerta tras baja.
