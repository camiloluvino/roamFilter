# Roam Export Filter - Smart Export for Filtered Blocks

A Roam Research plugin that exports filtered content using Datalog queries. Works even when blocks are collapsed.

## Features

- **Query-Based Export**: Uses Datalog to find blocks, not DOM traversal
- **Current Page Scope**: Searches only within the currently open page
- **Works with Collapsed Blocks**: Finds content regardless of UI state
- **Complete Hierarchy**: Exports ancestral context + all descendants
- **Smart Filtering**: Only exports branches containing the target tag
- **Flexible Input**: Supports `#tag`, `[[tag]]`, and `#[[tag]]` formats

## Commands

| Command | Activation | Description |
|---------|------------|-------------|
| **Smart Copy Selected Blocks** | `Alt+Shift+C` | Copies visually selected (blue) blocks with smart path building |
| **Export Filtered Content** | Command Palette | Searches by tag in current page → downloads as `.md` file |
| **Copy Filtered Content** | Command Palette | Searches by tag in current page → copies to clipboard |

## How It Works

### Quick Copy (Visual Selection)
1. Select blocks in Roam (they turn blue)
2. Press `Alt+Shift+C`
3. Content is copied to clipboard (Text + HTML)

### Export by Tag
1. Navigate to the page you want to export from
2. Open Command Palette (`Cmd+P` or `Ctrl+P`)
3. Search for "Export Filtered Content" or "Copy Filtered Content"
4. Enter the tag name (any format: `tag`, `#tag`, `[[tag]]`, `#[[tag]]`)
5. Content is exported/copied

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
3. Paste the code from `extension.js` in a code block underneath
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