# Changelog

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