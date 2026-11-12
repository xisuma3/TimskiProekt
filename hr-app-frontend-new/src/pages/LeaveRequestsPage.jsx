import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, Calendar, CalendarRange, Check, Hourglass, Users, X } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field, FieldLabel } from '@/components/ui/field';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import IconTile from '../components/app/IconTile';
import ItemCard, { MetaList } from '../components/app/ItemCard';
import { SectionTitle } from '../components/app/PageHeader';
import StatusBadge from '../components/app/StatusBadge';
import DataPage from '../components/DataPage';
import LeaveRequestModal from '../components/LeaveRequestModal';
import LeaveCalendar from '../components/LeaveCalendar';
import { authenticatedFetch, isAdmin } from '../services/authService';
import { LeaveBalanceCards } from './LeaveEntitlementsPage';
import { readErrorMessage } from '../services/apiError';
import { API_URLS } from '../config/api';

// "23 Nov – 27 Nov 2026", or "23 Nov 2026" for a single day, in the browser's locale.
// Leave dates are calendar dates (no offset), so they parse as local midnight.
export const shortRange = (start, end) => {
  const s = new Date(start);
  const e = new Date(end);
  const day = { day: 'numeric', month: 'short' };
  const full = { ...day, year: 'numeric' };
  if (s.toDateString() === e.toDateString()) return s.toLocaleDateString(undefined, full);
  const sameYear = s.getFullYear() === e.getFullYear();
  return `${s.toLocaleDateString(undefined, sameYear ? day : full)} – ${e.toLocaleDateString(undefined, full)}`;
};

