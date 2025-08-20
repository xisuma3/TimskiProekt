import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Row, Col, Alert } from 'react-bootstrap';
import { authenticatedFetch } from '../services/authService';
import { API_URLS } from '../config/api';

const AssetModal = ({ show, onHide, asset = null, onSave, employees = [] }) => {
  const [formData, setFormData] = useState({
    name: '', // Backend expects 'Name' field
    description: '', // Backend expects 'Description' field (required)
    serialNumber: '',
    employeeID: '', // Backend expects 'EmployeeID' for assignment
    isActive: true
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isEditing = !!asset;

  useEffect(() => {
    if (asset) {
      setFormData({
        name: asset.name || '',
        description: asset.description || '',
        serialNumber: asset.serialNumber || '',
        employeeID: asset.employeeID || '',
        isActive: asset.isActive !== undefined ? asset.isActive : true
      });
    } else {
      setFormData({
        name: '',
        description: '',
        serialNumber: '',
        employeeID: '',
        isActive: true
      });
    }
    setError('');
  }, [asset, show]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const url = isEditing 
        ? API_URLS.ASSETS.UPDATE(asset.assetID)
        : API_URLS.ASSETS.CREATE();
      
      const method = isEditing ? 'PUT' : 'POST';
      
      const submitData = {
        ...formData,
        employeeID: formData.employeeID || null
      };

      const response = await authenticatedFetch(url, {
        method,
        body: JSON.stringify(submitData)
      });

      if (!response.ok) {
        throw new Error(`Failed to ${isEditing ? 'update' : 'create'} asset.`);
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
        <Modal.Title>{isEditing ? 'Edit Asset' : 'Add New Asset'}</Modal.Title>
      </Modal.Header>
      <Modal.Body style={{ backgroundColor: '#0F172A', color: 'white' }}>
        {error && <Alert variant="danger">{error}</Alert>}
        
        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3">
            <Form.Label>Asset Name *</Form.Label>
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
            <Form.Label>Description *</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              name="description"
              value={formData.description}
              onChange={handleChange}
              required
              style={{ backgroundColor: '#1E293B', color: 'white', borderColor: '#6366F1' }}
            />
          </Form.Group>

          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Serial Number</Form.Label>
                <Form.Control
                  type="text"
                  name="serialNumber"
                  value={formData.serialNumber}
                  onChange={handleChange}
                  style={{ backgroundColor: '#1E293B', color: 'white', borderColor: '#6366F1' }}
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Assigned To</Form.Label>
                <Form.Select
                  name="employeeID"
                  value={formData.employeeID}
                  onChange={handleChange}
                  style={{ backgroundColor: '#1E293B', color: 'white', borderColor: '#6366F1' }}
                >
                  <option value="">Unassigned</option>
                  {employees.map(emp => (
                    <option key={emp.employeeID} value={emp.employeeID}>
                      {emp.firstName} {emp.lastName}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>

          <Form.Group className="mb-3">
            <Form.Check
              type="checkbox"
              name="isActive"
              label="Active"
              checked={formData.isActive}
              onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
              style={{ color: 'white' }}
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

export default AssetModal;