import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Row, Col, Alert } from 'react-bootstrap';
import { authenticatedFetch } from '../services/authService';
import { API_URLS } from '../config/api';

const EmployeeDossierModal = ({ show, onHide, dossier = null, onSave, employees = [] }) => {
  const [formData, setFormData] = useState({
    employeeID: '',
    birthDate: '',
    address: '',
    emergencyContact: '',
    employmentType: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isEditing = !!dossier;
  const employmentTypes = ['Full-Time', 'Part-Time', 'Contract'];

  useEffect(() => {
    if (dossier) {
      setFormData({
        employeeID: dossier.employeeID || '',
        birthDate: dossier.birthDate ? new Date(dossier.birthDate).toISOString().split('T')[0] : '',
        address: dossier.address || '',
        emergencyContact: dossier.emergencyContact || '',
        employmentType: dossier.employmentType || ''
      });
    } else {
      setFormData({
        employeeID: '',
        birthDate: '',
        address: '',
        emergencyContact: '',
        employmentType: ''
      });
    }
    setError('');
  }, [dossier, show]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const url = isEditing 
        ? API_URLS.EMPLOYEE_DOSSIERS.UPDATE(dossier.dossierID)
        : API_URLS.EMPLOYEE_DOSSIERS.CREATE();
      
      const method = isEditing ? 'PUT' : 'POST';
      
      const response = await authenticatedFetch(url, {
        method,
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to ${isEditing ? 'update' : 'create'} dossier`);
      }

      onSave();
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
        <Modal.Title>{isEditing ? 'Edit Employee Dossier' : 'Create Employee Dossier'}</Modal.Title>
      </Modal.Header>
      <Modal.Body style={{ backgroundColor: '#0F172A', color: 'white' }}>
        {error && <Alert variant="danger">{error}</Alert>}
        
        <Form onSubmit={handleSubmit}>
          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Employee *</Form.Label>
                <Form.Select
                  name="employeeID"
                  value={formData.employeeID}
                  onChange={handleChange}
                  required
                  disabled={isEditing}
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
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Employment Type *</Form.Label>
                <Form.Select
                  name="employmentType"
                  value={formData.employmentType}
                  onChange={handleChange}
                  required
                  style={{ backgroundColor: '#1E293B', color: 'white', borderColor: '#6366F1' }}
                >
                  <option value="">Select Type</option>
                  {employmentTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>

          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Birth Date</Form.Label>
                <Form.Control
                  type="date"
                  name="birthDate"
                  value={formData.birthDate}
                  onChange={handleChange}
                  style={{ backgroundColor: '#1E293B', color: 'white', borderColor: '#6366F1' }}
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Emergency Contact</Form.Label>
                <Form.Control
                  type="text"
                  name="emergencyContact"
                  value={formData.emergencyContact}
                  onChange={handleChange}
                  placeholder="Name and phone number"
                  style={{ backgroundColor: '#1E293B', color: 'white', borderColor: '#6366F1' }}
                />
              </Form.Group>
            </Col>
          </Row>

          <Form.Group className="mb-3">
            <Form.Label>Address</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              name="address"
              value={formData.address}
              onChange={handleChange}
              placeholder="Full address"
              style={{ backgroundColor: '#1E293B', color: 'white', borderColor: '#6366F1' }}
            />
          </Form.Group>
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

export default EmployeeDossierModal;