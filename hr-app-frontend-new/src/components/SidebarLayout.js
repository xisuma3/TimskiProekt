// SidebarLayout.js
import React from 'react';
import { Container, Row, Col, Nav } from 'react-bootstrap';
import { Link, Outlet, useLocation } from 'react-router-dom';
import TopBar from './TopBar';
import RoleBasedContent from './RoleBasedContent';
import { isAdmin } from '../services/authService';

const SidebarLayout = () => {
  const location = useLocation();

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0F172A' }}>
      {/* TopBar spans full width */}
      <TopBar />
      
      <Container fluid>
        <Row>
          {/* Sidebar */}
          <Col md={2} className="p-3" style={{ backgroundColor: '#0F172A', color: 'white', minHeight: 'calc(100vh - 80px)' }}>
            {/*<h4 className="mb-4" style={{ color: '#6366F1' }}>Navigation</h4>*/}
            <Nav className="flex-column">
              <Nav.Link 
                as={Link} 
                to="/dashboard" 
                className={`text-light mb-2 ${location.pathname === '/dashboard' ? 'active' : ''}`}
                style={location.pathname === '/dashboard' ? { backgroundColor: '#6366F1', borderRadius: '5px' } : {}}
              >
                <i className="bi bi-speedometer2 me-2"></i>Dashboard
              </Nav.Link>
              
              {/* Admin Only - Employees Management */}
              <RoleBasedContent allowedRoles={['Admin']}>
                <Nav.Link 
                  as={Link} 
                  to="/employees" 
                  className={`text-light mb-2 ${location.pathname === '/employees' ? 'active' : ''}`}
                  style={location.pathname === '/employees' ? { backgroundColor: '#6366F1', borderRadius: '5px' } : {}}
                >
                  <i className="bi bi-people me-2"></i>Employees
                </Nav.Link>
              </RoleBasedContent>

              {/* Admin Only - Departments */}
              <RoleBasedContent allowedRoles={['Admin']}>
                <Nav.Link 
                  as={Link} 
                  to="/departments" 
                  className={`text-light mb-2 ${location.pathname === '/departments' ? 'active' : ''}`}
                  style={location.pathname === '/departments' ? { backgroundColor: '#6366F1', borderRadius: '5px' } : {}}
                >
                  <i className="bi bi-building me-2"></i>Departments
                </Nav.Link>
              </RoleBasedContent>

              {/* Both Admin and Employee - Assets */}
              <Nav.Link 
                as={Link} 
                to="/assets" 
                className={`text-light mb-2 ${location.pathname === '/assets' ? 'active' : ''}`}
                style={location.pathname === '/assets' ? { backgroundColor: '#6366F1', borderRadius: '5px' } : {}}
              >
                <i className="bi bi-laptop me-2"></i>
                {isAdmin() ? 'Assets' : 'My Assets'}
              </Nav.Link>

              {/* Both Admin and Employee - Leave Requests */}
              <Nav.Link 
                as={Link} 
                to="/leave-requests" 
                className={`text-light mb-2 ${location.pathname === '/leave-requests' ? 'active' : ''}`}
                style={location.pathname === '/leave-requests' ? { backgroundColor: '#6366F1', borderRadius: '5px' } : {}}
              >
                <i className="bi bi-calendar-check me-2"></i>
                {isAdmin() ? 'Leave Requests' : 'My Leave Requests'}
              </Nav.Link>

              {/* Admin only - Leave Allowances */}
              {isAdmin() && (
                <Nav.Link
                  as={Link}
                  to="/leave-allowances"
                  className={`text-light mb-2 ${location.pathname === '/leave-allowances' ? 'active' : ''}`}
                  style={location.pathname === '/leave-allowances' ? { backgroundColor: '#6366F1', borderRadius: '5px' } : {}}
                >
                  <i className="bi bi-calendar3 me-2"></i>
                  Leave Allowances
                </Nav.Link>
              )}

              {/* Both Admin and Employee - Employee Dossiers */}
              <Nav.Link 
                as={Link} 
                to="/employee-dossiers" 
                className={`text-light mb-2 ${location.pathname === '/employee-dossiers' ? 'active' : ''}`}
                style={location.pathname === '/employee-dossiers' ? { backgroundColor: '#6366F1', borderRadius: '5px' } : {}}
              >
                <i className="bi bi-file-person me-2"></i>
                {isAdmin() ? 'Employee Dossiers' : 'My Dossier'}
              </Nav.Link>

              {/* Both Admin and Employee - Documents */}
              <Nav.Link 
                as={Link} 
                to="/documents" 
                className={`text-light mb-2 ${location.pathname === '/documents' ? 'active' : ''}`}
                style={location.pathname === '/documents' ? { backgroundColor: '#6366F1', borderRadius: '5px' } : {}}
              >
                <i className="bi bi-file-earmark-text me-2"></i>
                {isAdmin() ? 'Documents' : 'My Documents'}
              </Nav.Link>
            </Nav>
          </Col>

          {/* Main Content */}
          <Col md={10} className="p-4" style={{ backgroundColor: '#0F172A', color: 'white', minHeight: 'calc(100vh - 80px)' }}>
            <Outlet />
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default SidebarLayout;
