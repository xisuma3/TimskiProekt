import React from 'react';
import { Container, Row, Col, Card, Button } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';

const DocumentsPage = () => {
  const navigate = useNavigate();

  return (
    <Container fluid>
      <Row>
        <Col>
          <h2 className="mb-4" style={{ color: 'white' }}>Document Management</h2>
          <p style={{ color: '#94A3B8', fontSize: '1.1em' }}>
            Manage document templates and generate personalized documents for employees
          </p>
        </Col>
      </Row>

      <Row className="mt-4">
        <Col md={6} className="mb-4">
          <Card className="shadow h-100" style={{ backgroundColor: '#1E293B', borderColor: '#6366F1' }}>
            <Card.Body className="d-flex flex-column">
              <div className="text-center mb-3">
                <i className="bi bi-file-earmark-text" style={{ fontSize: '3rem', color: '#6366F1' }}></i>
              </div>
              <Card.Title className="text-center" style={{ color: '#6366F1', fontSize: '1.5em' }}>
                Document Templates
              </Card.Title>
              <Card.Text style={{ color: '#94A3B8', textAlign: 'center', flex: 1 }}>
                Create and manage HTML templates with placeholders for employee data, assets, and system information. 
                Templates can be used to generate personalized documents like contracts, asset assignments, and reports.
              </Card.Text>
              <div className="mt-auto">
                <Button 
                  variant="outline-primary" 
                  size="lg" 
                  className="w-100"
                  onClick={() => navigate('/document-templates')}
                >
                  Manage Templates
                </Button>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={6} className="mb-4">
          <Card className="shadow h-100" style={{ backgroundColor: '#1E293B', borderColor: '#10B981' }}>
            <Card.Body className="d-flex flex-column">
              <div className="text-center mb-3">
                <i className="bi bi-file-earmark-check" style={{ fontSize: '3rem', color: '#10B981' }}></i>
              </div>
              <Card.Title className="text-center" style={{ color: '#10B981', fontSize: '1.5em' }}>
                Generated Documents
              </Card.Title>
              <Card.Text style={{ color: '#94A3B8', textAlign: 'center', flex: 1 }}>
                View and manage documents that have been generated from templates. Each document contains 
                personalized content for specific employees with their data automatically populated.
              </Card.Text>
              <div className="mt-auto">
                <Button 
                  variant="outline-success" 
                  size="lg" 
                  className="w-100"
                  onClick={() => navigate('/generated-documents')}
                >
                  View Documents
                </Button>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

    </Container>
  );
};

export default DocumentsPage; 