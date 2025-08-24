import React from 'react';
import { Navigate } from 'react-router-dom';
import { hasRole } from '../services/authService';

const RoleBasedRoute = ({ children, allowedRoles = [], redirectTo = '/dashboard' }) => {
  const userHasRole = allowedRoles.some(role => hasRole(role));
  
  if (!userHasRole) {
    return <Navigate to={redirectTo} />;
  }
  
  return children;
};

export default RoleBasedRoute;