import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Row, Col, Alert } from 'react-bootstrap';
import { authenticatedFetch, getUserInfo, isAdmin } from '../services/authService';
import { API_URLS } from '../config/api';
import { checkAllowance, yearsSpanned } from '../services/leaveBalance';

const LeaveRequestModal = ({ show, onHide, employees = [], onSave }) => {
  const [formData, setFormData] = useState({
    employeeID: '',
    startDate: '',
    endDate: '',
    leaveType: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  // Live allowance check: null until employee, type and both dates are known.
  const [allowance, setAllowance] = useState(null);
  const [checking, setChecking] = useState(false);

  const leaveTypes = ['Vacation', 'Sick', 'Parental', 'Unpaid'];

  useEffect(() => {
    if (show) {
      // Get fresh userInfo from localStorage when modal opens
      const freshUserInfo = getUserInfo();

      if (!isAdmin() && freshUserInfo?.employeeId) {
        // For employees, always set their own employee ID
        setFormData(prev => ({
          ...prev,
          employeeID: freshUserInfo.employeeId
        }));
      } else if (isAdmin()) {
        // For admins, reset to empty (they need to select)
        setFormData(prev => ({
          ...prev,
          employeeID: ''
        }));
      }
    }
    setError('');
  }, [show]);

  const { employeeID, leaveType, startDate, endDate } = formData;
  useEffect(() => {
    const admin = isAdmin();
    if (!show || !leaveType || !startDate || !endDate || endDate < startDate || (admin && !employeeID)) {
      setAllowance(null);
      return undefined;
    }
    let cancelled = false;
    setChecking(true);
    Promise.all(yearsSpanned(startDate, endDate).map(async (year) => {
      const url = admin
        ? API_URLS.LEAVE_ENTITLEMENTS.GET_BALANCE(employeeID, year)
        : API_URLS.LEAVE_ENTITLEMENTS.GET_MY_BALANCE(year);
      const res = await authenticatedFetch(url);
      if (!res.ok) throw new Error('balance unavailable');
      return [year, await res.json()];
    }))
      .then((pairs) => {
        if (!cancelled) setAllowance(checkAllowance(Object.fromEntries(pairs), startDate, endDate, leaveType));
      })
      // If the balance can't be loaded, don't block here: the server still enforces the rule.
      .catch(() => { if (!cancelled) setAllowance(null); })
      .finally(() => { if (!cancelled) setChecking(false); });
    return () => { cancelled = true; };
  }, [show, employeeID, leaveType, startDate, endDate]);

  const blocked = Boolean(allowance && !allowance.ok);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (new Date(formData.endDate) < new Date(formData.startDate)) {
      setError('End date must be after start date');
      setLoading(false);
      return;
    }

    if (blocked) {
      setError(allowance.message);
      setLoading(false);
      return;
    }

    try {
      const response = await authenticatedFetch(
        API_URLS.LEAVE_REQUESTS.CREATE(),
        {
          method: 'POST',
          body: JSON.stringify(formData)
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create leave request');
      }

      onSave();
      onHide();
      const freshUserInfo = getUserInfo();
      setFormData({
        employeeID: freshUserInfo?.employeeId || '',
        startDate: '',
        endDate: '',
        leaveType: ''
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const calculateDays = () => {
    if (!formData.startDate || !formData.endDate) return 0;
    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);
    return Math.max(0, Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1);
  };

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Modal.Header closeButton>
        <Modal.Title>Submit Leave Request</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {error && <Alert variant="danger">{error}</Alert>}
        
        <Form onSubmit={handleSubmit}>
          <Row>
            {isAdmin() && (
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Employee *</Form.Label>
                  <Form.Select
                    name="employeeID"
                    value={formData.employeeID}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Select Employee</option>
                    {employees.map(emp => (
                      <option key={emp.employeeID} value={emp.employeeID}>
                        {emp.firstName} {emp.lastName}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
            )}
            <Col md={isAdmin() ? 6 : 12}>
              <Form.Group className="mb-3">
                <Form.Label>Leave Type *</Form.Label>
                <Form.Select
                  name="leaveType"
                  value={formData.leaveType}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select Leave Type</option>
                  {leaveTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>

          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Start Date *</Form.Label>
                <Form.Control
                  type="date"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleChange}
                  required
                  min={new Date().toISOString().split('T')[0]}
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>End Date *</Form.Label>
                <Form.Control
                  type="date"
                  name="endDate"
                  value={formData.endDate}
                  onChange={handleChange}
                  required
                  min={formData.startDate || new Date().toISOString().split('T')[0]}
                />
              </Form.Group>
            </Col>
          </Row>

          {calculateDays() > 0 && (
            <div className="status-chip is-primary mb-2">
              Duration: {calculateDays()} {calculateDays() === 1 ? 'day' : 'days'}
            </div>
          )}

          {checking && !allowance && (
            <p className="text-muted small mb-0" role="status">
              <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />
              Checking your allowance…
            </p>
          )}
          {allowance && (
            <Alert
              variant={allowance.ok ? 'success' : allowance.reason === 'none' ? 'warning' : 'danger'}
              className="d-flex gap-2 align-items-start mb-0"
              role={allowance.ok ? 'status' : 'alert'}
            >
              <i
                className={`bi ${allowance.ok ? 'bi-check-circle' : 'bi-exclamation-triangle'} mt-1`}
                aria-hidden="true"
              />
              <span>{allowance.message}</span>
            </Alert>
          )}
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handleSubmit}
          disabled={loading || blocked}
          title={blocked ? allowance.message : undefined}
        >
          {loading ? 'Submitting...' : 'Submit Request'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default LeaveRequestModal;