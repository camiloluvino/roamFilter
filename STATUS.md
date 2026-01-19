# Project Status - Roam Export Filter

> **Última actualización**: 2026-01-19 01:04

---

## Versión actual

**2.11.1** (2026-01-19 00:59)

---

## Estado de funcionalidades

| Funcionalidad | Estado | Notas |
|---------------|--------|-------|
| **Smart Export** | ✅ Estable | Modal unificado con pestañas "Por Filtros" y "Por Ramas" |
| **Smart Copy (Alt+Shift+C)** | ✅ Estable | Copia bloques visualmente seleccionados |
| **Export by Root Blocks** | ✅ Estable | Exporta cada bloque raíz como archivo separado |
| **ZIP Export (>5 files)** | ✅ Estable | Bundling automático con JSZip |
| **Selector de profundidad** | ✅ Estable | Niveles 1-4 (default: 2) en pestaña "Por Ramas" |

---

## Historial reciente

### v2.11.1 (2026-01-19 00:59)
- Fixed: **Indentación de ramas** - Ahora exporta solo rama + descendientes, sin ancestros
- Changed: Usa `getBlockWithDescendants()` directamente para estructura correcta

### v2.11.0 (2026-01-19 00:43)
- Added: **Un archivo por rama** - Cada rama seleccionada genera archivo separado
- Added: Prefijos de orden (01_, 02_...) en nombres de archivo
- Added: ZIP automático si >5 ramas

### v2.10.1 (2026-01-19 00:34)
- Added: **Selector de profundidad** - Niveles 1-4 en pestaña "Por Ramas"
- Changed: Modal más grande (800-1000px) para pantallas 1920x1080

### v2.10.0 (2026-01-19 00:22)
- Added: **Modal Unificado** - Comando "Smart Export" con pestañas "Por Filtros" y "Por Ramas"

---

## Problemas conocidos

- [ ] `DEBUG = true` en línea ~386 — Cambiar a `false` antes de release de producción

---

## Próximos pasos

- [ ] Probar exportación de ramas grandes con estructura profunda
- [ ] Considerar agregar "Export by Root Blocks" al modal unificado

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

