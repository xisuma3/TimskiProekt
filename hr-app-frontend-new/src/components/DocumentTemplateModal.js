import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Alert, Tabs, Tab } from 'react-bootstrap';
import { API_URLS } from '../config/api';

const DocumentTemplateModal = ({ show, onHide, onSave, editingTemplate }) => {
  const [templateData, setTemplateData] = useState({
    templateName: '',
    description: '',
    templateContent: '',
    templateType: 'Asset'
  });
  const [error, setError] = useState('');
  const [previewContent, setPreviewContent] = useState('');
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [assets, setAssets] = useState([]);
  const [selectedAssets, setSelectedAssets] = useState([]);

  useEffect(() => {
    if (editingTemplate) {
      setTemplateData({
        templateName: editingTemplate.templateName || '',
        description: editingTemplate.description || '',
        templateContent: editingTemplate.templateContent || '',
        templateType: editingTemplate.templateType || 'Asset'
      });
    } else {
      setTemplateData({
        templateName: '',
        description: '',
        templateContent: '',
        templateType: 'Asset'
      });
    }
    setError('');
    setPreviewContent('');
  }, [editingTemplate, show]);

  useEffect(() => {
    if (show) {
      fetchEmployees();
      fetchAssets();
    }
  }, [show]);

  const fetchEmployees = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(API_URLS.EMPLOYEES.GET_ALL(), {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setEmployees(data);
        if (data.length > 0) setSelectedEmployee(data[0].employeeID);
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

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setTemplateData(prev => ({
      ...prev,
      [name]: value
    }));
    setError('');
  };

  const handlePreview = async () => {
    if (!selectedEmployee || !templateData.templateContent) {
      setError('Please select an employee and add template content to preview');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      
      // Use the new direct preview endpoint that doesn't require saving templates
      const response = await fetch(API_URLS.DOCUMENT_TEMPLATES.PREVIEW(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          templateContent: templateData.templateContent,
          employeeId: selectedEmployee,
          assetIds: selectedAssets.length > 0 ? selectedAssets : null
        })
      });

      if (response.ok) {
        const content = await response.text();
        setPreviewContent(content);
      } else {
        const errorData = await response.json().catch(() => ({}));
        setError(errorData.message || 'Failed to generate preview');
      }
    } catch (err) {
      console.error('Preview error:', err);
      setError('Failed to generate preview');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!templateData.templateName.trim() || !templateData.templateContent.trim()) {
      setError('Template name and content are required');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const url = editingTemplate 
        ? API_URLS.DOCUMENT_TEMPLATES.UPDATE(editingTemplate.templateID)
        : API_URLS.DOCUMENT_TEMPLATES.CREATE();
      
      const method = editingTemplate ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(templateData)
      });

      if (response.ok) {
        onSave();
        onHide();
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to save template');
      }
    } catch (err) {
      console.error('Save error:', err);
      setError('Failed to save template');
    }
  };

  const sampleTemplate = `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h1 style="color: #6366F1;">{{employee.firstName}} {{employee.lastName}}</h1>
  <p><strong>Email:</strong> {{employee.email}}</p>
  <p><strong>Position:</strong> {{employee.position}}</p>
  <p><strong>Department:</strong> {{employee.department}}</p>
  <p><strong>Hire Date:</strong> {{employee.hireDate}}</p>
  
  <h3>Asset Assignment</h3>
  {{#assetList}}
  <div style="border: 1px solid #ccc; padding: 10px; margin: 5px 0;">
    <p><strong>Asset:</strong> {{asset.name}}</p>
    <p><strong>Serial Number:</strong> {{asset.serialNumber}}</p>
    <p><strong>Assigned:</strong> {{asset.assignmentDate}}</p>
  </div>
  {{/assetList}}
  
  <p>Generated on: {{system.currentDate}}</p>
</div>`;

  return (
    <Modal show={show} onHide={onHide} size="xl">
      <Modal.Header closeButton style={{ backgroundColor: '#1E293B', borderColor: '#374151' }}>
        <Modal.Title style={{ color: 'white' }}>
          {editingTemplate ? 'Edit Template' : 'Create New Template'}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body style={{ backgroundColor: '#1E293B', color: 'white' }}>
        {error && <Alert variant="danger">{error}</Alert>}
        
        <Tabs defaultActiveKey="editor" className="mb-3">
          <Tab eventKey="editor" title="Template Editor">
            <Form onSubmit={handleSubmit}>
              <Form.Group className="mb-3">
                <Form.Label>Template Name *</Form.Label>
                <Form.Control
                  type="text"
                  name="templateName"
                  value={templateData.templateName}
                  onChange={handleInputChange}
                  required
                  style={{ backgroundColor: '#374151', borderColor: '#6B7280', color: 'white' }}
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Description</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={2}
                  name="description"
                  value={templateData.description}
                  onChange={handleInputChange}
                  style={{ backgroundColor: '#374151', borderColor: '#6B7280', color: 'white' }}
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Template Type</Form.Label>
                <Form.Select
                  name="templateType"
                  value={templateData.templateType}
                  onChange={handleInputChange}
                  style={{ backgroundColor: '#374151', borderColor: '#6B7280', color: 'white' }}
                >
                  <option value="Asset">Asset</option>
                  <option value="Employment">Employment</option>
                  <option value="Salary">Salary</option>
                </Form.Select>
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Template Content (HTML) *</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={12}
                  name="templateContent"
                  value={templateData.templateContent}
                  onChange={handleInputChange}
                  required
                  style={{ backgroundColor: '#374151', borderColor: '#6B7280', color: 'white', fontFamily: 'monospace' }}
                  placeholder={sampleTemplate}
                />
              </Form.Group>

              <div className="d-flex justify-content-between">
                <Button 
                  type="button" 
                  variant="info" 
                  onClick={() => setTemplateData(prev => ({ ...prev, templateContent: sampleTemplate }))}
                >
                  Load Sample Template
                </Button>
                <div>
                  <Button variant="secondary" onClick={onHide} className="me-2">
                    Cancel
                  </Button>
                  <Button type="submit" variant="primary">
                    {editingTemplate ? 'Update Template' : 'Create Template'}
                  </Button>
                </div>
              </div>
            </Form>
          </Tab>

          <Tab eventKey="preview" title="Preview">
            <div className="mb-3">
              <Form.Group className="mb-2">
                <Form.Label>Select Employee for Preview</Form.Label>
                <Form.Select
                  value={selectedEmployee}
                  onChange={(e) => setSelectedEmployee(e.target.value)}
                  style={{ backgroundColor: '#374151', borderColor: '#6B7280', color: 'white' }}
                >
                  {employees.map(emp => (
                    <option key={emp.employeeID} value={emp.employeeID}>
                      {emp.firstName} {emp.lastName} - {emp.position}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>

              <Form.Group className="mb-2">
                <Form.Label>Select Assets (optional)</Form.Label>
                <Form.Select
                  multiple
                  value={selectedAssets}
                  onChange={(e) => setSelectedAssets(Array.from(e.target.selectedOptions, option => option.value))}
                  style={{ backgroundColor: '#374151', borderColor: '#6B7280', color: 'white' }}
                >
                  {assets.map(asset => (
                    <option key={asset.assetID} value={asset.assetID}>
                      {asset.name} - {asset.serialNumber}
                    </option>
                  ))}
                </Form.Select>
                <Form.Text style={{ color: '#9CA3AF' }}>
                  Hold Ctrl/Cmd to select multiple assets
                </Form.Text>
              </Form.Group>

              <Button variant="success" onClick={handlePreview} className="mb-3">
                Generate Preview
              </Button>
            </div>

            {previewContent && (
              <div 
                style={{ 
                  border: '1px solid #6B7280', 
                  borderRadius: '4px', 
                  padding: '15px',
                  backgroundColor: 'white',
                  color: 'black',
                  maxHeight: '400px',
                  overflow: 'auto'
                }}
                dangerouslySetInnerHTML={{ __html: previewContent }}
              />
            )}
          </Tab>
        </Tabs>
      </Modal.Body>
    </Modal>
  );
};

export default DocumentTemplateModal;