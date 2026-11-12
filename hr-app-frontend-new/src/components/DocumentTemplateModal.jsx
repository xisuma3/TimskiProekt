import { useEffect, useState } from 'react';
import { AlertCircle, Eye } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import DocPreview from './app/DocPreview';
import { API_URLS } from '../config/api';

const DocumentTemplateModal = ({ show, onHide, onSave, editingTemplate }) => {
  const [templateData, setTemplateData] = useState({
    templateName: '',
    description: '',
    templateContent: '',
    templateType: 'Asset',
    allowSelfService: false
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
        templateType: editingTemplate.templateType || 'Asset',
        allowSelfService: Boolean(editingTemplate.allowSelfService)
      });
    } else {
      setTemplateData({
        templateName: '',
        description: '',
        templateContent: '',
        templateType: 'Asset',
        allowSelfService: false
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

  // A checkbox list replaces the old Ctrl/Cmd-click multi-select; the state is the same
  // array of asset ids.
  const toggleAsset = (id) =>
    setSelectedAssets((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

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
    <Dialog open={show} onOpenChange={(open) => { if (!open) onHide(); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>
            {editingTemplate ? 'Edit Template' : 'Create New Template'}
          </DialogTitle>
          <DialogDescription>
            Write the template as HTML with placeholders, then preview it with an employee’s data.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertCircle aria-hidden="true" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="editor" className="min-w-0 gap-4">
          <TabsList>
            <TabsTrigger value="editor">Template Editor</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
          </TabsList>

          <TabsContent value="editor">
            <form onSubmit={handleSubmit} className="grid gap-6">
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="template-name">Template Name *</FieldLabel>
                  <Input
                    id="template-name"
                    type="text"
                    name="templateName"
                    value={templateData.templateName}
                    onChange={handleInputChange}
                    required
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="template-description">Description</FieldLabel>
                  <Textarea
                    id="template-description"
                    rows={2}
                    name="description"
                    value={templateData.description}
                    onChange={handleInputChange}
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="template-type">Template Type</FieldLabel>
                  <NativeSelect
                    id="template-type"
                    name="templateType"
                    value={templateData.templateType}
                    onChange={handleInputChange}
                    className="w-full"
                  >
                    <NativeSelectOption value="Asset">Asset</NativeSelectOption>
                    <NativeSelectOption value="Employment">Employment</NativeSelectOption>
                    <NativeSelectOption value="Salary">Salary</NativeSelectOption>
                  </NativeSelect>
                </Field>

                <Field orientation="horizontal">
                  <Switch
                    id="template-self-service"
                    checked={templateData.allowSelfService}
                    onCheckedChange={(checked) => setTemplateData((prev) => ({ ...prev, allowSelfService: checked }))}
                  />
                  <FieldContent>
                    <FieldLabel htmlFor="template-self-service">Employees can generate this themselves</FieldLabel>
                    <FieldDescription>
                      For documents about the employee only, like an employment confirmation. They can only
                      ever generate it for themselves, listing equipment they hold. Leave off for anything HR
                      must issue, such as salary letters.
                    </FieldDescription>
                  </FieldContent>
                </Field>

                <Field>
                  <FieldLabel htmlFor="template-content">Template Content (HTML) *</FieldLabel>
                  <Textarea
                    id="template-content"
                    rows={12}
                    name="templateContent"
                    value={templateData.templateContent}
                    onChange={handleInputChange}
                    required
                    className="field-sizing-fixed font-mono text-xs md:text-xs"
                    placeholder={sampleTemplate}
                  />
                </Field>
              </FieldGroup>

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setTemplateData(prev => ({ ...prev, templateContent: sampleTemplate }))}
                >
                  Load Sample Template
                </Button>
                <div className="flex flex-col-reverse gap-2 sm:flex-row">
                  <Button type="button" variant="outline" onClick={onHide}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingTemplate ? 'Update Template' : 'Create Template'}
                  </Button>
                </div>
              </div>
            </form>
          </TabsContent>

          <TabsContent value="preview" className="grid gap-6">
            <FieldGroup className="gap-6">
              <Field>
                <FieldLabel htmlFor="template-preview-employee">Select Employee for Preview</FieldLabel>
                <NativeSelect
                  id="template-preview-employee"
                  value={selectedEmployee}
                  onChange={(e) => setSelectedEmployee(e.target.value)}
                  className="w-full"
                >
                  {employees.map(emp => (
                    <NativeSelectOption key={emp.employeeID} value={emp.employeeID}>
                      {emp.firstName} {emp.lastName} - {emp.position}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </Field>

              <FieldSet className="gap-2">
                <FieldLegend variant="label" className="mb-1">Select Assets (optional)</FieldLegend>
                <div className="max-h-48 overflow-y-auto rounded-md border p-3">
                  {assets.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No assets to choose from.</p>
                  ) : (
                    <div className="grid gap-3">
                      {assets.map((asset) => {
                        const id = `template-preview-asset-${asset.assetID}`;
                        return (
                          <Field key={asset.assetID} orientation="horizontal">
                            <Checkbox
                              id={id}
                              checked={selectedAssets.includes(asset.assetID)}
                              onCheckedChange={() => toggleAsset(asset.assetID)}
                            />
                            <FieldLabel htmlFor={id} className="font-normal">
                              {asset.name}{asset.serialNumber ? ` - ${asset.serialNumber}` : ''}
                            </FieldLabel>
                          </Field>
                        );
                      })}
                    </div>
                  )}
                </div>
                <FieldDescription>Ticked assets fill the asset placeholders in the preview.</FieldDescription>
              </FieldSet>
            </FieldGroup>

            <div>
              <Button type="button" variant="outline" onClick={handlePreview}>
                <Eye aria-hidden="true" />
                Generate Preview
              </Button>
            </div>

            {previewContent && <DocPreview html={previewContent} className="max-h-100" />}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default DocumentTemplateModal;
