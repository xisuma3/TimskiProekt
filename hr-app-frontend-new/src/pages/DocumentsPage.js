import React from 'react';
import { Card } from 'react-bootstrap';
import DataPage from '../components/DataPage';

const DocumentsPage = () => {
  const renderDocumentCard = (doc) => (
    <Card className="shadow" style={{ backgroundColor: '#1E293B', borderColor: '#6366F1', color: 'white' }}>
      <Card.Body>
        <Card.Title style={{ color: '#6366F1' }}>
          {doc.templateName}
        </Card.Title>
        <Card.Subtitle className="mb-2" style={{ color: '#94A3B8' }}>
          Template ID: {doc.documentID}
        </Card.Subtitle>
        <Card.Text>
          <strong>Type:</strong> {doc.documentType || 'Not specified'}
          <br />
          <strong>Description:</strong> {doc.description || 'No description available'}
          <br />
          <strong>Created Date:</strong> {doc.createdDate ? new Date(doc.createdDate).toLocaleDateString() : 'Not specified'}
          <br />
          {doc.createdBy && (
            <>
              <strong>Created By:</strong> {doc.createdBy}
              <br />
            </>
          )}
          {doc.version && (
            <>
              <strong>Version:</strong> {doc.version}
              <br />
            </>
          )}
          <strong>Status:</strong> {doc.isActive ? 'Active' : 'Inactive'}
        </Card.Text>
      </Card.Body>
    </Card>
  );

  return (
    <DataPage
      title="Document Templates"
      apiEndpoint="http://localhost:5190/api/GeneratedDocument/GetAll"
      searchFields={['templateName', 'documentType', 'description']}
      renderCard={renderDocumentCard}
      searchPlaceholder="Search documents..."
    />
  );
};

export default DocumentsPage; 