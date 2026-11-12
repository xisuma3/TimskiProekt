// Light/dark colour mode. Dark mode is the `dark` class on <html>, which Tailwind's `dark:`
// variant and the shadcn tokens in index.css key off. index.html applies the saved choice
// before React loads, so the page never flashes the wrong theme.
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
  document.documentElement.classList.toggle('dark', theme === 'dark');
  // Native controls (scrollbars, date inputs) follow along.
  document.documentElement.style.colorScheme = theme;
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
