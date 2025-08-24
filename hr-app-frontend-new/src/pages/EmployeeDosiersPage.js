import React, { useState, useEffect } from 'react';
import { Card, Button, ButtonGroup, Modal } from 'react-bootstrap';
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

  const renderDossierCard = (dossier) => (
    <Card className="shadow" style={{ backgroundColor: '#1E293B', borderColor: '#6366F1', color: 'white' }}>
      <Card.Body>
        <Card.Title style={{ color: '#6366F1' }}>
          {isAdmin() ? dossier.employeeName : 'My Dossier'}
        </Card.Title>
        <Card.Subtitle className="mb-2" style={{ color: '#94A3B8' }}>
          {dossier.employmentType} Employee
        </Card.Subtitle>
        <Card.Text>
          <strong>Birth Date:</strong> {dossier.birthDate ? new Date(dossier.birthDate).toLocaleDateString() : 'Not specified'}<br/>
          <strong>Address:</strong> {dossier.address || 'Not specified'}<br/>
          <strong>Emergency Contact:</strong> {dossier.emergencyContact || 'Not specified'}<br/>
          <strong>Employment Type:</strong> {dossier.employmentType}
        </Card.Text>
        
        {/* Admin only - edit and delete buttons */}
        <RoleBasedContent allowedRoles={['Admin']}>
          <div className="d-flex justify-content-end mt-3">
            <ButtonGroup size="sm">
              <Button
                variant="outline-primary"
                onClick={() => handleEditClick(dossier)}
                style={{ borderColor: '#6366F1', color: '#6366F1' }}
              >
                <i className="bi bi-pencil"></i>
              </Button>
              <Button
                variant="outline-danger"
                onClick={() => handleDeleteClick(dossier)}
                style={{ borderColor: '#dc3545', color: '#dc3545' }}
              >
                <i className="bi bi-trash"></i>
              </Button>
            </ButtonGroup>
          </div>
        </RoleBasedContent>
      </Card.Body>
    </Card>
  );

  return (
    <>
      <DataPage
        title={isAdmin() ? "Employee Dossiers" : "My Dossier"}
        apiEndpoint={isAdmin() ? API_URLS.EMPLOYEE_DOSSIERS.GET_ALL() : API_URLS.EMPLOYEE_DOSSIERS.GET_MY_DOSSIER()}
        searchFields={isAdmin() ? ['employeeName', 'employmentType', 'address'] : ['employmentType', 'address']}
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
        <Modal.Header closeButton style={{ backgroundColor: '#1E293B', color: 'white', borderColor: '#dc3545' }}>
          <Modal.Title>Confirm Delete</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ backgroundColor: '#0F172A', color: 'white' }}>
          Are you sure you want to delete the dossier for {dossierToDelete?.employeeName}?
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

export default EmployeeDosiersPage;