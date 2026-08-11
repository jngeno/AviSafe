import { useLocation } from 'react-router-dom';
import { NAV_SECTIONS } from '../navConfig';
import { IconMoon, IconSun } from './icons';
import { useTheme } from '../useTheme';

const ALL_ITEMS = NAV_SECTIONS.flatMap((s) => s.items);

function currentTitle(pathname: string): string {
  const exact = ALL_ITEMS.find((item) => item.to === pathname);
  if (exact) return exact.label;

  const prefixed = ALL_ITEMS.filter((item) => item.to !== '/' && pathname.startsWith(item.to));
  if (prefixed.length) return prefixed[0].label;

  return 'AviSafe';
}

export function TopBar() {
  const location = useLocation();
  const [theme, toggleTheme] = useTheme();

  return (
    <header className="topbar">
      <h1 className="topbar-title">{currentTitle(location.pathname)}</h1>
      <div className="topbar-actions">
        <button
          type="button"
          className="theme-toggle"
          onClick={toggleTheme}
          aria-label="Toggle color theme"
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? <IconSun size={16} /> : <IconMoon size={16} />}
        </button>
      </div>
    </header>
  );
}
