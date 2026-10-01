import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { authenticatedFetch } from '../services/authService';
import { API_URLS } from '../config/api';
import { LeaveBalanceCards } from '../pages/LeaveEntitlementsPage';

const EmployeeDashboard = () => {
  const [employeeData, setEmployeeData] = useState(null);
  const [assets, setAssets] = useState([]);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [dossier, setDossier] = useState(null);
  const [balances, setBalances] = useState([]);
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
          // GetMyDossier returns a list (0 or 1) so it can back the dossier DataPage;
          // this card wants the single record.
          setDossier(Array.isArray(dossierData) ? dossierData[0] ?? null : dossierData);
        }

        // Leave balances for the current year
        const balanceResponse = await authenticatedFetch(API_URLS.LEAVE_ENTITLEMENTS.GET_MY_BALANCE());
        if (balanceResponse.ok) {
          setBalances(await balanceResponse.json());
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
      <div aria-busy="true" aria-label="Loading your dashboard">
        <div className="skeleton mb-4" style={{ height: 56, maxWidth: 360 }} />
        <Row className="g-4 mb-4">
          {[0, 1, 2].map((i) => (
            <Col md={4} key={i}><div className="skeleton" style={{ height: 96 }} /></Col>
          ))}
        </Row>
        <div className="skeleton" style={{ height: 280 }} />
      </div>
    );
  }

  const statusClass = (status) =>
    status === 'Approved' ? 'is-approved' : status === 'Rejected' ? 'is-rejected' : 'is-pending';

  const pendingCount = leaveRequests.filter((r) => r.status === 'Pending').length;

  const EmptyNote = ({ icon, children }) => (
    <div className="text-center text-muted py-4">
      <i className={`bi ${icon} d-block fs-3 mb-2`} aria-hidden="true" />
      {children}
    </div>
  );

  const SectionHeader = ({ title, to, linkText = 'View All' }) => (
    <Card.Header className="d-flex justify-content-between align-items-center py-3">
      <span>{title}</span>
      {to && (
        <Link to={to} className="small fw-semibold text-decoration-none">{linkText}</Link>
      )}
    </Card.Header>
  );

  const StatCard = ({ title, value, icon, tone, to }) => (
    <Card as={Link} to={to} className="item-card text-decoration-none h-100">
      <div className="stat-card">
        <span className={`stat-icon tone-${tone}`} aria-hidden="true"><i className={`bi bi-${icon}`} /></span>
        <div>
          <div className="stat-value">{value}</div>
          <div className="stat-label">{title}</div>
        </div>
      </div>
    </Card>
  );

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Welcome back{employeeData?.firstName ? `, ${employeeData.firstName}` : ''}</h1>
          <p>Your leave, equipment and records at a glance.</p>
        </div>
        <div className="page-header-actions">
          <Button as={Link} to="/leave-requests" variant="primary">
            <i className="bi bi-calendar-plus me-2" aria-hidden="true" />
            Request leave
          </Button>
        </div>
      </div>

      <Row className="g-4 mb-4">
        <Col md={4}>
          <StatCard title="Assets Assigned" value={assets.length} icon="laptop" tone="indigo" to="/assets" />
        </Col>
        <Col md={4}>
          <StatCard title="Leave Requests" value={leaveRequests.length} icon="calendar2-check" tone="green" to="/leave-requests" />
        </Col>
        <Col md={4}>
          <StatCard title="Awaiting decision" value={pendingCount} icon="hourglass-split" tone="amber" to="/leave-requests" />
        </Col>
      </Row>

      {balances.length > 0 && (
        <div className="mb-4">
          <h2 className="section-title">My Leave Balance ({new Date().getFullYear()})</h2>
          <LeaveBalanceCards balances={balances} />
        </div>
      )}

      <Row className="g-4">
        {/* Employee Profile Card */}
        <Col lg={6}>
          <Card className="h-100">
            <SectionHeader title="My Profile" />
            <Card.Body>
              {employeeData ? (
                <dl className="meta-list">
                  <dt>Name</dt>
                  <dd>{employeeData.firstName} {employeeData.lastName}</dd>
                  <dt>Email</dt>
                  <dd>{employeeData.email}</dd>
                  <dt>Position</dt>
                  <dd>{employeeData.position}</dd>
                  <dt>Department</dt>
                  <dd>{employeeData.departmentName}</dd>
                  <dt>Hire Date</dt>
                  <dd>{new Date(employeeData.hireDate).toLocaleDateString()}</dd>
                  {employeeData.managerName && (
                    <>
                      <dt>Manager</dt>
                      <dd>{employeeData.managerName}</dd>
                    </>
                  )}
                </dl>
              ) : (
                <EmptyNote icon="bi-person">Profile information not available</EmptyNote>
              )}
            </Card.Body>
          </Card>
        </Col>

        {/* Dossier Status */}
        <Col lg={6}>
          <Card className="h-100">
            <SectionHeader title="Employee Dossier" to="/employee-dossiers" linkText="View Dossier" />
            <Card.Body>
              {dossier ? (
                <dl className="meta-list">
                  <dt>Employment Type</dt>
                  <dd>{dossier.employmentType}</dd>
                  <dt>Address</dt>
                  <dd>{dossier.address || 'Not specified'}</dd>
                  <dt>Emergency Contact</dt>
                  <dd>{dossier.emergencyContact || 'Not specified'}</dd>
                </dl>
              ) : (
                <EmptyNote icon="bi-person-vcard">
                  Dossier not yet created. Contact HR to set up your employee dossier.
                </EmptyNote>
              )}
            </Card.Body>
          </Card>
        </Col>

        {/* Recent Assets */}
        <Col lg={6}>
          <Card className="h-100">
            <SectionHeader title="My Assets" to="/assets" />
            <Card.Body className="p-0">
              {assets.length > 0 ? (
                <ul className="list-group list-group-flush">
                  {assets.slice(0, 3).map(asset => (
                    <li key={asset.assetID} className="list-group-item d-flex align-items-center gap-3 px-4 py-3">
                      <span className="item-card-icon" aria-hidden="true"><i className="bi bi-laptop" /></span>
                      <div className="flex-grow-1 min-w-0">
                        <div className="fw-semibold">{asset.name}</div>
                        <small className="text-muted">Serial: {asset.serialNumber || '—'}</small>
                      </div>
                      <span className={`status-chip ${asset.isActive ? 'is-success' : ''}`}>
                        {asset.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyNote icon="bi-laptop">No assets assigned</EmptyNote>
              )}
            </Card.Body>
          </Card>
        </Col>

        {/* Recent Leave Requests */}
        <Col lg={6}>
          <Card className="h-100">
            <SectionHeader title="Recent Leave Requests" to="/leave-requests" />
            <Card.Body className="p-0">
              {leaveRequests.length > 0 ? (
                <ul className="list-group list-group-flush">
                  {leaveRequests.slice(0, 3).map(request => (
                    <li key={request.requestID} className="list-group-item d-flex align-items-center gap-3 px-4 py-3">
                      <span className="item-card-icon" aria-hidden="true"><i className="bi bi-calendar2-week" /></span>
                      <div className="flex-grow-1 min-w-0">
                        <div className="fw-semibold">{request.leaveType}</div>
                        <small className="text-muted">
                          {new Date(request.startDate).toLocaleDateString()} – {new Date(request.endDate).toLocaleDateString()}
                        </small>
                      </div>
                      <span className={`status-chip ${statusClass(request.status)}`}>{request.status}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyNote icon="bi-calendar2">No leave requests</EmptyNote>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default EmployeeDashboard;