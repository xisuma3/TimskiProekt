import React, { useEffect, useState } from 'react';
import { Alert, Button, Col, Form, Modal, Row, Table } from 'react-bootstrap';
import { authenticatedFetch } from '../services/authService';
import { API_URLS } from '../config/api';

const LEAVE_TYPES = ['Vacation', 'Sick', 'Parental', 'Unpaid'];

const ACTION_CHIP = {
  Created: 'is-success',
  Updated: 'is-info',
  Unchanged: '',
  Skipped: 'is-pending',
};

// Year-end carry-over: preview what moves into next year, then apply it. Applying is
// idempotent on the server (it sets next year's carry-over rather than adding to it), but
// it still changes allowances, so it only becomes available after a preview and asks first.
const CarryOverModal = ({ show, onHide, onApplied }) => {
  const [fromYear, setFromYear] = useState(new Date().getFullYear() - 1);
  const [maxDays, setMaxDays] = useState(5);
  const [types, setTypes] = useState(['Vacation']);
  const [results, setResults] = useState(null);
  const [applied, setApplied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!show) return;
    setFromYear(new Date().getFullYear() - 1);
    setMaxDays(5);
    setTypes(['Vacation']);
    setResults(null);
    setApplied(false);
    setError('');
  }, [show]);

  // Any change to the inputs invalidates the preview.
  const changed = (setter) => (value) => { setter(value); setResults(null); setApplied(false); };
  const toggleType = (type) => changed(setTypes)(
    types.includes(type) ? types.filter((t) => t !== type) : [...types, type]
  );

  const run = async (preview) => {
    setError('');
    if (types.length === 0) {
      setError('Choose at least one leave type.');
      return;
    }
    setBusy(true);
    try {
      const res = await authenticatedFetch(API_URLS.LEAVE_ENTITLEMENTS.CARRY_OVER(), {
        method: 'POST',
        body: JSON.stringify({ fromYear: Number(fromYear), maxDays: Number(maxDays), leaveTypes: types, preview }),
      });
      if (!res.ok) {
        let message = 'Carry-over failed.';
        try {
          const body = await res.json();
          if (body?.message) message = body.message;
          else if (body?.errors) message = Object.values(body.errors).flat().join(' ');
        } catch {
          // no JSON body
        }
        throw new Error(message);
      }
      setResults(await res.json());
      if (!preview) {
        setApplied(true);
        if (onApplied) onApplied();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const apply = () => {
    const toYear = Number(fromYear) + 1;
    // eslint-disable-next-line no-alert
    if (window.confirm(`Apply carry-over from ${fromYear} into ${toYear}? Next year's allowances will be created or updated.`)) {
      run(false);
    }
  };

  const counts = (results || []).reduce((acc, r) => ({ ...acc, [r.action]: (acc[r.action] || 0) + 1 }), {});
  const totalCarried = (results || []).reduce((sum, r) => sum + Number(r.carriedDays || 0), 0);
  const summary = results && [
    `${results.length} ${results.length === 1 ? 'allowance' : 'allowances'}`,
    ...['Created', 'Updated', 'Unchanged', 'Skipped'].filter((a) => counts[a]).map((a) => `${counts[a]} ${a.toLowerCase()}`),
    `${totalCarried} days carried in total`,
  ].join(' · ');

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Modal.Header closeButton>
        <Modal.Title>Year-end carry-over</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p className="text-muted">
          Unused days (the full year's allowance minus approved and pending leave) move into next year's
          allowance, up to the cap. Missing next-year allowances are created with the same allocation and accrual.
        </p>
        {error && <Alert variant="danger">{error}</Alert>}

        <Row className="g-3 mb-3">
          <Col sm={4}>
            <Form.Group controlId="carry-from-year">
              <Form.Label>From year</Form.Label>
              <Form.Control
                type="number"
                min={2000}
                max={2099}
                value={fromYear}
                onChange={(e) => changed(setFromYear)(e.target.value)}
              />
              <Form.Text>Into {Number(fromYear) + 1}</Form.Text>
            </Form.Group>
          </Col>
          <Col sm={4}>
            <Form.Group controlId="carry-max-days">
              <Form.Label>Max days to carry</Form.Label>
              <Form.Control
                type="number"
                min={0}
                max={366}
                step="0.5"
                value={maxDays}
                onChange={(e) => changed(setMaxDays)(e.target.value)}
              />
              <Form.Text>Per employee, per leave type</Form.Text>
            </Form.Group>
          </Col>
          <Col sm={4}>
            <fieldset>
              <legend className="form-label">Leave types</legend>
              {LEAVE_TYPES.map((t) => (
                <Form.Check
                  key={t}
                  id={`carry-type-${t}`}
                  type="checkbox"
                  label={t}
                  checked={types.includes(t)}
                  onChange={() => toggleType(t)}
                />
              ))}
            </fieldset>
          </Col>
        </Row>

        {results && (
          <>
            <Alert variant={applied ? 'success' : 'info'} className="mb-3" role="status">
              {applied ? 'Applied. ' : 'Preview — nothing has been saved yet. '}
              {summary}
            </Alert>
            {results.length === 0 ? (
              <div className="empty-state">
                <i className="bi bi-calendar-x" aria-hidden="true" />
                <h3>Nothing to carry over</h3>
                <p className="mb-0">No {types.join(', ').toLowerCase()} allowances exist for {fromYear}.</p>
              </div>
            ) : (
              <div className="table-responsive" style={{ maxHeight: '45vh' }}>
                <Table size="sm" className="align-middle mb-0">
                  <thead>
                    <tr>
                      <th scope="col">Employee</th>
                      <th scope="col">Type</th>
                      <th scope="col" className="text-end">Unused</th>
                      <th scope="col" className="text-end">Carried</th>
                      <th scope="col">Action</th>
                      <th scope="col">Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((r) => (
                      <tr key={`${r.employeeID}-${r.leaveType}`}>
                        <td>{r.employeeName}</td>
                        <td>{r.leaveType}</td>
                        <td className="text-end">{r.unusedDays}</td>
                        <td className="text-end fw-semibold">{r.carriedDays}</td>
                        <td><span className={`status-chip ${ACTION_CHIP[r.action] ?? ''}`}>{r.action}</span></td>
                        <td className="small text-muted">{r.note || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            )}
          </>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide} disabled={busy}>{applied ? 'Close' : 'Cancel'}</Button>
        {!applied && (
          <>
            <Button variant="outline-primary" onClick={() => run(true)} disabled={busy}>
              {busy && !results ? 'Working…' : 'Preview'}
            </Button>
            <Button variant="primary" onClick={apply} disabled={busy || !results || results.length === 0}>
              {busy && results ? 'Applying…' : 'Apply carry-over'}
            </Button>
          </>
        )}
      </Modal.Footer>
    </Modal>
  );
};

export default CarryOverModal;
