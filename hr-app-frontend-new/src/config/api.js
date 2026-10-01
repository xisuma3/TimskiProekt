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
    LEAVE_ENTITLEMENT: '/api/LeaveEntitlement',
    APPROVAL_DELEGATION: '/api/ApprovalDelegation'
  }
};

// ?a=1&b=2 from the defined values only.
const query = (params) => {
  const qs = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');
  return qs ? `?${qs}` : '';
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
    // Minimal colleague list (id, name, position, department) any signed-in user can read.
    GET_DIRECTORY: () => buildApiUrl(API_CONFIG.ENDPOINTS.EMPLOYEE, '/GetDirectory'),
    CREATE: () => buildApiUrl(API_CONFIG.ENDPOINTS.EMPLOYEE, '/Create'),
    UPDATE: (id) => buildApiUrl(API_CONFIG.ENDPOINTS.EMPLOYEE, `/Edit/${id}`),
    DELETE: (id) => buildApiUrl(API_CONFIG.ENDPOINTS.EMPLOYEE, `/Delete/${id}`),
    RESTORE: (id) => buildApiUrl(API_CONFIG.ENDPOINTS.EMPLOYEE, `/Restore/${id}`),
    // Irreversible: destroys personal data, keeps the employment records.
    ERASE: (id) => buildApiUrl(API_CONFIG.ENDPOINTS.EMPLOYEE, `/Erase/${id}`),
    // Append-only audit of erasures: who performed, who requested, why, when (Admin).
    ERASURE_LOG: () => buildApiUrl(API_CONFIG.ENDPOINTS.EMPLOYEE, '/GetErasureLog')
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
    DELETE: (id) => buildApiUrl(API_CONFIG.ENDPOINTS.ASSET, `/Delete/${id}`),

    // Custody. Moving an asset goes through Assign/Return so the chain is recorded;
    // never reassign by PUTting a new EmployeeID on the asset itself.
    ASSIGN: (id) => buildApiUrl(API_CONFIG.ENDPOINTS.ASSET, `/Assign/${id}`),
    RETURN: (id) => buildApiUrl(API_CONFIG.ENDPOINTS.ASSET, `/Return/${id}`),
    GET_HISTORY: (id) => buildApiUrl(API_CONFIG.ENDPOINTS.ASSET, `/GetHistory/${id}`),
    GET_MY_HISTORY: () => buildApiUrl(API_CONFIG.ENDPOINTS.ASSET, '/GetMyAssetHistory')
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
    // Employee self-service: the subject is the caller (from the token); only templates
    // with allowSelfService qualify.
    GENERATE_MINE: () => buildApiUrl(API_CONFIG.ENDPOINTS.GENERATED_DOCUMENT, '/GenerateMine'),
    DELETE: (id) => buildApiUrl(API_CONFIG.ENDPOINTS.GENERATED_DOCUMENT, `/Delete/${id}`)
  },
  
  // Leave Request endpoints
  LEAVE_REQUESTS: {
    GET_ALL: () => buildApiUrl(API_CONFIG.ENDPOINTS.LEAVE_REQUEST, '/GetAll'),
    GET_MY_REQUESTS: () => buildApiUrl(API_CONFIG.ENDPOINTS.LEAVE_REQUEST, '/GetMyLeaveRequests'),
    CREATE: () => buildApiUrl(API_CONFIG.ENDPOINTS.LEAVE_REQUEST, '/Create'),
    DELETE: (id) => buildApiUrl(API_CONFIG.ENDPOINTS.LEAVE_REQUEST, `/Delete/${id}`),
    APPROVE: (id) => buildApiUrl(API_CONFIG.ENDPOINTS.LEAVE_REQUEST, `/Approve/${id}/approve`),
    REJECT: (id) => buildApiUrl(API_CONFIG.ENDPOINTS.LEAVE_REQUEST, `/Reject/${id}/reject`),
    // A manager's direct reports. Admins see everything via GET_ALL.
    GET_MY_TEAM: (pendingOnly = false) =>
      buildApiUrl(API_CONFIG.ENDPOINTS.LEAVE_REQUEST, `/GetMyTeamRequests?pendingOnly=${pendingOnly}`)
  },

  // Leave entitlement and balance
  LEAVE_ENTITLEMENTS: {
    GET_ALL: () => buildApiUrl(API_CONFIG.ENDPOINTS.LEAVE_ENTITLEMENT, '/GetAll'),
    GET_BY_EMPLOYEE: (employeeId, year) =>
      buildApiUrl(API_CONFIG.ENDPOINTS.LEAVE_ENTITLEMENT,
        `/GetByEmployeeId/employee/${employeeId}${year ? `?year=${year}` : ''}`),
    // asOf (YYYY-MM-DD): work monthly accrual out for that date instead of today.
    GET_MY_BALANCE: (year, asOf) =>
      buildApiUrl(API_CONFIG.ENDPOINTS.LEAVE_ENTITLEMENT, `/GetMyBalance${query({ year, asOf })}`),
    GET_BALANCE: (employeeId, year, asOf) =>
      buildApiUrl(API_CONFIG.ENDPOINTS.LEAVE_ENTITLEMENT, `/GetBalance/${employeeId}${query({ year, asOf })}`),
    // Year-end carry-over (Admin). Body: { fromYear, maxDays, leaveTypes?, preview }.
    CARRY_OVER: () => buildApiUrl(API_CONFIG.ENDPOINTS.LEAVE_ENTITLEMENT, '/CarryOver'),
    CREATE: () => buildApiUrl(API_CONFIG.ENDPOINTS.LEAVE_ENTITLEMENT, '/Create'),
    UPDATE: (id) => buildApiUrl(API_CONFIG.ENDPOINTS.LEAVE_ENTITLEMENT, `/Update/${id}`),
    DELETE: (id) => buildApiUrl(API_CONFIG.ENDPOINTS.LEAVE_ENTITLEMENT, `/Delete/${id}`)
  },

  // Approval delegation: a manager's leave-approval authority handed to a colleague for a period.
  APPROVAL_DELEGATIONS: {
    GET_MINE: () => buildApiUrl(API_CONFIG.ENDPOINTS.APPROVAL_DELEGATION, '/GetMine'),
    GET_ALL: () => buildApiUrl(API_CONFIG.ENDPOINTS.APPROVAL_DELEGATION, '/GetAll'),
    CREATE: () => buildApiUrl(API_CONFIG.ENDPOINTS.APPROVAL_DELEGATION, '/Create'),
    REVOKE: (id) => buildApiUrl(API_CONFIG.ENDPOINTS.APPROVAL_DELEGATION, `/Revoke/${id}`)
  },

  // Employee Dossier endpoints
  EMPLOYEE_DOSSIERS: {
    GET_ALL: () => buildApiUrl(API_CONFIG.ENDPOINTS.EMPLOYEE_DOSSIER, '/GetAll'),
    GET_MY_DOSSIER: () => buildApiUrl(API_CONFIG.ENDPOINTS.EMPLOYEE_DOSSIER, '/GetMyDossier'),
    CREATE: () => buildApiUrl(API_CONFIG.ENDPOINTS.EMPLOYEE_DOSSIER, '/Create'),
    UPDATE: (id) => buildApiUrl(API_CONFIG.ENDPOINTS.EMPLOYEE_DOSSIER, `/Update/${id}`),
    DELETE: (id) => buildApiUrl(API_CONFIG.ENDPOINTS.EMPLOYEE_DOSSIER, `/Delete/${id}`)
  }
};

export default API_CONFIG;
