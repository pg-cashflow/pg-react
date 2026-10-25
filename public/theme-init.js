(function () {
  try {
    var stored = localStorage.getItem('pg_theme');
    // Only the three known values; anything else falls back to system (matches React).
    var theme = (stored === 'light' || stored === 'dark' || stored === 'system') ? stored : 'system';
    var resolved = theme === 'system'
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : theme;
    var isDark = resolved === 'dark';
    document.documentElement.classList.toggle('dark', isDark);
    document.documentElement.style.colorScheme = resolved;
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', isDark ? '#15130F' : '#FAFAF7');
  } catch (e) {}
})();
