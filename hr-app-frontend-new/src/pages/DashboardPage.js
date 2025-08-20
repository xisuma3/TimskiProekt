import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Spinner } from 'react-bootstrap';
import { authenticatedFetch } from '../services/authService';
import { API_URLS } from '../config/api';

const DashboardPage = () => {
  const [stats, setStats] = useState({
    totalEmployees: 0,
    pendingLeaveRequests: 0,
    totalAssets: 0,
    totalDepartments: 0,
    activeAssets: 0,
    recentLeaveRequests: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [employees, leaveRequests, assets, departments] = await Promise.all([
          authenticatedFetch(API_URLS.EMPLOYEES.GET_ALL()).then(r => r.json()),
          authenticatedFetch(API_URLS.LEAVE_REQUESTS.GET_ALL()).then(r => r.json()),
          authenticatedFetch(API_URLS.ASSETS.GET_ALL()).then(r => r.json()),
          authenticatedFetch(API_URLS.DEPARTMENTS.GET_ALL()).then(r => r.json())
        ]);

        const pendingRequests = leaveRequests.filter(req => req.status === 'Pending');
        const activeAssets = assets.filter(asset => asset.isActive);
        const recentRequests = leaveRequests
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .slice(0, 5);

        setStats({
          totalEmployees: employees.length,
          pendingLeaveRequests: pendingRequests.length,
          totalAssets: assets.length,
          totalDepartments: departments.length,
          activeAssets: activeAssets.length,
          recentLeaveRequests: recentRequests
        });
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const StatCard = ({ title, value, icon, color = '#6366F1' }) => (
    <Card className="shadow h-100" style={{ backgroundColor: '#1E293B', borderColor: color, color: 'white' }}>
      <Card.Body className="d-flex align-items-center">
        <div className="flex-grow-1">
          <h3 className="mb-0" style={{ color, fontWeight: 'bold' }}>{value}</h3>
          <p className="mb-0" style={{ color: '#94A3B8' }}>{title}</p>
        </div>
        <i className={`bi bi-${icon} fs-1`} style={{ color, opacity: 0.3 }}></i>
      </Card.Body>
    </Card>
  );

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#232B4D', color: 'white', padding: '2rem' }}>
        <Container>
          <div className="text-center">
            <Spinner animation="border" variant="light" />
          </div>
        </Container>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#232B4D', color: 'white', paddingTop: '2rem' }}>
      <Container>
        <h1 className="mb-4" style={{ color: '#6366F1' }}>HR Dashboard</h1>
        
        <Row className="mb-4">
          <Col lg={3} md={6} className="mb-3">
            <StatCard 
              title="Total Employees" 
              value={stats.totalEmployees} 
              icon="people" 
              color="#6366F1" 
            />
          </Col>
          <Col lg={3} md={6} className="mb-3">
            <StatCard 
              title="Pending Leave Requests" 
              value={stats.pendingLeaveRequests} 
              icon="calendar-check" 
              color="#f59e0b" 
            />
          </Col>
          <Col lg={3} md={6} className="mb-3">
            <StatCard 
              title="Active Assets" 
              value={stats.activeAssets} 
              icon="laptop" 
              color="#10b981" 
            />
          </Col>
          <Col lg={3} md={6} className="mb-3">
            <StatCard 
              title="Departments" 
              value={stats.totalDepartments} 
              icon="building" 
              color="#8b5cf6" 
            />
          </Col>
        </Row>

        <Row>
          <Col lg={8}>
            <Card className="shadow" style={{ backgroundColor: '#1E293B', borderColor: '#6366F1', color: 'white' }}>
              <Card.Header style={{ backgroundColor: '#1E293B', borderColor: '#6366F1' }}>
                <h5 className="mb-0" style={{ color: '#6366F1' }}>Recent Leave Requests</h5>
              </Card.Header>
              <Card.Body>
                {stats.recentLeaveRequests.length === 0 ? (
                  <p className="text-muted">No recent leave requests</p>
                ) : (
                  <div className="list-group list-group-flush">
                    {stats.recentLeaveRequests.map((request) => (
                      <div key={request.requestID} className="list-group-item" style={{ backgroundColor: 'transparent', borderColor: '#374151' }}>
                        <div className="d-flex justify-content-between align-items-center">
                          <div>
                            <h6 className="mb-1" style={{ color: 'white' }}>{request.employeeName}</h6>
                            <small className="text-muted">
                              {request.leaveType} • {new Date(request.startDate).toLocaleDateString()} - {new Date(request.endDate).toLocaleDateString()}
                            </small>
                          </div>
                          <span className={`badge ${
                            request.status === 'Approved' ? 'bg-success' : 
                            request.status === 'Rejected' ? 'bg-danger' : 'bg-warning'
                          }`}>
                            {request.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card.Body>
            </Card>
          </Col>
          
          <Col lg={4}>
            <Card className="shadow" style={{ backgroundColor: '#1E293B', borderColor: '#6366F1', color: 'white' }}>
              <Card.Header style={{ backgroundColor: '#1E293B', borderColor: '#6366F1' }}>
                <h5 className="mb-0" style={{ color: '#6366F1' }}>Quick Stats</h5>
              </Card.Header>
              <Card.Body>
                <div className="mb-3">
                  <small style={{ color: '#94A3B8' }}>Asset Utilization</small>
                  <div className="progress mt-1" style={{ backgroundColor: '#374151' }}>
                    <div 
                      className="progress-bar" 
                      style={{ 
                        backgroundColor: '#10b981',
                        width: `${stats.totalAssets > 0 ? (stats.activeAssets / stats.totalAssets) * 100 : 0}%`
                      }}
                    ></div>
                  </div>
                  <small style={{ color: '#94A3B8' }}>
                    {stats.activeAssets} of {stats.totalAssets} assets active
                  </small>
                </div>
                
                <div className="mb-3">
                  <small style={{ color: '#94A3B8' }}>Pending Requests Rate</small>
                  <div className="progress mt-1" style={{ backgroundColor: '#374151' }}>
                    <div 
                      className="progress-bar" 
                      style={{ 
                        backgroundColor: '#f59e0b',
                        width: `${stats.recentLeaveRequests.length > 0 ? (stats.pendingLeaveRequests / stats.recentLeaveRequests.length) * 100 : 0}%`
                      }}
                    ></div>
                  </div>
                  <small style={{ color: '#94A3B8' }}>
                    {stats.pendingLeaveRequests} pending requests
                  </small>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default DashboardPage;