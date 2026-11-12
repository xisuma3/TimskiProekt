import { useState, useEffect } from 'react';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
import { authenticatedFetch } from '../services/authService';
import { API_URLS } from '../config/api';

const LEAVE_TYPES = ['Vacation', 'Sick', 'Parental', 'Unpaid'];


const LeaveEntitlementModal = ({ show, onHide, onSave, item, employees = [] }) => {
  const isEdit = Boolean(item);

  const [form, setForm] = useState({
    employeeID: '',
    year: new Date().getFullYear(),
    leaveType: 'Vacation',
    daysAllocated: 20,
    daysCarriedOver: 0,
    accrualMethod: 'Upfront'
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
        daysCarriedOver: item.daysCarriedOver ?? 0,
        accrualMethod: item.accrualMethod === 'Monthly' ? 'Monthly' : 'Upfront'
      });
    } else {
      setForm({
        employeeID: '',
        year: new Date().getFullYear(),
        leaveType: 'Vacation',
        daysAllocated: 20,
        daysCarriedOver: 0,
        accrualMethod: 'Upfront'
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
      daysCarriedOver: Number(form.daysCarriedOver),
      accrualMethod: form.accrualMethod
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
    <Dialog open={show} onOpenChange={(open) => { if (!open) onHide(); }}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit} className="grid gap-6">
          <DialogHeader>
            <DialogTitle>{isEdit ? 'Edit Leave Allowance' : 'New Leave Allowance'}</DialogTitle>
            <DialogDescription>
              Employees can only request leave of a type they have an allowance for, and only up to
              the days remaining. Without an allowance for a year, that leave type can't be requested.
            </DialogDescription>
          </DialogHeader>

          {error && (
            <Alert variant="destructive">
              <AlertCircle aria-hidden="true" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="allowance-employee">Employee</FieldLabel>
              <NativeSelect
                id="allowance-employee"
                className="w-full"
                value={form.employeeID}
                onChange={update('employeeID')}
                required
                disabled={isEdit}
              >
                <NativeSelectOption value="">Select an employee…</NativeSelectOption>
                {employees.map((e) => (
                  <NativeSelectOption key={e.employeeID} value={e.employeeID}>
                    {e.firstName} {e.lastName}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="allowance-year">Year</FieldLabel>
                <Input
                  id="allowance-year"
                  type="number"
                  min={2000}
                  max={2100}
                  value={form.year}
                  onChange={update('year')}
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="allowance-leave-type">Leave type</FieldLabel>
                <NativeSelect
                  id="allowance-leave-type"
                  className="w-full"
                  value={form.leaveType}
                  onChange={update('leaveType')}
                >
                  {LEAVE_TYPES.map((t) => <NativeSelectOption key={t} value={t}>{t}</NativeSelectOption>)}
                </NativeSelect>
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="allowance-days-allocated">Days allocated</FieldLabel>
                <Input
                  id="allowance-days-allocated"
                  type="number" min={0} max={366} step="0.5"
                  value={form.daysAllocated}
                  onChange={update('daysAllocated')}
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="allowance-carried-over">Carried over</FieldLabel>
                <Input
                  id="allowance-carried-over"
                  type="number" min={0} max={366} step="0.5"
                  value={form.daysCarriedOver}
                  onChange={update('daysCarriedOver')}
                />
              </Field>
            </div>

            <Field>
              <FieldLabel htmlFor="allowance-accrual">Accrual</FieldLabel>
              <NativeSelect
                id="allowance-accrual"
                className="w-full"
                value={form.accrualMethod}
                onChange={update('accrualMethod')}
                aria-describedby="allowance-accrual-hint"
              >
                <NativeSelectOption value="Upfront">Up front — all days on 1 January</NativeSelectOption>
                <NativeSelectOption value="Monthly">Monthly — 1/12 at the start of each month</NativeSelectOption>
              </NativeSelect>
              <FieldDescription id="allowance-accrual-hint">
                {form.accrualMethod === 'Monthly'
                  ? 'The allocation builds up month by month; employees can book what will have accrued by the last day of their leave. Carried-over days are available in full from the start.'
                  : 'The whole allocation is available from the first day of the year.'}
              </FieldDescription>
            </Field>
          </FieldGroup>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onHide} disabled={saving}>Cancel</Button>
            <Button type="submit" disabled={saving}>
              {saving && <Spinner />}
              {saving ? 'Saving…' : isEdit ? 'Save' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default LeaveEntitlementModal;
