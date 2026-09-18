import React, { useState } from 'react';
import { Card, Button, ButtonGroup, Modal } from 'react-bootstrap';
import DataPage from '../components/DataPage';
import DepartmentModal from '../components/DepartmentModal';
import { authenticatedFetch } from '../services/authService';
import { API_URLS } from '../config/api';

const DepartmentsPage = () => {
  const [showModal, setShowModal] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [departmentToDelete, setDepartmentToDelete] = useState(null);

  const handleAddClick = () => {
    setEditingDepartment(null);
    setShowModal(true);
  };

  const handleEditClick = (department) => {
    setEditingDepartment(department);
    setShowModal(true);
  };

  const handleDeleteClick = (department) => {
    setDepartmentToDelete(department);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      const response = await authenticatedFetch(
        API_URLS.DEPARTMENTS.DELETE(departmentToDelete.departmentID),
        { method: 'DELETE' }
      );
      
      if (response.ok) {
        window.location.reload();
      } else {
        throw new Error('Failed to delete department');
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete department');
    } finally {
      setShowDeleteModal(false);
      setDepartmentToDelete(null);
    }
  };

  const renderDepartmentCard = (dept) => (
    <Card className="shadow" style={{ backgroundColor: '#1E293B', borderColor: '#6366F1', color: 'white' }}>
      <Card.Body>
        <Card.Title style={{ color: '#6366F1' }}>
          {dept.name}
        </Card.Title>
        <Card.Subtitle className="mb-2" style={{ color: '#94A3B8' }}>
          Department ID: {dept.departmentID}
        </Card.Subtitle>
        <Card.Text>
          <strong>Description:</strong> {dept.description || 'No description available'}
          <br />
          <strong>Location:</strong> {dept.location || 'Not specified'}
          <br />
          {dept.managerName && (
            <>
              <strong>Manager:</strong> {dept.managerName}
              <br />
            </>
          )}
          {dept.employeeCount && (
            <>
              <strong>Employee Count:</strong> {dept.employeeCount}
              <br />
            </>
          )}
        </Card.Text>
        
        <div className="d-flex justify-content-end mt-3">
          <ButtonGroup size="sm">
            <Button
              variant="outline-primary"
              onClick={() => handleEditClick(dept)}
              style={{ borderColor: '#6366F1', color: '#6366F1' }}
            >
              <i className="bi bi-pencil"></i>
            </Button>
            <Button
              variant="outline-danger"
              onClick={() => handleDeleteClick(dept)}
              style={{ borderColor: '#dc3545', color: '#dc3545' }}
            >
              <i className="bi bi-trash"></i>
            </Button>
          </ButtonGroup>
        </div>
      </Card.Body>
    </Card>
  );

  return (
    <>
      <DataPage
        title="Department Directory"
        apiEndpoint={API_URLS.DEPARTMENTS.GET_ALL()}
        searchFields={['name', 'description', 'location']}
        renderCard={renderDepartmentCard}
        searchPlaceholder="Search departments..."
        showAddButton={true}
        onAddClick={handleAddClick}
      />

      <DepartmentModal
        show={showModal}
        onHide={() => setShowModal(false)}
        department={editingDepartment}
        onSave={() => window.location.reload()}
      />

      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} centered>
        <Modal.Header closeButton style={{ backgroundColor: '#1E293B', color: 'white', borderColor: '#dc3545' }}>
          <Modal.Title>Confirm Delete</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ backgroundColor: '#0F172A', color: 'white' }}>
          Are you sure you want to delete department "{departmentToDelete?.name}"?
          <br />
          <small className="text-muted">This action cannot be undone.</small>
        </Modal.Body>
        <Modal.Footer style={{ backgroundColor: '#1E293B', borderColor: '#dc3545' }}>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDeleteConfirm}>
            Delete
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default DepartmentsPage;
