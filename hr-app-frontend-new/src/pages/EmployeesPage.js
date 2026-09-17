import React, { useState, useEffect } from 'react';
import { Card, Button, ButtonGroup, Modal, Form, Alert } from 'react-bootstrap';
import DataPage from '../components/DataPage';
import EmployeeModal from '../components/EmployeeModal';
import { authenticatedFetch } from '../services/authService';
import { API_URLS } from '../config/api';

const EmployeesPage = () => {
  const [showModal, setShowModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState(null);
  const [employeeToErase, setEmployeeToErase] = useState(null);
  const [eraseConfirmText, setEraseConfirmText] = useState('');
  const [eraseError, setEraseError] = useState(null);

  // Fetch departments for the dropdown
  useEffect(() => {
    authenticatedFetch(API_URLS.DEPARTMENTS.GET_ALL())
      .then(response => response.json())
      .then(data => setDepartments(data))
      .catch(err => console.error('Failed to fetch departments:', err));
  }, []);

  const handleAddClick = () => {
    setEditingEmployee(null);
    setShowModal(true);
  };

  const handleEditClick = (employee) => {
    setEditingEmployee(employee);
    setShowModal(true);
  };

  const handleDeleteClick = (employee) => {
    setEmployeeToDelete(employee);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      const response = await authenticatedFetch(
        API_URLS.EMPLOYEES.DELETE(employeeToDelete.employeeID),
        { method: 'DELETE' }
      );

      if (response.ok) {
        // Refresh the page data by triggering a re-render
        window.location.reload();
      } else {
        throw new Error('Failed to retire employee');
      }
    } catch (error) {
      console.error('Retire error:', error);
      alert('Failed to retire employee');
    } finally {
      setShowDeleteModal(false);
      setEmployeeToDelete(null);
    }
  };

  // GDPR erasure. Separate from retiring on purpose: it destroys personal data and
  // cannot be undone, so it asks the admin to type the name.
  const handleEraseConfirm = async () => {
    const expected = `${employeeToErase.firstName} ${employeeToErase.lastName}`;
    if (eraseConfirmText.trim() !== expected) {
      setEraseError(`Type "${expected}" exactly to confirm.`);
      return;
    }

    setEraseError(null);
    try {
      const response = await authenticatedFetch(
        API_URLS.EMPLOYEES.ERASE(employeeToErase.employeeID),
        { method: 'POST' }
      );

      if (response.ok) {
        window.location.reload();
        return;
      }

      let message = 'Failed to erase employee';
      try {
        const body = await response.json();
        if (body?.message) message = body.message;
      } catch {
        // no JSON body
      }
      // 409 when they have not been retired first, or are already erased.
      setEraseError(message);
    } catch (error) {
      setEraseError(error.message);
    }
  };

  const handleSave = (savedEmployee) => {
    // Refresh the page data
    window.location.reload();
  };

  const renderEmployeeCard = (emp) => (
    <Card className="shadow" style={{ backgroundColor: '#1E293B', borderColor: '#6366F1', color: 'white' }}>
      <Card.Body>
        <Card.Title style={{ color: '#6366F1' }}>
          {emp.firstName} {emp.lastName}
        </Card.Title>
        <Card.Subtitle className="mb-2" style={{ color: '#94A3B8' }}>
          {emp.position} | {emp.departmentName || emp.name || 'No Department'}
        </Card.Subtitle>
        <Card.Text>
          <strong>Email:</strong> {emp.email}
          <br />
          <strong>Hire Date:</strong> {new Date(emp.hireDate).toLocaleDateString()}
          <br />
          {emp.managerName && (
            <>
              <strong>Manager:</strong> {emp.managerName}
              <br />
            </>
          )}
          {emp.mentorName && (
            <>
              <strong>Mentor:</strong> {emp.mentorName}
              <br />
            </>
          )}
        </Card.Text>
        
        {/* Action Buttons */}
        <div className="d-flex justify-content-end mt-3">
          <ButtonGroup size="sm">
            <Button
              variant="outline-primary"
              onClick={() => handleEditClick(emp)}
              style={{ borderColor: '#6366F1', color: '#6366F1' }}
            >
              <i className="bi bi-pencil"></i>
            </Button>
            <Button
              variant="outline-warning"
              onClick={() => handleDeleteClick(emp)}
              title="Retire — hides them but keeps their records"
              style={{ borderColor: '#f59e0b', color: '#f59e0b' }}
            >
              <i className="bi bi-box-arrow-right"></i>
            </Button>
            <Button
              variant="outline-danger"
              onClick={() => { setEmployeeToErase(emp); setEraseConfirmText(''); setEraseError(null); }}
              title="Erase personal data — irreversible"
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
        title="Employee Directory"
        apiEndpoint={API_URLS.EMPLOYEES.GET_ALL()}
        searchFields={['firstName', 'lastName', 'email', 'departmentName']}
        renderCard={renderEmployeeCard}
        searchPlaceholder="Search employees..."
        showAddButton={true}
        onAddClick={handleAddClick}
      />

      {/* Add/Edit Modal */}
      <EmployeeModal
        show={showModal}
        onHide={() => setShowModal(false)}
        employee={editingEmployee}
        onSave={handleSave}
        departments={departments}
      />

      {/* Delete Confirmation Modal */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} centered>
        <Modal.Header closeButton style={{ backgroundColor: '#1E293B', color: 'white', borderColor: '#dc3545' }}>
          <Modal.Title>Retire Employee</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ backgroundColor: '#0F172A', color: 'white' }}>
          Retire {employeeToDelete?.firstName} {employeeToDelete?.lastName}?
          <br />
          <small className="text-muted">
            They are removed from listings, but their leave decisions, asset custody and
            generated documents are kept. This can be undone.
          </small>
        </Modal.Body>
        <Modal.Footer style={{ backgroundColor: '#1E293B', borderColor: '#f59e0b' }}>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
            Cancel
          </Button>
          <Button variant="warning" onClick={handleDeleteConfirm}>
            Retire
          </Button>
        </Modal.Footer>
      </Modal>

      {/* GDPR erasure — deliberately harder to trigger than retiring */}
      <Modal show={Boolean(employeeToErase)} onHide={() => setEmployeeToErase(null)} centered>
        <Modal.Header closeButton style={{ backgroundColor: '#1E293B', color: 'white', borderColor: '#dc3545' }}>
          <Modal.Title>Erase Personal Data</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ backgroundColor: '#0F172A', color: 'white' }}>
          {eraseError && <Alert variant="danger">{eraseError}</Alert>}

          <p>
            This permanently destroys the personal data of{' '}
            <strong>{employeeToErase?.firstName} {employeeToErase?.lastName}</strong>:
            their name, email, login, dossier, and the body of every document generated
            for them.
          </p>
          <p style={{ color: '#94A3B8' }}>
            Their leave decisions and asset custody are <strong>kept</strong> in anonymised
            form — those record what the company did and what happened to company property.
          </p>
          <p className="text-danger"><strong>This cannot be undone.</strong></p>

          <Form.Group>
            <Form.Label style={{ color: '#94A3B8' }}>
              Type <code>{employeeToErase?.firstName} {employeeToErase?.lastName}</code> to confirm
            </Form.Label>
            <Form.Control
              value={eraseConfirmText}
              onChange={(e) => setEraseConfirmText(e.target.value)}
              style={{ backgroundColor: '#1E293B', color: 'white', borderColor: '#374151' }}
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer style={{ backgroundColor: '#1E293B', borderColor: '#dc3545' }}>
          <Button variant="secondary" onClick={() => setEmployeeToErase(null)}>Cancel</Button>
          <Button variant="danger" onClick={handleEraseConfirm}>Erase permanently</Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default EmployeesPage;
