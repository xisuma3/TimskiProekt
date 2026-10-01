import React from 'react';
import { Card, Button, Row, Col } from 'react-bootstrap';
import DataPage from '../components/DataPage';
import DocumentTemplateModal from '../components/DocumentTemplateModal';
import { API_URLS } from '../config/api';
import { isAdmin } from '../services/authService';

const typeChip = (type) =>
  type === 'Asset' ? 'is-primary' : type === 'Employment' ? 'is-success' : 'is-pending';

const DocumentTemplatesPage = () => {
  const admin = isAdmin();
  const renderTemplateCard = (template, onEdit, onDelete) => (
    <Card className="item-card">
      <Card.Body>
        <div className="item-card-head">
          <span className="item-card-icon" aria-hidden="true"><i className="bi bi-file-earmark-text" /></span>
          <div className="flex-grow-1 min-w-0">
            <Card.Title>{template.templateName}</Card.Title>
            <Card.Subtitle className="text-truncate">
              {template.allowSelfService ? 'Employees can generate this themselves' : 'Issued by HR only'}
            </Card.Subtitle>
          </div>
          {template.allowSelfService && (
            <span className="status-chip is-info" title="Employees can generate this themselves">Self-service</span>
          )}
          <span className={`status-chip ${typeChip(template.templateType)}`}>{template.templateType}</span>
        </div>

        <dl className="meta-list mb-3">
          <dt>Description</dt>
          <dd>{template.description || 'No description available'}</dd>
          <dt>Documents</dt>
          <dd>{template.generatedDocumentsCount || 0} generated</dd>
        </dl>

        <div className="small text-muted fw-semibold mb-1">Content preview</div>
        <div className="p-2 rounded small font-monospace text-break" style={{ background: 'var(--hr-surface-muted)', border: '1px solid var(--hr-border)' }}>
          {template.templateContent ?
            template.templateContent.length > 100
              ? template.templateContent.substring(0, 100) + '...'
              : template.templateContent
            : 'No content available'
          }
        </div>

        {admin && (
          <div className="item-card-actions">
            <Button
              variant="outline-primary"
              size="sm"
              className="btn-icon"
              aria-label="Edit template"
              onClick={() => onEdit(template)}
            >
              <i className="bi bi-pencil" aria-hidden="true"></i>
            </Button>
            <Button
              variant="outline-danger"
              size="sm"
              className="btn-icon"
              aria-label="Delete template"
              onClick={() => onDelete(template)}
            >
              <i className="bi bi-trash" aria-hidden="true"></i>
            </Button>
          </div>
        )}
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
        subtitle="Reusable templates for contracts, handover forms and letters."
        emptyIcon="bi-file-earmark-text"
        apiEndpoint={apiEndpoint}
        searchFields={['templateName', 'templateType', 'description']}
        renderCard={renderTemplateCard}
        searchPlaceholder="Search templates..."
        createButtonText="Create Template"
        modalComponent={admin ? DocumentTemplateModal : null}
        onDelete={admin ? handleDelete : null}
        deleteConfirmText="Are you sure you want to delete this template? This action cannot be undone."
      />

      {/* Template Placeholder Guide */}
      <Card className="mt-4">
        <Card.Body>
          <div className="item-card-head mb-3">
            <span className="item-card-icon tone-amber" aria-hidden="true"><i className="bi bi-info-circle" /></span>
            <div>
              <Card.Title>Template Placeholder Guide</Card.Title>
              <Card.Subtitle>Available placeholders for template content</Card.Subtitle>
            </div>
          </div>
          <Row className="g-3">
            <Col md={6}>
              <div className="fw-semibold mb-2">Employee Data</div>
              <code className="d-block p-3 rounded" style={{ background: 'var(--hr-surface-muted)', border: '1px solid var(--hr-border)' }}>
                {'{{employee.firstName}}'}<br />
                {'{{employee.lastName}}'}<br />
                {'{{employee.email}}'}<br />
                {'{{employee.position}}'}<br />
                {'{{employee.department}}'}<br />
                {'{{employee.hireDate}}'}
              </code>
            </Col>
            <Col md={6}>
              <div className="fw-semibold mb-2">System & Assets</div>
              <code className="d-block p-3 rounded" style={{ background: 'var(--hr-surface-muted)', border: '1px solid var(--hr-border)' }}>
                {'{{system.currentDate}}'}<br />
                {'{{asset.name}}'}<br />
                {'{{asset.serialNumber}}'}<br />
                {'{{#assetList}}...{{/assetList}}'}
              </code>
            </Col>
          </Row>
        </Card.Body>
      </Card>
    </>
  );
};

export default DocumentTemplatesPage;
