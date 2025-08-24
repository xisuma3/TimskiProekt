import axios from 'axios';
import { API_URLS } from '../config/api';

export const login = async (email, password) => {
  const response = await axios.post(API_URLS.LOGIN(), { email, password });
  return response.data;
};

export const register = async (registrationData, password = null) => {
  // Handle both old format (email, password) and new format (full employee details)
  let payload;
  if (typeof registrationData === 'string' && password) {
    // Old format: register(email, password)
    payload = { email: registrationData, password: password };
  } else {
    // New format: register({ email, password, firstName, ... })
    payload = registrationData;
  }
  
  const response = await axios.post(API_URLS.REGISTER(), payload);
  return response.data;
};

// Get the stored token
export const getToken = () => {
  return localStorage.getItem('token');
};

// Check if user is logged in
export const isLoggedIn = () => {
  return !!getToken();
};

// Get user info from localStorage
export const getUserInfo = () => {
  const userInfo = localStorage.getItem('userInfo');
  return userInfo ? JSON.parse(userInfo) : null;
};

// Get user roles
export const getUserRoles = () => {
  const userInfo = getUserInfo();
  return userInfo?.roles || [];
};

// Check if user has specific role
export const hasRole = (role) => {
  const roles = getUserRoles();
  return roles.includes(role);
};

// Check if user is admin
export const isAdmin = () => {
  return hasRole('Admin');
};

// Check if user is employee
export const isEmployee = () => {
  return hasRole('Employee');
};

// Fetch and store user details
export const fetchUserDetails = async (userId) => {
  try {
    const response = await authenticatedFetch(API_URLS.USER.GET_BY_ID(userId));
    if (response.ok) {
      const userData = await response.json();
      localStorage.setItem('userInfo', JSON.stringify(userData));
      return userData;
    }
  } catch (error) {
    console.error('Failed to fetch user details:', error);
  }
  return null;
};

// Fetch employee details by ApplicationUserId and merge with existing userInfo
export const fetchEmployeeDetails = async (userId) => {
  try {
    // Use GetMyProfile for current user's employee details
    const response = await authenticatedFetch(API_URLS.EMPLOYEES.GET_MY_PROFILE());
    
    if (response.ok) {
      const employee = await response.json();
      
      if (employee) {
        // Get existing userInfo and merge with employee data
        const existingUserInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
        const updatedUserInfo = {
          ...existingUserInfo,
          firstName: employee.firstName,
          lastName: employee.lastName,
          position: employee.position,
          departmentName: employee.departmentName,
          employeeId: employee.employeeID
        };
        localStorage.setItem('userInfo', JSON.stringify(updatedUserInfo));
        return updatedUserInfo;
      }
    }
  } catch (error) {
    console.error('Failed to fetch employee details:', error);
  }
  return null;
};

// Logout function
export const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('userInfo');
  window.location.href = '/login';
};

// Make authenticated request
export const authenticatedFetch = async (url, options = {}) => {
  const token = getToken();
  
  if (!token) {
    throw new Error('No authentication token found');
  }

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    ...options.headers
  };

  const response = await fetch(url, {
    ...options,
    headers
  });

  if (response.status === 401) {
    // Token expired or invalid
    logout();
    throw new Error('Authentication failed');
  }

  return response;
};
