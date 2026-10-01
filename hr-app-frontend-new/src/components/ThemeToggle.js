import React, { useEffect, useState } from 'react';
import { getTheme, setTheme, watchSystemTheme } from '../services/themeService';

// Icon button that flips between light and dark. `className` lets each page
// supply its own button look (Bootstrap .btn in the app, .lp-btn on landing/login).
const ThemeToggle = ({ className = 'btn btn-light' }) => {
  const [theme, setThemeState] = useState(getTheme);

  useEffect(() => {
    const onChange = (e) => setThemeState(e.detail);
    window.addEventListener('themechange', onChange);
    const unwatch = watchSystemTheme(setThemeState);
    return () => {
      window.removeEventListener('themechange', onChange);
      unwatch();
    };
  }, []);

  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      className={`theme-toggle ${className}`}
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <i className={`bi ${isDark ? 'bi-sun' : 'bi-moon-stars'}`} aria-hidden="true" />
    </button>
  );
};

export default ThemeToggle;
