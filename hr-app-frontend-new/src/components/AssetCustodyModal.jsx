import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, ArrowLeftRight, Download, History, Package, UserCheck } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import EmptyState from './app/EmptyState';
import IconTile from './app/IconTile';
import { SectionTitle } from './app/PageHeader';
import StatusBadge from './app/StatusBadge';
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
    <Dialog open={show} onOpenChange={(open) => { if (!open) onHide(); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            Custody — {asset?.name}
            {asset?.serialNumber && (
              <span className="font-normal text-muted-foreground"> · {asset.serialNumber}</span>
            )}
          </DialogTitle>
          <DialogDescription>
            Assign, transfer or return this asset. Every handover is kept in the history below.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6">
          {error && (
            <Alert variant="destructive">
              <AlertCircle aria-hidden="true" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex items-center gap-3 rounded-lg border bg-muted/50 p-4">
            <IconTile icon={currentHolder ? UserCheck : Package} tone={currentHolder ? 'indigo' : 'muted'} />
            <div className="min-w-0 text-sm">
              {currentHolder ? (
                <>Currently held by <strong className="font-semibold">{currentHolder.employeeName}</strong> since{' '}
                  {new Date(currentHolder.assignedDate).toLocaleDateString()}{' '}
                  <span className="text-muted-foreground">({currentHolder.daysHeld} days)</span></>
              ) : (
                <StatusBadge tone="muted">In stock — nobody holds this</StatusBadge>
              )}
            </div>
          </div>

          {currentHolder ? (
            <section>
              <SectionTitle as="h3">Hand over or take back</SectionTitle>
              <FieldGroup className="gap-4">
                <Field>
                  <FieldLabel htmlFor="custody-transfer-to">Transfer to</FieldLabel>
                  <NativeSelect
                    id="custody-transfer-to"
                    value={assignTo}
                    onChange={(e) => setAssignTo(e.target.value)}
                    className="w-full"
                  >
                    <NativeSelectOption value="">Select an employee…</NativeSelectOption>
                    {employees
                      .filter((e) => e.employeeID !== currentHolder.employeeID)
                      .map((e) => (
                        <NativeSelectOption key={e.employeeID} value={e.employeeID}>{e.firstName} {e.lastName}</NativeSelectOption>
                      ))}
                  </NativeSelect>
                </Field>
                <Field>
                  <FieldLabel htmlFor="custody-return-condition">Condition on return (optional)</FieldLabel>
                  <Input
                    id="custody-return-condition"
                    value={returnCondition}
                    onChange={(e) => setReturnCondition(e.target.value)}
                    placeholder="Good, minor scuffs…"
                  />
                  <FieldDescription>Recorded on the current holder's period when it closes.</FieldDescription>
                </Field>
                <Field>
                  <FieldLabel htmlFor="custody-notes">Notes (optional)</FieldLabel>
                  <Input id="custody-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
                </Field>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" disabled={!assignTo || busy} onClick={handleAssign}>
                    <ArrowLeftRight aria-hidden="true" />
                    Transfer
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    disabled={busy}
                    onClick={handleReturn}
                  >
                    <Download aria-hidden="true" />
                    Return to stock
                  </Button>
                </div>
              </FieldGroup>
            </section>
          ) : (
            <section>
              <SectionTitle as="h3">Assign</SectionTitle>
              <FieldGroup className="gap-4">
                <Field>
                  <FieldLabel htmlFor="custody-assign-to">Assign to</FieldLabel>
                  <NativeSelect
                    id="custody-assign-to"
                    value={assignTo}
                    onChange={(e) => setAssignTo(e.target.value)}
                    className="w-full"
                  >
                    <NativeSelectOption value="">Select an employee…</NativeSelectOption>
                    {employees.map((e) => (
                      <NativeSelectOption key={e.employeeID} value={e.employeeID}>{e.firstName} {e.lastName}</NativeSelectOption>
                    ))}
                  </NativeSelect>
                </Field>
                <Field>
                  <FieldLabel htmlFor="custody-assign-notes">Notes (optional)</FieldLabel>
                  <Input
                    id="custody-assign-notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Notes (optional)"
                  />
                </Field>
                <div>
                  <Button type="button" disabled={!assignTo || busy} onClick={handleAssign}>
                    Assign
                  </Button>
                </div>
              </FieldGroup>
            </section>
          )}

          <section>
            <SectionTitle as="h3">History</SectionTitle>
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Spinner className="text-primary" aria-hidden="true" /> Loading history…
              </div>
            ) : history.length === 0 ? (
              <EmptyState icon={History} title="No custody history" description="This asset has never been assigned." className="p-6" />
            ) : (
              // A vertical timeline: one entry per custody period, joined by a rail.
              <ol className="rounded-lg border p-4">
                {history.map((h, i) => {
                  const current = !h.returnedDate;
                  return (
                    <li key={h.assignmentID} className="relative flex gap-3 pb-5 last:pb-0">
                      {i < history.length - 1 && (
                        <span aria-hidden="true" className="absolute top-9 bottom-1 left-4 w-px -translate-x-1/2 bg-border" />
                      )}
                      <Avatar aria-hidden="true">
                        <AvatarFallback className={cn('text-xs font-semibold', current && 'bg-primary text-primary-foreground')}>
                          {(h.employeeName || '?').charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1 pt-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold">{h.employeeName}</span>
                          {current && <StatusBadge tone="success">Current</StatusBadge>}
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {new Date(h.assignedDate).toLocaleDateString()} –{' '}
                          {h.returnedDate ? new Date(h.returnedDate).toLocaleDateString() : 'now'}
                          {' · '}{h.daysHeld} days
                        </p>
                        {(h.notes || h.returnCondition) && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            {[h.notes, h.returnCondition].filter(Boolean).join(' · ')}
                          </p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onHide}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AssetCustodyModal;
