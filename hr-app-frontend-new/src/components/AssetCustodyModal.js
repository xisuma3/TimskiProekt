import React, { useState, useEffect, useCallback } from 'react';
import { Modal, Button, Form, Alert, Table, Badge, Spinner } from 'react-bootstrap';
import { authenticatedFetch } from '../services/authService';
import { API_URLS } from '../config/api';

const DARK_INPUT = {
  backgroundColor: '#1E293B',
  color: 'white',
  borderColor: '#374151'
};

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
      <Modal.Header closeButton style={{ backgroundColor: '#1E293B', color: 'white', borderColor: '#6366F1' }}>
        <Modal.Title>
          Custody — {asset?.name}
          {asset?.serialNumber && (
            <small style={{ color: '#94A3B8' }}> · {asset.serialNumber}</small>
          )}
        </Modal.Title>
      </Modal.Header>

      <Modal.Body style={{ backgroundColor: '#0F172A', color: 'white' }}>
        {error && <Alert variant="danger">{error}</Alert>}

        <div className="mb-3">
          {currentHolder ? (
            <>Currently held by <strong>{currentHolder.employeeName}</strong> since{' '}
              {new Date(currentHolder.assignedDate).toLocaleDateString()}{' '}
              ({currentHolder.daysHeld} days)</>
          ) : (
            <Badge bg="secondary">In stock — nobody holds this</Badge>
          )}
        </div>

        {currentHolder ? (
          <div className="mb-4">
            <h6 style={{ color: '#6366F1' }}>Hand over or take back</h6>
            <Form.Group className="mb-2">
              <Form.Label style={{ color: '#94A3B8' }}>Transfer to</Form.Label>
              <Form.Select value={assignTo} onChange={(e) => setAssignTo(e.target.value)} style={DARK_INPUT}>
                <option value="">Select an employee…</option>
                {employees
                  .filter((e) => e.employeeID !== currentHolder.employeeID)
                  .map((e) => (
                    <option key={e.employeeID} value={e.employeeID}>{e.firstName} {e.lastName}</option>
                  ))}
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-2">
              <Form.Label style={{ color: '#94A3B8' }}>Condition on return (optional)</Form.Label>
              <Form.Control
                value={returnCondition}
                onChange={(e) => setReturnCondition(e.target.value)}
                placeholder="Good, minor scuffs…"
                style={DARK_INPUT}
              />
            </Form.Group>
            <Form.Group className="mb-2">
              <Form.Label style={{ color: '#94A3B8' }}>Notes (optional)</Form.Label>
              <Form.Control value={notes} onChange={(e) => setNotes(e.target.value)} style={DARK_INPUT} />
            </Form.Group>
            <div className="d-flex gap-2">
              <Button variant="primary" disabled={!assignTo || busy} onClick={handleAssign}>
                Transfer
              </Button>
              <Button variant="outline-warning" disabled={busy} onClick={handleReturn}>
                Return to stock
              </Button>
            </div>
          </div>
        ) : (
          <div className="mb-4">
            <h6 style={{ color: '#6366F1' }}>Assign</h6>
            <Form.Group className="mb-2">
              <Form.Select value={assignTo} onChange={(e) => setAssignTo(e.target.value)} style={DARK_INPUT}>
                <option value="">Select an employee…</option>
                {employees.map((e) => (
                  <option key={e.employeeID} value={e.employeeID}>{e.firstName} {e.lastName}</option>
                ))}
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-2">
              <Form.Control
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notes (optional)"
                style={DARK_INPUT}
              />
            </Form.Group>
            <Button variant="primary" disabled={!assignTo || busy} onClick={handleAssign}>
              Assign
            </Button>
          </div>
        )}

        <h6 style={{ color: '#6366F1' }}>History</h6>
        {loading ? (
          <Spinner animation="border" variant="primary" size="sm" />
        ) : history.length === 0 ? (
          <p style={{ color: '#94A3B8' }}>This asset has never been assigned.</p>
        ) : (
          <Table size="sm" variant="dark" responsive>
            <thead>
              <tr>
                <th>Held by</th><th>From</th><th>Until</th><th>Days</th><th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h) => (
                <tr key={h.assignmentID}>
                  <td>{h.employeeName}</td>
                  <td>{new Date(h.assignedDate).toLocaleDateString()}</td>
                  <td>
                    {h.returnedDate
                      ? new Date(h.returnedDate).toLocaleDateString()
                      : <Badge bg="success">current</Badge>}
                  </td>
                  <td>{h.daysHeld}</td>
                  <td style={{ color: '#94A3B8' }}>
                    {[h.notes, h.returnCondition].filter(Boolean).join(' · ')}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Modal.Body>

      <Modal.Footer style={{ backgroundColor: '#1E293B', borderColor: '#6366F1' }}>
        <Button variant="secondary" onClick={onHide}>Close</Button>
      </Modal.Footer>
    </Modal>
  );
};

export default AssetCustodyModal;
