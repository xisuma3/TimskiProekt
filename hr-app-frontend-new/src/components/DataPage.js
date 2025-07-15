import React, { useEffect, useState } from 'react';
import { Container, Row, Col, Card, Spinner, Alert, Form, InputGroup, Button } from 'react-bootstrap';
import { authenticatedFetch } from '../services/authService';

const PAGE_BG = '#232B4D';

const DataPage = ({ 
  title, 
  apiEndpoint, 
  searchFields = [], 
  renderCard, 
  searchPlaceholder = "Search...",
  showAddButton = false,
  onAddClick = null
}) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    authenticatedFetch(apiEndpoint)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to fetch ${title.toLowerCase()}.`);
        }
        return response.json();
      })
      .then((data) => {
        setData(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError(err.message);
        setLoading(false);
      });
  }, [apiEndpoint, title]);

  // Filter data by search
  const filteredData = data.filter(item => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return searchFields.some(field => {
      const value = item[field];
      return value && value.toString().toLowerCase().includes(searchLower);
    });
  });

  return (
    <div
      style={{
        minHeight: '100vh',
        background: PAGE_BG,
        color: 'white',
        paddingTop: '2rem',
        paddingBottom: '2rem',
      }}
    >
      <Container>
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h1 style={{ color: '#6366F1' }}>{title}</h1>
          <div className="d-flex gap-3">
            <Form style={{ minWidth: 250 }}>
              <InputGroup>
                <InputGroup.Text style={{ backgroundColor: '#1E293B', borderColor: '#6366F1', color: '#6366F1' }}>
                  <i className="bi bi-search"></i>
                </InputGroup.Text>
                <Form.Control
                  type="text"
                  placeholder={searchPlaceholder}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{ background: '#1E293B', color: 'white', borderColor: '#6366F1' }}
                />
              </InputGroup>
            </Form>
            {showAddButton && (
              <Button
                onClick={onAddClick}
                style={{ 
                  backgroundColor: '#6366F1', 
                  borderColor: '#6366F1',
                  padding: '0.375rem 1rem'
                }}
              >
                <i className="bi bi-plus-circle me-2"></i>
                Add New
              </Button>
            )}
          </div>
        </div>

        {loading && (
          <div className="text-center">
            <Spinner animation="border" variant="light" />
          </div>
        )}

        {error && (
          <Alert variant="danger" className="text-center">
            {error}
          </Alert>
        )}

        {!loading && !error && filteredData.length === 0 && (
          <div className="text-center text-muted">No {title.toLowerCase()} found.</div>
        )}

        {!loading && !error && filteredData.length > 0 && (
          <Row>
            {filteredData.map((item, index) => (
              <Col md={4} className="mb-4" key={item.id || item.employeeID || item.departmentID || item.assetID || item.documentID || index}>
                {renderCard(item)}
              </Col>
            ))}
          </Row>
        )}
      </Container>
    </div>
  );
};

export default DataPage; 