# Roam Filter Copy - Copy Only Visible Blocks

A Roam Research plugin that intelligently copies filtered and selected blocks with their descendants.

## Features

- **Smart Selection**: Automatically detects when a parent block is selected along with its children
- **Collapsed Block Intelligence**: Correctly handles filtered selections within collapsed blocks - only copies the paths to filtered content
- **Full Descendant Copy**: Copies all descendants of leaf-selected blocks, even if collapsed
- **Filter Aware**: Works perfectly with Roam's filter system - only copies what you've selected
- **Keyboard Shortcut**: Alt+Shift+C to copy selected visible blocks

## How It Works

The plugin uses intelligent logic to determine what to copy:

1. **If you select a parent block AND its children**:
   - Copies only the parent block text (without descendants)
   - Then copies each selected child with ALL its descendants

2. **If you select a block without selecting its children**:
   - Copies that block with ALL its descendants (using Roam's API)

3. **If you select a COLLAPSED block with filtered content inside** (NEW in v1.2.0):
   - Uses Roam API to detect which descendants are also selected
   - Copies ONLY the path to those selected descendants
   - Ignores sibling blocks that don't contain filtered content
   - Example: Filtering `#important` inside a collapsed "Meeting Notes" will copy only the branch containing `#important`, not other meeting sections

This allows you to use Roam's filters to show only relevant blocks, select them, and copy everything including nested content - even when parent blocks are collapsed.

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

### Example 1: Expanded blocks with filter

**Before filtering:**
```
- Meeting Notes
  - Discussion #important
    - Point A
    - Point B
  - Random thoughts #personal
    - Point C
```

**After filtering by #important and selecting:**
```
- Meeting Notes
  - Discussion #important
    - Point A
    - Point B
```

### Example 2: Collapsed blocks with nested filter (NEW in v1.2.0)

**Structure (collapsed "Conversación 3"):**
```
- ejemplo 2
  - Conversación 3 [COLLAPSED]
    - Resumen ejecutivo
      - Punto clave 1
        - Evidencia B #tomarEsto
      - Punto clave 2
      - Punto clave 3
    - Recomendaciones
```

**After filtering by #tomarEsto and selecting "Conversación 3":**
```
- Conversación 3
  - Resumen ejecutivo
    - Punto clave 1
      - Evidencia B #tomarEsto
        - (all its descendants)
```

Note: "Punto clave 2", "Punto clave 3", and "Recomendaciones" are NOT copied because they're not on the path to the filtered content.

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

- **Collapsed block intelligence**: Uses Roam API to detect filtered content in collapsed blocks
- **Selective path building**: Constructs only necessary paths to selected descendants
- **Robust error handling**: All functions include try-catch blocks and input validation
- **API safety checks**: Validates Roam API and Clipboard API availability before use
- **Memory cleanup**: Provides cleanup function to remove event listeners
- **Direct child detection**: Improved algorithm for detecting parent-child relationships
- **Comprehensive testing**: 22 unit tests covering all major functionality

## License

MIT

## Author

Camilo Luvino