import React, { useEffect, useState } from 'react';
import { Alert, Button, Form, Modal } from 'react-bootstrap';
import { authenticatedFetch } from '../services/authService';
import { API_URLS } from '../config/api';

// Templates that list equipment need the employee to say which of their assets to include.
export const usesAssets = (content = '') => /\{\{\s*(#assetList|asset\.)/.test(content);

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
      authenticatedFetch(API_URLS.DOCUMENT_TEMPLATES.GET_ALL()).then((r) => (r.ok ? r.json() : [])),
      authenticatedFetch(API_URLS.ASSETS.GET_MY_ASSETS()).then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([allTemplates, myAssets]) => {
        if (cancelled) return;
        const available = (allTemplates || []).filter((t) => t.allowSelfService);
        setTemplates(available);
        setAssets(myAssets || []);
        setAssetIds((myAssets || []).map((a) => a.assetID));
        if (available.length === 1) setTemplateId(available[0].templateID);
      })
      .catch(() => { if (!cancelled) { setTemplates([]); setError('Could not load the available documents.'); } });
    return () => { cancelled = true; };
  }, [show]);

  const selected = templates?.find((t) => t.templateID === templateId);
  const needsAssets = selected && usesAssets(selected.templateContent);

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
    <Modal show={show} onHide={onHide} centered size="lg">
      <Modal.Header closeButton>
        <Modal.Title>Get a document</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {error && <Alert variant="danger">{error}</Alert>}

        {templates === null && (
          <p className="text-muted mb-0" role="status">
            <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />Loading available documents…
          </p>
        )}

        {templates?.length === 0 && !error && (
          <div className="empty-state">
            <i className="bi bi-file-earmark-lock" aria-hidden="true" />
            <h3>Nothing available yet</h3>
            <p className="mb-0">HR hasn't made any documents available for self-service. Ask HR if you need one.</p>
          </div>
        )}

        {templates?.length > 0 && (
          <>
            <p className="text-muted">
              These documents are filled in with your own details. For anything else, ask HR.
            </p>
            <div className="ss-options" role="radiogroup" aria-label="Document">
              {templates.map((t) => (
                <label key={t.templateID} className={`ss-option ${templateId === t.templateID ? 'is-selected' : ''}`}>
                  <input
                    type="radio"
                    name="ss-template"
                    className="form-check-input"
                    checked={templateId === t.templateID}
                    onChange={() => setTemplateId(t.templateID)}
                  />
                  <span className="item-card-icon tone-indigo" aria-hidden="true"><i className="bi bi-file-earmark-text" /></span>
                  <span className="flex-grow-1 min-w-0">
                    <span className="d-block fw-semibold">{t.templateName}</span>
                    <span className="d-block small text-muted">{t.description || `${t.templateType} document`}</span>
                  </span>
                </label>
              ))}
            </div>

            {needsAssets && (
              <fieldset className="mt-4">
                <legend className="form-label">Equipment to list</legend>
                {assets.length === 0 ? (
                  <p className="text-muted small mb-0">You don't have any equipment assigned, so none will be listed.</p>
                ) : (
                  assets.map((a) => (
                    <Form.Check
                      key={a.assetID}
                      id={`ss-asset-${a.assetID}`}
                      type="checkbox"
                      label={`${a.name}${a.serialNumber ? ` · ${a.serialNumber}` : ''}`}
                      checked={assetIds.includes(a.assetID)}
                      onChange={() => toggleAsset(a.assetID)}
                    />
                  ))
                )}
              </fieldset>
            )}
          </>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>Cancel</Button>
        <Button variant="primary" onClick={generate} disabled={!selected || submitting}>
          {submitting ? 'Generating…' : 'Generate'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default SelfServiceDocumentModal;
