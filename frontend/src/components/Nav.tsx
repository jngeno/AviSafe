import { NavLink } from 'react-router-dom';

const LINKS = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/experiments', label: 'Experiments' },
  { to: '/train', label: 'Train' },
  { to: '/predict', label: 'Predict' },
];

export function Nav() {
  return (
    <header className="app-header">
      <div className="app-header-inner">
        <span className="app-title">AviSafe</span>
        <nav className="app-nav">
          {LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) => (isActive ? 'nav-link nav-link--active' : 'nav-link')}
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  );
}
