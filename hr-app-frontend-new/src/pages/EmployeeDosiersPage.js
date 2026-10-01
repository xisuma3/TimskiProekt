import React, { useState, useEffect } from 'react';
import { Card, Button, Modal } from 'react-bootstrap';
import DataPage from '../components/DataPage';
import EmployeeDossierModal from '../components/EmployeeDossierModal';
import RoleBasedContent from '../components/RoleBasedContent';
import { authenticatedFetch, isAdmin } from '../services/authService';
import { API_URLS } from '../config/api';

const EmployeeDosiersPage = () => {
  const [showModal, setShowModal] = useState(false);
  const [editingDossier, setEditingDossier] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [dossierToDelete, setDossierToDelete] = useState(null);

  useEffect(() => {
    // Only admins need employee list for dossier management
    if (isAdmin()) {
      authenticatedFetch(API_URLS.EMPLOYEES.GET_ALL())
        .then(response => response.json())
        .then(data => setEmployees(data))
        .catch(err => console.error('Failed to fetch employees:', err));
    }
  }, []);

  const handleAddClick = () => {
    setEditingDossier(null);
    setShowModal(true);
  };

  const handleEditClick = (dossier) => {
    setEditingDossier(dossier);
    setShowModal(true);
  };

  const handleDeleteClick = (dossier) => {
    setDossierToDelete(dossier);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      const response = await authenticatedFetch(
        API_URLS.EMPLOYEE_DOSSIERS.DELETE(dossierToDelete.dossierID),
        { method: 'DELETE' }
      );
      
      if (response.ok) {
        window.location.reload();
      } else {
        throw new Error('Failed to delete dossier');
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete dossier');
    } finally {
      setShowDeleteModal(false);
      setDossierToDelete(null);
    }
  };

  const renderDossierCard = (dossier) => {
    const name = isAdmin() ? dossier.employeeName : 'My Dossier';
    return (
      <Card className="item-card">
        <Card.Body>
          <div className="item-card-head">
            <span className="item-card-icon" aria-hidden="true"><i className="bi bi-person-vcard" /></span>
            <div className="flex-grow-1 min-w-0">
              <Card.Title>{name}</Card.Title>
              <Card.Subtitle>{dossier.employmentType} Employee</Card.Subtitle>
            </div>
          </div>

          <dl className="meta-list">
            <dt>Birth Date</dt>
            <dd>{dossier.birthDate ? new Date(dossier.birthDate).toLocaleDateString() : 'Not specified'}</dd>
            <dt>Address</dt>
            <dd>{dossier.address || 'Not specified'}</dd>
            <dt>Emergency Contact</dt>
            <dd>{dossier.emergencyContact || 'Not specified'}</dd>
            <dt>Employment Type</dt>
            <dd>{dossier.employmentType}</dd>
          </dl>

          {/* Admin only - edit and delete buttons */}
          <RoleBasedContent allowedRoles={['Admin']}>
            <div className="item-card-actions">
              <Button
                size="sm"
                variant="outline-primary"
                className="btn-icon"
                onClick={() => handleEditClick(dossier)}
                aria-label={`Edit dossier for ${name}`}
              >
                <i className="bi bi-pencil" aria-hidden="true"></i>
              </Button>
              <Button
                size="sm"
                variant="outline-danger"
                className="btn-icon"
                onClick={() => handleDeleteClick(dossier)}
                aria-label={`Delete dossier for ${name}`}
              >
                <i className="bi bi-trash" aria-hidden="true"></i>
              </Button>
            </div>
          </RoleBasedContent>
        </Card.Body>
      </Card>
    );
  };

  return (
    <>
      <DataPage
        title={isAdmin() ? "Employee Dossiers" : "My Dossier"}
        apiEndpoint={isAdmin() ? API_URLS.EMPLOYEE_DOSSIERS.GET_ALL() : API_URLS.EMPLOYEE_DOSSIERS.GET_MY_DOSSIER()}
        searchFields={isAdmin() ? ['employeeName', 'employmentType', 'address'] : ['employmentType', 'address']}
        personFilter={{ label: 'Employee', field: 'employeeName' }}
        subtitle={isAdmin() ? 'Personal and employment details for every employee.' : 'Your personal and employment details on file.'}
        emptyIcon="bi-person-vcard"
        renderCard={renderDossierCard}
        searchPlaceholder={isAdmin() ? "Search employee dossiers..." : "Search my dossier..."}
        showAddButton={isAdmin()}
        onAddClick={handleAddClick}
      />

      <EmployeeDossierModal
        show={showModal}
        onHide={() => setShowModal(false)}
        dossier={editingDossier}
        onSave={() => window.location.reload()}
        employees={employees}
      />

      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Confirm Delete</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to delete the dossier for {dossierToDelete?.employeeName}?
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

export default EmployeeDosiersPage;