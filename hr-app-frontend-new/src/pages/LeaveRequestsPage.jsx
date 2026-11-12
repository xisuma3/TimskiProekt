import { useState, useEffect } from 'react';
import { Calendar, CalendarRange, Check, Hourglass, Users, X } from 'lucide-react';
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
import { API_URLS } from '../config/api';

const LeaveRequestsPage = () => {
  const [showModal, setShowModal] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [requestToProcess, setRequestToProcess] = useState(null);
  const [decisionReason, setDecisionReason] = useState('');
  const [balances, setBalances] = useState([]);
  const [teamCount, setTeamCount] = useState(0);
  const [showTeam, setShowTeam] = useState(false);

  useEffect(() => {
    // Only admins need employee list for leave request management
    if (isAdmin()) {
      authenticatedFetch(API_URLS.EMPLOYEES.GET_ALL())
        .then(response => response.json())
        .then(data => setEmployees(data))
        .catch(err => console.error('Failed to fetch employees:', err));
    } else {
      // Non-admins see their own remaining allowance, and a count of anything waiting
      // on them as a manager.
      authenticatedFetch(API_URLS.LEAVE_ENTITLEMENTS.GET_MY_BALANCE())
        .then(response => response.json())
        .then(setBalances)
        .catch(err => console.error('Failed to fetch balances:', err));

      authenticatedFetch(API_URLS.LEAVE_REQUESTS.GET_MY_TEAM(true))
        .then(response => response.json())
        .then(data => setTeamCount(Array.isArray(data) ? data.length : 0))
        .catch(err => console.error('Failed to fetch team requests:', err));
    }
  }, []);

  const handleAddClick = () => {
    setShowModal(true);
  };

  // The API records who decided and why, and refuses to change an already-settled
  // request (409). Show its message rather than a generic failure.
  const submitDecision = async (url, reason) => {
    const response = await authenticatedFetch(url, {
      method: 'PUT',
      body: JSON.stringify({ reason: reason || null })
    });

    if (response.ok) {
      window.location.reload();
      return;
    }

    let message = 'Failed to update request';
    try {
      const body = await response.json();
      if (body?.message) message = body.message;
    } catch {
      // response had no JSON body; keep the default message
    }
    throw new Error(message);
  };

  const handleApprove = async () => {
    try {
      await submitDecision(
        API_URLS.LEAVE_REQUESTS.APPROVE(requestToProcess.requestID),
        decisionReason
      );
    } catch (error) {
      console.error('Approve error:', error);
      alert(error.message);
    } finally {
      setShowApproveModal(false);
      setRequestToProcess(null);
      setDecisionReason('');
    }
  };

  const handleReject = async (request) => {
    const reason = window.prompt(
      `Reject ${request.employeeName}'s ${request.leaveType.toLowerCase()} leave?

Reason (optional):`
    );
    if (reason === null) return; // cancelled

    try {
      await submitDecision(API_URLS.LEAVE_REQUESTS.REJECT(request.requestID), reason);
    } catch (error) {
      console.error('Reject error:', error);
      alert(error.message);
    }
  };

  const closeApprove = () => {
    setShowApproveModal(false);
    setDecisionReason('');
  };

  const makeRenderCard = (canDecide) => (request) => (
    <ItemCard
      icon={CalendarRange}
      tone="indigo"
      title={isAdmin() || canDecide ? request.employeeName : 'My Leave Request'}
      subtitle={`${request.leaveType} Leave`}
      badge={<StatusBadge status={request.status} />}
      // Admin can approve/reject, employees can only view
      actions={canDecide && request.status === 'Pending' ? (
        <>
          <Button
            size="sm"
            variant="outline"
            className="text-success hover:bg-success/10 hover:text-success"
            onClick={() => {
              setRequestToProcess(request);
              setShowApproveModal(true);
            }}
          >
            <Check aria-hidden="true" />
            Approve
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => handleReject(request)}
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
        onSave={() => window.location.reload()}
      />

      <Dialog open={showApproveModal} onOpenChange={(open) => { if (!open) closeApprove(); }}>
        <DialogContent className="sm:max-w-lg">
          <form onSubmit={(e) => { e.preventDefault(); handleApprove(); }} className="grid gap-6">
            <DialogHeader>
              <DialogTitle>Approve Leave Request</DialogTitle>
              <DialogDescription>
                Approve {requestToProcess?.totalDays}-day {requestToProcess?.leaveType?.toLowerCase()} leave
                for {requestToProcess?.employeeName}?
              </DialogDescription>
            </DialogHeader>
            <Field>
              <FieldLabel htmlFor="approve-reason">Reason (optional)</FieldLabel>
              <Textarea
                id="approve-reason"
                rows={2}
                value={decisionReason}
                onChange={(e) => setDecisionReason(e.target.value)}
                placeholder="Recorded against this decision"
              />
            </Field>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeApprove}>
                Cancel
              </Button>
              <Button type="submit" className="bg-success text-success-foreground hover:bg-success/85">
                <Check aria-hidden="true" />
                Approve
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default LeaveRequestsPage;
