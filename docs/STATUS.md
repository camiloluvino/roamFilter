# Project Status - Roam Export Filter

> **Last updated**: 2026-01-07

---

## Current Version

**2.7.2** (2026-01-07)

---

## Feature Status

| Feature | Status | Notes |
|---------|--------|-------|
| **Smart Copy (Alt+Shift+C)** | ✅ Stable | Copia bloques visualmente seleccionados |
| **Export Filtered Content** | ✅ Stable | Exporta a archivo .md por tag |
| **Copy Filtered Content** | ✅ Stable | Copia al clipboard por tag |
| **Export by Root Blocks** | ✅ Stable | Exporta cada bloque raíz como archivo separado |
| **ZIP Export (>5 files)** | ✅ Stable | Bundling automático con JSZip |
| **Filename Order Prefix** | ✅ Stable | Prefijos 01_, 02_ para ordenar archivos |

---

## Recent History

### v2.7.1 (2025-12-20)
- Added: Prefijos de orden en nombres de archivo (01_, 02_, etc.)

### v2.7.0 (2025-12-20)
- Added: ZIP export automático cuando hay >5 archivos
- Added: Integración con JSZip desde CDN

### v2.1.1 (2025-11-07)
- Fixed: Bloques intermedios seleccionados ya no copian su árbol completo

### v2.1.0 (2025-11-07)
- Fixed: Filtrado correcto de ramas no relacionadas al copiar selecciones

### v1.2.0 (2025-10-30)
- Added: Inteligencia para bloques colapsados
- Fixed: Bloques colapsados ya no copian todos los hijos indiscriminadamente

---

## Known Issues

- `DEBUG = true` en línea 352 — Debe cambiarse a `false` para producción.

---

## Next Steps

*Ninguno documentado actualmente. Agregar aquí mejoras pendientes o direcciones de desarrollo.*

---

## Session Log

*Registrar aquí un resumen breve de cada sesión de trabajo.*

| Date | Summary |
|------|---------|
| 2025-12-29 | Creación de AI_INSTRUCTIONS.md y STATUS.md para documentación orientada a IA. |
