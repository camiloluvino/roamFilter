# Roam Filter Export - Smart Export for Filtered Blocks

A Roam Research plugin that exports filtered content using Datalog queries. Works even when blocks are collapsed.

## Features

- **Query-Based Export**: Uses Datalog to find blocks, not DOM traversal
- **Works with Collapsed Blocks**: Finds content regardless of UI state
- **Complete Hierarchy**: Exports ancestral context + all descendants
- **Smart Filtering**: Only exports branches containing the target tag
- **Two Output Options**:
  - **Export to File**: Downloads as Markdown file (for large content)
  - **Copy to Clipboard**: Copies as Text + HTML (for quick paste)

## How It Works

### Export to File
1. Open Command Palette (`Cmd+P` or `Ctrl+P`)
2. Search for "Export Filtered Content"
3. Enter the tag name (without #)
4. A Markdown file downloads automatically

### Copy to Clipboard
1. Open Command Palette (`Cmd+P` or `Ctrl+P`)
2. Search for "Copy Filtered Content"
3. Enter the tag name (without #)
4. Content is copied to clipboard (Text + HTML)
  - Conversación 3 #resumen
    - Resumen ejecutivo
      - Punto clave 2 #filtrarEsto
        - Justificación teórica
          - ...
```

Only branches containing `#filtrarEsto` are exported, with full context and descendants.

## Installation

### For personal use (roam/js):

1. Go to `[[roam/js]]` page
2. Create a `{{[[roam/js]]}}` block
3. Paste the code from `extension.js` in a code block underneath
4. Refresh the page

### For Roam Depot:

This extension will be submitted to Roam Depot for easier installation.

## Technical Details

- Uses `roamAlphaAPI.data.q()` for Datalog queries
- Recursively fetches descendants with `roamAlphaAPI.pull()`
- Builds merged trees to avoid duplication
- Exports to Markdown format

## Uninstalling

Run in browser console:
```javascript
window.roamFilterExportCleanup();
```

## License

MIT

## Author

Camilo Luvino