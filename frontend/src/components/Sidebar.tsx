import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { NAV_SECTIONS } from '../navConfig';
import { IconPlane } from './icons';

export const SIDEBAR_TOGGLE_EVENT = 'avisafe:toggle-sidebar';

export function toggleSidebar() {
  window.dispatchEvent(new CustomEvent(SIDEBAR_TOGGLE_EVENT));
}

export function Sidebar() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    function handleToggle() {
      setMobileOpen((v) => !v);
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setMobileOpen(false);
    }
    window.addEventListener(SIDEBAR_TOGGLE_EVENT, handleToggle);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener(SIDEBAR_TOGGLE_EVENT, handleToggle);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Below the tablet breakpoint the sidebar is an overlay drawer --
  // close it whenever the route changes (a NavLink click) so it
  // doesn't stay open covering the page just navigated to.
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  return (
    <>
      {mobileOpen && (
        <div
          className="sidebar-backdrop"
          aria-hidden="true"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside className={mobileOpen ? 'sidebar sidebar--open' : 'sidebar'} aria-label="Primary navigation">
        <div className="sidebar-brand">
          <span className="sidebar-brand-mark">
            <IconPlane size={16} />
          </span>
          <div className="sidebar-brand-text">
            <span className="sidebar-brand-title">AviSafe</span>
            <span className="sidebar-brand-sub">Safety Intelligence</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {NAV_SECTIONS.map((section) => (
            <div className="sidebar-section" key={section.label}>
              <h3 className="sidebar-section-label">{section.label}</h3>
              {section.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    isActive ? 'sidebar-link sidebar-link--active' : 'sidebar-link'
                  }
                >
                  <span className="sidebar-link-icon">{item.icon}</span>
                  <span className="sidebar-link-label">{item.label}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <p>MSc Thesis Platform</p>
          <p>Explainable AI &middot; Systemic Causation</p>
        </div>
      </aside>
    </>
  );
}
