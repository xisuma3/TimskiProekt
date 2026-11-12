import { useState } from 'react';
import { Eye, FileCheck, Printer, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import DocPreview from '../components/app/DocPreview';
import ItemCard, { MetaList } from '../components/app/ItemCard';
import StatusBadge from '../components/app/StatusBadge';
import DataPage from '../components/DataPage';
import DocumentGenerationModal from '../components/DocumentGenerationModal';
import SelfServiceDocumentModal from '../components/SelfServiceDocumentModal';
import { API_URLS } from '../config/api';
import { isAdmin } from '../services/authService';

const typeTone = (type) =>
  type === 'Asset' ? 'primary' : type === 'Employment' ? 'success' : 'warning';

const GeneratedDocumentsPage = () => {
  const [viewingDocument, setViewingDocument] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showSelfService, setShowSelfService] = useState(false);
  // Bumped after a self-service document is created so the list reloads.
  const [listVersion, setListVersion] = useState(0);
  const admin = isAdmin();

  const renderDocumentCard = (document, onEdit, onDelete) => (
    <ItemCard
      icon={FileCheck}
      tone="green"
      title={document.templateName || 'Document'}
      subtitle={`Document ID: ${document.documentID}`}
      badge={<StatusBadge tone={typeTone(document.documentType)}>{document.documentType || 'Unknown'}</StatusBadge>}
      actions={(
        <>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="View document"
            onClick={() => handleViewDocument(document)}
          >
            <Eye aria-hidden="true" />
          </Button>
          {admin && (
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              aria-label="Delete document"
              onClick={() => onDelete(document)}
            >
              <Trash2 aria-hidden="true" />
            </Button>
          )}
        </>
      )}
    >
      <MetaList
        items={[
          { label: 'Employee', value: admin ? document.employeeName : 'My Document', fallback: '—' },
          { label: 'Generated', value: new Date(document.generatedDate).toLocaleDateString() },
        ]}
      />

      <div className="mt-4 mb-1 text-xs font-semibold text-muted-foreground">Content preview</div>
      <div className="rounded-md border bg-muted/50 p-2 text-xs wrap-break-word">
        {document.contentPreview || 'No content available'}
      </div>
    </ItemCard>
  );

  const handleViewDocument = async (document) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(API_URLS.GENERATED_DOCUMENTS.GET_CONTENT(document.documentID), {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const content = await response.text();
        setViewingDocument({ ...document, fullContent: content });
        setShowViewModal(true);
      }
    } catch (err) {
      console.error('Failed to fetch document content:', err);
    }
  };

  const handleDelete = async (document, token) => {
    const response = await fetch(API_URLS.GENERATED_DOCUMENTS.DELETE(document.documentID), {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) {
      throw new Error('Failed to delete document');
    }
  };

  const apiEndpoint = admin ? API_URLS.GENERATED_DOCUMENTS.GET_ALL() : API_URLS.GENERATED_DOCUMENTS.GET_MY_DOCUMENTS();

  return (
    <>
      <DataPage
        key={listVersion}
        title={admin ? "Generated Documents" : "My Generated Documents"}
        subtitle={admin
          ? 'Documents produced from templates for your employees.'
          : 'Documents issued to you. Some you can generate yourself with Get a document.'}
        emptyIcon={FileCheck}
        apiEndpoint={apiEndpoint}
        searchFields={admin ? ['templateName', 'employeeName', 'documentType'] : ['templateName', 'documentType']}
        dateFilter={{ label: 'Generated', field: 'generatedDate' }}
        personFilter={{ label: 'Employee', field: 'employeeName' }}
        renderCard={renderDocumentCard}
        searchPlaceholder={admin ? "Search documents..." : "Search my documents..."}
        createButtonText={admin ? "Generate Document" : "Get a document"}
        showAddButton={!admin}
        onAddClick={() => setShowSelfService(true)}
        modalComponent={admin ? DocumentGenerationModal : null}
        onDelete={admin ? handleDelete : null}
        deleteConfirmText="Are you sure you want to delete this generated document? This action cannot be undone."
      />

      {!admin && (
        <SelfServiceDocumentModal
          show={showSelfService}
          onHide={() => setShowSelfService(false)}
          onGenerated={(doc) => {
            setShowSelfService(false);
            setListVersion((v) => v + 1);
            handleViewDocument(doc);
          }}
        />
      )}

      {/* Document View Modal */}
      <Dialog open={showViewModal} onOpenChange={(open) => { if (!open) setShowViewModal(false); }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle>
              {viewingDocument?.templateName} - {viewingDocument?.employeeName}
            </DialogTitle>
            <DialogDescription>Read-only copy of the generated document. Print it for a paper copy.</DialogDescription>
          </DialogHeader>
          <div className="rounded-lg bg-muted p-4">
            {viewingDocument?.fullContent && (
              <DocPreview html={viewingDocument.fullContent} className="max-h-[65vh]" />
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowViewModal(false)}>
              Close
            </Button>
            <Button
              onClick={() => {
                const printWindow = window.open('', '_blank');
                printWindow.document.write(`
                  <html>
                    <head>
                      <title>${viewingDocument?.templateName} - ${viewingDocument?.employeeName}</title>
                      <style>body { font-family: Arial, sans-serif; margin: 20px; }</style>
                    </head>
                    <body>${viewingDocument?.fullContent}</body>
                  </html>
                `);
                printWindow.document.close();
                printWindow.print();
              }}
            >
              <Printer aria-hidden="true" />
              Print
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default GeneratedDocumentsPage;
