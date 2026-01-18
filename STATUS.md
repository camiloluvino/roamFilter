# Project Status - Roam Export Filter

> **Última actualización**: 2026-01-18

---

## Versión actual

**2.8.1** (2026-01-07 02:42)

---

## Estado de funcionalidades

| Funcionalidad | Estado | Notas |
|---------------|--------|-------|
| **Smart Copy (Alt+Shift+C)** | ✅ Estable | Copia bloques visualmente seleccionados |
| **Export Filtered Content** | ✅ Estable | Exporta a archivo .md por tag |
| **Copy Filtered Content** | ✅ Estable | Copia al clipboard por tag |
| **Export by Root Blocks** | ✅ Estable | Exporta cada bloque raíz como archivo separado |
| **ZIP Export (>5 files)** | ✅ Estable | Bundling automático con JSZip |
| **Filename Order Prefix** | ✅ Estable | Prefijos 01_, 02_ para ordenar archivos |

---

## Historial reciente

### v2.8.1 (2026-01-07)
- Changed: Favorite tags en lugar de detección dinámica para reducir ruido

### v2.8.0 (2026-01-07)
- Added: Toggle de orden en Export by Root Blocks
- Added: Preview count en vivo con debounce
- Added: Tag chips clickeables

### v2.7.2 (2026-01-07)
- Changed: Orden invertido de prefijos (bottom = 01_)

### v2.7.1 (2025-12-20)
- Added: Prefijos de orden en nombres de archivo

### v2.7.0 (2025-12-20)
- Added: ZIP export automático cuando hay >5 archivos

---

## Problemas conocidos

- [ ] `DEBUG = true` en línea ~386 — Cambiar a `false` antes de release de producción

---

## Próximos pasos

*Sin próximos pasos definidos actualmente.*

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
| 2026-01-18 | Reubicación de AI_INSTRUCTIONS.md y STATUS.md a raíz del proyecto. Añadida sección "Fragilidades y errores comunes". |
| 2025-12-29 | Creación de AI_INSTRUCTIONS.md y STATUS.md para documentación orientada a IA. |
