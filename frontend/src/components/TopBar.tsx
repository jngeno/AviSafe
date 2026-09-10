import { useLocation } from 'react-router-dom';
import { NAV_SECTIONS } from '../navConfig';
import { IconMenu, IconMoon, IconSearch, IconSun } from './icons';
import { useTheme } from '../useTheme';
import { openGlobalSearch } from './GlobalSearch';
import { toggleSidebar } from './Sidebar';

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
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
        <button
          type="button"
          className="topbar-menu-toggle"
          onClick={toggleSidebar}
          aria-label="Toggle navigation menu"
        >
          <IconMenu size={20} />
        </button>
        <h1 className="topbar-title">{currentTitle(location.pathname)}</h1>
      </div>
      <div className="topbar-actions">
        <button
          type="button"
          className="topbar-search-trigger"
          onClick={openGlobalSearch}
          title="Search (Ctrl+K)"
        >
          <IconSearch size={14} />
          <span>Search…</span>
          <kbd>Ctrl K</kbd>
        </button>
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
