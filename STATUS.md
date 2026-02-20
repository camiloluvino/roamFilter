# Project Status - Roam Export Filter

> **Última actualización**: 2026-02-20 16:41

---

## Versión actual

**2.19.0** (2026-02-20 16:41)

---

## Estado de funcionalidades

| Funcionalidad | Estado | Notas |
|---------------|--------|-------|
| **Smart Export** | ✅ Estable | Modal unificado con 3 pestañas y buscador de páginas |
| **EPUB Export** | ✅ Estable | Exporta a formato EPUB 3.0 manual integrado |
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
