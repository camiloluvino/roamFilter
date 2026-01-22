# Technical Notes & Lessons Learned

This document captures relevant technical conclusions and recommendations derived from debugging complex issues in the Roam Export Filter.

## Dependency Management in Browser Extensions

### The Risk of Generic CDN URLs
**Issue**: Using generic URLs like `unpkg.com/package` (without a version) caused the EJS library to silently update to v4.0.0. This new version removed browser support (CommonJS only), causing `ReferenceError: exports is not defined`.
**Lesson**: **Always pin dependency versions** in CDN URLs for browser-side scripts.
- ❌ Unsafe: `https://unpkg.com/package/file.js`
- ✅ Safe: `https://unpkg.com/package@x.y.z/file.js`

### Browser vs. Node.js Compatibility
**Issue**: Many NPM packages are designed primarily for Node.js. When using them in a browser (without a bundler like Webpack/Vite), you must ensure they offer a **UMD (Universal Module Definition)** or **ESM** build.
**Diagnosis**: If you see `exports is not defined` or `require is not defined`, the library is likely CommonJS and not browser-compatible.

## API Verification & assumptions

### "Ghost" Methods
**Issue**: We assumed `jEpub` had a `.css()` method based on general patterns, but checking the source code revealed it didn't. The previous error (`exports is not defined`) silenced the script before it could fail on `book.css()`, masking the second bug.
**Lesson**: When a library has sparse documentation, **inspect the source code** (or a CDN chunk) earlier in the debugging process. Don't assume an API exists just because it "should".

## Roam Research Specifics

### Caching Aggressiveness
**Issue**: Even after pushing a fix to GitHub, Roam continued to load the old version of the script.
**Mechanism**: Roam's `[[roam/js]]` blocks and browsers cache these scripts aggressively.
**Recommendation**:
1.  **Version Logging**: Always include `console.log("Loaded vX.Y.Z")` at the start of the script.
2.  **Verification**: Always ask the user to verify this log message matches the expected version before diagnosing "why the fix didn't work".
3.  **Wait Time**: GitHub Pages/CDNs can take 30-60 seconds to propagate. Immediate reloads might still serve the old file.

## Debugging Strategy

### Serial Failure Masking
**Observation**: A fatal error at load time (dependency failure) can mask runtime errors (API mismatch).
**Strategy**: When fixing a blocker #1 (loading), immediately anticipate that the subsequent code paths have never actually run yet. Be ready for "new" errors that were just waiting for their turn.
