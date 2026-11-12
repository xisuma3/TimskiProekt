import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getTheme, setTheme, watchSystemTheme } from '../services/themeService';

// Icon button that flips between light and dark.
const ThemeToggle = ({ className, variant = 'ghost' }) => {
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
  const label = isDark ? 'Switch to light mode' : 'Switch to dark mode';

  return (
    <Button
      type="button"
      variant={variant}
      size="icon"
      className={className}
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label={label}
      title={label}
    >
      {isDark ? <Sun /> : <Moon />}
    </Button>
  );
};

export default ThemeToggle;
