import { useEffect, useState } from 'react';
import { AlertCircle, FileLock, FileText } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
  FieldTitle,
} from '@/components/ui/field';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Spinner } from '@/components/ui/spinner';
import EmptyState from './app/EmptyState';
import IconTile from './app/IconTile';
import { authenticatedFetch } from '../services/authService';
import { API_URLS } from '../config/api';

// An employee generating a document about themselves from a template HR opted in.
// The API decides the subject from the token; this only picks the template and assets.
const SelfServiceDocumentModal = ({ show, onHide, onGenerated }) => {
  const [templates, setTemplates] = useState(null); // null = loading
  const [assets, setAssets] = useState([]);
  const [templateId, setTemplateId] = useState('');
  const [assetIds, setAssetIds] = useState([]);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!show) return undefined;
    let cancelled = false;
    setTemplates(null);
    setTemplateId('');
    setError('');
    Promise.all([
      // Only the opted-in templates, without their HTML: the full library is HR's.
      authenticatedFetch(API_URLS.DOCUMENT_TEMPLATES.GET_SELF_SERVICE()).then((r) => (r.ok ? r.json() : [])),
      authenticatedFetch(API_URLS.ASSETS.GET_MY_ASSETS()).then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([selfService, myAssets]) => {
        if (cancelled) return;
        const available = selfService || [];
        setTemplates(available);
        setAssets(myAssets || []);
        setAssetIds((myAssets || []).map((a) => a.assetID));
        if (available.length === 1) setTemplateId(available[0].templateID);
      })
      .catch(() => { if (!cancelled) { setTemplates([]); setError('Could not load the available documents.'); } });
    return () => { cancelled = true; };
  }, [show]);

  const selected = templates?.find((t) => t.templateID === templateId);
  // The server works this out from the template body, which employees no longer receive.
  const needsAssets = Boolean(selected?.listsAssets);

  const toggleAsset = (id) =>
    setAssetIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const generate = async () => {
    if (!selected) {
      setError('Choose a document first.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const res = await authenticatedFetch(API_URLS.GENERATED_DOCUMENTS.GENERATE_MINE(), {
        method: 'POST',
        body: JSON.stringify({ templateID: selected.templateID, assetIDs: needsAssets ? assetIds : [] }),
      });
      if (!res.ok) {
        let message = 'Could not generate the document.';
        try {
          const body = await res.json();
          if (body?.message) message = body.message;
        } catch {
          // no JSON body
        }
        throw new Error(message);
      }
      const created = await res.json();
      onGenerated(created);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={show} onOpenChange={(open) => { if (!open) onHide(); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        {/* No <form>: there is nothing to type, and Radix radios/checkboxes inside a form
            render hidden bubble inputs that need ResizeObserver, which jsdom lacks. */}
        <DialogHeader>
          <DialogTitle>Get a document</DialogTitle>
          <DialogDescription>
            These documents are filled in with your own details. For anything else, ask HR.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertCircle aria-hidden="true" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {templates === null && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
            <Spinner aria-hidden="true" />
            Loading available documents…
          </p>
        )}

        {templates?.length === 0 && !error && (
          <EmptyState
            icon={FileLock}
            title="Nothing available yet"
            description="HR hasn't made any documents available for self-service. Ask HR if you need one."
            className="p-8"
          />
        )}

        {templates?.length > 0 && (
          <div className="grid gap-6">
            <RadioGroup value={templateId} onValueChange={setTemplateId} aria-label="Document">
              {templates.map((t) => {
                const id = `ss-template-${t.templateID}`;
                return (
                  <FieldLabel key={t.templateID} htmlFor={id}>
                    <Field orientation="horizontal">
                      <IconTile icon={FileText} tone="indigo" size="sm" />
                      <FieldContent className="min-w-0">
                        <FieldTitle>{t.templateName}</FieldTitle>
                        <FieldDescription>{t.description || `${t.templateType} document`}</FieldDescription>
                      </FieldContent>
                      <RadioGroupItem value={t.templateID} id={id} />
                    </Field>
                  </FieldLabel>
                );
              })}
            </RadioGroup>

            {needsAssets && (
              <FieldSet className="gap-3">
                <FieldLegend variant="label" className="mb-0">Equipment to list</FieldLegend>
                {assets.length === 0 ? (
                  <p className="text-sm text-muted-foreground">You don't have any equipment assigned, so none will be listed.</p>
                ) : (
                  <FieldGroup data-slot="checkbox-group" className="gap-3">
                    {assets.map((a) => {
                      const id = `ss-asset-${a.assetID}`;
                      return (
                        <Field key={a.assetID} orientation="horizontal">
                          <Checkbox
                            id={id}
                            checked={assetIds.includes(a.assetID)}
                            onCheckedChange={() => toggleAsset(a.assetID)}
                          />
                          <FieldLabel htmlFor={id} className="font-normal">
                            {`${a.name}${a.serialNumber ? ` · ${a.serialNumber}` : ''}`}
                          </FieldLabel>
                        </Field>
                      );
                    })}
                  </FieldGroup>
                )}
              </FieldSet>
            )}
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onHide}>Cancel</Button>
          <Button type="button" onClick={generate} disabled={!selected || submitting}>
            {submitting && <Spinner />}
            {submitting ? 'Generating…' : 'Generate'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SelfServiceDocumentModal;
