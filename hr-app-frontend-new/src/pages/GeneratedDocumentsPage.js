import React from 'react';
import { Card, Button, Modal } from 'react-bootstrap';
import { useState } from 'react';
import DataPage from '../components/DataPage';
import DocumentGenerationModal from '../components/DocumentGenerationModal';
import { API_URLS } from '../config/api';
import { isAdmin } from '../services/authService';

const typeChip = (type) =>
  type === 'Asset' ? 'is-primary' : type === 'Employment' ? 'is-success' : 'is-pending';

const GeneratedDocumentsPage = () => {
  const [viewingDocument, setViewingDocument] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const admin = isAdmin();

  const renderDocumentCard = (document, onEdit, onDelete) => (
    <Card className="item-card">
      <Card.Body>
        <div className="item-card-head">
          <span className="item-card-icon tone-green" aria-hidden="true"><i className="bi bi-file-earmark-check" /></span>
          <div className="flex-grow-1 min-w-0">
            <Card.Title>{document.templateName || 'Document'}</Card.Title>
            <Card.Subtitle className="text-truncate">Document ID: {document.documentID}</Card.Subtitle>
          </div>
          <span className={`status-chip ${typeChip(document.documentType)}`}>{document.documentType || 'Unknown'}</span>
        </div>

        <dl className="meta-list mb-3">
          <dt>Employee</dt>
          <dd>{admin ? document.employeeName : 'My Document'}</dd>
          <dt>Generated</dt>
          <dd>{new Date(document.generatedDate).toLocaleDateString()}</dd>
        </dl>

        <div className="small text-muted fw-semibold mb-1">Content preview</div>
        <div className="p-2 rounded small text-break" style={{ background: 'var(--hr-surface-muted)', border: '1px solid var(--hr-border)' }}>
          {document.contentPreview || 'No content available'}
        </div>

        <div className="item-card-actions">
          <Button
            variant="outline-primary"
            size="sm"
            className="btn-icon"
            aria-label="View document"
            onClick={() => handleViewDocument(document)}
          >
            <i className="bi bi-eye" aria-hidden="true"></i>
          </Button>
          {admin && <Button
            variant="outline-danger"
            size="sm"
            className="btn-icon"
            aria-label="Delete document"
            onClick={() => onDelete(document)}
          >
            <i className="bi bi-trash" aria-hidden="true"></i>
          </Button>}
        </div>
      </Card.Body>
    </Card>
  );

  const handleViewDocument = async (document) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(API_URLS.GENERATED_DOCUMENTS.GET_CONTENT(document.documentID), {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const content = await response.text();
        setViewingDocument({ ...document, fullContent: content });
        setShowViewModal(true);
      }
    } catch (err) {
      console.error('Failed to fetch document content:', err);
    }
  };

  const handleDelete = async (document, token) => {
    const response = await fetch(API_URLS.GENERATED_DOCUMENTS.DELETE(document.documentID), {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) {
      throw new Error('Failed to delete document');
    }
  };

  const apiEndpoint = admin ? API_URLS.GENERATED_DOCUMENTS.GET_ALL() : API_URLS.GENERATED_DOCUMENTS.GET_MY_DOCUMENTS();

  return (
    <>
      <DataPage
        title={admin ? "Generated Documents" : "My Generated Documents"}
        subtitle={admin ? 'Documents produced from templates for your employees.' : 'Documents HR has generated for you.'}
        emptyIcon="bi-file-earmark-check"
        apiEndpoint={apiEndpoint}
        searchFields={admin ? ['templateName', 'employeeName', 'documentType'] : ['templateName', 'documentType']}
        renderCard={renderDocumentCard}
        searchPlaceholder={admin ? "Search documents..." : "Search my documents..."}
        createButtonText="Generate Document"
        modalComponent={admin ? DocumentGenerationModal : null}
        onDelete={admin ? handleDelete : null}
        deleteConfirmText="Are you sure you want to delete this generated document? This action cannot be undone."
      />

      {/* Document View Modal */}
      <Modal
        show={showViewModal}
        onHide={() => setShowViewModal(false)}
        size="xl"
      >
        <Modal.Header closeButton>
          <Modal.Title>
            {viewingDocument?.templateName} - {viewingDocument?.employeeName}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="bg-body-tertiary">
          {viewingDocument?.fullContent && (
            <div className="doc-preview" style={{ maxHeight: '65vh' }} dangerouslySetInnerHTML={{ __html: viewingDocument.fullContent }} />
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowViewModal(false)}>
            Close
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              const printWindow = window.open('', '_blank');
              printWindow.document.write(`
                <html>
                  <head>
                    <title>${viewingDocument?.templateName} - ${viewingDocument?.employeeName}</title>
                    <style>body { font-family: Arial, sans-serif; margin: 20px; }</style>
                  </head>
                  <body>${viewingDocument?.fullContent}</body>
                </html>
              `);
              printWindow.document.close();
              printWindow.print();
            }}
          >
            <i className="bi bi-printer me-1" aria-hidden="true"></i>Print
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default GeneratedDocumentsPage;
