import { NavLink } from 'react-router-dom';
import { FUTURE_READY, NAV_SECTIONS } from '../navConfig';
import { IconPlane } from './icons';

export function Sidebar() {
  return (
    <aside className="sidebar">
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
                {item.comingSoon && <span className="sidebar-badge">Soon</span>}
              </NavLink>
            ))}
          </div>
        ))}

        <div className="sidebar-section">
          <h3 className="sidebar-section-label">Future Ready</h3>
          {FUTURE_READY.map((item) => (
            <div className="sidebar-link sidebar-link--future" key={item.label}>
              <span className="sidebar-link-icon">{item.icon}</span>
              <span className="sidebar-link-label">{item.label}</span>
              <span className="sidebar-badge sidebar-badge--muted">Roadmap</span>
            </div>
          ))}
        </div>
      </nav>

      <div className="sidebar-footer">
        <p>MSc Thesis Platform</p>
        <p>Explainable AI &middot; Systemic Causation</p>
      </div>
    </aside>
  );
}
