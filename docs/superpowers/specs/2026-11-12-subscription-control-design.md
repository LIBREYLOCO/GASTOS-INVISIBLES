# Gastos invisibles: control de suscripciones

Fecha: 2026-11-12. Base observada: GitHub/local `6640e850d9f43dba617b6e3a080e5e14da8109c4`. Usuario delega la reingeniería y ejecución.

## Resultado
Importar estados de cuenta, revisar lectura, obtener suscripciones y otros pagos recurrentes con evidencia, detectar cambios de precio, decidir qué conservar/investigar/cancelar y comprobar cobros posteriores a una baja. Mantener MXN/EUR separados, cuentas separadas y posibilidades de ahorro distintas de ahorro realizado.

## Enfoque elegido por el implementador
Conservar HTML/CSS/JS y Netlify privado. Alternativas: parchear el detector actual (insuficiente para falsos positivos e historial), trasladar todo a un backend (más superficie y custodia de datos), o separar un motor puro, lectores locales y archivo cifrado portable. Se adopta la tercera: los originales y las contraseñas no se guardan ni envían a servicios de análisis.

## Contratos
- Detector puro: normalización de proveedores, cadencias de calendario, evidencia mínima, tiendas/compras repetidas fuera de suscripciones, etiquetas de incertidumbre y señales de precio. Una marca conocida con un solo cargo es candidata, nunca una suscripción demostrada. Los meses sin extractos no prueban cancelación.
- Identidad estable por proveedor/cuenta/moneda/serie. Misma fecha/importe dentro de un archivo puede representar dos cargos reales; la reimportación se deduplica conservando multiplicidad.
- Importación: conservar parsers existentes, errores visibles, bloqueo de importaciones simultáneas, documentos con límites completos (no truncar páginas silenciosamente). Vista previa muestra cargos y abonos y procedencia. Usuario confirma antes de incorporar cargos.
- Seguimiento: investigar/conservar/no recurrente/solicité baja/baja confirmada. Guardar fecha de la baja, detectar nuevos cargos posteriores; nunca enviar cancelaciones ni afirmar ahorro realizado sin evidencia.
- Historial: archivo local `.gi-vault`, AES-GCM con clave derivada de frase de al menos 14 caracteres mediante PBKDF2 SHA-256, 310000 iteraciones y sal/IV aleatorios. Carga valida esquema/límites; contraseña equivocada o archivo manipulado falla sin sustituir sesión. Nada de claves o movimientos en localStorage ni servidores.
- Lectores PDF/Excel/OCR empaquetados desde versiones fijadas por lockfile. CSP solo mismo origen más bytes WASM locales y workers blob necesarios. Sin análisis o documentos enviados a CDN. Esta medida no equivale a auditoría formal ni certifica todos los formatos bancarios.
- UI conserva identidad navy/mint; vistas de inicio, suscripciones, movimientos, importación, seguimiento y privacidad; filtros, proveedor, coste mensual/anual por moneda, evidencia completa y próximo cargo estimado respecto a cobertura importada.

## Verificación observable
Pruebas reales del motor con comercios cambiantes, fin de mes, huecos, subidas, compras, cargos duplicados legítimos, créditos, monedas/cuentas, bajas con nuevo cobro. Cifrado round trip, contraseña errónea/manipulación/esquema. Parsers existentes verdes. En Chrome: importar fixtures, revisar casos detectados y no detectados, abrir evidencia, cambiar seguimiento, reimportar sin duplicar, PDF textual y OCR ficticios. Acceso no autorizado sigue bloqueado. Desplegar un commit remoto identificado en el mismo proyecto Netlify; no tocar otros proyectos ni subir extractos reales.
