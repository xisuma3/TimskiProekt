import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Button, Badge, Spinner } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { authenticatedFetch } from '../services/authService';
import { API_URLS } from '../config/api';

const EmployeeDashboard = () => {
  const [employeeData, setEmployeeData] = useState(null);
  const [assets, setAssets] = useState([]);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [dossier, setDossier] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEmployeeData = async () => {
      try {
        // Fetch employee profile
        const profileResponse = await authenticatedFetch(API_URLS.EMPLOYEES.GET_MY_PROFILE());
        if (profileResponse.ok) {
          const profileData = await profileResponse.json();
          setEmployeeData(profileData);
        }

        // Fetch employee assets
        const assetsResponse = await authenticatedFetch(API_URLS.ASSETS.GET_MY_ASSETS());
        if (assetsResponse.ok) {
          const assetsData = await assetsResponse.json();
          setAssets(assetsData);
        }

        // Fetch employee leave requests
        const leaveResponse = await authenticatedFetch(API_URLS.LEAVE_REQUESTS.GET_MY_REQUESTS());
        if (leaveResponse.ok) {
          const leaveData = await leaveResponse.json();
          setLeaveRequests(leaveData);
        }

        // Fetch employee dossier
        const dossierResponse = await authenticatedFetch(API_URLS.EMPLOYEE_DOSSIERS.GET_MY_DOSSIER());
        if (dossierResponse.ok) {
          const dossierData = await dossierResponse.json();
          setDossier(dossierData);
        }

      } catch (error) {
        console.error('Failed to fetch employee data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEmployeeData();
  }, []);

  if (loading) {
    return (
      <div className="text-center">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3">Loading your dashboard...</p>
      </div>
    );
  }

  const getStatusBadge = (status) => {
    const variant = status === 'Approved' ? 'success' : 
                   status === 'Rejected' ? 'danger' : 'warning';
    return <Badge bg={variant}>{status}</Badge>;
  };

  return (
    <div>
      <h2 className="mb-4" style={{ color: '#6366F1' }}>
        Welcome, {employeeData?.firstName} {employeeData?.lastName}!
      </h2>
      
      <Row>
        {/* Employee Profile Card */}
        <Col md={6} className="mb-4">
          <Card style={{ backgroundColor: '#1E293B', borderColor: '#6366F1', color: 'white' }}>
            <Card.Header style={{ backgroundColor: '#374151', color: '#6366F1' }}>
              <h5 className="mb-0">My Profile</h5>
            </Card.Header>
            <Card.Body>
              {employeeData ? (
                <>
                  <p><strong>Name:</strong> {employeeData.firstName} {employeeData.lastName}</p>
                  <p><strong>Email:</strong> {employeeData.email}</p>
                  <p><strong>Position:</strong> {employeeData.position}</p>
                  <p><strong>Department:</strong> {employeeData.departmentName}</p>
                  <p><strong>Hire Date:</strong> {new Date(employeeData.hireDate).toLocaleDateString()}</p>
                  {employeeData.managerName && (
                    <p><strong>Manager:</strong> {employeeData.managerName}</p>
                  )}
                </>
              ) : (
                <p>Profile information not available</p>
              )}
            </Card.Body>
          </Card>
        </Col>

        {/* Quick Stats */}
        <Col md={6} className="mb-4">
          <Card style={{ backgroundColor: '#1E293B', borderColor: '#6366F1', color: 'white' }}>
            <Card.Header style={{ backgroundColor: '#374151', color: '#6366F1' }}>
              <h5 className="mb-0">Quick Stats</h5>
            </Card.Header>
            <Card.Body>
              <Row>
                <Col xs={6}>
                  <div className="text-center">
                    <h4 style={{ color: '#6366F1' }}>{assets.length}</h4>
                    <small>Assets Assigned</small>
                  </div>
                </Col>
                <Col xs={6}>
                  <div className="text-center">
                    <h4 style={{ color: '#6366F1' }}>{leaveRequests.length}</h4>
                    <small>Leave Requests</small>
                  </div>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row>
        {/* Recent Assets */}
        <Col md={6} className="mb-4">
          <Card style={{ backgroundColor: '#1E293B', borderColor: '#6366F1', color: 'white' }}>
            <Card.Header style={{ backgroundColor: '#374151', color: '#6366F1' }}>
              <div className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0">My Assets</h5>
                <Link to="/assets">
                  <Button variant="outline-primary" size="sm">View All</Button>
                </Link>
              </div>
            </Card.Header>
            <Card.Body>
              {assets.length > 0 ? (
                assets.slice(0, 3).map(asset => (
                  <div key={asset.assetID} className="mb-2 pb-2 border-bottom">
                    <h6>{asset.name}</h6>
                    <small className="text-muted">Serial: {asset.serialNumber}</small>
                    <br />
                    <Badge bg={asset.isActive ? 'success' : 'secondary'}>
                      {asset.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                ))
              ) : (
                <p>No assets assigned</p>
              )}
            </Card.Body>
          </Card>
        </Col>

        {/* Recent Leave Requests */}
        <Col md={6} className="mb-4">
          <Card style={{ backgroundColor: '#1E293B', borderColor: '#6366F1', color: 'white' }}>
            <Card.Header style={{ backgroundColor: '#374151', color: '#6366F1' }}>
              <div className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0">Recent Leave Requests</h5>
                <Link to="/leave-requests">
                  <Button variant="outline-primary" size="sm">View All</Button>
                </Link>
              </div>
            </Card.Header>
            <Card.Body>
              {leaveRequests.length > 0 ? (
                leaveRequests.slice(0, 3).map(request => (
                  <div key={request.requestID} className="mb-2 pb-2 border-bottom">
                    <div className="d-flex justify-content-between align-items-start">
                      <div>
                        <h6>{request.leaveType}</h6>
                        <small className="text-muted">
                          {new Date(request.startDate).toLocaleDateString()} - 
                          {new Date(request.endDate).toLocaleDateString()}
                        </small>
                      </div>
                      {getStatusBadge(request.status)}
                    </div>
                  </div>
                ))
              ) : (
                <p>No leave requests</p>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Dossier Status */}
      <Row>
        <Col md={12} className="mb-4">
          <Card style={{ backgroundColor: '#1E293B', borderColor: '#6366F1', color: 'white' }}>
            <Card.Header style={{ backgroundColor: '#374151', color: '#6366F1' }}>
              <div className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0">Employee Dossier</h5>
                <Link to="/employee-dossiers">
                  <Button variant="outline-primary" size="sm">View Dossier</Button>
                </Link>
              </div>
            </Card.Header>
            <Card.Body>
              {dossier ? (
                <div>
                  <p><strong>Employment Type:</strong> {dossier.employmentType}</p>
                  <p><strong>Address:</strong> {dossier.address || 'Not specified'}</p>
                  <p><strong>Emergency Contact:</strong> {dossier.emergencyContact || 'Not specified'}</p>
                </div>
              ) : (
                <p>Dossier not yet created. Contact HR to set up your employee dossier.</p>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default EmployeeDashboard;