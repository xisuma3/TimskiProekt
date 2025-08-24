import React from 'react';
import { hasRole, isAdmin, isEmployee } from '../services/authService';

const RoleBasedContent = ({ adminContent, employeeContent, allowedRoles, children }) => {
  // If allowedRoles is specified, check if user has any of those roles
  if (allowedRoles) {
    const userHasRole = allowedRoles.some(role => hasRole(role));
    return userHasRole ? children : null;
  }
  
  // If admin/employee specific content is provided
  if (isAdmin() && adminContent) {
    return adminContent;
  }
  
  if (isEmployee() && employeeContent) {
    return employeeContent;
  }
  
  // Default case - render children if user has appropriate role
  return children || null;
};

export default RoleBasedContent;