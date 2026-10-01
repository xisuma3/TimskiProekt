import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Row, Col, Alert } from 'react-bootstrap';
import { authenticatedFetch, getUserInfo, isAdmin } from '../services/authService';
import { API_URLS } from '../config/api';
import { asOfForYear, checkAllowance, yearsSpanned } from '../services/leaveBalance';
import DateRangePicker from './DateRangePicker';

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
        ? API_URLS.LEAVE_ENTITLEMENTS.GET_BALANCE(employeeID, year, asOfForYear(endDate, year))
        : API_URLS.LEAVE_ENTITLEMENTS.GET_MY_BALANCE(year, asOfForYear(endDate, year));
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

  // Days this employee already has pending or approved leave on. The server refuses
  // overlaps, so the picker marks them and won't let a range cross them.
  const [booked, setBooked] = useState([]);
  useEffect(() => {
    const admin = isAdmin();
    if (!show || (admin && !employeeID)) {
      setBooked([]);
      return undefined;
    }
    let cancelled = false;
    const url = admin ? API_URLS.LEAVE_REQUESTS.GET_ALL() : API_URLS.LEAVE_REQUESTS.GET_MY_REQUESTS();
    authenticatedFetch(url)
      .then((res) => (res.ok ? res.json() : []))
      .then((list) => {
        if (cancelled) return;
        setBooked((list || []).filter((r) =>
          r.status !== 'Rejected' && (!admin || String(r.employeeID) === String(employeeID))));
      })
      .catch(() => { if (!cancelled) setBooked([]); });
    return () => { cancelled = true; };
  }, [show, employeeID]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Submit lives in the modal footer, outside the <form>, so `required` never fires — check here.
    const missing = [
      isAdmin() && !formData.employeeID && 'an employee',
      !formData.leaveType && 'a leave type',
      (!formData.startDate || !formData.endDate) && 'your first and last day',
    ].filter(Boolean);
    if (missing.length) {
      setError(`Please choose ${missing.join(', ')}.`);
      setLoading(false);
      return;
    }

    if (formData.endDate < formData.startDate) {
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

          <Form.Group className="mb-3">
            <Form.Label as="div" id="leave-dates-label">Dates *</Form.Label>
            <div role="group" aria-labelledby="leave-dates-label">
              <DateRangePicker
                start={formData.startDate}
                end={formData.endDate}
                booked={booked}
                onChange={({ start, end }) => setFormData((prev) => ({ ...prev, startDate: start, endDate: end }))}
              />
            </div>
          </Form.Group>

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