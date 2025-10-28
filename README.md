# Roam Filter Copy - Copy Only Visible Blocks

A Roam Research plugin that intelligently copies filtered and selected blocks with their descendants.

## Features

- **Smart Selection**: Automatically detects when a parent block is selected along with its children
- **Full Descendant Copy**: Copies all descendants of leaf-selected blocks, even if collapsed
- **Filter Aware**: Works perfectly with Roam's filter system - only copies what you've selected
- **Keyboard Shortcut**: Alt+Shift+C to copy selected visible blocks

## How It Works

The plugin uses intelligent logic to determine what to copy:

1. If you select a parent block AND its children: 
   - Copies only the parent block text (without descendants)
   - Then copies each selected child with ALL its descendants

2. If you select a block without selecting its children:
   - Copies that block with ALL its descendants (using Roam's API)

This allows you to use Roam's filters to show only relevant blocks, select them, and copy everything including nested content.

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

## Example

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

## Requirements

- Roam Research (web or desktop)
- No additional dependencies

## License

MIT

## Author

Camilo Luvino