import { FileText, Info, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import IconTile from '../components/app/IconTile';
import ItemCard, { MetaList } from '../components/app/ItemCard';
import StatusBadge from '../components/app/StatusBadge';
import DataPage from '../components/DataPage';
import DocumentTemplateModal from '../components/DocumentTemplateModal';
import { API_URLS } from '../config/api';
import { isAdmin } from '../services/authService';

const typeTone = (type) =>
  type === 'Asset' ? 'primary' : type === 'Employment' ? 'success' : 'warning';

const PlaceholderBlock = ({ title, children }) => (
  <div>
    <div className="mb-2 text-sm font-semibold">{title}</div>
    <code className="block rounded-md border bg-muted/50 p-4 font-mono text-sm leading-relaxed wrap-anywhere">
      {children}
    </code>
  </div>
);

const DocumentTemplatesPage = () => {
  const admin = isAdmin();
  const renderTemplateCard = (template, onEdit, onDelete) => (
    <ItemCard
      icon={FileText}
      tone="indigo"
      title={template.templateName}
      subtitle={template.allowSelfService ? 'Employees can generate this themselves' : 'Issued by HR only'}
      badge={(
        <div className="flex flex-col items-end gap-1">
          {template.allowSelfService && <StatusBadge tone="info">Self-service</StatusBadge>}
          <StatusBadge tone={typeTone(template.templateType)}>{template.templateType}</StatusBadge>
        </div>
      )}
      actions={admin ? (
        <>
          <Button variant="ghost" size="icon-sm" aria-label="Edit template" onClick={() => onEdit(template)}>
            <Pencil aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            aria-label="Delete template"
            onClick={() => onDelete(template)}
          >
            <Trash2 aria-hidden="true" />
          </Button>
        </>
      ) : null}
    >
      <MetaList
        items={[
          { label: 'Description', value: template.description, fallback: 'No description available' },
          { label: 'Documents', value: `${template.generatedDocumentsCount || 0} generated` },
        ]}
      />

      <div className="mt-4 mb-1 text-xs font-semibold text-muted-foreground">Content preview</div>
      <div className="rounded-md border bg-muted/50 p-2 font-mono text-xs wrap-anywhere">
        {template.templateContent ?
          template.templateContent.length > 100
            ? template.templateContent.substring(0, 100) + '...'
            : template.templateContent
          : 'No content available'
        }
      </div>
    </ItemCard>
  );

  const handleDelete = async (template, token) => {
    if (template.generatedDocumentsCount > 0) {
      throw new Error('Cannot delete template with existing generated documents');
    }

    const response = await fetch(API_URLS.DOCUMENT_TEMPLATES.DELETE(template.templateID), {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to delete template');
    }
  };

  const apiEndpoint = API_URLS.DOCUMENT_TEMPLATES.GET_ALL();

  return (
    <>
      <DataPage
        title="Document Templates"
        subtitle="Reusable templates for contracts, handover forms and letters."
        emptyIcon={FileText}
        apiEndpoint={apiEndpoint}
        searchFields={['templateName', 'templateType', 'description']}
        renderCard={renderTemplateCard}
        searchPlaceholder="Search templates..."
        createButtonText="Create Template"
        modalComponent={admin ? DocumentTemplateModal : null}
        onDelete={admin ? handleDelete : null}
        deleteConfirmText="Are you sure you want to delete this template? This action cannot be undone."
      />

      {/* Template Placeholder Guide */}
      <Card className="mt-6">
        <CardHeader>
          <div className="flex items-start gap-3">
            <IconTile icon={Info} tone="amber" />
            <div className="min-w-0">
              <CardTitle>Template Placeholder Guide</CardTitle>
              <CardDescription>Available placeholders for template content</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <PlaceholderBlock title="Employee Data">
            {'{{employee.firstName}}'}<br />
            {'{{employee.lastName}}'}<br />
            {'{{employee.email}}'}<br />
            {'{{employee.position}}'}<br />
            {'{{employee.department}}'}<br />
            {'{{employee.hireDate}}'}
          </PlaceholderBlock>
          <PlaceholderBlock title="System & Assets">
            {'{{system.currentDate}}'}<br />
            {'{{asset.name}}'}<br />
            {'{{asset.serialNumber}}'}<br />
            {'{{#assetList}}...{{/assetList}}'}
          </PlaceholderBlock>
        </CardContent>
      </Card>
    </>
  );
};

export default DocumentTemplatesPage;
