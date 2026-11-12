import React, { useState, useEffect } from 'react';
import { Card, Button, Modal, Badge } from 'react-bootstrap';
import DataPage from '../components/DataPage';
import AssetModal from '../components/AssetModal';
import AssetCustodyModal from '../components/AssetCustodyModal';
import RoleBasedContent from '../components/RoleBasedContent';
import { authenticatedFetch, isAdmin } from '../services/authService';
import { API_URLS } from '../config/api';

const AssetsPage = () => {
  const [showModal, setShowModal] = useState(false);
  const [editingAsset, setEditingAsset] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [assetToDelete, setAssetToDelete] = useState(null);
  const [custodyAsset, setCustodyAsset] = useState(null);

  useEffect(() => {
    // Only admins need employee list for asset assignment
    if (isAdmin()) {
      authenticatedFetch(API_URLS.EMPLOYEES.GET_ALL())
        .then(response => response.json())
        .then(data => setEmployees(data))
        .catch(err => console.error('Failed to fetch employees:', err));
    }
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
    <Card className="item-card">
      <Card.Body>
        <div className="item-card-head">
          <span className="item-card-icon" aria-hidden="true"><i className="bi bi-laptop" /></span>
          <div className="flex-grow-1 min-w-0">
            <Card.Title>{asset.name}</Card.Title>
            <Card.Subtitle>{asset.serialNumber || 'No serial number'}</Card.Subtitle>
          </div>
          <span className={`status-chip ${asset.isActive ? 'is-success' : ''}`}>
            {asset.isActive ? 'Active' : 'Inactive'}
          </span>
        </div>

        <dl className="meta-list">
          <dt>Description</dt>
          <dd>{asset.description || 'Not specified'}</dd>
          <dt>Held by</dt>
          <dd>
            {asset.isAssigned ? asset.employeeName : <Badge bg="secondary">In stock</Badge>}
          </dd>
          {asset.isAssigned && (
            <>
              <dt>Since</dt>
              <dd>{asset.assignmentDate ? new Date(asset.assignmentDate).toLocaleDateString() : '—'}</dd>
            </>
          )}
        </dl>

        <RoleBasedContent allowedRoles={['Admin']}>
          <div className="item-card-actions">
            <Button
              size="sm"
              variant="outline-info"
              onClick={() => setCustodyAsset(asset)}
              title="Assign, return, and custody history"
            >
              <i className="bi bi-arrow-left-right me-1" aria-hidden="true"></i> Custody
            </Button>
            <Button
              size="sm"
              variant="outline-primary"
              className="btn-icon"
              onClick={() => handleEditClick(asset)}
              aria-label={`Edit ${asset.name}`}
            >
              <i className="bi bi-pencil" aria-hidden="true"></i>
            </Button>
            <Button
              size="sm"
              variant="outline-danger"
              className="btn-icon"
              onClick={() => handleDeleteClick(asset)}
              aria-label={`Delete ${asset.name}`}
            >
              <i className="bi bi-trash" aria-hidden="true"></i>
            </Button>
          </div>
        </RoleBasedContent>
      </Card.Body>
    </Card>
  );

  return (
    <>
      <DataPage
        title={isAdmin() ? "Asset Inventory" : "My Assets"}
        apiEndpoint={isAdmin() ? API_URLS.ASSETS.GET_ALL() : API_URLS.ASSETS.GET_MY_ASSETS()}
        searchFields={['name', 'description', 'serialNumber', 'employeeName']}
        dateFilter={{ label: 'Assigned', field: 'assignmentDate' }}
        personFilter={{ label: 'Held by', field: 'employeeName', emptyLabel: 'In stock' }}
        renderCard={renderAssetCard}
        subtitle={isAdmin() ? 'Company equipment and who currently holds it.' : 'Equipment currently assigned to you.'}
        emptyIcon="bi-laptop"
        searchPlaceholder="Search assets..."
        showAddButton={isAdmin()}
        onAddClick={handleAddClick}
      />

      <RoleBasedContent allowedRoles={['Admin']}>
        <AssetModal
          show={showModal}
          onHide={() => setShowModal(false)}
          asset={editingAsset}
          onSave={() => window.location.reload()}
          employees={employees}
        />
      </RoleBasedContent>

      <RoleBasedContent allowedRoles={['Admin']}>
        <AssetCustodyModal
          show={Boolean(custodyAsset)}
          asset={custodyAsset}
          employees={employees}
          onHide={() => setCustodyAsset(null)}
          onChanged={() => window.location.reload()}
        />
      </RoleBasedContent>

      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} centered>
        <Modal.Header closeButton>

          <Modal.Title>Confirm Delete</Modal.Title>
        </Modal.Header>
        <Modal.Body>

          Are you sure you want to delete asset "{assetToDelete?.name}"?
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

export default AssetsPage; 