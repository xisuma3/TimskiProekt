// SidebarLayout.js
import React from 'react';
import { Container, Row, Col, Nav } from 'react-bootstrap';
import { Link, Outlet, useLocation } from 'react-router-dom';
import TopBar from './TopBar';

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
                to="/employees" 
                className={`text-light mb-2 ${location.pathname === '/employees' ? 'active' : ''}`}
                style={location.pathname === '/employees' ? { backgroundColor: '#6366F1', borderRadius: '5px' } : {}}
              >
                Employees
              </Nav.Link>
              <Nav.Link 
                as={Link} 
                to="/departments" 
                className={`text-light mb-2 ${location.pathname === '/departments' ? 'active' : ''}`}
                style={location.pathname === '/departments' ? { backgroundColor: '#6366F1', borderRadius: '5px' } : {}}
              >
                Departments
              </Nav.Link>
              <Nav.Link 
                as={Link} 
                to="/assets" 
                className={`text-light mb-2 ${location.pathname === '/assets' ? 'active' : ''}`}
                style={location.pathname === '/assets' ? { backgroundColor: '#6366F1', borderRadius: '5px' } : {}}
              >
                Assets
              </Nav.Link>
              <Nav.Link 
                as={Link} 
                to="/documents" 
                className={`text-light mb-2 ${location.pathname === '/documents' ? 'active' : ''}`}
                style={location.pathname === '/documents' ? { backgroundColor: '#6366F1', borderRadius: '5px' } : {}}
              >
                Documents
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
