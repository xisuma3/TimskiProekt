import React from 'react';
import { Row, Col, Card, Button } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';

const SECTIONS = [
  {
    to: '/document-templates',
    icon: 'bi-file-earmark-text',
    tone: 'indigo',
    title: 'Document Templates',
    text: 'Create and manage HTML templates with placeholders for employee, asset and system data.',
    action: 'Manage Templates',
  },
  {
    to: '/generated-documents',
    icon: 'bi-file-earmark-check',
    tone: 'green',
    title: 'Generated Documents',
    text: 'View and print documents generated from templates, filled with each employee’s data.',
    action: 'View Documents',
  },
];

const DocumentsPage = () => {
  const navigate = useNavigate();

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Document Management</h1>
          <p>Manage document templates and generate personalized documents for employees.</p>
        </div>
      </div>

      <Row className="g-4">
        {SECTIONS.map((s) => (
          <Col md={6} key={s.to}>
            <Card className="item-card">
              <Card.Body>
                <div className="item-card-head">
                  <span className={`item-card-icon tone-${s.tone}`} aria-hidden="true">
                    <i className={`bi ${s.icon}`} />
                  </span>
                  <div className="flex-grow-1 min-w-0">
                    <Card.Title>{s.title}</Card.Title>
                    <Card.Text className="text-muted mb-0">{s.text}</Card.Text>
                  </div>
                </div>
                <div className="item-card-actions">
                  <Button
                    variant="outline-primary"
                    className="stretched-link"
                    onClick={() => navigate(s.to)}
                  >
                    {s.action} <i className="bi bi-arrow-right ms-1" aria-hidden="true" />
                  </Button>
                </div>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );
};

export default DocumentsPage;
