# SDD ledger — plan: docs/superpowers/plans/2026-11-12-subscription-control.md

Base: 6640e85, rama reengineer/subscription-control, copia existente limpia en /private/tmp/gi-formatos-fix-20261112.
Ruling: ejecutar en esta copia aislada existente y rama nueva, sin crear otro worktree — reutilización indicada por instrucciones; no hay trabajo ajeno en ella.
Ruling: el usuario «Hazlo tú» delega elecciones y ejecución — usar el enfoque de motor separado y bóveda portable descrito en spec, sin otra ronda de preguntas.
Pre-flight: Task 1 produce candidatos y decisiones para Task 3; Task 2 valida el mismo esquema transactions/decisions/imports que consume Task 3. La sesión original guarda importes positivos para cargos, y esa convención se mantiene.
Ruling: el archivo cifrado portable conserva el historial sin introducir custodia de movimientos en un backend; requiere guardar/abrir explícitamente y no promete sincronización entre dispositivos.

Task 1: complete. 13 nuevas pruebas RED→GREEN, 23 totales verdes. Motor puro y deduplicación por multiplicidad. Cadencia usa día mediano para evitar desplazar una renovación por un fin de semana; fin de mes validado.
