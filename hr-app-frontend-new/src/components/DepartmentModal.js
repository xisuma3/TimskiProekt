import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Alert } from 'react-bootstrap';
import { authenticatedFetch } from '../services/authService';
import { API_URLS } from '../config/api';

const DepartmentModal = ({ show, onHide, department = null, onSave }) => {
  const [formData, setFormData] = useState({
    name: '', // Backend expects 'Name' field (consistent with entity)
    description: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isEditing = !!department;

  useEffect(() => {
    if (department) {
      setFormData({
        name: department.name || '',
        description: department.description || ''
      });
    } else {
      setFormData({
        name: '',
        description: ''
      });
    }
    setError('');
  }, [department, show]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const url = isEditing 
        ? API_URLS.DEPARTMENTS.UPDATE(department.departmentID)
        : API_URLS.DEPARTMENTS.CREATE();
      
      const method = isEditing ? 'PUT' : 'POST';
      
      const response = await authenticatedFetch(url, {
        method,
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        throw new Error(`Failed to ${isEditing ? 'update' : 'create'} department.`);
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
        <Modal.Title>{isEditing ? 'Edit Department' : 'Add New Department'}</Modal.Title>
      </Modal.Header>
      <Modal.Body style={{ backgroundColor: '#0F172A', color: 'white' }}>
        {error && <Alert variant="danger">{error}</Alert>}
        
        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3">
            <Form.Label>Department Name *</Form.Label>
            <Form.Control
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              style={{ backgroundColor: '#1E293B', color: 'white', borderColor: '#6366F1' }}
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Description</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              name="description"
              value={formData.description}
              onChange={handleChange}
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

export default DepartmentModal;