// API Configuration
const API_CONFIG = {
  // Use environment variable or fallback to localhost for development
  BASE_URL: process.env.REACT_APP_API_URL || 'http://localhost:5190',
  
  // API endpoints
  ENDPOINTS: {
    AUTH: '/api/Auth',
    EMPLOYEE: '/api/Employee',
    DEPARTMENT: '/api/Department',
    ASSET: '/api/Asset',
    DOCUMENT_TEMPLATE: '/api/DocumentTemplate',
    GENERATED_DOCUMENT: '/api/GeneratedDocument',
    LEAVE_REQUEST: '/api/LeaveRequest',
    EMPLOYEE_DOSSIER: '/api/EmployeeDossier',
    USER: '/api/User'
  }
};

// Helper function to build full API URLs
export const buildApiUrl = (endpoint, path = '') => {
  return `${API_CONFIG.BASE_URL}${endpoint}${path}`;
};

// Export individual endpoint builders for convenience
export const API_URLS = {
  // Auth endpoints
  LOGIN: () => buildApiUrl(API_CONFIG.ENDPOINTS.AUTH, '/login'),
  REGISTER: () => buildApiUrl(API_CONFIG.ENDPOINTS.AUTH, '/register'),
  
  // Employee endpoints
  EMPLOYEES: {
    GET_ALL: () => buildApiUrl(API_CONFIG.ENDPOINTS.EMPLOYEE, '/GetAll'),
    GET_BY_ID: (id) => buildApiUrl(API_CONFIG.ENDPOINTS.EMPLOYEE, `/GetById/${id}`),
    GET_MY_PROFILE: () => buildApiUrl(API_CONFIG.ENDPOINTS.EMPLOYEE, '/GetMyProfile'),
    CREATE: () => buildApiUrl(API_CONFIG.ENDPOINTS.EMPLOYEE, '/Create'),
    UPDATE: (id) => buildApiUrl(API_CONFIG.ENDPOINTS.EMPLOYEE, `/Edit/${id}`),
    DELETE: (id) => buildApiUrl(API_CONFIG.ENDPOINTS.EMPLOYEE, `/Delete/${id}`)
  },
  
  // Department endpoints
  DEPARTMENTS: {
    GET_ALL: () => buildApiUrl(API_CONFIG.ENDPOINTS.DEPARTMENT, '/GetAll'),
    CREATE: () => buildApiUrl(API_CONFIG.ENDPOINTS.DEPARTMENT, '/Create'),
    UPDATE: (id) => buildApiUrl(API_CONFIG.ENDPOINTS.DEPARTMENT, `/Edit/${id}`),
    DELETE: (id) => buildApiUrl(API_CONFIG.ENDPOINTS.DEPARTMENT, `/Delete/${id}`)
  },
  
  // Asset endpoints
  ASSETS: {
    GET_ALL: () => buildApiUrl(API_CONFIG.ENDPOINTS.ASSET, '/GetAll'),
    GET_MY_ASSETS: () => buildApiUrl(API_CONFIG.ENDPOINTS.ASSET, '/GetMyAssets'),
    CREATE: () => buildApiUrl(API_CONFIG.ENDPOINTS.ASSET, '/Create'),
    UPDATE: (id) => buildApiUrl(API_CONFIG.ENDPOINTS.ASSET, `/Update/${id}`),
    DELETE: (id) => buildApiUrl(API_CONFIG.ENDPOINTS.ASSET, `/Delete/${id}`)
  },
  
  // Document Template endpoints
  DOCUMENT_TEMPLATES: {
    GET_ALL: () => buildApiUrl(API_CONFIG.ENDPOINTS.DOCUMENT_TEMPLATE, '/GetAll'),
    PREVIEW: () => buildApiUrl(API_CONFIG.ENDPOINTS.DOCUMENT_TEMPLATE, '/Preview'),
    CREATE: () => buildApiUrl(API_CONFIG.ENDPOINTS.DOCUMENT_TEMPLATE, '/Create'),
    UPDATE: (id) => buildApiUrl(API_CONFIG.ENDPOINTS.DOCUMENT_TEMPLATE, `/Update/${id}`),
    DELETE: (id) => buildApiUrl(API_CONFIG.ENDPOINTS.DOCUMENT_TEMPLATE, `/Delete/${id}`)
  },
  
  // Generated Document endpoints
  GENERATED_DOCUMENTS: {
    GET_ALL: () => buildApiUrl(API_CONFIG.ENDPOINTS.GENERATED_DOCUMENT, '/GetAll'),
    GET_MY_DOCUMENTS: () => buildApiUrl(API_CONFIG.ENDPOINTS.GENERATED_DOCUMENT, '/GetMyDocuments'),
    GET_CONTENT: (id) => buildApiUrl(API_CONFIG.ENDPOINTS.GENERATED_DOCUMENT, `/GetContent/${id}`),
    GENERATE: () => buildApiUrl(API_CONFIG.ENDPOINTS.GENERATED_DOCUMENT, '/Generate'),
    DELETE: (id) => buildApiUrl(API_CONFIG.ENDPOINTS.GENERATED_DOCUMENT, `/Delete/${id}`)
  },
  
  // Leave Request endpoints
  LEAVE_REQUESTS: {
    GET_ALL: () => buildApiUrl(API_CONFIG.ENDPOINTS.LEAVE_REQUEST, '/GetAll'),
    GET_MY_REQUESTS: () => buildApiUrl(API_CONFIG.ENDPOINTS.LEAVE_REQUEST, '/GetMyLeaveRequests'),
    CREATE: () => buildApiUrl(API_CONFIG.ENDPOINTS.LEAVE_REQUEST, '/Create'),
    UPDATE: (id) => buildApiUrl(API_CONFIG.ENDPOINTS.LEAVE_REQUEST, `/Update/${id}`),
    DELETE: (id) => buildApiUrl(API_CONFIG.ENDPOINTS.LEAVE_REQUEST, `/Delete/${id}`),
    APPROVE: (id) => buildApiUrl(API_CONFIG.ENDPOINTS.LEAVE_REQUEST, `/Approve/${id}/approve`),
    REJECT: (id) => buildApiUrl(API_CONFIG.ENDPOINTS.LEAVE_REQUEST, `/Reject/${id}/reject`)
  },

  // Employee Dossier endpoints
  EMPLOYEE_DOSSIERS: {
    GET_ALL: () => buildApiUrl(API_CONFIG.ENDPOINTS.EMPLOYEE_DOSSIER, '/GetAll'),
    GET_MY_DOSSIER: () => buildApiUrl(API_CONFIG.ENDPOINTS.EMPLOYEE_DOSSIER, '/GetMyDossier'),
    CREATE: () => buildApiUrl(API_CONFIG.ENDPOINTS.EMPLOYEE_DOSSIER, '/Create'),
    UPDATE: (id) => buildApiUrl(API_CONFIG.ENDPOINTS.EMPLOYEE_DOSSIER, `/Update/${id}`),
    DELETE: (id) => buildApiUrl(API_CONFIG.ENDPOINTS.EMPLOYEE_DOSSIER, `/Delete/${id}`)
  },

  // User endpoints
  USER: {
    GET_ALL: () => buildApiUrl(API_CONFIG.ENDPOINTS.USER, '/GetAll'),
    GET_BY_ID: (id) => buildApiUrl(API_CONFIG.ENDPOINTS.USER, `/GetById/${id}`),
    CREATE: () => buildApiUrl(API_CONFIG.ENDPOINTS.USER, '/Create'),
    UPDATE: (id) => buildApiUrl(API_CONFIG.ENDPOINTS.USER, `/Edit/${id}`),
    DELETE: (id) => buildApiUrl(API_CONFIG.ENDPOINTS.USER, `/Delete/${id}`)
  }
};

export default API_CONFIG;