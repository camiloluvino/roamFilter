# Changelog

## [2.0.0] - 2025-11-07

### Changed
- **Major simplification**: Removed complex conditional logic in favor of straightforward "copy all descendants" approach
- Each selected block now ALWAYS copies with ALL its descendants (expanded or collapsed)
- Removed ~150 lines of unnecessary code for better maintainability and performance

### Removed
- `hasSelectedDescendants()` - No longer needed with simplified logic
- `isDirectChild()` - No longer needed with simplified logic
- `getBlockTextOnly()` - No longer needed with simplified logic
- `getAllDescendantUids()` - No longer needed with simplified logic
- `findSelectedDescendants()` - No longer needed with simplified logic
- `buildPathToDescendants()` - No longer needed with simplified logic

### Fixed
- **Critical fix**: Now correctly handles selection of non-direct descendants (grandchildren, great-grandchildren, etc.)
- Works correctly when filtering reveals blocks at different nesting levels

### Technical
- Reduced code complexity from O(n²) to O(n)
- Improved performance by eliminating redundant API calls
- Clearer code structure for easier debugging and maintenance

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