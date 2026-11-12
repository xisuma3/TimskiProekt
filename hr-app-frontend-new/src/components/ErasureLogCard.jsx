import React, { useEffect, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import EmptyState from './app/EmptyState';
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
    <Card className="pb-0">
      <CardHeader>
        <CardTitle>Erasure log</CardTitle>
        <CardDescription>
          Every GDPR erasure: who performed it, who requested it and why. Entries can't be changed or removed.
        </CardDescription>
      </CardHeader>

      {records === null && (
        <CardContent className="pb-6" aria-busy="true" aria-label="Loading erasure log">
          <Skeleton className="h-18" />
        </CardContent>
      )}

      {records !== null && error && (
        <CardContent className="pb-6">
          <p className="py-6 text-center text-sm text-muted-foreground">Erasure log unavailable</p>
        </CardContent>
      )}

      {records !== null && !error && records.length === 0 && (
        <CardContent className="pb-6">
          <EmptyState icon={ShieldCheck} title="No erasures have been performed." className="border-0 p-6" />
        </CardContent>
      )}

      {records !== null && !error && records.length > 0 && (
        <div className="border-t">
          <Table className="[&_tr>*:first-child]:pl-6 [&_tr>*:last-child]:pr-6">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead scope="col">Performed</TableHead>
                <TableHead scope="col">Performed by</TableHead>
                <TableHead scope="col">Requested by</TableHead>
                <TableHead scope="col">Request received</TableHead>
                <TableHead scope="col">Reason</TableHead>
                <TableHead scope="col">Erased record</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((r) => (
                <TableRow key={r.erasureRecordID}>
                  <TableCell className="py-3">{fmtDateTime(r.performedAt)}</TableCell>
                  <TableCell className="py-3 whitespace-normal">{r.performedByName || '—'}</TableCell>
                  <TableCell className="py-3 whitespace-normal">{r.requestedBy}</TableCell>
                  <TableCell className="py-3">{fmtDate(r.requestReceivedAt)}</TableCell>
                  <TableCell className="min-w-[200px] py-3 whitespace-normal">{r.reason}</TableCell>
                  <TableCell className="py-3">
                    <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs" title={r.employeeID}>
                      {String(r.employeeID || '').slice(0, 8)}…
                    </code>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </Card>
  );
};

export default ErasureLogCard;
