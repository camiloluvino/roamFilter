# Changelog

## [2.14.0] - 2026-01-22 00:40

### Added
- **EPUB export format**: New option to export as EPUB instead of Markdown
  - Format selector (Markdown/EPUB) in the unified export modal
  - Works with both "Por Filtros" and "Por Ramas" export modes
  - In "Por Ramas" mode, all selected branches are combined into a single EPUB

- **EPUB styling options**: Configurable options for better reading experience
  - **Espaciado bloques**: Compact / Normal / Wide spacing between blocks
  - **Al cambiar nivel**: None / Subtle / Marked spacing when hierarchy changes
  - **Indicador niveles**: Indentation / Vertical line / Numbering for visual hierarchy

### Technical
- Added `loadJEpub()`: Loads jEpub library from CDN (depends on JSZip)
- Added `treeToEpubHTML()`: Converts block tree to HTML with configurable styles
- Added `downloadAsEpub()`: Generates and downloads EPUB file
- Added `escapeHTML()`: Helper for safe HTML content
- Modified `promptUnifiedExport()`: Added format selector and EPUB options panel
- Modified `unifiedExport()`: Routes to EPUB or Markdown based on selection

---

## [2.13.0] - 2026-01-19 14:29

### Added
- **Descending order option**: New checkbox "Orden descendente (..., 02_, 01_)" under the order prefix option
- When enabled, the first branch gets the highest number prefix instead of 01_
- Useful when you want files sorted alphabetically to appear in reverse order compared to Roam

### Technical
- Checkbox is disabled until "Agregar prefijo de orden" is enabled
- Added `useDescendingOrder` flag to export options

---

## [2.12.0] - 2026-01-19 02:31

### Added
- **Optional order prefix**: Checkbox to enable/disable order prefix (01_, 02_...) on filenames
- Default is now OFF (no prefix), user can enable when order matters

---

## [2.11.1] - 2026-01-19 00:59

### Fixed
- **Branch export indentation**: Now exports only the selected branch with descendants, without including ancestors
- Branches now export with correct nested structure instead of being flattened

### Technical
- Changed from `fetchBlocksForExport()` + `buildExportTree()` to using `getBlockWithDescendants()` directly
- Maintains tag filter validation before processing each branch

---

## [2.11.0] - 2026-01-19 00:43

### Added
- **One file per branch**: "Por Ramas" now exports each selected branch as a separate .md file
- Order prefixes (01_, 02_, etc.) on filenames to preserve selection order
- Automatic ZIP when exporting more than 5 branches

### Changed
- Notifications now in Spanish for consistency

---

## [2.10.1] - 2026-01-19 00:34

### Added
- **Depth selector** in "Por Ramas" tab: Choose 1-4 levels of hierarchy (default: 2)
- Tree re-renders dynamically when depth changes

### Changed
- **Larger modal**: 800-1000px wide (was 550-700px), 400px tree height (was 300px)
- Optimized for 1920x1080 screens
- Slightly larger font sizes for better readability

---

## [2.10.0] - 2026-01-19 00:22

### Added
- **Unified Export Modal**: Single command "Smart Export" opens a modal with two tabs:
  - **📋 Por Filtros**: Export blocks by tag (replaces "Export Filtered Content")
  - **🌳 Por Ramas**: Visual branch selection with checkboxes (includes optional tag filter)
- Page name displayed in modal header
- Favorite tags chips for quick selection in "Por Filtros" tab

### Changed
- Consolidated 3 commands into 1 unified "Smart Export" command
- Removed "Export Filtered Content", "Copy Filtered Content", and "Export by Branch Selection" as separate commands

### Technical
- Added `promptUnifiedExport()`: Modal with tab system and dual functionality
- Added `unifiedExport()`: Main orchestrator that handles both export modes
- Simplified Command Palette registration (now only 3 commands)

---

## [2.9.0] - 2026-01-18

### Added
- **Export by Branch Selection**: New visual interface to manually select specific branches for export
  - Shows page structure with checkboxes for the first 3 levels
  - Indicates when blocks have deeper children (`+N sub-bloques`)
  - Full tooltip on hover showing complete block text
  - Real-time counter of selected branches
- **Combined mode**: Optional tag filter within selected branches (e.g., "from chapter 3, only the #summaries")
- New command in Command Palette: "Export by Branch Selection"

### Technical
- Added `getPageStructure()`: Fetches page tree limited to N levels for the branch selector
- Added `fetchBlocksForExport()`: Converts selected UIDs to format compatible with `buildExportTree()`
- Added `promptForBranchSelection()`: Modal UI with checkbox tree
- Added `exportByBranchSelection()`: Main orchestration function
- Reuses existing `buildExportTree()`, `treeToMarkdown()`, and `downloadFile()` functions

---

## [2.8.1] - 2026-01-07 02:42

### Changed
- **Favorite tags instead of dynamic detection**: Tag chips now show a configurable `FAVORITE_TAGS` list instead of detecting all tags in the page (which often included noise from copy/paste)
- Edit the `FAVORITE_TAGS` constant near line 412 to customize your preferred tags

---

## [2.8.0] - 2026-01-07 02:32

