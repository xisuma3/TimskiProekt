import React, { useState, useEffect } from 'react';
import { Modal, Form, Button, Alert, Row, Col } from 'react-bootstrap';
import { authenticatedFetch } from '../services/authService';
import { API_URLS } from '../config/api';

const LEAVE_TYPES = ['Vacation', 'Sick', 'Parental', 'Unpaid'];

const DARK_INPUT = {
  backgroundColor: '#1E293B',
  color: 'white',
  borderColor: '#374151'
};

const LeaveEntitlementModal = ({ show, onHide, onSave, item, employees = [] }) => {
  const isEdit = Boolean(item);

  const [form, setForm] = useState({
    employeeID: '',
    year: new Date().getFullYear(),
    leaveType: 'Vacation',
    daysAllocated: 20,
    daysCarriedOver: 0
  });
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (item) {
      setForm({
        employeeID: item.employeeID ?? '',
        year: item.year ?? new Date().getFullYear(),
        leaveType: item.leaveType ?? 'Vacation',
        daysAllocated: item.daysAllocated ?? 0,
        daysCarriedOver: item.daysCarriedOver ?? 0
      });
    } else {
      setForm({
        employeeID: '',
        year: new Date().getFullYear(),
        leaveType: 'Vacation',
        daysAllocated: 20,
        daysCarriedOver: 0
      });
    }
    setError(null);
  }, [item, show]);

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    const payload = {
      employeeID: form.employeeID,
      year: Number(form.year),
      leaveType: form.leaveType,
      daysAllocated: Number(form.daysAllocated),
      daysCarriedOver: Number(form.daysCarriedOver)
    };

    try {
      const response = await authenticatedFetch(
        isEdit
          ? API_URLS.LEAVE_ENTITLEMENTS.UPDATE(item.entitlementID)
          : API_URLS.LEAVE_ENTITLEMENTS.CREATE(),
        { method: isEdit ? 'PUT' : 'POST', body: JSON.stringify(payload) }
      );

      if (response.ok) {
        onSave();
        onHide();
        return;
      }

      // 409 covers both "already has an allowance for this year" and "cannot reduce
      // below what is already committed" — the API's message says which.
      let message = 'Failed to save the allowance.';
      try {
        const body = await response.json();
        if (body?.message) message = body.message;
        else if (body?.errors) message = Object.values(body.errors).flat().join(' ');
      } catch {
        // no JSON body
      }
      setError(message);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Form onSubmit={handleSubmit}>
        <Modal.Header closeButton style={{ backgroundColor: '#1E293B', color: 'white', borderColor: '#6366F1' }}>
          <Modal.Title>{isEdit ? 'Edit Leave Allowance' : 'New Leave Allowance'}</Modal.Title>
        </Modal.Header>

        <Modal.Body style={{ backgroundColor: '#0F172A', color: 'white' }}>
          {error && <Alert variant="danger">{error}</Alert>}

          <Form.Group className="mb-3">
            <Form.Label>Employee</Form.Label>
            <Form.Select
              value={form.employeeID}
              onChange={update('employeeID')}
              required
              disabled={isEdit}
              style={DARK_INPUT}
            >
              <option value="">Select an employee…</option>
              {employees.map((e) => (
                <option key={e.employeeID} value={e.employeeID}>
                  {e.firstName} {e.lastName}
                </option>
              ))}
            </Form.Select>
          </Form.Group>

          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Year</Form.Label>
                <Form.Control
                  type="number"
                  min={2000}
                  max={2100}
                  value={form.year}
                  onChange={update('year')}
                  required
                  style={DARK_INPUT}
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Leave type</Form.Label>
                <Form.Select value={form.leaveType} onChange={update('leaveType')} style={DARK_INPUT}>
                  {LEAVE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>

          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Days allocated</Form.Label>
                <Form.Control
                  type="number" min={0} max={366} step="0.5"
                  value={form.daysAllocated}
                  onChange={update('daysAllocated')}
                  required
                  style={DARK_INPUT}
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Carried over</Form.Label>
                <Form.Control
                  type="number" min={0} max={366} step="0.5"
                  value={form.daysCarriedOver}
                  onChange={update('daysCarriedOver')}
                  style={DARK_INPUT}
                />
              </Form.Group>
            </Col>
          </Row>

          <small style={{ color: '#94A3B8' }}>
            A leave type with no allowance is <strong>uncapped</strong>, not zero — sick leave
            is usually governed by policy rather than a day count.
          </small>
        </Modal.Body>

        <Modal.Footer style={{ backgroundColor: '#1E293B', borderColor: '#6366F1' }}>
          <Button variant="secondary" onClick={onHide} disabled={saving}>Cancel</Button>
          <Button variant="primary" type="submit" disabled={saving}>
            {saving ? 'Saving…' : isEdit ? 'Save' : 'Create'}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default LeaveEntitlementModal;
