import React, { useState, useEffect } from 'react';
import { Card, Button, ButtonGroup, Modal } from 'react-bootstrap';
import DataPage from '../components/DataPage';
import EmployeeModal from '../components/EmployeeModal';
import { authenticatedFetch } from '../services/authService';

const EmployeesPage = () => {
  const [showModal, setShowModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState(null);

  // Fetch departments for the dropdown
  useEffect(() => {
    authenticatedFetch('http://localhost:5190/api/Department/GetAll')
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
        `http://localhost:5190/api/Employee/Delete/${employeeToDelete.employeeID}`,
        { method: 'DELETE' }
      );
      
      if (response.ok) {
        // Refresh the page data by triggering a re-render
        window.location.reload();
      } else {
        throw new Error('Failed to delete employee');
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete employee');
    } finally {
      setShowDeleteModal(false);
      setEmployeeToDelete(null);
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
          {emp.position} | {emp.departmentName}
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
              variant="outline-danger"
              onClick={() => handleDeleteClick(emp)}
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
        apiEndpoint="http://localhost:5190/api/Employee/GetAll"
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
          <Modal.Title>Confirm Delete</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ backgroundColor: '#0F172A', color: 'white' }}>
          Are you sure you want to delete {employeeToDelete?.firstName} {employeeToDelete?.lastName}?
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

export default EmployeesPage;
