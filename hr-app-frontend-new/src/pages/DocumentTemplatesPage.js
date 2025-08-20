import React from 'react';
import { Card, Badge, Button, Row, Col } from 'react-bootstrap';
import DataPage from '../components/DataPage';
import DocumentTemplateModal from '../components/DocumentTemplateModal';
import { API_URLS } from '../config/api';

const DocumentTemplatesPage = () => {
  const renderTemplateCard = (template, onEdit, onDelete) => (
    <Card className="shadow" style={{ backgroundColor: '#1E293B', borderColor: '#6366F1', color: 'white' }}>
      <Card.Body>
        <div className="d-flex justify-content-between align-items-start mb-2">
          <Card.Title style={{ color: '#6366F1' }}>
            {template.templateName}
          </Card.Title>
          <div>
            <Button 
              variant="outline-light" 
              size="sm" 
              className="me-1"
              onClick={() => onEdit(template)}
            >
              <i className="bi bi-pencil"></i>
            </Button>
            <Button 
              variant="outline-danger" 
              size="sm"
              onClick={() => onDelete(template)}
            >
              <i className="bi bi-trash"></i>
            </Button>
          </div>
        </div>
        <Card.Subtitle className="mb-2" style={{ color: '#94A3B8' }}>
          Template ID: {template.templateID}
        </Card.Subtitle>
        <Card.Text>
          <Badge 
            bg={template.templateType === 'Asset' ? 'primary' : 
                 template.templateType === 'Employment' ? 'success' : 'warning'}
            className="mb-2"
          >
            {template.templateType}
          </Badge>
          <br />
          <strong>Description:</strong> {template.description || 'No description available'}
          <br />
          <strong>Generated Documents:</strong> {template.generatedDocumentsCount || 0}
          <br />
          <strong>Content Preview:</strong> 
          <div 
            className="mt-2 p-2"
            style={{ 
              backgroundColor: '#334155', 
              borderRadius: '4px', 
              fontSize: '0.85em',
              fontFamily: 'monospace'
            }}
          >
            {template.templateContent ? 
              template.templateContent.length > 100 
                ? template.templateContent.substring(0, 100) + '...'
                : template.templateContent
              : 'No content available'
            }
          </div>
        </Card.Text>
      </Card.Body>
    </Card>
  );

  const handleDelete = async (template, token) => {
    if (template.generatedDocumentsCount > 0) {
      throw new Error('Cannot delete template with existing generated documents');
    }

    const response = await fetch(API_URLS.DOCUMENT_TEMPLATES.DELETE(template.templateID), {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to delete template');
    }
  };

  const apiEndpoint = API_URLS.DOCUMENT_TEMPLATES.GET_ALL();

  return (
    <>
      <DataPage
        title="Document Templates"
        apiEndpoint={apiEndpoint}
        searchFields={['templateName', 'templateType', 'description']}
        renderCard={renderTemplateCard}
        searchPlaceholder="Search templates..."
        createButtonText="Create Template"
        modalComponent={DocumentTemplateModal}
        onDelete={handleDelete}
        deleteConfirmText="Are you sure you want to delete this template? This action cannot be undone."
        useMinHeight={false}
      />
      
      {/* Template Placeholder Guide */}
      <div className="mt-4 px-3">
        <Card className="shadow" style={{ backgroundColor: '#1E293B', borderColor: '#F59E0B' }}>
          <Card.Body>
            <Card.Title style={{ color: '#F59E0B' }}>
              <i className="bi bi-info-circle me-2"></i>Template Placeholder Guide
            </Card.Title>
            <Card.Text style={{ color: '#94A3B8' }}>
              <strong>Available Placeholders for Template Content:</strong>
              <Row className="mt-2">
                <Col md={6}>
                  <div className="mb-2">
                    <strong style={{ color: '#6366F1' }}>Employee Data:</strong><br />
                    <code style={{ color: '#E2E8F0' }}>
                      {'{{employee.firstName}}'}<br />
                      {'{{employee.lastName}}'}<br />
                      {'{{employee.email}}'}<br />
                      {'{{employee.position}}'}<br />
                      {'{{employee.department}}'}<br />
                      {'{{employee.hireDate}}'}
                    </code>
                  </div>
                </Col>
                <Col md={6}>
                  <div className="mb-2">
                    <strong style={{ color: '#10B981' }}>System & Assets:</strong><br />
                    <code style={{ color: '#E2E8F0' }}>
                      {'{{system.currentDate}}'}<br />
                      {'{{asset.name}}'}<br />
                      {'{{asset.serialNumber}}'}<br />
                      {'{{#assetList}}...{{/assetList}}'}
                    </code>
                  </div>
                </Col>
              </Row>
            </Card.Text>
          </Card.Body>
        </Card>
      </div>
    </>
  );
};

export default DocumentTemplatesPage;