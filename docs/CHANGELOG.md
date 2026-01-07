# Changelog

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