const LeaveRequestsPage = () => {
  const [showModal, setShowModal] = useState(false);
  const [employees, setEmployees] = useState([]);
  // The decision being taken in the dialog: { request, kind: 'approve' | 'reject' }.
  const [decision, setDecision] = useState(null);
  const [decisionReason, setDecisionReason] = useState('');
  const [decisionError, setDecisionError] = useState(null);
  const [deciding, setDeciding] = useState(false);
  const [balances, setBalances] = useState([]);
  const [teamCount, setTeamCount] = useState(0);
  const [showTeam, setShowTeam] = useState(false);
  // Bumped after a decision or a new request so the lists refetch instead of the page reloading.
  const [refreshKey, setRefreshKey] = useState(0);

  // Non-admins see their own remaining allowance, and a count of anything waiting on
  // them as a manager. Both change after a decision or a new request.
  const loadSummary = useCallback(() => {
    if (isAdmin()) return;
    authenticatedFetch(API_URLS.LEAVE_ENTITLEMENTS.GET_MY_BALANCE())
      .then(response => response.json())
      .then(setBalances)
      .catch(err => console.error('Failed to fetch balances:', err));

    authenticatedFetch(API_URLS.LEAVE_REQUESTS.GET_MY_TEAM(true))
      .then(response => response.json())
      .then(data => setTeamCount(Array.isArray(data) ? data.length : 0))
      .catch(err => console.error('Failed to fetch team requests:', err));
  }, []);

  useEffect(() => {
    // Only admins need employee list for leave request management
    if (isAdmin()) {
      authenticatedFetch(API_URLS.EMPLOYEES.GET_ALL())
        .then(response => response.json())
        .then(data => setEmployees(data))
        .catch(err => console.error('Failed to fetch employees:', err));
    }
    loadSummary();
  }, [loadSummary]);

  const refresh = () => {
    setRefreshKey((key) => key + 1);
    loadSummary();
  };

  const handleAddClick = () => {
    setShowModal(true);
  };

  const openDecision = (request, kind) => {
    setDecision({ request, kind });
    setDecisionReason('');
    setDecisionError(null);
  };

  const closeDecision = () => {
    if (deciding) return;
    setDecision(null);
    setDecisionReason('');
    setDecisionError(null);
  };

  // The API records who decided and why, and refuses to change an already-settled
  // request (409). Show its message, in the dialog, rather than a generic failure.
  const submitDecision = async () => {
    const { request, kind } = decision;
    const url = kind === 'approve'
      ? API_URLS.LEAVE_REQUESTS.APPROVE(request.requestID)
      : API_URLS.LEAVE_REQUESTS.REJECT(request.requestID);

    setDeciding(true);
    setDecisionError(null);
    try {
      const response = await authenticatedFetch(url, {
        method: 'PUT',
        body: JSON.stringify({ reason: decisionReason || null })
      });
      if (!response.ok) {
        throw new Error(await readErrorMessage(response, 'Failed to update request'));
      }
      setDecision(null);
      setDecisionReason('');
      refresh();
    } catch (error) {
      console.error(`${kind === 'approve' ? 'Approve' : 'Reject'} error:`, error);
      setDecisionError(error.message);
    } finally {
      setDeciding(false);
    }
  };

  const makeRenderCard = (canDecide) => (request) => (
    <ItemCard
      icon={CalendarRange}
      tone="indigo"
      // Someone else's request leads with whose it is; your own leads with what it is and
      // when (every card used to say "My Leave Request").
      title={isAdmin() || canDecide ? request.employeeName : `${request.leaveType} Leave`}
      subtitle={isAdmin() || canDecide ? `${request.leaveType} Leave` : shortRange(request.startDate, request.endDate)}
      badge={<StatusBadge status={request.status} />}
      // Admin can approve/reject, employees can only view
      actions={canDecide && request.status === 'Pending' ? (
        <>
          <Button
            size="sm"
            variant="outline"
            className="text-success hover:bg-success/10 hover:text-success"
            onClick={() => openDecision(request, 'approve')}
          >
            <Check aria-hidden="true" />
            Approve
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => openDecision(request, 'reject')}
          >
            <X aria-hidden="true" />
            Reject
          </Button>
        </>
      ) : null}
    >
      {/* Team view only: why this manager may decide it (skip-level or delegated). */}
      {request.approvalRoute && (
        <div className="mb-3">
          <span title="Why you can decide this request">
            <StatusBadge tone="info">{request.approvalRoute}</StatusBadge>
          </span>
        </div>
      )}

      <MetaList
        items={[
          { label: 'Start Date', value: new Date(request.startDate).toLocaleDateString() },
          { label: 'End Date', value: new Date(request.endDate).toLocaleDateString() },
          { label: 'Duration', value: `${request.totalDays} ${request.totalDays === 1 ? 'day' : 'days'}` },
          { label: 'Created', value: new Date(request.createdAt).toLocaleDateString() },
          request.status !== 'Pending' && request.decisionAt && {
            label: `${request.status} by`,
            value: `${request.approvedByName || 'Unknown'}`
              + `${request.decidedOnBehalfOfName ? ` on behalf of ${request.decidedOnBehalfOfName}` : ''}`
              + ` on ${new Date(request.decisionAt).toLocaleDateString()}`,
          },
          request.status !== 'Pending' && request.decisionAt && request.decisionReason && {
            label: 'Reason',
            value: request.decisionReason,
          },
        ]}
      />
    </ItemCard>
  );

  // Admins decide anything; a manager decides only their own reports, which the API
  // enforces regardless of what the UI offers.
  const renderLeaveRequestCard = makeRenderCard(isAdmin());
  const decidingOn = decision?.request;
  const isApprove = decision?.kind === 'approve';
  const renderTeamRequestCard = makeRenderCard(true);

  return (
    <>
      {!isAdmin() && balances.length > 0 && (
        <div className="mb-6">
          <SectionTitle>My Balance ({new Date().getFullYear()})</SectionTitle>
          <LeaveBalanceCards balances={balances} compact />
        </div>
      )}

      {!isAdmin() && teamCount > 0 && (
        <Card className="mb-6 gap-0 py-0">
          <CardContent className="flex flex-wrap items-center gap-4 p-4">
            <IconTile icon={Hourglass} tone="amber" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold">
                <strong>{teamCount}</strong> leave request{teamCount === 1 ? '' : 's'}
                {teamCount === 1 ? ' is' : ' are'} waiting on you.
              </p>
              <p className="text-sm text-muted-foreground">
                From people in your reporting line, including indirect reports, and anyone whose approvals you're covering.
              </p>
            </div>
            <Button
              size="sm"
              variant={showTeam ? 'secondary' : 'default'}
              onClick={() => setShowTeam(!showTeam)}
              aria-expanded={showTeam}
            >
              {showTeam ? 'Hide' : 'Review'}
            </Button>
          </CardContent>
        </Card>
      )}

      {!isAdmin() && showTeam && (
        <div className="mb-12">
          <DataPage
            refreshKey={refreshKey}
            title="My Team's Requests"
            headingLevel={2}
            subtitle="Requests you can decide: direct and indirect reports, and anyone whose approvals you're covering."
            apiEndpoint={API_URLS.LEAVE_REQUESTS.GET_MY_TEAM(false)}
            searchFields={['employeeName', 'leaveType', 'status']}
            dateFilter={{ label: 'Leave', startField: 'startDate', endField: 'endDate' }}
            personFilter={{ label: 'Employee', field: 'employeeName' }}
            renderCard={renderTeamRequestCard}
            searchPlaceholder="Search team requests..."
            showAddButton={false}
            emptyIcon={Users}
            renderCalendar={(items) => (
              <LeaveCalendar requests={items} renderDetails={renderTeamRequestCard} showNames />
            )}
          />
        </div>
      )}

      <DataPage
        refreshKey={refreshKey}
        title={isAdmin() ? "Leave Requests" : "My Leave Requests"}
        subtitle={isAdmin()
          ? 'Every leave request across the organisation.'
          : 'Your time-off requests and their status.'}
        apiEndpoint={isAdmin() ? API_URLS.LEAVE_REQUESTS.GET_ALL() : API_URLS.LEAVE_REQUESTS.GET_MY_REQUESTS()}
        searchFields={isAdmin() ? ['employeeName', 'leaveType', 'status'] : ['leaveType', 'status']}
        dateFilter={{ label: 'Leave', startField: 'startDate', endField: 'endDate' }}
        personFilter={{ label: 'Employee', field: 'employeeName' }}
        renderCard={renderLeaveRequestCard}
        searchPlaceholder={isAdmin() ? "Search leave requests..." : "Search my requests..."}
        showAddButton={true}
        onAddClick={handleAddClick}
        createButtonText="New Request"
        emptyIcon={Calendar}
        renderCalendar={(items) => (
          <LeaveCalendar requests={items} renderDetails={renderLeaveRequestCard} showNames={isAdmin()} />
        )}
      />

      <LeaveRequestModal
        show={showModal}
        onHide={() => setShowModal(false)}
        employees={employees}
        onSave={refresh}
      />

      <Dialog open={Boolean(decision)} onOpenChange={(open) => { if (!open) closeDecision(); }}>
        <DialogContent className="sm:max-w-lg">
          <form onSubmit={(e) => { e.preventDefault(); submitDecision(); }} className="grid gap-6">
            <DialogHeader>
              <DialogTitle>{isApprove ? 'Approve Leave Request' : 'Reject Leave Request'}</DialogTitle>
              <DialogDescription>
                {isApprove ? 'Approve' : 'Reject'} {decidingOn?.totalDays}-day {decidingOn?.leaveType?.toLowerCase()} leave
                for {decidingOn?.employeeName}?
              </DialogDescription>
            </DialogHeader>
            {decisionError && (
              <Alert variant="destructive">
                <AlertCircle aria-hidden="true" />
                <AlertDescription>{decisionError}</AlertDescription>
              </Alert>
            )}
            <Field>
              <FieldLabel htmlFor={`${decision?.kind}-reason`}>Reason (optional)</FieldLabel>
              <Textarea
                id={`${decision?.kind}-reason`}
                rows={2}
                value={decisionReason}
                onChange={(e) => setDecisionReason(e.target.value)}
                placeholder="Recorded against this decision"
              />
            </Field>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDecision} disabled={deciding}>
                Cancel
              </Button>
              {isApprove ? (
                <Button type="submit" disabled={deciding} className="bg-success text-success-foreground hover:bg-success/85">
                  {deciding ? <Spinner /> : <Check aria-hidden="true" />}
                  Approve
                </Button>
              ) : (
                <Button type="submit" disabled={deciding} variant="destructive">
                  {deciding ? <Spinner /> : <X aria-hidden="true" />}
                  Reject
                </Button>
              )}
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default LeaveRequestsPage;
