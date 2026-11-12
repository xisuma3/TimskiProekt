import { useEffect, useState } from 'react';
import { AlertCircle, Eye, FileText } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from '@/components/ui/field';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Spinner } from '@/components/ui/spinner';
import DocPreview from './app/DocPreview';
import { MetaList } from './app/ItemCard';
import StatusBadge from './app/StatusBadge';
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

  // A checkbox list replaces the old Ctrl/Cmd-click multi-select; the state is the same
  // array of asset ids.
  const toggleAsset = (id) =>
    setSelectedAssets((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

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
    <Dialog open={show} onOpenChange={(open) => { if (!open) onHide(); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-5xl">
        <form
          onSubmit={(e) => { e.preventDefault(); handleGenerate(); }}
          className="grid gap-6"
        >
          <DialogHeader>
            <DialogTitle>Generate Document</DialogTitle>
            <DialogDescription>
              Fill a template with an employee’s details, preview it, then save it as a document.
            </DialogDescription>
          </DialogHeader>

          {error && (
            <Alert variant="destructive">
              <AlertCircle aria-hidden="true" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="grid gap-6 md:grid-cols-2">
            <FieldGroup className="min-w-0 gap-6">
              <Field>
                <FieldLabel htmlFor="generate-template">Select Template *</FieldLabel>
                <NativeSelect
                  id="generate-template"
                  value={selectedTemplate}
                  onChange={(e) => setSelectedTemplate(e.target.value)}
                  required
                  className="w-full"
                >
                  <NativeSelectOption value="">Choose a template...</NativeSelectOption>
                  {templates.map(template => (
                    <NativeSelectOption key={template.templateID} value={template.templateID}>
                      {template.templateName} ({template.templateType})
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
                {getSelectedTemplate() && (
                  <div className="rounded-lg border bg-muted/50 p-4">
                    <div className="flex flex-wrap items-center gap-2 font-medium">
                      {getSelectedTemplate().templateName}
                      <StatusBadge tone="primary">{getSelectedTemplate().templateType}</StatusBadge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {getSelectedTemplate().description || 'No description available'}
                    </p>
                  </div>
                )}
              </Field>

              <Field>
                <FieldLabel htmlFor="generate-employee">Select Employee *</FieldLabel>
                <NativeSelect
                  id="generate-employee"
                  value={selectedEmployee}
                  onChange={(e) => setSelectedEmployee(e.target.value)}
                  required
                  className="w-full"
                >
                  <NativeSelectOption value="">Choose an employee...</NativeSelectOption>
                  {employees.map(employee => (
                    <NativeSelectOption key={employee.employeeID} value={employee.employeeID}>
                      {employee.firstName} {employee.lastName} - {employee.position}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
                {getSelectedEmployee() && (
                  <div className="rounded-lg border bg-muted/50 p-4">
                    <div className="mb-2 font-medium">
                      {getSelectedEmployee().firstName} {getSelectedEmployee().lastName}
                    </div>
                    <MetaList
                      items={[
                        { label: 'Position', value: getSelectedEmployee().position, fallback: '—' },
                        { label: 'Email', value: getSelectedEmployee().email, fallback: '—' },
                        { label: 'Hire Date', value: new Date(getSelectedEmployee().hireDate).toLocaleDateString() },
                      ]}
                    />
                  </div>
                )}
              </Field>

              <FieldSet className="gap-2">
                <FieldLegend variant="label" className="mb-1">Select Assets (Optional)</FieldLegend>
                <div className="max-h-48 overflow-y-auto rounded-md border p-3">
                  {assets.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No assets to choose from.</p>
                  ) : (
                    <div className="grid gap-3">
                      {assets.map((asset) => {
                        const id = `generate-asset-${asset.assetID}`;
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
                <FieldDescription>
                  These will be available for asset placeholders in the template.
                </FieldDescription>
                {getSelectedAssetsData().length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 text-sm">
                    <span className="font-medium">Selected Assets:</span>
                    {getSelectedAssetsData().map(asset => (
                      <Badge key={asset.assetID} variant="secondary">
                        {asset.name}
                      </Badge>
                    ))}
                  </div>
                )}
              </FieldSet>
            </FieldGroup>

            <div className="flex min-w-0 flex-col gap-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-medium">Document Preview</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handlePreview}
                  disabled={!selectedTemplate || !selectedEmployee}
                >
                  <Eye aria-hidden="true" />
                  Generate Preview
                </Button>
              </div>

              {previewContent ? (
                <DocPreview html={previewContent} className="h-100" />
              ) : (
                <div className="flex h-100 flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                  <FileText className="size-8" aria-hidden="true" />
                  <p className="max-w-xs">
                    Select template and employee, then click "Generate Preview" to see the document
                  </p>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onHide}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!selectedTemplate || !selectedEmployee || isGenerating}
            >
              {isGenerating && <Spinner />}
              {isGenerating ? 'Generating...' : 'Generate Document'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default DocumentGenerationModal;
