// Light/dark colour mode. The theme lives on <html data-bs-theme>, which both Bootstrap
// and theme.css key off. public/index.html applies the saved choice before React loads,
// so the page never flashes the wrong theme.
const STORAGE_KEY = 'theme';
const media = () => window.matchMedia?.('(prefers-color-scheme: dark)');

// 'light' | 'dark' when the user picked one, null when following the system.
export const getStoredTheme = () => {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === 'light' || value === 'dark' ? value : null;
  } catch {
    return null;
  }
};

export const getSystemTheme = () => (media()?.matches ? 'dark' : 'light');

export const getTheme = () => getStoredTheme() || getSystemTheme();

export const applyTheme = (theme) => {
  document.documentElement.setAttribute('data-bs-theme', theme);
};

export const setTheme = (theme) => {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Storage blocked (private mode): the choice still applies for this page.
  }
  applyTheme(theme);
  window.dispatchEvent(new CustomEvent('themechange', { detail: theme }));
};

// Follow OS changes until the user makes an explicit choice. Returns an unsubscribe.
export const watchSystemTheme = (onChange) => {
  const mq = media();
  if (!mq) return () => {};
  const handler = () => {
    if (getStoredTheme()) return;
    const theme = getSystemTheme();
    applyTheme(theme);
    onChange(theme);
  };
  mq.addEventListener('change', handler);
  return () => mq.removeEventListener('change', handler);
};
