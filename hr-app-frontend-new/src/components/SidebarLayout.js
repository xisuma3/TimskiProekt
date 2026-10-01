// SidebarLayout.js
import React, { useEffect, useState } from 'react';
import { Offcanvas } from 'react-bootstrap';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import TopBar from './TopBar';
import UserMenu from './UserMenu';
import { isAdmin } from '../services/authService';

// One list drives both the desktop sidebar and the mobile drawer.
// `adminOnly` hides an item from the menu; the route guard in AppRouter is what enforces it.
const navSections = (admin) => [
  {
    label: 'Overview',
    items: [{ to: '/dashboard', icon: 'bi-grid-1x2', label: 'Dashboard' }],
  },
  {
    label: 'People',
    items: [
      { to: '/employees', icon: 'bi-people', label: 'Employees', adminOnly: true },
      { to: '/departments', icon: 'bi-building', label: 'Departments', adminOnly: true },
      { to: '/employee-dossiers', icon: 'bi-person-vcard', label: admin ? 'Employee Dossiers' : 'My Dossier' },
    ],
  },
  {
    label: 'Time off',
    items: [
      { to: '/leave-requests', icon: 'bi-calendar2-check', label: admin ? 'Leave Requests' : 'My Leave Requests' },
      { to: '/leave-allowances', icon: 'bi-calendar3', label: 'Leave Allowances', adminOnly: true },
      { to: '/approval-cover', icon: 'bi-person-check', label: 'Approval Cover' },
    ],
  },
  {
    label: 'Resources',
    items: [
      { to: '/assets', icon: 'bi-laptop', label: admin ? 'Assets' : 'My Assets' },
      { to: '/documents', icon: 'bi-file-earmark-text', label: admin ? 'Documents' : 'My Documents' },
    ],
  },
  {
    label: 'Insights',
    items: [
      { to: '/system-analysis', icon: 'bi-graph-up', label: 'System Analysis', adminOnly: true },
    ],
  },
];

export const pageTitleFor = (pathname) => {
  for (const section of navSections(isAdmin())) {
    const match = section.items.find((i) => pathname === i.to || pathname.startsWith(`${i.to}/`));
    if (match) return match.label;
  }
  if (pathname.startsWith('/document-templates')) return 'Document Templates';
  if (pathname.startsWith('/generated-documents')) return 'Generated Documents';
  return 'HR Management';
};

const SidebarNav = ({ onNavigate }) => {
  const admin = isAdmin();
  return (
    <>
      <Link to="/dashboard" className="app-sidebar-brand" onClick={onNavigate}>
        <span className="app-brand-mark"><i className="bi bi-people-fill" aria-hidden="true" /></span>
        HR Management
      </Link>
      <nav className="app-nav" aria-label="Main">
        {navSections(admin).map((section) => {
          const items = section.items.filter((i) => admin || !i.adminOnly);
          if (items.length === 0) return null;
          return (
            <div key={section.label}>
              <div className="app-nav-section">{section.label}</div>
              {items.map((item) => (
                <NavLink key={item.to} to={item.to} className="app-nav-link" onClick={onNavigate}>
                  <i className={`bi ${item.icon}`} aria-hidden="true" />
                  {item.label}
                </NavLink>
              ))}
            </div>
          );
        })}
      </nav>
      <div className="app-sidebar-foot">
        <UserMenu />
      </div>
    </>
  );
};

const SidebarLayout = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  // Close the mobile drawer whenever the route changes.
  useEffect(() => setMenuOpen(false), [location.pathname]);

  return (
    <div className="app-shell">
      <a className="visually-hidden-focusable position-absolute m-2 p-2 bg-body rounded" href="#app-content">
        Skip to content
      </a>

      <aside className="app-sidebar">
        <SidebarNav />
      </aside>

      <Offcanvas show={menuOpen} onHide={() => setMenuOpen(false)} className="app-offcanvas" aria-label="Main menu">
        <Offcanvas.Body>
          <SidebarNav onNavigate={() => setMenuOpen(false)} />
        </Offcanvas.Body>
      </Offcanvas>

      <div className="app-main">
        <TopBar title={pageTitleFor(location.pathname)} onMenuClick={() => setMenuOpen(true)} />
        <main id="app-content" className="app-content" tabIndex={-1}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default SidebarLayout;
