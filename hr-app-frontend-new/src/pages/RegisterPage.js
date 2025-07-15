import React, { useState } from 'react';
import { Form, Button, Container, Row, Col, Alert } from 'react-bootstrap';
import { register } from '../services/authService';

const RegisterPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      await register(email, password);
      setSuccess('Registration successful! You can now log in.');
    } catch (err) {
      setError('Registration failed or server error.');
    }
  };
  return (
    <div style={{ backgroundColor: '#0F172A', minHeight: '100vh', color: 'white' }}>
      <Container>
        <Row className="justify-content-md-center">
          <Col md={4}>
            <h2 className="mt-5" style={{ color: '#6366F1' }}>Register</h2>
            {error && <Alert variant="danger">{error}</Alert>}
            {success && <Alert variant="success">{success}</Alert>}
            <Form onSubmit={handleSubmit}>
              <Form.Group controlId="formBasicEmail" className="mb-3">
                <Form.Label>Email address</Form.Label>
                <Form.Control
                  type="email"
                  placeholder="Enter email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  style={{ backgroundColor: '#1E293B', borderColor: '#6366F1', color: 'white' }}
                />
              </Form.Group>
              <Form.Group controlId="formBasicPassword" className="mb-3">
                <Form.Label>Password</Form.Label>
                <Form.Control
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  style={{ backgroundColor: '#1E293B', borderColor: '#6366F1', color: 'white' }}
                />
              </Form.Group>
              <Button 
                type="submit" 
                className="w-100"
                style={{ backgroundColor: '#6366F1', borderColor: '#6366F1' }}
              >
                Register
              </Button>
            </Form>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default RegisterPage;
