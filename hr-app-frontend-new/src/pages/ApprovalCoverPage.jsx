import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Card, Form, Modal } from 'react-bootstrap';
import DateRangePicker from '../components/DateRangePicker';
import { authenticatedFetch, isAdmin } from '../services/authService';
import { API_URLS } from '../config/api';

// Approval cover: a manager hands their leave approvals to a colleague for a period.
// The API takes the delegator from the token for non-admins; admins may arrange cover
// on behalf of any manager.

const STATUS_CHIP = { Active: 'is-success', Scheduled: 'is-info', Ended: '', Revoked: 'is-rejected' };

const fmtDay = (value) =>
  value
    ? new Date(`${String(value).slice(0, 10)}T00:00:00Z`).toLocaleDateString(undefined, {
      day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC',
    })
    : '—';

const readJson = async (res) => {
  try {
    return await res.json();
  } catch {
    return null;
  }
};

const getList = async (url) => {
  const res = await authenticatedFetch(url);
  if (!res.ok) throw new Error(String(res.status));
  const data = await res.json();
  return Array.isArray(data) ? data : [];
};

const DelegationRow = ({ d, meId, onRevoke }) => {
  const iAmDelegate = meId && d.delegateEmployeeID === meId;
  const canRevoke = d.status === 'Active' || d.status === 'Scheduled';
  return (
    <Card className="item-card">
      <Card.Body>
        <div className="item-card-head">
          <span className="item-card-icon tone-sky" aria-hidden="true"><i className="bi bi-person-check" /></span>
          <div className="flex-grow-1 min-w-0">
            <Card.Title>{d.delegateName} covers {d.delegatorName}</Card.Title>
            <Card.Subtitle>{fmtDay(d.startDate)} – {fmtDay(d.endDate)}</Card.Subtitle>
          </div>
          <span className={`status-chip ${STATUS_CHIP[d.status] ?? ''}`}>{d.status}</span>
        </div>
        <dl className="meta-list">
          <dt>Approvals of</dt>
          <dd>{d.delegatorName}</dd>
          <dt>Covered by</dt>
          <dd>{d.delegateName}</dd>
          {d.note && (
            <>
              <dt>Note</dt>
              <dd>{d.note}</dd>
            </>
          )}
        </dl>
        {canRevoke && (
          <div className="item-card-actions">
            <Button size="sm" variant="outline-danger" onClick={() => onRevoke(d, iAmDelegate)}>
              <i className="bi bi-x-lg me-1" aria-hidden="true" />
              {iAmDelegate ? 'Decline' : 'Revoke'}
            </Button>
          </div>
        )}
      </Card.Body>
    </Card>
  );
};

const Section = ({ title, empty, items, meId, onRevoke }) => (
  <section className="mb-5" aria-label={title}>
    <h2 className="section-title">{title}</h2>
    {items.length === 0 ? (
      <div className="empty-state py-4">
        <i className="bi bi-person-check" aria-hidden="true" />
        <p className="mb-0">{empty}</p>
      </div>
    ) : (
      <div className="row g-4">
        {items.map((d) => (
          <div className="col-md-6 col-xl-4" key={d.delegationID}>
            <DelegationRow d={d} meId={meId} onRevoke={onRevoke} />
          </div>
        ))}
      </div>
    )}
  </section>
);

