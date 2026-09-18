import React, { useCallback, useEffect, useState } from 'react';
import { Container, Row, Col, Spinner, Alert, Form, InputGroup, Button } from 'react-bootstrap';
import { authenticatedFetch } from '../services/authService';

const PAGE_BG = '#232B4D';

const DataPage = ({ 
  title, 
  apiEndpoint, 
  searchFields = [], 
  renderCard, 
  searchPlaceholder = "Search...",
  showAddButton = false,
  onAddClick = null,
  createButtonText = "Add New",
  modalComponent: ModalComponent = null,
  modalItemProp = 'editingTemplate',
  onDelete = null,
  deleteConfirmText = "Are you sure you want to delete this item?",
  useMinHeight = true
}) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchData = useCallback(() => {
    setLoading(true);
    setError(null);
    authenticatedFetch(apiEndpoint)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to fetch ${title.toLowerCase()}.`);
        }
        return response.json();
      })
      .then((data) => {
        // Ensure data is always an array for consistent handling
        const arrayData = Array.isArray(data) ? data : [data];
        setData(arrayData);
        setError(null);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError(err.message);
        setLoading(false);
      });
  }, [apiEndpoint, title]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreate = () => {
    setEditingItem(null);
    setShowModal(true);
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setShowModal(true);
  };

  const handleDeleteClick = (item) => {
    setItemToDelete(item);
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (!onDelete || !itemToDelete) return;
    
    setDeleteLoading(true);
    try {
      const token = localStorage.getItem('token');
      await onDelete(itemToDelete, token);
      await fetchData(); // Refresh data
      setShowDeleteConfirm(false);
      setItemToDelete(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleModalSave = () => {
    setShowModal(false);
    setEditingItem(null);
    fetchData(); // Refresh data
  };

  // Filter data by search
  const filteredData = data.filter(item => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return searchFields.some(field => {
      const value = item[field];
      return value && value.toString().toLowerCase().includes(searchLower);
    });
  });

  return (
    <div
      style={{
        minHeight: useMinHeight ? '100vh' : 'auto',
        background: PAGE_BG,
        color: 'white',
        paddingTop: '2rem',
        paddingBottom: '2rem',
      }}
    >
      <Container>
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h1 style={{ color: '#6366F1' }}>{title}</h1>
          <div className="d-flex gap-3">
            <Form style={{ minWidth: 250 }}>
              <InputGroup>
                <InputGroup.Text style={{ backgroundColor: '#1E293B', borderColor: '#6366F1', color: '#6366F1' }}>
                  <i className="bi bi-search"></i>
                </InputGroup.Text>
                <Form.Control
                  type="text"
                  placeholder={searchPlaceholder}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{ background: '#1E293B', color: 'white', borderColor: '#6366F1' }}
                />
              </InputGroup>
            </Form>
            {(showAddButton || ModalComponent) && (
              <Button
                onClick={showAddButton ? onAddClick : handleCreate}
                style={{ 
                  backgroundColor: '#6366F1', 
                  borderColor: '#6366F1',
                  padding: '0.375rem 1rem'
                }}
              >
                <i className="bi bi-plus-circle me-2"></i>
                {createButtonText}
              </Button>
            )}
          </div>
        </div>

        {loading && (
          <div className="text-center">
            <Spinner animation="border" variant="light" />
          </div>
        )}

        {error && (
          <Alert variant="danger" className="text-center">
            {error}
          </Alert>
        )}

        {!loading && !error && filteredData.length === 0 && (
          <div className="text-center text-muted">No {title.toLowerCase()} found.</div>
        )}

        {!loading && !error && filteredData.length > 0 && (
          <Row>
            {filteredData.map((item, index) => (
              <Col md={4} className="mb-4" key={item.id || item.employeeID || item.departmentID || item.assetID || item.documentID || item.templateID || index}>
                {/* Check if this is using the new modal system or old approach */}
                {ModalComponent && onDelete 
                  ? renderCard(item, handleEdit, handleDeleteClick) // New document modals
                  : renderCard(item) // Existing pages that handle their own edit/delete
                }
              </Col>
            ))}
          </Row>
        )}

        {/* Modal Component - Only for new document modals */}
        {ModalComponent && onDelete && (
          <ModalComponent
            show={showModal}
            onHide={() => setShowModal(false)}
            onSave={handleModalSave}
            {...{ [modalItemProp]: editingItem }}
            onGenerate={handleModalSave}
          />
        )}

        {/* Delete Confirmation Modal - Only for new document modals */}
        {ModalComponent && onDelete && showDeleteConfirm && (
          <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="modal-dialog">
              <div className="modal-content" style={{ backgroundColor: '#1E293B', color: 'white' }}>
                <div className="modal-header" style={{ borderColor: '#374151' }}>
                  <h5 className="modal-title">Confirm Delete</h5>
                </div>
                <div className="modal-body">
                  {deleteConfirmText}
                </div>
                <div className="modal-footer" style={{ borderColor: '#374151' }}>
                  <Button 
                    variant="secondary" 
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={deleteLoading}
                  >
                    Cancel
                  </Button>
                  <Button 
                    variant="danger" 
                    onClick={handleDeleteConfirm}
                    disabled={deleteLoading}
                  >
                    {deleteLoading ? 'Deleting...' : 'Delete'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </Container>
    </div>
  );
};

export default DataPage;
