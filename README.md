# Roam Filter Copy - Copy Filtered Blocks with All Descendants

A Roam Research plugin that copies filtered and selected blocks with ALL their descendants.

## Features

- **Simple and Efficient**: Select visible blocks after filtering → Copy with ALL descendants
- **Filter Aware**: Works perfectly with Roam's filter system
- **Handles Collapsed Blocks**: Uses Roam API to copy complete hierarchies even when collapsed
- **Preserves Structure**: Includes necessary ancestors to maintain hierarchy
- **Keyboard Shortcut**: Alt+Shift+C to copy selected visible blocks

## How It Works

The plugin uses simple, straightforward logic:

1. **Apply a filter** to show only relevant blocks (e.g., filter by `#important`)
2. **Select the visible blocks** you want to copy
3. **Press Alt+Shift+C**
4. **Each selected block is copied with ALL its descendants** (expanded or collapsed)
5. **Ancestors are included** to maintain the hierarchical structure

The plugin automatically removes duplicates if you select both a parent and its descendants - it will copy the top-level selection with everything underneath.

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

### Example 2: Collapsed blocks with nested filter

**Original structure (with "Conversación 3" collapsed):**
```
- ejemplo 2
  ▶ Conversación 3 [COLLAPSED]
      - Resumen ejecutivo
        - Punto clave 1
          - Evidencia A
          - Evidencia B #filtrarEsto
            - Detalle 1
            - Detalle 2
        - Punto clave 2
        - Punto clave 3
      - Recomendaciones
```

**After filtering by #filtrarEsto:**
Roam shows:
```
- ejemplo 2
  - Conversación 3 [Still shows as collapsed but contains filtered content]
```

**You select "Conversación 3", then Alt+Shift+C:**
```
- Conversación 3
  - Resumen ejecutivo
    - Punto clave 1
      - Evidencia A
      - Evidencia B #filtrarEsto
        - Detalle 1
        - Detalle 2
    - Punto clave 2
    - Punto clave 3
  - Recomendaciones
```

✅ Copies the ENTIRE block with ALL descendants
✅ Works even when collapsed
✅ Uses Roam API to get complete structure

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