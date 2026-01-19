# Roam Export Filter - Smart Export for Filtered Blocks

A Roam Research plugin that exports filtered content using Datalog queries. Works even when blocks are collapsed.

## Features

- **Unified Export Modal**: Single command with two export modes (by tag or by branch selection)
- **Query-Based Export**: Uses Datalog to find blocks, not DOM traversal
- **Current Page Scope**: Searches only within the currently open page
- **Works with Collapsed Blocks**: Finds content regardless of UI state
- **One File Per Branch**: Each selected branch exports as a separate .md file
- **Depth Selector**: Choose 1-4 hierarchy levels to display (default: 2)
- **ZIP Auto-Bundle**: Automatically creates ZIP when exporting >5 files

## Commands

| Command | Activation | Description |
|---------|------------|-------------|
| **Smart Export** | Command Palette | Unified modal with "Por Filtros" and "Por Ramas" tabs |
| **Smart Copy Selected Blocks** | `Alt+Shift+C` | Copies visually selected (blue) blocks |
| **Export by Root Blocks** | Command Palette | Exports each root block as separate file |

## How It Works

### Smart Export (Recommended)
1. Navigate to the page you want to export from
2. Open Command Palette (`Cmd+P` or `Ctrl+P`)
3. Search for "Smart Export"
4. Choose tab:
   - **Por Filtros**: Enter a tag to find all blocks with that tag
   - **Por Ramas**: Select specific branches to export (one file per branch)
5. Click "Exportar"

### Quick Copy (Visual Selection)
1. Select blocks in Roam (they turn blue)
2. Press `Alt+Shift+C`
3. Content is copied to clipboard (Text + HTML)

## Example

**Searching for `#filtrarEsto` in `paginaPruebaFiltrado`:**

Only branches containing `#filtrarEsto` are exported, with:
- Full ancestral context (path from page root)
- All descendants of tagged blocks
- Correct block ordering

## Installation

### Auto-Update via CDN (Recommended)

Use this method to automatically receive updates across all your Roam graphs:

1. Go to `[[roam/js]]` page in each graph
2. Create a `{{[[roam/js]]}}` block
3. Add a JavaScript code block with:

```javascript
var s = document.createElement('script');
s.src = 'https://camiloluvino.github.io/roamFilter/roam-filter.js?v=' + Date.now();
s.type = 'text/javascript';
s.onload = function () {
    console.log('[Roam Export Filter] Loaded from GitHub Pages');
};
s.onerror = function () {
    console.error('[Roam Export Filter] Failed to load from GitHub Pages');
};
document.head.appendChild(s);
```

4. Refresh the page

> **Benefit**: When you update the plugin, all your graphs will automatically get the latest version.

---

### Manual Installation (roam/js):

1. Go to `[[roam/js]]` page
2. Create a `{{[[roam/js]]}}` block
3. Paste the code from `roam-filter.js` in a code block underneath
4. Refresh the page

## Technical Details

- Uses `roamAlphaAPI.data.q()` for Datalog queries
- Filters by current page using `:block/page`
- Recursively fetches descendants with `roamAlphaAPI.pull()`
- Builds merged trees to avoid duplication
- Exports to Markdown format

## Uninstalling

Run in browser console:
```javascript
window.roamExportFilterCleanup();
```

## License

MIT

## Author

Camilo Luvino