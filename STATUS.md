# Project Status - Roam Export Filter

> **Última actualización**: 2026-03-29 20:40

---

## Versión actual

**2.21.1** (2026-03-29 20:40)

---

## Estado de funcionalidades

| Funcionalidad | Estado | Notas |
|---------------|--------|-------|
| **Smart Export** | ✅ Estable | Modal unificado con 3 pestañas y buscador de páginas |
| **MD Export** | ✅ Estable | Exporta a Markdown en formato Jerárquico o Plano |
| **EPUB Export** | ✅ Estable | Exporta a formato EPUB 3.0 con soporte de Markdown |
| **Smart Copy (Alt+Shift+C)** | ✅ Estable | Copia bloques visualmente seleccionados |
| **Export by Root Blocks** | ✅ Estable | Exporta cada bloque raíz como archivo separado |
| **ZIP Export (>5 files)** | ✅ Estable | Bundling automático con JSZip |

---

## Problemas conocidos

- [ ] `DEBUG = true` en código — Cambiar a `false` antes de release de producción

---

## Próximos pasos

- [ ] Considerar agregar "Export by Root Blocks" al modal unificado
- [ ] Probar con páginas muy grandes (>100 bloques)

---

## Historial reciente

### v2.21.1 (2026-03-29 20:40)
- Fixed: Corregido problema de scroll en la pestaña "Por Ramas". Se implementó `min-height: 0` y se ajustó el manejo de `overflow` para asegurar que el footer y las opciones de formato permanezcan visibles y fijos mientras la lista de ramas mantiene su propio scroll.

### v2.20.2 (2026-03-05 01:40)
- Added: Soporte para formato Markdown de Roam en exportación EPUB (**negritas**, __cursivas__, ^^resaltado^^, links, etc).
- Added: Estilos CSS personalizados en EPUB para páginas de Roam y etiquetas.

### v2.20.1 (2026-03-04 14:55)
- Fixed: Extracción e inyección de Heading nativo en exportación Markdown Plano.

### v2.20.0 (2026-03-04 14:35)
- Added: Soporte para exportación en "Markdown Plano" removiendo viñetas e indentación, generando párrafos separados en el modal de Smart Export.

### v2.19.0 (2026-02-20 16:41)
- Changed: Reemplazado generador de EPUB basado en jEpub por un generador manual de EPUB 3.0 para mejor compatibilidad con Kindle ("Send to Kindle").
- Removed: Eliminadas dependencias de EJS y jEpub.

### v2.14.4 (2026-01-22 01:38)
- Fixed: EPUB export error - `book.css is not a function`

### v2.14.3 (2026-01-22 01:26)
- Fixed: Pinned EJS to v3.1.10 for browser compatibility

### v2.14.2 (2026-01-22 01:13)
- Added: EPUB export format with styling options

*Ver `docs/CHANGELOG.md` para historial completo.*