const ArrangeCoverModal = ({ show, onHide, onCreated, candidates, meId, admin }) => {
  const [form, setForm] = useState({ delegator: '', delegate: '', start: '', end: '', note: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (show) {
      setForm({ delegator: admin ? '' : meId || '', delegate: '', start: '', end: '', note: '' });
      setError('');
    }
  }, [show, admin, meId]);

  const delegatorId = admin ? form.delegator || meId : meId;
  const options = (candidates || []).filter((e) => e.employeeID !== delegatorId);

  const submit = async () => {
    const missing = [
      !form.delegate && 'who will cover',
      (!form.start || !form.end) && 'the first and last day',
    ].filter(Boolean);
    if (missing.length) {
      setError(`Please choose ${missing.join(' and ')}.`);
      return;
    }
    setSaving(true);
    setError('');
    try {
      const body = {
        delegateEmployeeID: form.delegate,
        startDate: form.start,
        endDate: form.end,
        note: form.note.trim() || null,
      };
      if (admin && form.delegator) body.delegatorEmployeeID = form.delegator;
      const res = await authenticatedFetch(API_URLS.APPROVAL_DELEGATIONS.CREATE(), {
        method: 'POST',
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await readJson(res);
        throw new Error(data?.message || 'Could not arrange cover.');
      }
      onCreated();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const noDirectory = candidates === null;

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Modal.Header closeButton>
        <Modal.Title>Arrange cover</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {error && <Alert variant="danger">{error}</Alert>}
        {noDirectory ? (
          <div className="empty-state">
            <i className="bi bi-people" aria-hidden="true" />
            <h3>Directory unavailable</h3>
            <p className="mb-0">
              The staff directory couldn't be loaded, so a colleague can't be chosen right now. HR can set up cover for you.
            </p>
          </div>
        ) : (
          <>
            {admin && (
              <Form.Group className="mb-3" controlId="cover-delegator">
                <Form.Label>On behalf of</Form.Label>
                <Form.Select
                  value={form.delegator}
                  onChange={(e) => setForm((f) => ({ ...f, delegator: e.target.value, delegate: '' }))}
                >
                  <option value="">Myself</option>
                  {(candidates || []).map((e) => (
                    <option key={e.employeeID} value={e.employeeID}>{e.name}{e.position ? ` · ${e.position}` : ''}</option>
                  ))}
                </Form.Select>
                <Form.Text>The manager whose approvals are being handed over.</Form.Text>
              </Form.Group>
            )}
            <Form.Group className="mb-3" controlId="cover-delegate">
              <Form.Label>Covered by *</Form.Label>
              <Form.Select
                value={form.delegate}
                onChange={(e) => setForm((f) => ({ ...f, delegate: e.target.value }))}
              >
                <option value="">Choose a colleague</option>
                {options.map((e) => (
                  <option key={e.employeeID} value={e.employeeID}>{e.name}{e.position ? ` · ${e.position}` : ''}</option>
                ))}
              </Form.Select>
              <Form.Text>They can decide leave requests on your behalf while the cover is active.</Form.Text>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label as="div" id="cover-dates-label">Dates *</Form.Label>
              <div role="group" aria-labelledby="cover-dates-label">
                <DateRangePicker
                  start={form.start}
                  end={form.end}
                  onChange={({ start, end }) => setForm((f) => ({ ...f, start, end }))}
                  startPrompt="Select the first day of cover."
                  endPrompt="select the last day of cover"
                />
              </div>
            </Form.Group>
            <Form.Group controlId="cover-note">
              <Form.Label>Note (optional)</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                maxLength={500}
                value={form.note}
                onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                placeholder="e.g. Away on holiday"
              />
            </Form.Group>
          </>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>Cancel</Button>
        {!noDirectory && (
          <Button variant="primary" onClick={submit} disabled={saving}>
            {saving ? 'Saving…' : 'Arrange cover'}
          </Button>
        )}
      </Modal.Footer>
    </Modal>
  );
};

const ApprovalCoverPage = () => {
  const admin = isAdmin();
  const [meId, setMeId] = useState(null);
  const [mine, setMine] = useState([]);
  const [all, setAll] = useState([]);
  const [candidates, setCandidates] = useState(undefined); // undefined = loading, null = unavailable
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [toRevoke, setToRevoke] = useState(null); // { d, decline }
  const [revokeError, setRevokeError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const profileRes = await authenticatedFetch(API_URLS.EMPLOYEES.GET_MY_PROFILE());
      const profile = profileRes.ok ? await profileRes.json() : null;
      setMeId(profile?.employeeID ?? null);

      const [myList, allList, people] = await Promise.all([
        getList(API_URLS.APPROVAL_DELEGATIONS.GET_MINE()),
        admin ? getList(API_URLS.APPROVAL_DELEGATIONS.GET_ALL()) : Promise.resolve([]),
        // The directory (id, name, position, department) is readable by everyone; if it
        // can't be loaded the form explains instead of offering an empty picker.
        getList(API_URLS.EMPLOYEES.GET_DIRECTORY()).catch(() => null),
      ]);
      setMine(myList);
      setAll(allList);
      setCandidates(people);
    } catch {
      setError('Could not load approval cover.');
    } finally {
      setLoading(false);
    }
  }, [admin]);

  useEffect(() => { load(); }, [load]);

  const given = mine.filter((d) => d.delegatorEmployeeID === meId);
  const received = mine.filter((d) => d.delegateEmployeeID === meId);

  const confirmRevoke = async () => {
    setRevokeError('');
    try {
      const res = await authenticatedFetch(API_URLS.APPROVAL_DELEGATIONS.REVOKE(toRevoke.d.delegationID), { method: 'POST' });
      if (!res.ok) {
        const data = await readJson(res);
        throw new Error(data?.message || 'Could not revoke this cover.');
      }
      setToRevoke(null);
      load();
    } catch (err) {
      setRevokeError(err.message);
    }
  };

  const onRevoke = (d, decline) => { setRevokeError(''); setToRevoke({ d, decline }); };

  return (
    <section aria-labelledby="approval-cover-title">
      <div className="page-header">
        <div>
          <h1 id="approval-cover-title">Approval Cover</h1>
          <p>Away for a while? Hand your leave approvals to a colleague until you're back.</p>
        </div>
        <div className="page-header-actions">
          <Button variant="primary" onClick={() => setShowModal(true)} disabled={loading}>
            <i className="bi bi-plus-lg me-2" aria-hidden="true" />Arrange cover
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="danger" className="d-flex align-items-center justify-content-between gap-3">
          <span>{error}</span>
          <Button size="sm" variant="light" onClick={load}>Try again</Button>
        </Alert>
      )}

      {loading && (
        <div className="row g-4" aria-busy="true" aria-label="Loading approval cover">
          {[0, 1, 2].map((i) => (
            <div className="col-md-6 col-xl-4" key={i}><div className="skeleton" style={{ height: 160 }} /></div>
          ))}
        </div>
      )}

      {!loading && !error && (
        <>
          <Section
            title="Covering for me"
            empty="Nobody is covering your approvals."
            items={given}
            meId={meId}
            onRevoke={onRevoke}
          />
          <Section
            title="I'm covering"
            empty="You aren't covering anyone's approvals."
            items={received}
            meId={meId}
            onRevoke={onRevoke}
          />
          {admin && (
            <Section
              title="All delegations"
              empty="No approval cover has been arranged yet."
              items={all}
              meId={meId}
              onRevoke={onRevoke}
            />
          )}
        </>
      )}

      <ArrangeCoverModal
        show={showModal}
        onHide={() => setShowModal(false)}
        onCreated={() => { setShowModal(false); load(); }}
        candidates={candidates === undefined ? [] : candidates}
        meId={meId}
        admin={admin}
      />

      <Modal show={Boolean(toRevoke)} onHide={() => setToRevoke(null)} centered>
        <Modal.Header closeButton>
          <Modal.Title>{toRevoke?.decline ? 'Decline cover' : 'Revoke cover'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {revokeError && <Alert variant="danger">{revokeError}</Alert>}
          {toRevoke && (
            <p className="mb-0">
              {toRevoke.decline
                ? `Stop covering ${toRevoke.d.delegatorName}'s approvals? Their requests go back to them.`
                : `End ${toRevoke.d.delegateName}'s cover of ${toRevoke.d.delegatorName}'s approvals now?`}
            </p>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setToRevoke(null)}>Cancel</Button>
          <Button variant="danger" onClick={confirmRevoke}>{toRevoke?.decline ? 'Decline' : 'Revoke'}</Button>
        </Modal.Footer>
      </Modal>
    </section>
  );
};

export default ApprovalCoverPage;
