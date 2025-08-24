import React from 'react';
import { Card, Badge, Button, Modal } from 'react-bootstrap';
import { useState } from 'react';
import DataPage from '../components/DataPage';
import DocumentGenerationModal from '../components/DocumentGenerationModal';
import { API_URLS } from '../config/api';
import { isAdmin } from '../services/authService';

const GeneratedDocumentsPage = () => {
  const [viewingDocument, setViewingDocument] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);

  const renderDocumentCard = (document, onEdit, onDelete) => (
    <Card className="shadow" style={{ backgroundColor: '#1E293B', borderColor: '#6366F1', color: 'white' }}>
      <Card.Body>
        <div className="d-flex justify-content-between align-items-start mb-2">
          <Card.Title style={{ color: '#6366F1' }}>
            {document.templateName || 'Document'}
          </Card.Title>
          <div>
            <Button 
              variant="outline-light" 
              size="sm" 
              className="me-1"
              onClick={() => handleViewDocument(document)}
            >
              <i className="bi bi-eye"></i>
            </Button>
            <Button 
              variant="outline-danger" 
              size="sm"
              onClick={() => onDelete(document)}
            >
              <i className="bi bi-trash"></i>
            </Button>
          </div>
        </div>
        <Card.Subtitle className="mb-2" style={{ color: '#94A3B8' }}>
          Document ID: {document.documentID}
        </Card.Subtitle>
        <Card.Text>
          <Badge 
            bg={document.documentType === 'Asset' ? 'primary' : 
                 document.documentType === 'Employment' ? 'success' : 'warning'}
            className="mb-2"
          >
            {document.documentType || 'Unknown'}
          </Badge>
          <br />
          <strong>Employee:</strong> {isAdmin() ? document.employeeName : 'My Document'}
          <br />
          <strong>Generated:</strong> {new Date(document.generatedDate).toLocaleDateString()}
          <br />
          <strong>Content Preview:</strong> 
          <div 
            className="mt-2 p-2"
            style={{ 
              backgroundColor: '#334155', 
              borderRadius: '4px', 
              fontSize: '0.85em'
            }}
          >
            {document.contentPreview || 'No content available'}
          </div>
        </Card.Text>
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

  const apiEndpoint = isAdmin() ? API_URLS.GENERATED_DOCUMENTS.GET_ALL() : API_URLS.GENERATED_DOCUMENTS.GET_MY_DOCUMENTS();

  return (
    <>
      <DataPage
        title={isAdmin() ? "Generated Documents" : "My Generated Documents"}
        apiEndpoint={apiEndpoint}
        searchFields={isAdmin() ? ['templateName', 'employeeName', 'documentType'] : ['templateName', 'documentType']}
        renderCard={renderDocumentCard}
        searchPlaceholder={isAdmin() ? "Search documents..." : "Search my documents..."}
        createButtonText="Generate Document"
        modalComponent={DocumentGenerationModal}
        onDelete={handleDelete}
        deleteConfirmText="Are you sure you want to delete this generated document? This action cannot be undone."
      />

      {/* Document View Modal */}
      <Modal 
        show={showViewModal} 
        onHide={() => setShowViewModal(false)} 
        size="xl"
      >
        <Modal.Header closeButton style={{ backgroundColor: '#1E293B', borderColor: '#374151' }}>
          <Modal.Title style={{ color: 'white' }}>
            {viewingDocument?.templateName} - {viewingDocument?.employeeName}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ backgroundColor: 'white', color: 'black', maxHeight: '70vh', overflow: 'auto' }}>
          {viewingDocument?.fullContent && (
            <div dangerouslySetInnerHTML={{ __html: viewingDocument.fullContent }} />
          )}
        </Modal.Body>
        <Modal.Footer style={{ backgroundColor: '#1E293B', borderColor: '#374151' }}>
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
            <i className="bi bi-printer me-1"></i>Print
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default GeneratedDocumentsPage;