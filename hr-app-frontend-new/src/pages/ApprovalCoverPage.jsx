import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, Plus, UserCheck, Users, X } from 'lucide-react';
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
import { Field, FieldDescription, FieldGroup, FieldLabel, FieldTitle } from '@/components/ui/field';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import ConfirmDialog from '../components/app/ConfirmDialog';
import EmptyState from '../components/app/EmptyState';
import ItemCard, { MetaList } from '../components/app/ItemCard';
import PageHeader, { SectionTitle } from '../components/app/PageHeader';
import StatusBadge from '../components/app/StatusBadge';
import DateRangePicker from '../components/DateRangePicker';
import { authenticatedFetch, isAdmin } from '../services/authService';
import { API_URLS } from '../config/api';

// Approval cover: a manager hands their leave approvals to a colleague for a period.
// The API takes the delegator from the token for non-admins; admins may arrange cover
// on behalf of any manager.

const STATUS_TONE = { Active: 'success', Scheduled: 'info', Ended: 'muted', Revoked: 'danger' };

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
    <ItemCard
      icon={UserCheck}
      tone="sky"
      title={`${d.delegateName} covers ${d.delegatorName}`}
      subtitle={`${fmtDay(d.startDate)} – ${fmtDay(d.endDate)}`}
      badge={<StatusBadge tone={STATUS_TONE[d.status] ?? 'muted'}>{d.status}</StatusBadge>}
      actions={canRevoke ? (
        <Button
          size="sm"
          variant="outline"
          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={() => onRevoke(d, iAmDelegate)}
        >
          <X aria-hidden="true" />
          {iAmDelegate ? 'Decline' : 'Revoke'}
        </Button>
      ) : null}
    >
      <MetaList
        items={[
          { label: 'Approvals of', value: d.delegatorName },
          { label: 'Covered by', value: d.delegateName },
          { label: 'Note', value: d.note },
        ]}
      />
    </ItemCard>
  );
};

const Section = ({ title, empty, items, meId, onRevoke }) => (
  <section aria-label={title}>
    <SectionTitle>{title}</SectionTitle>
    {items.length === 0 ? (
      <EmptyState icon={UserCheck} title={empty} className="py-6" />
    ) : (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {items.map((d) => (
          <DelegationRow key={d.delegationID} d={d} meId={meId} onRevoke={onRevoke} />
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
    <Dialog open={show} onOpenChange={(open) => { if (!open) onHide(); }}>
      <DialogContent className="sm:max-w-2xl">
        {/* noValidate: submit() checks the fields itself and names everything missing at once. */}
        <form onSubmit={(e) => { e.preventDefault(); submit(); }} noValidate className="grid gap-6">
          <DialogHeader>
            <DialogTitle>Arrange cover</DialogTitle>
            <DialogDescription>Hand leave approvals to a colleague for a set period.</DialogDescription>
          </DialogHeader>

          {error && (
            <Alert variant="destructive">
              <AlertCircle aria-hidden="true" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {noDirectory ? (
            <EmptyState
              icon={Users}
              title="Directory unavailable"
              description="The staff directory couldn't be loaded, so a colleague can't be chosen right now. HR can set up cover for you."
            />
          ) : (
            <FieldGroup>
              {admin && (
                <Field>
                  <FieldLabel htmlFor="cover-delegator">On behalf of</FieldLabel>
                  <NativeSelect
                    id="cover-delegator"
                    className="w-full"
                    value={form.delegator}
                    onChange={(e) => setForm((f) => ({ ...f, delegator: e.target.value, delegate: '' }))}
                    aria-describedby="cover-delegator-hint"
                  >
                    <NativeSelectOption value="">Myself</NativeSelectOption>
                    {(candidates || []).map((e) => (
                      <NativeSelectOption key={e.employeeID} value={e.employeeID}>{e.name}{e.position ? ` · ${e.position}` : ''}</NativeSelectOption>
                    ))}
                  </NativeSelect>
                  <FieldDescription id="cover-delegator-hint">The manager whose approvals are being handed over.</FieldDescription>
                </Field>
              )}
              <Field>
                <FieldLabel htmlFor="cover-delegate">Covered by *</FieldLabel>
                <NativeSelect
                  id="cover-delegate"
                  className="w-full"
                  value={form.delegate}
                  onChange={(e) => setForm((f) => ({ ...f, delegate: e.target.value }))}
                  aria-describedby="cover-delegate-hint"
                >
                  <NativeSelectOption value="">Choose a colleague</NativeSelectOption>
                  {options.map((e) => (
                    <NativeSelectOption key={e.employeeID} value={e.employeeID}>{e.name}{e.position ? ` · ${e.position}` : ''}</NativeSelectOption>
                  ))}
                </NativeSelect>
                <FieldDescription id="cover-delegate-hint">They can decide leave requests on your behalf while the cover is active.</FieldDescription>
              </Field>
              <Field aria-labelledby="cover-dates-label">
                <FieldTitle id="cover-dates-label">Dates *</FieldTitle>
                <DateRangePicker
                  start={form.start}
                  end={form.end}
                  onChange={({ start, end }) => setForm((f) => ({ ...f, start, end }))}
                  startPrompt="Select the first day of cover."
                  endPrompt="select the last day of cover"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="cover-note">Note (optional)</FieldLabel>
                <Textarea
                  id="cover-note"
                  rows={2}
                  maxLength={500}
                  value={form.note}
                  onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                  placeholder="e.g. Away on holiday"
                />
              </Field>
            </FieldGroup>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onHide}>Cancel</Button>
            {!noDirectory && (
              <Button type="submit" disabled={saving}>
                {saving && <Spinner />}
                {saving ? 'Saving…' : 'Arrange cover'}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
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
      <PageHeader
        id="approval-cover-title"
        title="Approval Cover"
        description="Away for a while? Hand your leave approvals to a colleague until you're back."
        actions={(
          <Button onClick={() => setShowModal(true)} disabled={loading}>
            <Plus aria-hidden="true" />
            Arrange cover
          </Button>
        )}
      />

      {error && (
        <Alert variant="destructive">
          <AlertCircle aria-hidden="true" />
          <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
            <span>{error}</span>
            <Button size="sm" variant="outline" onClick={load}>Try again</Button>
          </AlertDescription>
        </Alert>
      )}

      {loading && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" aria-busy="true" aria-label="Loading approval cover">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-40" />)}
        </div>
      )}

      {!loading && !error && (
        <div className="space-y-12">
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
        </div>
      )}

      <ArrangeCoverModal
        show={showModal}
        onHide={() => setShowModal(false)}
        onCreated={() => { setShowModal(false); load(); }}
        candidates={candidates === undefined ? [] : candidates}
        meId={meId}
        admin={admin}
      />

      <ConfirmDialog
        open={Boolean(toRevoke)}
        onOpenChange={(open) => { if (!open) setToRevoke(null); }}
        title={toRevoke?.decline ? 'Decline cover' : 'Revoke cover'}
        description={toRevoke && (toRevoke.decline
          ? `Stop covering ${toRevoke.d.delegatorName}'s approvals? Their requests go back to them.`
          : `End ${toRevoke.d.delegateName}'s cover of ${toRevoke.d.delegatorName}'s approvals now?`)}
        confirmLabel={toRevoke?.decline ? 'Decline' : 'Revoke'}
        onConfirm={confirmRevoke}
      >
        {revokeError && (
          <Alert variant="destructive">
            <AlertCircle aria-hidden="true" />
            <AlertDescription>{revokeError}</AlertDescription>
          </Alert>
        )}
      </ConfirmDialog>
    </section>
  );
};

export default ApprovalCoverPage;
