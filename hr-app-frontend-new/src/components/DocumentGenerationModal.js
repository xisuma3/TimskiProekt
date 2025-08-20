import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Alert, Card, Badge } from 'react-bootstrap';
import { API_URLS } from '../config/api';

const DocumentGenerationModal = ({ show, onHide, onGenerate }) => {
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [selectedAssets, setSelectedAssets] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [assets, setAssets] = useState([]);
  const [error, setError] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewContent, setPreviewContent] = useState('');

  useEffect(() => {
    if (show) {
      fetchTemplates();
      fetchEmployees();
      fetchAssets();
      resetForm();
    }
  }, [show]);

  const resetForm = () => {
    setSelectedTemplate('');
    setSelectedEmployee('');
    setSelectedAssets([]);
    setError('');
    setPreviewContent('');
    setIsGenerating(false);
  };

  const fetchTemplates = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(API_URLS.DOCUMENT_TEMPLATES.GET_ALL(), {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setTemplates(data);
      }
    } catch (err) {
      console.error('Failed to fetch templates:', err);
    }
  };

  const fetchEmployees = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(API_URLS.EMPLOYEES.GET_ALL(), {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setEmployees(data);
      }
    } catch (err) {
      console.error('Failed to fetch employees:', err);
    }
  };

  const fetchAssets = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(API_URLS.ASSETS.GET_ALL(), {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setAssets(data);
      }
    } catch (err) {
      console.error('Failed to fetch assets:', err);
    }
  };

  const handlePreview = async () => {
    if (!selectedTemplate || !selectedEmployee) {
      setError('Please select both a template and an employee');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      
      // Get the selected template content
      const selectedTemplateData = templates.find(t => t.templateID === selectedTemplate);
      if (!selectedTemplateData) {
        setError('Selected template not found');
        return;
      }
      
      // Use the new direct preview endpoint
      const response = await fetch(API_URLS.DOCUMENT_TEMPLATES.PREVIEW(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          templateContent: selectedTemplateData.templateContent,
          employeeId: selectedEmployee,
          assetIds: selectedAssets.length > 0 ? selectedAssets : null
        })
      });

      if (response.ok) {
        const content = await response.text();
        setPreviewContent(content);
        setError('');
      } else {
        const errorData = await response.json().catch(() => ({}));
        setError(errorData.message || 'Failed to generate preview');
      }
    } catch (err) {
      console.error('Preview error:', err);
      setError('Failed to generate preview');
    }
  };

  const handleGenerate = async () => {
    if (!selectedTemplate || !selectedEmployee) {
      setError('Please select both a template and an employee');
      return;
    }

    setIsGenerating(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(API_URLS.GENERATED_DOCUMENTS.GENERATE(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          templateID: selectedTemplate,
          employeeID: selectedEmployee,
          assetIDs: selectedAssets
        })
      });

      if (response.ok) {
        onGenerate();
        onHide();
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to generate document');
      }
    } catch (err) {
      console.error('Generation error:', err);
      setError('Failed to generate document');
    } finally {
      setIsGenerating(false);
    }
  };

  const getSelectedTemplate = () => {
    return templates.find(t => t.templateID === selectedTemplate);
  };

  const getSelectedEmployee = () => {
    return employees.find(e => e.employeeID === selectedEmployee);
  };

  const getSelectedAssetsData = () => {
    return assets.filter(a => selectedAssets.includes(a.assetID));
  };

  return (
    <Modal show={show} onHide={onHide} size="xl">
      <Modal.Header closeButton style={{ backgroundColor: '#1E293B', borderColor: '#374151' }}>
        <Modal.Title style={{ color: 'white' }}>Generate Document</Modal.Title>
      </Modal.Header>
      <Modal.Body style={{ backgroundColor: '#1E293B', color: 'white' }}>
        {error && <Alert variant="danger">{error}</Alert>}
        
        <div className="row">
          <div className="col-md-6">
            <Form.Group className="mb-3">
              <Form.Label>Select Template *</Form.Label>
              <Form.Select
                value={selectedTemplate}
                onChange={(e) => setSelectedTemplate(e.target.value)}
                style={{ backgroundColor: '#374151', borderColor: '#6B7280', color: 'white' }}
                required
              >
                <option value="">Choose a template...</option>
                {templates.map(template => (
                  <option key={template.templateID} value={template.templateID}>
                    {template.templateName} ({template.templateType})
                  </option>
                ))}
              </Form.Select>
            </Form.Group>

            {getSelectedTemplate() && (
              <Card className="mb-3" style={{ backgroundColor: '#374151', borderColor: '#6B7280' }}>
                <Card.Body>
                  <Card.Title style={{ color: '#6366F1', fontSize: '1rem' }}>
                    {getSelectedTemplate().templateName}
                    <Badge bg="primary" className="ms-2">{getSelectedTemplate().templateType}</Badge>
                  </Card.Title>
                  <Card.Text style={{ color: '#9CA3AF', fontSize: '0.9rem' }}>
                    {getSelectedTemplate().description || 'No description available'}
                  </Card.Text>
                </Card.Body>
              </Card>
            )}

            <Form.Group className="mb-3">
              <Form.Label>Select Employee *</Form.Label>
              <Form.Select
                value={selectedEmployee}
                onChange={(e) => setSelectedEmployee(e.target.value)}
                style={{ backgroundColor: '#374151', borderColor: '#6B7280', color: 'white' }}
                required
              >
                <option value="">Choose an employee...</option>
                {employees.map(employee => (
                  <option key={employee.employeeID} value={employee.employeeID}>
                    {employee.firstName} {employee.lastName} - {employee.position}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>

            {getSelectedEmployee() && (
              <Card className="mb-3" style={{ backgroundColor: '#374151', borderColor: '#6B7280' }}>
                <Card.Body>
                  <Card.Title style={{ color: '#10B981', fontSize: '1rem' }}>
                    {getSelectedEmployee().firstName} {getSelectedEmployee().lastName}
                  </Card.Title>
                  <Card.Text style={{ color: '#9CA3AF', fontSize: '0.9rem' }}>
                    <strong>Position:</strong> {getSelectedEmployee().position}<br />
                    <strong>Email:</strong> {getSelectedEmployee().email}<br />
                    <strong>Hire Date:</strong> {new Date(getSelectedEmployee().hireDate).toLocaleDateString()}
                  </Card.Text>
                </Card.Body>
              </Card>
            )}

            <Form.Group className="mb-3">
              <Form.Label>Select Assets (Optional)</Form.Label>
              <Form.Select
                multiple
                value={selectedAssets}
                onChange={(e) => setSelectedAssets(Array.from(e.target.selectedOptions, option => option.value))}
                style={{ backgroundColor: '#374151', borderColor: '#6B7280', color: 'white' }}
                size={4}
              >
                {assets.map(asset => (
                  <option key={asset.assetID} value={asset.assetID}>
                    {asset.name} - {asset.serialNumber}
                  </option>
                ))}
              </Form.Select>
              <Form.Text style={{ color: '#9CA3AF' }}>
                Hold Ctrl/Cmd to select multiple assets. These will be available for asset placeholders in the template.
              </Form.Text>
            </Form.Group>

            {getSelectedAssetsData().length > 0 && (
              <div className="mb-3">
                <strong>Selected Assets:</strong>
                {getSelectedAssetsData().map(asset => (
                  <Badge key={asset.assetID} bg="secondary" className="me-1 mt-1">
                    {asset.name}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="col-md-6">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h6>Document Preview</h6>
              <Button 
                variant="info" 
                size="sm" 
                onClick={handlePreview}
                disabled={!selectedTemplate || !selectedEmployee}
              >
                Generate Preview
              </Button>
            </div>
            
            <div 
              style={{ 
                border: '1px solid #6B7280', 
                borderRadius: '4px', 
                padding: '15px',
                backgroundColor: 'white',
                color: 'black',
                height: '400px',
                overflow: 'auto'
              }}
            >
              {previewContent ? (
                <div dangerouslySetInnerHTML={{ __html: previewContent }} />
              ) : (
                <div className="text-center" style={{ color: '#6B7280', marginTop: '150px' }}>
                  Select template and employee, then click "Generate Preview" to see the document
                </div>
              )}
            </div>
          </div>
        </div>
      </Modal.Body>
      <Modal.Footer style={{ backgroundColor: '#1E293B', borderColor: '#374151' }}>
        <Button variant="secondary" onClick={onHide}>
          Cancel
        </Button>
        <Button 
          variant="success" 
          onClick={handleGenerate}
          disabled={!selectedTemplate || !selectedEmployee || isGenerating}
        >
          {isGenerating ? 'Generating...' : 'Generate Document'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default DocumentGenerationModal;