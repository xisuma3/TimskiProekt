import React, { useState, useEffect, useCallback } from 'react';
import { Modal, Button, Form, Alert, Badge, Spinner } from 'react-bootstrap';
import { authenticatedFetch } from '../services/authService';
import { API_URLS } from '../config/api';

/**
 * Custody chain for one asset, plus the two operations that change it.
 *
 * Handing an asset over closes the current holder's period rather than overwriting it,
 * so this table is the whole history — that is the point of the feature.
 */
const AssetCustodyModal = ({ show, onHide, asset, employees = [], onChanged }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const [assignTo, setAssignTo] = useState('');
  const [notes, setNotes] = useState('');
  const [returnCondition, setReturnCondition] = useState('');

  const currentHolder = history.find((h) => h.isOpen);

  const loadHistory = useCallback(async () => {
    if (!asset) return;
    setLoading(true);
    setError(null);
    try {
      const response = await authenticatedFetch(API_URLS.ASSETS.GET_HISTORY(asset.assetID));
      if (!response.ok) throw new Error('Failed to load custody history');
      setHistory(await response.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [asset]);

  useEffect(() => {
    if (show) {
      setAssignTo('');
      setNotes('');
      setReturnCondition('');
      loadHistory();
    }
  }, [show, loadHistory]);

  const call = async (url, body) => {
    setBusy(true);
    setError(null);
    try {
      const response = await authenticatedFetch(url, { method: 'POST', body: JSON.stringify(body) });
      if (response.ok) {
        await loadHistory();
        if (onChanged) onChanged();
        return;
      }

      // 409 for "already holds it" / "already in stock", 400 for bad dates.
      let message = 'The operation failed';
      try {
        const payload = await response.json();
        if (payload?.message) message = payload.message;
      } catch {
        // no JSON body
      }
      setError(message);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleAssign = () =>
    call(API_URLS.ASSETS.ASSIGN(asset.assetID), {
      employeeID: assignTo,
      notes: notes || null
    });

  const handleReturn = () =>
    call(API_URLS.ASSETS.RETURN(asset.assetID), {
      returnCondition: returnCondition || null,
      notes: notes || null
    });

  return (
    <Modal show={show} onHide={onHide} centered size="lg">
      <Modal.Header closeButton>
        <Modal.Title>
          Custody — {asset?.name}
          {asset?.serialNumber && (
            <small className="text-muted fw-normal"> · {asset.serialNumber}</small>
          )}
        </Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {error && <Alert variant="danger">{error}</Alert>}

        <div className="d-flex align-items-center gap-3 p-3 mb-4 rounded-3 border bg-body-tertiary">
          <span className="item-card-icon" aria-hidden="true">
            <i className={`bi ${currentHolder ? 'bi-person-check' : 'bi-box-seam'}`} />
          </span>
          <div>
            {currentHolder ? (
              <>Currently held by <strong>{currentHolder.employeeName}</strong> since{' '}
                {new Date(currentHolder.assignedDate).toLocaleDateString()}{' '}
                ({currentHolder.daysHeld} days)</>
            ) : (
              <Badge bg="secondary">In stock — nobody holds this</Badge>
            )}
          </div>
        </div>

        {currentHolder ? (
          <div className="mb-4">
            <h6 className="section-title">Hand over or take back</h6>
            <Form.Group className="mb-3" controlId="custody-transfer-to">
              <Form.Label>Transfer to</Form.Label>
              <Form.Select value={assignTo} onChange={(e) => setAssignTo(e.target.value)}>
                <option value="">Select an employee…</option>
                {employees
                  .filter((e) => e.employeeID !== currentHolder.employeeID)
                  .map((e) => (
                    <option key={e.employeeID} value={e.employeeID}>{e.firstName} {e.lastName}</option>
                  ))}
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3" controlId="custody-return-condition">
              <Form.Label>Condition on return (optional)</Form.Label>
              <Form.Control
                value={returnCondition}
                onChange={(e) => setReturnCondition(e.target.value)}
                placeholder="Good, minor scuffs…"
              />
              <Form.Text>Recorded on the current holder's period when it closes.</Form.Text>
            </Form.Group>
            <Form.Group className="mb-3" controlId="custody-notes">
              <Form.Label>Notes (optional)</Form.Label>
              <Form.Control value={notes} onChange={(e) => setNotes(e.target.value)} />
            </Form.Group>
            <div className="d-flex flex-wrap gap-2">
              <Button variant="primary" disabled={!assignTo || busy} onClick={handleAssign}>
                <i className="bi bi-arrow-left-right me-2" aria-hidden="true" />
                Transfer
              </Button>
              <Button variant="outline-danger" disabled={busy} onClick={handleReturn}>
                <i className="bi bi-box-arrow-in-down me-2" aria-hidden="true" />
                Return to stock
              </Button>
            </div>
          </div>
        ) : (
          <div className="mb-4">
            <h6 className="section-title">Assign</h6>
            <Form.Group className="mb-3" controlId="custody-assign-to">
              <Form.Label>Assign to</Form.Label>
              <Form.Select value={assignTo} onChange={(e) => setAssignTo(e.target.value)}>
                <option value="">Select an employee…</option>
                {employees.map((e) => (
                  <option key={e.employeeID} value={e.employeeID}>{e.firstName} {e.lastName}</option>
                ))}
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3" controlId="custody-assign-notes">
              <Form.Label>Notes (optional)</Form.Label>
              <Form.Control
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notes (optional)"
              />
            </Form.Group>
            <Button variant="primary" disabled={!assignTo || busy} onClick={handleAssign}>
              Assign
            </Button>
          </div>
        )}

        <h6 className="section-title">History</h6>
        {loading ? (
          <div className="d-flex align-items-center gap-2 text-muted">
            <Spinner animation="border" variant="primary" size="sm" /> Loading history…
          </div>
        ) : history.length === 0 ? (
          <div className="text-center text-muted py-4 border rounded-3">
            <i className="bi bi-clock-history d-block fs-3 mb-2" aria-hidden="true" />
            This asset has never been assigned.
          </div>
        ) : (
          <ol className="list-group list-group-flush border rounded-3">
            {history.map((h) => (
              <li key={h.assignmentID} className="list-group-item d-flex align-items-start gap-3 py-3">
                <span className="app-avatar" aria-hidden="true">
                  {(h.employeeName || '?').charAt(0).toUpperCase()}
                </span>
                <div className="flex-grow-1 min-w-0">
                  <div className="d-flex flex-wrap align-items-center gap-2">
                    <span className="fw-semibold">{h.employeeName}</span>
                    {!h.returnedDate && <span className="status-chip is-success">Current</span>}
                  </div>
                  <small className="text-muted d-block">
                    {new Date(h.assignedDate).toLocaleDateString()} –{' '}
                    {h.returnedDate ? new Date(h.returnedDate).toLocaleDateString() : 'now'}
                    {' · '}{h.daysHeld} days
                  </small>
                  {(h.notes || h.returnCondition) && (
                    <small className="text-muted d-block mt-1">
                      {[h.notes, h.returnCondition].filter(Boolean).join(' · ')}
                    </small>
                  )}
                </div>
              </li>
            ))}
          </ol>
        )}
      </Modal.Body>

      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>Close</Button>
      </Modal.Footer>
    </Modal>
  );
};

export default AssetCustodyModal;