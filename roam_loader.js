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
