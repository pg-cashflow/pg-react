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
    var fonts = document.getElementById('pg-fonts');
    if (fonts) fonts.rel = 'stylesheet';

    var storedLocale = localStorage.getItem('pg_locale');
    if (storedLocale && ['en-IN', 'te-IN', 'ta-IN', 'kn-IN'].indexOf(storedLocale) !== -1) {
      document.documentElement.lang = storedLocale;
      var fontUrls = {
        'te-IN': 'https://fonts.googleapis.com/css2?family=Noto+Sans+Telugu:wght@400;500;600;700&display=swap',
        'ta-IN': 'https://fonts.googleapis.com/css2?family=Noto+Sans+Tamil:wght@400;500;600;700&display=swap',
        'kn-IN': 'https://fonts.googleapis.com/css2?family=Noto+Sans+Kannada:wght@400;500;600;700&display=swap'
      };
      if (fontUrls[storedLocale] && !document.getElementById('pg-font-' + storedLocale)) {
        var lf = document.createElement('link');
        lf.id = 'pg-font-' + storedLocale;
        lf.rel = 'stylesheet';
        lf.href = fontUrls[storedLocale];
        document.head.appendChild(lf);
      }
    }
  } catch (e) {}
})();
