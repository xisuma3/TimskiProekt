import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import ProtectedRoute from './components/ProtectedRoute';
import RoleBasedRoute from './components/RoleBasedRoute';
import LandingPage from './pages/LandingPage';
import EmployeesPage from './pages/EmployeesPage';
import DepartmentsPage from './pages/DepartmentsPage';
import AssetsPage from './pages/AssetsPage';
import DocumentsPage from './pages/DocumentsPage';
import DocumentTemplatesPage from './pages/DocumentTemplatesPage';
import GeneratedDocumentsPage from './pages/GeneratedDocumentsPage';
import LeaveRequestsPage from './pages/LeaveRequestsPage';
import LeaveEntitlementsPage from './pages/LeaveEntitlementsPage';
import EmployeeDosiersPage from './pages/EmployeeDosiersPage';
import DashboardPage from './pages/DashboardPage';
import SidebarLayout from './components/SidebarLayout';

const AppRouter = () => (
  <Router>
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route element={
        <ProtectedRoute>
          <SidebarLayout />
        </ProtectedRoute>
      }>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/employees" element={
            <RoleBasedRoute allowedRoles={['Admin']}>
              <EmployeesPage />
            </RoleBasedRoute>
          } />
          <Route path="/departments" element={
            <RoleBasedRoute allowedRoles={['Admin']}>
              <DepartmentsPage />
            </RoleBasedRoute>
          } />
          <Route path="/assets" element={<AssetsPage />} />
          <Route path="/documents" element={<DocumentsPage />} />
          <Route path="/document-templates" element={<DocumentTemplatesPage />} />
          <Route path="/generated-documents" element={<GeneratedDocumentsPage />} />
          <Route path="/leave-requests" element={<LeaveRequestsPage />} />
          <Route path="/leave-allowances" element={
            <RoleBasedRoute allowedRoles={['Admin']}>
              <LeaveEntitlementsPage />
            </RoleBasedRoute>
          } />
          <Route path="/employee-dossiers" element={<EmployeeDosiersPage />} />
        </Route>
    </Routes>
  </Router>
);

export default AppRouter;
