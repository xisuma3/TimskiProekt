import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Row, Col, Alert } from 'react-bootstrap';
import { authenticatedFetch, getUserInfo, isAdmin } from '../services/authService';
import { API_URLS } from '../config/api';

const LeaveRequestModal = ({ show, onHide, employees = [], onSave }) => {
  const [formData, setFormData] = useState({
    employeeID: '',
    startDate: '',
    endDate: '',
    leaveType: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [userInfo, setUserInfo] = useState(getUserInfo());

  const leaveTypes = ['Vacation', 'Sick', 'Parental', 'Unpaid'];

  useEffect(() => {
    if (show) {
      // Get fresh userInfo from localStorage when modal opens
      const freshUserInfo = getUserInfo();
      setUserInfo(freshUserInfo);
      
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (new Date(formData.endDate) < new Date(formData.startDate)) {
      setError('End date must be after start date');
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
      <Modal.Header closeButton style={{ backgroundColor: '#1E293B', color: 'white', borderColor: '#6366F1' }}>
        <Modal.Title>Submit Leave Request</Modal.Title>
      </Modal.Header>
      <Modal.Body style={{ backgroundColor: '#0F172A', color: 'white' }}>
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
                    style={{ backgroundColor: '#1E293B', color: 'white', borderColor: '#6366F1' }}
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
                  style={{ backgroundColor: '#1E293B', color: 'white', borderColor: '#6366F1' }}
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
                  style={{ backgroundColor: '#1E293B', color: 'white', borderColor: '#6366F1' }}
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
                  style={{ backgroundColor: '#1E293B', color: 'white', borderColor: '#6366F1' }}
                />
              </Form.Group>
            </Col>
          </Row>

          {calculateDays() > 0 && (
            <div className="mb-3 text-center" style={{ color: '#6366F1' }}>
              <strong>Duration: {calculateDays()} days</strong>
            </div>
          )}
        </Form>
      </Modal.Body>
      <Modal.Footer style={{ backgroundColor: '#1E293B', borderColor: '#6366F1' }}>
        <Button variant="secondary" onClick={onHide}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={loading}
          style={{ backgroundColor: '#6366F1', borderColor: '#6366F1' }}
        >
          {loading ? 'Submitting...' : 'Submit Request'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default LeaveRequestModal;