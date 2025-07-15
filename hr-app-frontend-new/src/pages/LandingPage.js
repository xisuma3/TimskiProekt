import React from 'react';
import { Container, Row, Col, Button, Card } from 'react-bootstrap';

const LandingPage = () => (
  <div
    style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0F172A 0%, #6366F1 100%)',
      color: 'white',
      display: 'flex',
      alignItems: 'center'
    }}
  >
    <Container>
      <Row className="justify-content-center align-items-center">
        <Col md={8} className="text-center">
          <h1 style={{ fontSize: '3rem', fontWeight: 'bold', letterSpacing: '2px' }}>
            Welcome to the HR Management System
          </h1>
          <p style={{ fontSize: '1.5rem', margin: '2rem 0' }}>
            Streamline your employee, asset, and document management with ease and security.
          </p>
          <Button
            variant="light"
            size="lg"
            href="/login"
            style={{ fontWeight: 'bold', marginRight: '1rem', backgroundColor: '#6366F1', borderColor: '#6366F1' }}
          >
            Login
          </Button>
          <Button
            variant="outline-light"
            size="lg"
            href="/register"
            style={{ fontWeight: 'bold' }}
          >
            Register
          </Button>
        </Col>
      </Row>
      <Row className="justify-content-center mt-5">
        <Col md={10}>
          <Card bg="dark" text="light" className="shadow-lg" style={{ backgroundColor: '#1E293B', borderColor: '#6366F1' }}>
            <Card.Body>
              <Row>
                <Col md={4} className="text-center">
                  <i className="bi bi-people-fill" style={{ fontSize: '3rem', color: '#6366F1' }}></i>
                  <h4>Employee Management</h4>
                  <p>Manage employee records, dossiers, and leave requests efficiently.</p>
                </Col>
                <Col md={4} className="text-center">
                  <i className="bi bi-building" style={{ fontSize: '3rem', color: '#6366F1' }}></i>
                  <h4>Department & Asset Tracking</h4>
                  <p>Organize departments and keep track of company assets with ease.</p>
                </Col>
                <Col md={4} className="text-center">
                  <i className="bi bi-file-earmark-text" style={{ fontSize: '3rem', color: '#6366F1' }}></i>
                  <h4>Document Automation</h4>
                  <p>Generate, store, and manage HR documents and templates securely.</p>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  </div>
);

export default LandingPage;
