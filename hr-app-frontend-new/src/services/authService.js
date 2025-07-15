import axios from 'axios';

const API_URL = 'http://localhost:5190/api/Auth'; // Change this to your backend URL if different

export const login = async (email, password) => {
  const response = await axios.post(`${API_URL}/login`, { email, password });
  return response.data;
};

export const register = async (email, password) => {
  const response = await axios.post(`${API_URL}/register`, { email, password });
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

// Fetch and store user details
export const fetchUserDetails = async (userId) => {
  try {
    const response = await authenticatedFetch(`http://localhost:5190/api/User/GetById/${userId}`);
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