### Added
- **Order toggle in Export by Root Blocks**: Checkbox to control whether `01_` = bottom block (inverted, default) or top block
- **Live preview count**: Shows how many files will be exported as you type a filter tag (with 300ms debounce)
- **Clickable tag chips**: Displays up to 15 tags found in the page; click to use as filter

### Changed
- Export button now shows dynamic count: "Export X files"
- Modal is slightly wider to accommodate new UI elements

---

## [2.7.2] - 2026-01-07

### Changed
- **Inverted filename order prefix**: Bottom block in Roam now gets prefix `01_`, top block gets highest number. This makes chronological content (oldest at bottom) sort correctly when files are sorted alphabetically.

---

## [2.7.1] - 2025-12-20

### Added
- **Filename order prefix**: Exported files now include order prefix (01_, 02_, etc.) to maintain page order when sorted alphabetically

---

## [2.7.0] - 2025-12-20

### Added
- **ZIP export for Export by Root Blocks**: When exporting more than 5 root blocks, files are now bundled into a single ZIP file instead of downloading individually
- JSZip library integration (loaded from CDN on demand)

### Changed
- Export by Root Blocks now collects all files first, then decides export method based on count
- Improved notification messages to indicate ZIP creation process

---

- When filtering and selecting hierarchies, only copies branches containing leaf targets
- Example: "Metodología propuesta" and "Conclusiones" no longer copied when only "Introducción #filtrarEsto" is the target

### Technical
- Modified `processContainer` to filter `selectedDescendantUids` to only leaf targets before passing to `buildPathToDescendants`
- Leaf targets = selected blocks with NO other selected descendants
- This prevents intermediate selected blocks from being treated as copy destinations

## [2.1.1] - 2025-11-07

### Fixed
- **Critical fix**: Intermediate selected blocks (like "Conversación 1") no longer copy their entire tree
- Only "leaf targets" (selected blocks with NO selected descendants) copy their entire tree
- Intermediate blocks now correctly act as path segments, not copy destinations

### Technical
- Added `hasTargetDescendants` check in `buildPathToDescendants()`
- Distinguishes between leaf targets (copy all) and intermediate targets (path only)

## [2.1.0] - 2025-11-07

### Fixed
- **Critical fix**: Now correctly filters out unrelated branches when copying filtered selections
- When a block has selected descendants, ONLY paths to those descendants are copied (not the entire tree)
- Restored path-building logic that was incorrectly removed in v2.0.0

### Changed
- Simplified path detection logic - removed DOM-based child detection
- Now uses only UID-based descendant detection for more reliable filtering

### Technical
- Restored: `getAllDescendantUids()`, `findSelectedDescendants()`, `buildPathToDescendants()`
- Removed unreliable DOM traversal functions: `hasSelectedDescendants()`, `isDirectChild()`, `getBlockTextOnly()`
- More efficient: Single check for selected descendants, no complex branching

## [2.0.0] - 2025-11-07 [YANKED]

### Issues
- **Bug**: Copied ALL descendants even when filtering should exclude branches
- Over-simplified logic didn't account for selective path building

### Changed
- Attempted simplification by removing path-building logic (incorrect approach)

## [1.2.0] - 2025-10-30

### Added
- **Collapsed block intelligence**: Now correctly handles filtered selections within collapsed blocks
- `getAllDescendantUids()`: Recursively finds all descendants using Roam API
- `findSelectedDescendants()`: Identifies which descendants are selected even when parent is collapsed
- `buildPathToDescendants()`: Builds only the necessary paths to selected descendants
- 7 additional unit tests for collapsed block functionality (total: 22 tests)

### Fixed
- **Major fix**: Collapsed blocks no longer copy all children indiscriminately
- When a filtered block is inside a collapsed parent, only that branch is copied now
- Example: Filtering for `#tag` inside collapsed "Conversación 3" now copies only the path to `#tag`, not all siblings

### Technical
- Enhanced `processContainer()` to detect collapsed blocks with selected descendants
- Uses Roam API to traverse structure when DOM doesn't show children
- Maintains backward compatibility: blocks without filtered descendants still copy all children

## [1.1.0] - 2025-10-29

### Added
- Robust error handling across all functions with try-catch blocks
- Input validation for all function parameters
- Roam API availability checking before API calls
- Clipboard API validation before copy operations
- Event listener cleanup mechanism (`window.roamFilterCopyCleanup()`)
- Improved direct child detection algorithm using `isDirectChild()` function
- Unit tests suite with 15 test cases (`tests.html`)
- Error notifications when copy operations fail
- Console logging for debugging and tracking

### Changed
- Notification text changed from "✓ Copiado" to "✓ Copied" (English consistency)
- Refactored notification display into reusable `showNotification()` function
- Improved `isDirectChild()` logic to be more reliable than previous DOM traversal

### Fixed
- Memory leak prevention by removing duplicate event listeners on init
- Potential crashes from null/undefined parameters
- Better handling of edge cases in DOM traversal

## [1.0.0] - 2025-10-28

### Added
- Initial release
- Smart parent-child selection detection
- Full descendant copying via Roam API
- Alt+Shift+C keyboard shortcut
- Visual notification on successful copy