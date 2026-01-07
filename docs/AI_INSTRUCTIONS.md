# AI Instructions - Roam Export Filter

> **READ THIS FIRST** at the start of every work session.

## Project Description

Plugin para Roam Research que exporta contenido filtrado usando consultas Datalog. Funciona incluso cuando los bloques están colapsados. Ofrece tres modos: copia rápida con selección visual (`Alt+Shift+C`), exportación a archivo Markdown por tag, y copia al portapapeles por tag.

---

## Source of Truth

**CRITICAL**: El archivo que DEBES editar es:

```
extension.js    ← FUENTE DE VERDAD (edita este)
roam-filter.js  ← Copia idéntica para GitHub Pages CDN
```

### Estructura del proyecto:

```
roamExportFilter/
├── docs/                   ← Documentación (AI_INSTRUCTIONS, CHANGELOG, STATUS)
├── tests/                  ← Suite de tests (tests.html)
├── reference/              ← Archivos de referencia (documentación Roam API)
├── extension.js            ← FUENTE DE VERDAD
├── roam-filter.js          ← Copia idéntica para CDN
├── extension.json          ← Metadata del plugin
└── README.md               ← Documentación usuario
```

### Después de editar `extension.js`:

1. Copia el contenido exacto a `roam-filter.js` (son idénticos).
2. Actualiza la versión y fecha en las líneas 1-3 del archivo.

---

## Conceptual Architecture

El código en `extension.js` está organizado en secciones marcadas con comentarios:

```
┌─────────────────────────────────────────────────┐
│  JSZIP LOADING (líneas 11-28)                   │
│  Carga JSZip desde CDN para exports >5 archivos │
└─────────────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────────────┐
│  --- queries.js --- (líneas 34-211)             │
│  • isRoamAPIAvailable()                         │
│  • getCurrentPageUid()                          │
│  • findBlocksByTag(tagName)                     │
│  • getBlockWithDescendants(blockUid)            │
│  • buildTreeRecursively(block)                  │
│  • transformBlock(block)                        │
│  Consultas Datalog contra roamAlphaAPI          │
└─────────────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────────────┐
│  --- export-by-root.js --- (líneas 213-349)     │
│  • getRootBlocks(pageUid)                       │
│  • getFilteredChildren(rootUid, tagName)        │
│  • rootBlockToMarkdown(content, children)       │
│  • generateRootFilename(content)                │
│  Exportación por bloques raíz como archivos     │
└─────────────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────────────┐
│  --- tree-builder.js --- (líneas 351-579)       │
│  • buildExportTree(targetBlocks)                │
│  Construye árbol unificado desde bloques        │
│  encontrados, preservando ancestros y orden     │
└─────────────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────────────┐
│  --- exporter.js --- (líneas 581-645)           │
│  • treeToMarkdown(trees, indentLevel)           │
│  • generateFilename(tagName)                    │
│  • downloadFile(content, filename)              │
│  • generateHeader(tagName, blockCount)          │
│  Conversión a Markdown y descarga               │
└─────────────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────────────┐
│  MAIN EXTENSION LOGIC (líneas 647-915)          │
│  • cleanTagInput(input)                         │
│  • showNotification(message, bg)                │
│  • promptForTag() — Modal de UI                 │
│  • exportFilteredContent()                      │
│  • copyFilteredContent()                        │
│  UI y orquestación de export/copy by tag        │
└─────────────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────────────┐
│  EXPORT BY ROOT BLOCKS (líneas 920-1178)        │
│  • promptForRootExport() — Modal opciones       │
│  • exportByRootBlocks() — Lógica principal      │
│  • treeToHTML(trees, indentLevel)               │
│  Exporta cada bloque raíz como archivo separado │
│  ZIP automático si >5 archivos                  │
└─────────────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────────────┐
│  VISUAL SELECTION COPY (líneas 1179-1484)       │
│  • getBlockInfoCached(), descendantsCache       │
│  • getVisualBlockTree(blockUid)                 │
│  • buildVisualPathTree(parentUid, targetUids)   │
│  • visualTreeToMarkdown/HTML()                  │
│  • copyVisibleBlocks(event) — Alt+Shift+C       │
│  Copia bloques seleccionados visualmente        │
└─────────────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────────────┐
│  EXTENSION INITIALIZATION (líneas 1492-1558)    │
│  • initExtension() — Registra comandos          │
│  • cleanupExtension() — Limpieza                │
│  • window.roamExportFilterCleanup               │
└─────────────────────────────────────────────────┘
```

