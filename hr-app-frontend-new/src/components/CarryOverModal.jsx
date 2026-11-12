import { useEffect, useState } from 'react';
import { AlertCircle, CalendarX, CircleCheck, Info } from 'lucide-react';
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
import { Field, FieldDescription, FieldLabel, FieldLegend, FieldSet } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import ConfirmDialog from './app/ConfirmDialog';
import EmptyState from './app/EmptyState';
import StatusBadge from './app/StatusBadge';
import { authenticatedFetch } from '../services/authService';
import { API_URLS } from '../config/api';

const LEAVE_TYPES = ['Vacation', 'Sick', 'Parental', 'Unpaid'];

const ACTION_TONE = {
  Created: 'success',
  Updated: 'info',
  Unchanged: 'muted',
  Skipped: 'warning',
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
  const [confirming, setConfirming] = useState(false);

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

  // Applying asks first; the confirmation runs the real (non-preview) call.
  const toYear = Number(fromYear) + 1;
  const apply = () => setConfirming(true);
  const confirmApply = () => {
    setConfirming(false);
    run(false);
  };

  const counts = (results || []).reduce((acc, r) => ({ ...acc, [r.action]: (acc[r.action] || 0) + 1 }), {});
  const totalCarried = (results || []).reduce((sum, r) => sum + Number(r.carriedDays || 0), 0);
  const summary = results && [
    `${results.length} ${results.length === 1 ? 'allowance' : 'allowances'}`,
    ...['Created', 'Updated', 'Unchanged', 'Skipped'].filter((a) => counts[a]).map((a) => `${counts[a]} ${a.toLowerCase()}`),
    `${totalCarried} days carried in total`,
  ].join(' · ');

  return (
    <>
      <Dialog open={show} onOpenChange={(open) => { if (!open) onHide(); }}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Year-end carry-over</DialogTitle>
            <DialogDescription>
              Unused days (the full year's allowance minus approved and pending leave) move into next year's
              allowance, up to the cap. Missing next-year allowances are created with the same allocation and accrual.
            </DialogDescription>
          </DialogHeader>

          {error && (
            <Alert variant="destructive">
              <AlertCircle aria-hidden="true" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="grid gap-4 sm:grid-cols-3">
            <Field>
              <FieldLabel htmlFor="carry-from-year">From year</FieldLabel>
              <Input
                id="carry-from-year"
                type="number"
                min={2000}
                max={2099}
                value={fromYear}
                onChange={(e) => changed(setFromYear)(e.target.value)}
              />
              <FieldDescription>Into {Number(fromYear) + 1}</FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="carry-max-days">Max days to carry</FieldLabel>
              <Input
                id="carry-max-days"
                type="number"
                min={0}
                max={366}
                step="0.5"
                value={maxDays}
                onChange={(e) => changed(setMaxDays)(e.target.value)}
              />
              <FieldDescription>Per employee, per leave type</FieldDescription>
            </Field>
            <FieldSet className="gap-2.5">
              <FieldLegend variant="label" className="mb-1">Leave types</FieldLegend>
              {LEAVE_TYPES.map((t) => (
                <Field key={t} orientation="horizontal" className="gap-2">
                  <Checkbox
                    id={`carry-type-${t}`}
                    checked={types.includes(t)}
                    onCheckedChange={() => toggleType(t)}
                  />
                  <FieldLabel htmlFor={`carry-type-${t}`} className="font-normal">{t}</FieldLabel>
                </Field>
              ))}
            </FieldSet>
          </div>

          {results && (
            <div className="grid gap-4">
              <Alert
                className={applied ? 'border-success/40 bg-success/10 text-success' : 'border-sky-500/30 bg-sky-500/5 text-sky-600 dark:text-sky-400'}
                role="status"
              >
                {applied ? <CircleCheck aria-hidden="true" /> : <Info aria-hidden="true" />}
                <AlertDescription className="text-foreground">
                  {applied ? 'Applied. ' : 'Preview — nothing has been saved yet. '}
                  {summary}
                </AlertDescription>
              </Alert>
              {results.length === 0 ? (
                <EmptyState
                  icon={CalendarX}
                  title="Nothing to carry over"
                  description={`No ${types.join(', ').toLowerCase()} allowances exist for ${fromYear}.`}
                  className="p-8"
                />
              ) : (
                <div className="max-h-[45vh] overflow-y-auto rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead scope="col">Employee</TableHead>
                        <TableHead scope="col">Type</TableHead>
                        <TableHead scope="col" className="text-right">Unused</TableHead>
                        <TableHead scope="col" className="text-right">Carried</TableHead>
                        <TableHead scope="col">Action</TableHead>
                        <TableHead scope="col">Note</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {results.map((r) => (
                        <TableRow key={`${r.employeeID}-${r.leaveType}`}>
                          <TableCell>{r.employeeName}</TableCell>
                          <TableCell>{r.leaveType}</TableCell>
                          <TableCell className="text-right tabular-nums">{r.unusedDays}</TableCell>
                          <TableCell className="text-right font-semibold tabular-nums">{r.carriedDays}</TableCell>
                          <TableCell><StatusBadge tone={ACTION_TONE[r.action] ?? 'muted'}>{r.action}</StatusBadge></TableCell>
                          <TableCell className="min-w-48 whitespace-normal text-xs text-muted-foreground">{r.note || '—'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={onHide} disabled={busy}>{applied ? 'Close' : 'Cancel'}</Button>
            {!applied && (
              <>
                <Button variant="outline" onClick={() => run(true)} disabled={busy}>
                  {busy && !results && <Spinner />}
                  {busy && !results ? 'Working…' : 'Preview'}
                </Button>
                <Button onClick={apply} disabled={busy || !results || results.length === 0}>
                  {busy && results && <Spinner />}
                  {busy && results ? 'Applying…' : 'Apply carry-over'}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title="Apply carry-over?"
        description={`Apply carry-over from ${fromYear} into ${toYear}? Next year's allowances will be created or updated.`}
        confirmLabel="Apply"
        destructive={false}
        onConfirm={confirmApply}
      />
    </>
  );
};

export default CarryOverModal;
