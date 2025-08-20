import React, { useState, useEffect } from 'react';
import { Form, Button, Container, Row, Col, Alert } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { register, authenticatedFetch } from '../services/authService';

const RegisterPage = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    position: '',
    departmentName: '',
    hireDate: ''
  });
  const [departments, setDepartments] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Note: Department endpoint requires authentication, so we'll handle this differently
    // For now, we'll make department optional in registration
    // Alternative: create a public endpoint for departments, or remove department from registration
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      setLoading(false);
      return;
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long.');
      setLoading(false);
      return;
    }

    try {
      const registerData = {
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        position: formData.position,
        departmentID: null, // Will be assigned by HR later
        hireDate: formData.hireDate
      };

      await register(registerData);
      setSuccess('Registration successful! Redirecting to login page...');
      // Reset form
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        confirmPassword: '',
        position: '',
        departmentName: '',
        hireDate: ''
      });
      
      // Redirect to login page after 3 seconds
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err) {
      setError(err.message || 'Registration failed or server error.');
    } finally {
      setLoading(false);
    }
  };
  return (
    <div style={{ backgroundColor: '#0F172A', minHeight: '100vh', color: 'white' }}>
      <Container>
        <Row className="justify-content-md-center">
          <Col md={8}>
            <h2 className="mt-5" style={{ color: '#6366F1' }}>Register</h2>
            {error && <Alert variant="danger">{error}</Alert>}
            {success && <Alert variant="success">{success}</Alert>}
            <Form onSubmit={handleSubmit}>
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>First Name *</Form.Label>
                    <Form.Control
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleChange}
                      required
                      style={{ backgroundColor: '#1E293B', borderColor: '#6366F1', color: 'white' }}
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Last Name *</Form.Label>
                    <Form.Control
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleChange}
                      required
                      style={{ backgroundColor: '#1E293B', borderColor: '#6366F1', color: 'white' }}
                    />
                  </Form.Group>
                </Col>
              </Row>

              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Email address *</Form.Label>
                    <Form.Control
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      style={{ backgroundColor: '#1E293B', borderColor: '#6366F1', color: 'white' }}
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Position *</Form.Label>
                    <Form.Control
                      type="text"
                      name="position"
                      value={formData.position}
                      onChange={handleChange}
                      required
                      style={{ backgroundColor: '#1E293B', borderColor: '#6366F1', color: 'white' }}
                    />
                  </Form.Group>
                </Col>
              </Row>

              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Department (Optional)</Form.Label>
                    <Form.Control
                      type="text"
                      name="departmentName"
                      value={formData.departmentName || ''}
                      onChange={handleChange}
                      placeholder="Enter department name"
                      style={{ backgroundColor: '#1E293B', borderColor: '#6366F1', color: 'white' }}
                    />
                    <Form.Text className="text-muted">
                      Department will be assigned by HR after registration
                    </Form.Text>
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Hire Date *</Form.Label>
                    <Form.Control
                      type="date"
                      name="hireDate"
                      value={formData.hireDate}
                      onChange={handleChange}
                      required
                      style={{ backgroundColor: '#1E293B', borderColor: '#6366F1', color: 'white' }}
                    />
                  </Form.Group>
                </Col>
              </Row>

              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Password *</Form.Label>
                    <Form.Control
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      required
                      placeholder="Enter password"
                      style={{ backgroundColor: '#1E293B', borderColor: '#6366F1', color: 'white' }}
                    />
                    <Form.Text className="text-muted">
                      Minimum 6 characters
                    </Form.Text>
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Confirm Password *</Form.Label>
                    <Form.Control
                      type="password"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      required
                      placeholder="Confirm password"
                      style={{ backgroundColor: '#1E293B', borderColor: '#6366F1', color: 'white' }}
                    />
                  </Form.Group>
                </Col>
              </Row>

              <Button 
                type="submit" 
                className="w-100 mt-3"
                disabled={loading}
                style={{ backgroundColor: '#6366F1', borderColor: '#6366F1' }}
              >
                {loading ? 'Registering...' : 'Register'}
              </Button>
            </Form>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default RegisterPage;
