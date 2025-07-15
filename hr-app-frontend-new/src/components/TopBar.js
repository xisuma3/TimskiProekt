import React, { useState, useEffect } from 'react';
import { Button, Navbar, Container, Dropdown } from 'react-bootstrap';
import { logout, getUserInfo } from '../services/authService';

const TopBar = () => {
  const [userInfo, setUserInfo] = useState({
    name: 'User',
    email: '',
    role: 'Employee'
  });

  useEffect(() => {
    // Get user info from localStorage
    const storedUserInfo = getUserInfo();
    if (storedUserInfo) {
      setUserInfo({
        name: storedUserInfo.firstName && storedUserInfo.lastName 
          ? `${storedUserInfo.firstName} ${storedUserInfo.lastName}`
          : storedUserInfo.email || 'User',
        email: storedUserInfo.email || '',
        role: storedUserInfo.role || storedUserInfo.position || 'Employee'
      });
    }
  }, []);

  return (
    <div style={{ 
      backgroundColor: '#1E293B', 
      borderBottom: '1px solid #334155',
      padding: '1rem 0'
    }}>
      <Container fluid>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center' 
        }}>
          {/* Left side - Page title */}
          <div>
            <h4 style={{ 
              color: '#6366F1', 
              margin: 0, 
              fontWeight: '600',
              fontSize: '1.5rem'
            }}>
              HR Management System
            </h4>
          </div>

          {/* Right side - User info and logout */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '1rem' 
          }}>
            {/* User info */}
            <div style={{ 
              textAlign: 'right',
              marginRight: '1rem'
            }}>
              <div style={{ 
                color: 'white', 
                fontWeight: '500',
                fontSize: '0.95rem'
              }}>
                {userInfo.name}
              </div>
              <div style={{ 
                color: '#94A3B8', 
                fontSize: '0.8rem'
              }}>
                {userInfo.role}
              </div>
            </div>

            {/* User avatar */}
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              backgroundColor: '#6366F1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: 'bold',
              fontSize: '1.1rem'
            }}>
              {userInfo.name.charAt(0)}
            </div>

            {/* Logout button */}
            <Button
              variant="outline-light"
              onClick={logout}
              size="sm"
              style={{ 
                borderColor: '#6366F1', 
                color: '#6366F1',
                padding: '0.375rem 1rem',
                fontSize: '0.875rem',
                borderRadius: '6px'
              }}
            >
              Logout
            </Button>
          </div>
        </div>
      </Container>
    </div>
  );
};

export default TopBar; 