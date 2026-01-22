# Project Status - Roam Export Filter

> **Última actualización**: 2026-01-22 00:42

---

## Versión actual

**2.14.0** (2026-01-22 00:40)

---

## Estado de funcionalidades

| Funcionalidad | Estado | Notas |
|---------------|--------|-------|
| **Smart Export** | ✅ Estable | Modal unificado con pestañas "Por Filtros" y "Por Ramas" |
| **EPUB Export** | 🆕 Nueva | Exporta a formato EPUB con opciones de estilo configurables |
| **Smart Copy (Alt+Shift+C)** | ✅ Estable | Copia bloques visualmente seleccionados |
| **Export by Root Blocks** | ✅ Estable | Exporta cada bloque raíz como archivo separado |
| **Selector de profundidad** | ✅ Estable | Niveles 1-4 (default: 2) en pestaña "Por Ramas" |
| **Prefijo de orden** | ✅ Estable | Opcional, agrega 01_, 02_... a nombres de archivo |
| **ZIP Export (>5 files)** | ✅ Estable | Bundling automático con JSZip |

---

## Historial reciente

### v2.14.0 (2026-01-22 00:40)
- Added: **Exportación EPUB** - Nueva opción de formato con selector Markdown/EPUB
- Added: **Opciones de estilo EPUB** - Espaciado entre bloques, espaciado al cambiar nivel, indicador de niveles
- Technical: Carga jEpub desde CDN, nuevas funciones treeToEpubHTML y downloadAsEpub

### v2.13.0 (2026-01-19 14:29)
- Added: **Orden descendente** - Opción para invertir prefijos de orden

### v2.12.0 (2026-01-19 02:31)
- Added: **Toggle de prefijo de orden** - Checkbox opcional para agregar 01_, 02_... a archivos
- Changed: Por defecto sin prefijo, usuario puede activarlo si necesita orden

### v2.11.1 (2026-01-19 00:59)
- Fixed: **Indentación de ramas** - Ahora exporta solo rama + descendientes, sin ancestros

---

## Problemas conocidos

- [ ] `DEBUG = true` en línea ~404 — Cambiar a `false` antes de release de producción

---

## Próximos pasos

- [x] ~~Implementar exportación EPUB~~
- [ ] Considerar agregar "Export by Root Blocks" al modal unificado
- [ ] Probar con páginas muy grandes (>100 bloques)

---

## Notas para la IA

### Cómo mantener este documento actualizado:

**Al final de cada sesión de trabajo**, actualiza este documento con:

1. **Fecha**: Cambiar "Última actualización" al día actual
2. **Versión**: Si cambió, actualizar la versión en "Versión actual"
3. **Historial**: Agregar entrada en "Historial reciente" (máximo 5 entradas visibles, mover antiguas a CHANGELOG.md)
4. **Problemas**: Agregar/resolver items en "Problemas conocidos"
5. **Próximos pasos**: Actualizar si hay trabajo pendiente o direcciones de desarrollo

### Formato de entradas de historial:

```markdown
### vX.Y.Z (YYYY-MM-DD)
- Added: Descripción de nueva funcionalidad
- Changed: Descripción de cambio de comportamiento
- Fixed: Descripción de bug corregido
- Removed: Descripción de funcionalidad eliminada
```

### Registro de sesiones:

| Fecha | Resumen |
|-------|---------|
| 2026-01-18 | Implementada funcionalidad "Export by Branch Selection" - selección manual de ramas para exportación con interfaz visual de checkboxes. |
| 2026-01-18 | Reubicación de AI_INSTRUCTIONS.md y STATUS.md a raíz del proyecto. Añadida sección "Fragilidades y errores comunes". |
| 2025-12-29 | Creación de AI_INSTRUCTIONS.md y STATUS.md para documentación orientada a IA. |

