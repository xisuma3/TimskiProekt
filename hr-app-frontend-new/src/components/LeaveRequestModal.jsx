import { useState, useEffect } from 'react';
import { AlertCircle, CircleCheck, TriangleAlert } from 'lucide-react';
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
import { Field, FieldGroup, FieldLabel, FieldTitle } from '@/components/ui/field';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import { authenticatedFetch, getUserInfo, isAdmin } from '../services/authService';
import { API_URLS } from '../config/api';
import { asOfForYear, checkAllowance, yearsSpanned } from '../services/leaveBalance';
import DateRangePicker from './DateRangePicker';

const LeaveRequestModal = ({ show, onHide, employees = [], onSave }) => {
  const [formData, setFormData] = useState({
    employeeID: '',
    startDate: '',
    endDate: '',
    leaveType: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  // Live allowance check: null until employee, type and both dates are known.
  const [allowance, setAllowance] = useState(null);
  const [checking, setChecking] = useState(false);

  const leaveTypes = ['Vacation', 'Sick', 'Parental', 'Unpaid'];

  useEffect(() => {
    if (show) {
      // Get fresh userInfo from localStorage when modal opens
      const freshUserInfo = getUserInfo();

      if (!isAdmin() && freshUserInfo?.employeeId) {
        // For employees, always set their own employee ID
        setFormData(prev => ({
          ...prev,
          employeeID: freshUserInfo.employeeId
        }));
      } else if (isAdmin()) {
        // For admins, reset to empty (they need to select)
        setFormData(prev => ({
          ...prev,
          employeeID: ''
        }));
      }
    }
    setError('');
  }, [show]);

  const { employeeID, leaveType, startDate, endDate } = formData;
  useEffect(() => {
    const admin = isAdmin();
    if (!show || !leaveType || !startDate || !endDate || endDate < startDate || (admin && !employeeID)) {
      setAllowance(null);
      return undefined;
    }
    let cancelled = false;
    setChecking(true);
    Promise.all(yearsSpanned(startDate, endDate).map(async (year) => {
      const url = admin
        ? API_URLS.LEAVE_ENTITLEMENTS.GET_BALANCE(employeeID, year, asOfForYear(endDate, year))
        : API_URLS.LEAVE_ENTITLEMENTS.GET_MY_BALANCE(year, asOfForYear(endDate, year));
      const res = await authenticatedFetch(url);
      if (!res.ok) throw new Error('balance unavailable');
      return [year, await res.json()];
    }))
      .then((pairs) => {
        if (!cancelled) setAllowance(checkAllowance(Object.fromEntries(pairs), startDate, endDate, leaveType));
      })
      // If the balance can't be loaded, don't block here: the server still enforces the rule.
      .catch(() => { if (!cancelled) setAllowance(null); })
      .finally(() => { if (!cancelled) setChecking(false); });
    return () => { cancelled = true; };
  }, [show, employeeID, leaveType, startDate, endDate]);

  const blocked = Boolean(allowance && !allowance.ok);

  // Days this employee already has pending or approved leave on. The server refuses
  // overlaps, so the picker marks them and won't let a range cross them.
  const [booked, setBooked] = useState([]);
  useEffect(() => {
    const admin = isAdmin();
    if (!show || (admin && !employeeID)) {
      setBooked([]);
      return undefined;
    }
    let cancelled = false;
    const url = admin ? API_URLS.LEAVE_REQUESTS.GET_ALL() : API_URLS.LEAVE_REQUESTS.GET_MY_REQUESTS();
    authenticatedFetch(url)
      .then((res) => (res.ok ? res.json() : []))
      .then((list) => {
        if (cancelled) return;
        setBooked((list || []).filter((r) =>
          r.status !== 'Rejected' && (!admin || String(r.employeeID) === String(employeeID))));
      })
      .catch(() => { if (!cancelled) setBooked([]); });
    return () => { cancelled = true; };
  }, [show, employeeID]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // The form is noValidate, so the browser's `required` check never fires: check here,
    // naming everything that's missing in one message.
    const missing = [
      isAdmin() && !formData.employeeID && 'an employee',
      !formData.leaveType && 'a leave type',
      (!formData.startDate || !formData.endDate) && 'your first and last day',
    ].filter(Boolean);
    if (missing.length) {
      setError(`Please choose ${missing.join(', ')}.`);
      setLoading(false);
      return;
    }

    if (formData.endDate < formData.startDate) {
      setError('End date must be after start date');
      setLoading(false);
      return;
    }

    if (blocked) {
      setError(allowance.message);
      setLoading(false);
      return;
    }

    try {
      const response = await authenticatedFetch(
        API_URLS.LEAVE_REQUESTS.CREATE(),
        {
          method: 'POST',
          body: JSON.stringify(formData)
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create leave request');
      }

      onSave();
      onHide();
      const freshUserInfo = getUserInfo();
      setFormData({
        employeeID: freshUserInfo?.employeeId || '',
        startDate: '',
        endDate: '',
        leaveType: ''
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Allowance result: green when it fits, amber when there's no allowance at all, red otherwise.
  const allowanceTone = !allowance ? null
    : allowance.ok ? 'border-success/40 bg-success/10 text-success'
    : allowance.reason === 'none' ? 'border-warning/40 bg-warning/10 text-warning'
    : null;

  return (
    <Dialog open={show} onOpenChange={(open) => { if (!open) onHide(); }}>
      <DialogContent className="sm:max-w-2xl">
        <form onSubmit={handleSubmit} noValidate className="grid gap-6">
          <DialogHeader>
            <DialogTitle>Submit Leave Request</DialogTitle>
            <DialogDescription>Choose the type of leave and the days you'll be away.</DialogDescription>
          </DialogHeader>

          {error && (
            <Alert variant="destructive">
              <AlertCircle aria-hidden="true" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <FieldGroup>
            <div className={cn('grid gap-4', isAdmin() && 'sm:grid-cols-2')}>
              {isAdmin() && (
                <Field>
                  <FieldLabel htmlFor="leave-employee">Employee *</FieldLabel>
                  <NativeSelect
                    id="leave-employee"
                    className="w-full"
                    name="employeeID"
                    value={formData.employeeID}
                    onChange={handleChange}
                    required
                  >
                    <NativeSelectOption value="">Select Employee</NativeSelectOption>
                    {employees.map(emp => (
                      <NativeSelectOption key={emp.employeeID} value={emp.employeeID}>
                        {emp.firstName} {emp.lastName}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                </Field>
              )}
              <Field>
                <FieldLabel htmlFor="leave-type">Leave Type *</FieldLabel>
                <NativeSelect
                  id="leave-type"
                  className="w-full"
                  name="leaveType"
                  value={formData.leaveType}
                  onChange={handleChange}
                  required
                >
                  <NativeSelectOption value="">Select Leave Type</NativeSelectOption>
                  {leaveTypes.map(type => (
                    <NativeSelectOption key={type} value={type}>{type}</NativeSelectOption>
                  ))}
                </NativeSelect>
              </Field>
            </div>

            <Field aria-labelledby="leave-dates-label">
              <FieldTitle id="leave-dates-label">Dates *</FieldTitle>
              <DateRangePicker
                start={formData.startDate}
                end={formData.endDate}
                booked={booked}
                onChange={({ start, end }) => setFormData((prev) => ({ ...prev, startDate: start, endDate: end }))}
              />
            </Field>
          </FieldGroup>

          {checking && !allowance && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
              <Spinner aria-hidden="true" />
              Checking your allowance…
            </p>
          )}
          {allowance && (
            <Alert
              variant={allowanceTone ? 'default' : 'destructive'}
              className={allowanceTone ?? undefined}
              role={allowance.ok ? 'status' : 'alert'}
            >
              {allowance.ok ? <CircleCheck aria-hidden="true" /> : <TriangleAlert aria-hidden="true" />}
              <AlertDescription className={allowanceTone ? 'text-foreground' : undefined}>{allowance.message}</AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onHide}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || blocked}
              title={blocked ? allowance.message : undefined}
            >
              {loading && <Spinner />}
              {loading ? 'Submitting...' : 'Submit Request'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default LeaveRequestModal;
