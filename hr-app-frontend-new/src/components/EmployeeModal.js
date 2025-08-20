import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Row, Col, Alert } from 'react-bootstrap';
import { authenticatedFetch, register } from '../services/authService';
import { API_URLS } from '../config/api';

const EmployeeModal = ({ show, onHide, employee = null, onSave, departments = [] }) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    position: '',
    departmentID: '',
    hireDate: '',
    managerName: '',
    mentorName: '',
    password: '',
    confirmPassword: '',
    applicationUserId: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isEditing = !!employee;

  // Generate UUID for new employees
  const generateUUID = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    // Fallback for older browsers
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  useEffect(() => {
    if (employee) {
      // Find department ID by matching department name
      const matchingDept = departments.find(dept => dept.name === employee.departmentName);
      const departmentID = matchingDept ? matchingDept.departmentID : '';
      
      setFormData({
        firstName: employee.firstName || '',
        lastName: employee.lastName || '',
        email: employee.email || '',
        position: employee.position || '',
        departmentID: departmentID,
        hireDate: employee.hireDate ? new Date(employee.hireDate).toISOString().split('T')[0] : '',
        managerName: employee.managerName || '',
        mentorName: employee.mentorName || '',
        password: '',
        confirmPassword: '',
        applicationUserId: employee.applicationUserId || ''
      });
    } else {
      // For creating new employee, generate UUID
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        position: '',
        departmentID: '',
        hireDate: '',
        managerName: '',
        mentorName: '',
        password: '',
        confirmPassword: '',
        applicationUserId: generateUUID()
      });
    }
    setError('');
  }, [employee, show, departments]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isEditing) {
        // For editing employees, just update employee data (no user changes)
        const dataToSend = {
          FirstName: formData.firstName,
          LastName: formData.lastName,
          Email: formData.email,
          Position: formData.position,
          DepartmentID: formData.departmentID || null,
          HireDate: formData.hireDate,
          ManagerID: null,
          MentorID: null
        };
        
        const response = await authenticatedFetch(
          API_URLS.EMPLOYEES.UPDATE(employee.employeeID),
          {
            method: 'PUT',
            body: JSON.stringify(dataToSend)
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const errorMessage = errorData.errors 
            ? Object.values(errorData.errors).flat().join(', ')
            : 'Failed to update employee.';
          throw new Error(errorMessage);
        }

        // Check if response has content (204 No Content returns empty body)
        let savedEmployee = null;
        if (response.status !== 204) {
          savedEmployee = await response.json();
        }
        onSave(savedEmployee || formData);
        onHide();
        return;
      }

      // For new employees - validate passwords first
      if (!formData.password) {
        throw new Error('Password is required for new employees.');
      }
      if (formData.password !== formData.confirmPassword) {
        throw new Error('Passwords do not match.');
      }
      if (formData.password.length < 6) {
        throw new Error('Password must be at least 6 characters long.');
      }

      // Use the enhanced register API that creates both user and employee
      const registerData = {
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        position: formData.position,
        departmentID: formData.departmentID || null,
        hireDate: formData.hireDate
      };

      const result = await register(registerData);
      
      // The register API now creates both the user and employee
      onSave(result);
      onHide();

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
      <Modal.Header closeButton style={{ backgroundColor: '#1E293B', color: 'white', borderColor: '#6366F1' }}>
        <Modal.Title>{isEditing ? 'Edit Employee' : 'Add New Employee'}</Modal.Title>
      </Modal.Header>
      <Modal.Body style={{ backgroundColor: '#0F172A', color: 'white' }}>
        {error && <Alert variant="danger">{error}</Alert>}
        
        <Form onSubmit={handleSubmit}>
          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>First Name *</Form.Label>
                <Form.Control
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  required
                  style={{ backgroundColor: '#1E293B', color: 'white', borderColor: '#6366F1' }}
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Last Name *</Form.Label>
                <Form.Control
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  required
                  style={{ backgroundColor: '#1E293B', color: 'white', borderColor: '#6366F1' }}
                />
              </Form.Group>
            </Col>
          </Row>

          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Email *</Form.Label>
                <Form.Control
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  style={{ backgroundColor: '#1E293B', color: 'white', borderColor: '#6366F1' }}
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Position *</Form.Label>
                <Form.Control
                  type="text"
                  name="position"
                  value={formData.position}
                  onChange={handleChange}
                  required
                  style={{ backgroundColor: '#1E293B', color: 'white', borderColor: '#6366F1' }}
                />
              </Form.Group>
            </Col>
          </Row>

          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Department *</Form.Label>
                <Form.Select
                  name="departmentID"
                  value={formData.departmentID}
                  onChange={handleChange}
                  required
                  style={{ backgroundColor: '#1E293B', color: 'white', borderColor: '#6366F1' }}
                >
                  <option value="">Select Department</option>
                  {departments.map(dept => (
                    <option key={dept.departmentID} value={dept.departmentID}>
                      {dept.name}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Hire Date *</Form.Label>
                <Form.Control
                  type="date"
                  name="hireDate"
                  value={formData.hireDate}
                  onChange={handleChange}
                  required
                  style={{ backgroundColor: '#1E293B', color: 'white', borderColor: '#6366F1' }}
                />
              </Form.Group>
            </Col>
          </Row>

          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Manager</Form.Label>
                <Form.Control
                  type="text"
                  name="managerName"
                  value={formData.managerName}
                  onChange={handleChange}
                  style={{ backgroundColor: '#1E293B', color: 'white', borderColor: '#6366F1' }}
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Mentor</Form.Label>
                <Form.Control
                  type="text"
                  name="mentorName"
                  value={formData.mentorName}
                  onChange={handleChange}
                  style={{ backgroundColor: '#1E293B', color: 'white', borderColor: '#6366F1' }}
                />
              </Form.Group>
            </Col>
          </Row>

          {/* Password fields - only for new employees */}
          {!isEditing && (
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Password *</Form.Label>
                  <Form.Control
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    placeholder="Enter initial password"
                    style={{ backgroundColor: '#1E293B', color: 'white', borderColor: '#6366F1' }}
                  />
                  <Form.Text className="text-muted">
                    Minimum 6 characters
                  </Form.Text>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Confirm Password *</Form.Label>
                  <Form.Control
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                    placeholder="Confirm password"
                    style={{ backgroundColor: '#1E293B', color: 'white', borderColor: '#6366F1' }}
                  />
                </Form.Group>
              </Col>
            </Row>
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
          {loading ? 'Saving...' : (isEditing ? 'Update' : 'Create')}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default EmployeeModal; 