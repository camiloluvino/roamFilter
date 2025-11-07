# Roam Filter Copy - Smart Copy for Filtered Blocks

A Roam Research plugin that intelligently copies filtered blocks while respecting your selection.

## Features

- **Smart Path Building**: When you select descendant blocks, only copies paths to those blocks
- **Complete Hierarchy Copy**: When no descendants are selected, copies everything
- **Filter Aware**: Works perfectly with Roam's filter system
- **Handles Collapsed Blocks**: Uses Roam API to work even when blocks are collapsed
- **Automatic Deduplication**: Removes redundant selections when parent and child are both selected
- **Keyboard Shortcut**: Alt+Shift+C to copy selected visible blocks

## How It Works

The plugin uses intelligent logic to determine what to copy:

**When filtering by tags (e.g., `#important`):**

1. **Apply your filter** - Roam shows only blocks matching your criteria
2. **Select visible blocks** - Usually the filter result blocks or their parents
3. **Press Alt+Shift+C**

**The plugin then decides:**

- **If the selected block has descendants that are ALSO selected**: Copies ONLY the paths to those descendants (filtering out unrelated branches)
- **If the selected block has NO descendants selected**: Copies the entire block with ALL its children

This means: When you filter and select results, you get ONLY the filtered content. When you select a single block without filtering, you get everything.

## Installation

### For personal use (roam/js):

1. Enable custom components in Settings → User
2. Create a page named `[[roam/js]]`
3. Add a `{{[[roam/js]]}}` block
4. Accept the security warning
5. Paste the code from `extension.js` in a code block underneath
6. Refresh the page

### For Roam Depot (coming soon):

This extension will be submitted to Roam Depot for easier installation.

## Usage

1. Apply filters to your page (e.g., filter by #tag)
2. Select the visible blocks you want to copy (drag to select)
3. Press **Alt+Shift+C**
4. Paste anywhere - the content will be in proper Roam markdown format

## Examples

### Example 1: Simple filter and copy

**Original structure:**
```
- Meeting Notes
  - Discussion #important
    - Point A
    - Point B
  - Random thoughts #personal
    - Point C
  - Action items #important
    - Task 1
    - Task 2
```

**After filtering by #important:**
Roam shows only:
```
- Meeting Notes
  - Discussion #important
  - Action items #important
```

**You select "Discussion #important" and "Action items #important", then Alt+Shift+C:**
```
- Discussion #important
  - Point A
  - Point B
- Action items #important
  - Task 1
  - Task 2
```

✅ Each selected block copied with ALL its descendants
✅ Maintains proper hierarchy and indentation

---

### Example 2: Selective copy with nested filter

**Original structure:**
```
- ejemplo 2
  - Conversación 1 #resumen
    - Introducción #filtrarEsto
      - Contexto histórico
      - Marco teórico
    - Metodología propuesta
    - Conclusiones preliminares
  - Conversación 2 #discusión
    - Debate sobre los resultados
  - Conversación 3 #resumen
    - Resumen ejecutivo
      - Punto clave 1
      - Punto clave 2 #filtrarEsto
        - Justificación teórica
    - Recomendaciones
```

**After filtering by #filtrarEsto:**
Roam shows only:
```
- ejemplo 2
  - Conversación 1
    - Introducción #filtrarEsto
  - Conversación 3
    - Resumen ejecutivo
      - Punto clave 2 #filtrarEsto
```

**You select "ejemplo 2" (which now has visible descendants selected), then Alt+Shift+C:**
```
- ejemplo 2
  - Conversación 1 #resumen
    - Introducción #filtrarEsto
      - Contexto histórico
      - Marco teórico
  - Conversación 3 #resumen
    - Resumen ejecutivo
      - Punto clave 2 #filtrarEsto
        - Justificación teórica
```

✅ Copies ONLY branches containing filtered blocks
✅ "Conversación 2" NOT copied (no filtered content)
✅ "Metodología propuesta" NOT copied (no filtered content)
✅ "Punto clave 1" NOT copied (no filtered content)
✅ "Recomendaciones" NOT copied (no filtered content)
✅ Each filtered block includes ALL its descendants

## Requirements

- Roam Research (web or desktop)
- No additional dependencies

## Development

### Testing

The extension includes unit tests for core functions. To run tests:

1. Open `tests.html` in your browser
2. Tests will run automatically and display results

### Uninstalling

To remove the extension and clean up event listeners, run in browser console:
```javascript
window.roamFilterCopyCleanup();
```

## Technical Features

- **Simple and efficient logic**: Straightforward algorithm without unnecessary complexity
- **Complete hierarchy copy**: Uses Roam API to copy full block trees even when collapsed
- **Automatic deduplication**: Filters out descendant selections when parent is also selected
- **Robust error handling**: All functions include try-catch blocks and input validation
- **API safety checks**: Validates Roam API and Clipboard API availability before use
- **Memory cleanup**: Provides cleanup function to remove event listeners
- **Lightweight**: Minimal code footprint for maximum performance

## License

MIT

## Author

Camilo Luvino