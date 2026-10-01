import React, { useEffect, useState } from 'react';
import { Card } from 'react-bootstrap';
import { authenticatedFetch } from '../services/authService';
import { parseInstant } from '../services/notificationService';
import { API_URLS } from '../config/api';

// The append-only audit of GDPR erasures: who performed each one, on whose request, and
// why. The erased person's name no longer exists, so rows show the retained record id.
const fmtDateTime = (value) => {
  const d = parseInstant(value); // API instants are UTC without an offset
  return d && !Number.isNaN(d.getTime())
    ? d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
    : '—';
};

// Calendar date ("YYYY-MM-DD..."): read the date part only so no timezone shifts it.
const fmtDate = (value) => {
  if (!value) return '—';
  const s = String(value).slice(0, 10);
  const d = new Date(`${s}T00:00:00`);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString(undefined, { dateStyle: 'medium' });
};

const ErasureLogCard = ({ refreshKey }) => {
  const [records, setRecords] = useState(null); // null = loading
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setError(false);
    authenticatedFetch(API_URLS.EMPLOYEES.ERASURE_LOG())
      .then((res) => {
        if (!res.ok) throw new Error(String(res.status));
        return res.json();
      })
      .then((list) => {
        if (cancelled) return;
        const rows = (Array.isArray(list) ? list : []).filter((r) => r && r.erasureRecordID);
        rows.sort((a, b) => (parseInstant(b.performedAt)?.getTime() || 0) - (parseInstant(a.performedAt)?.getTime() || 0));
        setRecords(rows);
      })
      .catch(() => { if (!cancelled) { setRecords([]); setError(true); } });
    return () => { cancelled = true; };
  }, [refreshKey]);

  return (
    <Card className="mt-4">
      <Card.Header className="py-3">
        Erasure log
        <small className="d-block text-muted fw-normal">
          Every GDPR erasure: who performed it, who requested it and why. Entries can't be changed or removed.
        </small>
      </Card.Header>

      {records === null && (
        <Card.Body aria-busy="true" aria-label="Loading erasure log">
          <div className="skeleton" style={{ height: 72 }} />
        </Card.Body>
      )}

      {records !== null && error && (
        <Card.Body><div className="chart-muted">Erasure log unavailable</div></Card.Body>
      )}

      {records !== null && !error && records.length === 0 && (
        <Card.Body>
          <div className="empty-state py-4">
            <i className="bi bi-shield-check" aria-hidden="true" />
            <p className="mb-0">No erasures have been performed.</p>
          </div>
        </Card.Body>
      )}

      {records !== null && !error && records.length > 0 && (
        <div className="table-responsive">
          <table className="table mb-0 align-middle">
            <thead>
              <tr>
                <th scope="col" className="ps-4">Performed</th>
                <th scope="col">Performed by</th>
                <th scope="col">Requested by</th>
                <th scope="col">Request received</th>
                <th scope="col">Reason</th>
                <th scope="col" className="pe-4">Erased record</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r) => (
                <tr key={r.erasureRecordID}>
                  <td className="ps-4 text-nowrap">{fmtDateTime(r.performedAt)}</td>
                  <td>{r.performedByName || '—'}</td>
                  <td>{r.requestedBy}</td>
                  <td className="text-nowrap">{fmtDate(r.requestReceivedAt)}</td>
                  <td style={{ minWidth: 200 }}>{r.reason}</td>
                  <td className="pe-4">
                    <code title={r.employeeID}>{String(r.employeeID || '').slice(0, 8)}…</code>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
};

export default ErasureLogCard;
