import React from 'react';
import { Dropdown } from 'react-bootstrap';
import { logout, getUserInfo } from '../services/authService';

export const describeUser = () => {
  const info = getUserInfo();
  if (!info) return { name: 'User', email: '', role: 'Employee' };
  return {
    name: info.firstName && info.lastName ? `${info.firstName} ${info.lastName}` : info.email || 'User',
    email: info.email || '',
    // An admin also carries the Employee role, so show the most privileged one.
    role: info.roles?.includes('Admin') ? 'Admin' : info.roles?.[0] || info.position || 'Employee',
  };
};

// Account control pinned to the bottom of the sidebar; opens upwards.
const UserMenu = () => {
  const user = describeUser();

  return (
    <Dropdown drop="up" className="app-user">
      <Dropdown.Toggle as="button" className="app-user-btn" aria-label={`Account menu for ${user.name}`}>
        <span className="app-avatar" aria-hidden="true">{user.name.charAt(0).toUpperCase()}</span>
        <span className="app-user-meta">
          <b>{user.name}</b>
          <small>{user.role}</small>
        </span>
        <i className="bi bi-chevron-expand text-muted" aria-hidden="true" />
      </Dropdown.Toggle>
      <Dropdown.Menu className="app-user-menu">
        <Dropdown.Header>
          <div className="fw-semibold text-body text-truncate">{user.name}</div>
          <small className="text-muted">{user.role}</small>
          {user.email && user.email !== user.name && (
            <small className="text-muted text-truncate d-block">{user.email}</small>
          )}
        </Dropdown.Header>
        <Dropdown.Divider />
        <Dropdown.Item as="button" onClick={logout}>
          <i className="bi bi-box-arrow-right me-2" aria-hidden="true" />
          Sign out
        </Dropdown.Item>
      </Dropdown.Menu>
    </Dropdown>
  );
};

export default UserMenu;
