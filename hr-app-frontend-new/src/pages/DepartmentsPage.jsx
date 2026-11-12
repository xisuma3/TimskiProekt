import React, { useState } from 'react';
import { Card, Button, Modal } from 'react-bootstrap';
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
    <Card className="item-card">
      <Card.Body>
        <div className="item-card-head">
          <span className="item-card-icon tone-violet" aria-hidden="true"><i className="bi bi-building" /></span>
          <div className="flex-grow-1 min-w-0">
            <Card.Title>{dept.name}</Card.Title>
            <Card.Subtitle>{dept.location || 'No location set'}</Card.Subtitle>
          </div>
          {dept.employeeCount ? (
            <span className="status-chip is-primary">{dept.employeeCount} people</span>
          ) : null}
        </div>

        <dl className="meta-list">
          <dt>Description</dt>
          <dd>{dept.description || 'No description available'}</dd>
          {dept.managerName && (
            <>
              <dt>Manager</dt>
              <dd>{dept.managerName}</dd>
            </>
          )}
        </dl>

        <div className="item-card-actions">
          <Button
            size="sm"
            variant="outline-primary"
            className="btn-icon"
            onClick={() => handleEditClick(dept)}
            aria-label={`Edit ${dept.name}`}
          >
            <i className="bi bi-pencil" aria-hidden="true"></i>
          </Button>
          <Button
            size="sm"
            variant="outline-danger"
            className="btn-icon"
            onClick={() => handleDeleteClick(dept)}
            aria-label={`Delete ${dept.name}`}
          >
            <i className="bi bi-trash" aria-hidden="true"></i>
          </Button>
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
        subtitle="Teams across the organisation and who leads them."
        emptyIcon="bi-building"
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
        <Modal.Header closeButton>
          <Modal.Title>Confirm Delete</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to delete department "{departmentToDelete?.name}"?
          <br />
          <small className="text-muted">This action cannot be undone.</small>
        </Modal.Body>
        <Modal.Footer>
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
