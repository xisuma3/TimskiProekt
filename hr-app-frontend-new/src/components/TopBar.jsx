import React from 'react';
import { Button } from 'react-bootstrap';
import ThemeToggle from './ThemeToggle';
import NotificationBell from './NotificationBell';

// The account menu lives at the bottom of the sidebar (UserMenu); the top bar keeps
// the page title and the always-visible controls.
const TopBar = ({ title, onMenuClick }) => (
  <header className="app-topbar">
    <Button
      variant="light"
      className="app-menu-btn btn-icon"
      onClick={onMenuClick}
      aria-label="Open menu"
    >
      <i className="bi bi-list fs-5" aria-hidden="true" />
    </Button>

    <h2 className="app-topbar-title flex-grow-1">{title}</h2>

    <NotificationBell />
    <ThemeToggle />
  </header>
);

export default TopBar;
