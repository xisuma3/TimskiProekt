import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Button, ProgressBar } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import EmployeeDashboard from '../components/EmployeeDashboard';
import { authenticatedFetch, isAdmin } from '../services/authService';
import { API_URLS } from '../config/api';

const DashboardPage = () => {
  const [stats, setStats] = useState({
    totalEmployees: 0,
    pendingLeaveRequests: 0,
    totalLeaveRequests: 0,
    totalAssets: 0,
    totalDepartments: 0,
    activeAssets: 0,
    recentLeaveRequests: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      // Only fetch admin stats if user is admin
      if (!isAdmin()) {
        setLoading(false);
        return;
      }

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
          totalLeaveRequests: leaveRequests.length,
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

  const statusClass = (status) =>
    status === 'Approved' ? 'is-approved' : status === 'Rejected' ? 'is-rejected' : 'is-pending';

  const pct = (part, whole) => (whole > 0 ? Math.round((part / whole) * 100) : 0);

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

  if (loading) {
    return (
      <div aria-busy="true" aria-label="Loading dashboard">
        <div className="skeleton mb-4" style={{ height: 56, maxWidth: 320 }} />
        <Row className="g-4 mb-4">
          {[0, 1, 2, 3].map((i) => (
            <Col lg={3} sm={6} key={i}><div className="skeleton" style={{ height: 96 }} /></Col>
          ))}
        </Row>
        <div className="skeleton" style={{ height: 320 }} />
      </div>
    );
  }

  // Show employee dashboard for employees
  if (!isAdmin()) {
    return <EmployeeDashboard />;
  }

  const assetUse = pct(stats.activeAssets, stats.totalAssets);
  const pendingShare = pct(stats.pendingLeaveRequests, stats.totalLeaveRequests);

  // Show admin dashboard for admins
  return (
    <div>
      <div className="page-header">
        <div>
          <h1>HR Dashboard</h1>
          <p>What needs your attention across the organisation today.</p>
        </div>
        <div className="page-header-actions">
          <Button as={Link} to="/leave-requests" variant="primary">
            <i className="bi bi-calendar2-check me-2" aria-hidden="true" />
            Review leave requests
          </Button>
        </div>
      </div>

      <Row className="g-4 mb-4">
        <Col lg={3} sm={6}>
          <StatCard title="Total Employees" value={stats.totalEmployees} icon="people" tone="indigo" to="/employees" />
        </Col>
        <Col lg={3} sm={6}>
          <StatCard title="Pending Leave Requests" value={stats.pendingLeaveRequests} icon="hourglass-split" tone="amber" to="/leave-requests" />
        </Col>
        <Col lg={3} sm={6}>
          <StatCard title="Active Assets" value={stats.activeAssets} icon="laptop" tone="green" to="/assets" />
        </Col>
        <Col lg={3} sm={6}>
          <StatCard title="Departments" value={stats.totalDepartments} icon="building" tone="violet" to="/departments" />
        </Col>
      </Row>

      <Row className="g-4">
        <Col lg={8}>
          <Card className="h-100">
            <Card.Header className="d-flex justify-content-between align-items-center py-3">
              <span>Recent Leave Requests</span>
              <Link to="/leave-requests" className="small fw-semibold text-decoration-none">View all</Link>
            </Card.Header>
            <Card.Body className="p-0">
              {stats.recentLeaveRequests.length === 0 ? (
                <div className="text-center text-muted py-5">
                  <i className="bi bi-calendar2 d-block fs-3 mb-2" aria-hidden="true" />
                  No recent leave requests
                </div>
              ) : (
                <ul className="list-group list-group-flush">
                  {stats.recentLeaveRequests.map((request) => (
                    <li key={request.requestID} className="list-group-item d-flex align-items-center gap-3 px-4 py-3">
                      <span className="app-avatar" aria-hidden="true">
                        {(request.employeeName || '?').charAt(0).toUpperCase()}
                      </span>
                      <div className="flex-grow-1 min-w-0">
                        <div className="fw-semibold">{request.employeeName}</div>
                        <small className="text-muted">
                          {request.leaveType} · {new Date(request.startDate).toLocaleDateString()} – {new Date(request.endDate).toLocaleDateString()}
                        </small>
                      </div>
                      <span className={`status-chip ${statusClass(request.status)}`}>{request.status}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card.Body>
          </Card>
        </Col>

        <Col lg={4}>
          <Card className="h-100">
            <Card.Header className="py-3">At a glance</Card.Header>
            <Card.Body>
              <div className="mb-4">
                <div className="d-flex justify-content-between small mb-2">
                  <span className="fw-semibold">Asset utilisation</span>
                  <span className="text-muted">{assetUse}%</span>
                </div>
                <ProgressBar now={assetUse} variant="success" aria-label="Asset utilisation" />
                <small className="text-muted d-block mt-2">
                  {stats.activeAssets} of {stats.totalAssets} assets active
                </small>
              </div>

              <div>
                <div className="d-flex justify-content-between small mb-2">
                  <span className="fw-semibold">Requests awaiting a decision</span>
                  <span className="text-muted">{pendingShare}%</span>
                </div>
                <ProgressBar now={pendingShare} variant="warning" aria-label="Share of leave requests pending" />
                <small className="text-muted d-block mt-2">
                  {stats.pendingLeaveRequests} of {stats.totalLeaveRequests} requests pending
                </small>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default DashboardPage;