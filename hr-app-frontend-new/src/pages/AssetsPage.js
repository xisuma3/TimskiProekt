import React, { useState, useEffect } from 'react';
import { Card, Button, ButtonGroup, Modal } from 'react-bootstrap';
import DataPage from '../components/DataPage';
import AssetModal from '../components/AssetModal';
import { authenticatedFetch } from '../services/authService';
import { API_URLS } from '../config/api';

const AssetsPage = () => {
  const [showModal, setShowModal] = useState(false);
  const [editingAsset, setEditingAsset] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [assetToDelete, setAssetToDelete] = useState(null);

  useEffect(() => {
    authenticatedFetch(API_URLS.EMPLOYEES.GET_ALL())
      .then(response => response.json())
      .then(data => setEmployees(data))
      .catch(err => console.error('Failed to fetch employees:', err));
  }, []);

  const handleAddClick = () => {
    setEditingAsset(null);
    setShowModal(true);
  };

  const handleEditClick = (asset) => {
    setEditingAsset(asset);
    setShowModal(true);
  };

  const handleDeleteClick = (asset) => {
    setAssetToDelete(asset);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      const response = await authenticatedFetch(
        API_URLS.ASSETS.DELETE(assetToDelete.assetID),
        { method: 'DELETE' }
      );
      
      if (response.ok) {
        window.location.reload();
      } else {
        throw new Error('Failed to delete asset');
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete asset');
    } finally {
      setShowDeleteModal(false);
      setAssetToDelete(null);
    }
  };

  const renderAssetCard = (asset) => (
    <Card className="shadow" style={{ backgroundColor: '#1E293B', borderColor: '#6366F1', color: 'white' }}>
      <Card.Body>
        <Card.Title style={{ color: '#6366F1' }}>
          {asset.name}
        </Card.Title>
        <Card.Subtitle className="mb-2" style={{ color: '#94A3B8' }}>
          {asset.serialNumber}
        </Card.Subtitle>
        <Card.Text>
          <strong>Description:</strong> {asset.description || 'Not specified'}
          <br />
          <strong>Assignment Date:</strong> {asset.assignmentDate ? new Date(asset.assignmentDate).toLocaleDateString() : 'Not assigned'}
          <br />
          {asset.employeeName && (
            <>
              <strong>Assigned To:</strong> {asset.employeeName}
              <br />
            </>
          )}
          <strong>Status:</strong> {asset.isActive ? 'Active' : 'Inactive'}
        </Card.Text>
        
        <div className="d-flex justify-content-end mt-3">
          <ButtonGroup size="sm">
            <Button
              variant="outline-primary"
              onClick={() => handleEditClick(asset)}
              style={{ borderColor: '#6366F1', color: '#6366F1' }}
            >
              <i className="bi bi-pencil"></i>
            </Button>
            <Button
              variant="outline-danger"
              onClick={() => handleDeleteClick(asset)}
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
        title="Asset Inventory"
        apiEndpoint={API_URLS.ASSETS.GET_ALL()}
        searchFields={['name', 'description', 'serialNumber', 'employeeName']}
        renderCard={renderAssetCard}
        searchPlaceholder="Search assets..."
        showAddButton={true}
        onAddClick={handleAddClick}
      />

      <AssetModal
        show={showModal}
        onHide={() => setShowModal(false)}
        asset={editingAsset}
        onSave={() => window.location.reload()}
        employees={employees}
      />

      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} centered>
        <Modal.Header closeButton style={{ backgroundColor: '#1E293B', color: 'white', borderColor: '#dc3545' }}>
          <Modal.Title>Confirm Delete</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ backgroundColor: '#0F172A', color: 'white' }}>
          Are you sure you want to delete asset "{assetToDelete?.name}"?
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

export default AssetsPage; 