### Flujo de dependencias:
- Las funciones de `queries.js` son usadas por `tree-builder.js` y `export-by-root.js`
- `tree-builder.js` produce estructuras consumidas por `exporter.js`
- `MAIN EXTENSION LOGIC` orquesta todo usando funciones de todas las secciones

---

## Design Decisions & Historical Context

### ¿Por qué todo está inlineado en un archivo?

**Roam Research no soporta ES modules (`import/export`)**. El código debe ejecutarse como un script único. Históricamente existió una carpeta `src/core/` con módulos separados, pero fue eliminada por estar obsoleta y nunca haberse usado en producción.

### ¿Por qué existe `roam-filter.js` además de `extension.js`?

Es la misma fuente servida desde GitHub Pages CDN. Los usuarios cargan el plugin con:
```javascript
s.src = 'https://camiloluvino.github.io/roamFilter/roam-filter.js';
```

### ¿Por qué hay una variable `DEBUG = true`?

Línea 352. Habilita logs extensivos en consola. En producción debería ser `false`, pero se mantiene `true` para desarrollo activo.

---

## Operational Principles

### Versionado

1. **Ubicación**: Líneas 1-3 de `extension.js`:
   ```javascript
   // Roam Filter Export - Smart Export for Filtered Blocks
   // Version: X.Y.Z
   // Date: YYYY-MM-DD HH:MM
   ```

2. **Cuándo incrementar**:
   - MAJOR (X): Cambios breaking o restructuración significativa
   - MINOR (Y): Nueva funcionalidad
   - PATCH (Z): Corrección de bugs

3. **Actualizar también**: `docs/CHANGELOG.md` con los cambios realizados.

### Convenciones de nombrado

- **Funciones**: camelCase con verbos descriptivos (`findBlocksByTag`, `buildExportTree`)
- **Constantes globales**: UPPER_CASE (`DEBUG`)
- **Variables de cache**: sufijo `Cache` (`descendantsCache`, `blockInfoCache`)

### Manejo de errores

**OBLIGATORIO**: Toda interacción con `roamAlphaAPI` debe estar en try/catch:

```javascript
try {
    const result = window.roamAlphaAPI.data.q(`...`);
    // ...
} catch (err) {
    console.error("Error in [functionName]:", err);
    return []; // o valor default apropiado
}
```

### Antes de llamar a la API, verificar disponibilidad:

```javascript
if (!isRoamAPIAvailable()) {
    console.error("Roam API is not available");
    return [];
}
```

---

## Roam Technical Particulars

### API disponible

- **`window.roamAlphaAPI.data.q(query)`**: Ejecuta consultas Datalog
- **`window.roamAlphaAPI.pull(pattern, eid)`**: Obtiene datos de una entidad
- **`window.roamAlphaAPI.ui.commandPalette.addCommand()`**: Registra comandos

### Formato de atributos

Los datos de Roam vienen con prefijos como `:block/uid`, `:block/string`, etc. El código maneja ambos formatos:
```javascript
const uid = block[":block/uid"] || block.uid;
```

### Limitaciones conocidas

1. **Sin recursión nativa**: El pattern `...` en pull no funciona para profundidad infinita. Usamos `buildTreeRecursively()`.
2. **Orden de bloques**: Viene de `:block/order`, debe ordenarse manualmente.
3. **Parents vienen al revés**: De raíz a hoja, pero procesamos de hoja a raíz.

### Registro de comandos (Command Palette)

```javascript
window.roamAlphaAPI.ui.commandPalette.addCommand({
    label: "Command Name",
    callback: () => { ... }
});
```

### Limpieza al desinstalar

Exponer cleanup global:
```javascript
window.roamExportFilterCleanup = cleanupExtension;
```
