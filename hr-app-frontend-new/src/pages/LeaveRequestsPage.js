import React, { useState, useEffect } from 'react';
import { Card, Button, Modal, Form } from 'react-bootstrap';
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

  const getStatusChip = (status) => {
    const tone = status === 'Approved' ? 'is-approved' :
                 status === 'Rejected' ? 'is-rejected' : 'is-pending';
    return <span className={`status-chip ${tone}`}>{status}</span>;
  };

  const makeRenderCard = (canDecide) => (request) => (
    <Card className="item-card">
      <Card.Body>
        <div className="item-card-head">
          <span className="item-card-icon" aria-hidden="true"><i className="bi bi-calendar2-week" /></span>
          <div className="flex-grow-1 min-w-0">
            <Card.Title>
              {isAdmin() || canDecide ? request.employeeName : 'My Leave Request'}
            </Card.Title>
            <Card.Subtitle>{request.leaveType} Leave</Card.Subtitle>
          </div>
          {getStatusChip(request.status)}
        </div>

        <dl className="meta-list">
          <dt>Start Date</dt>
          <dd>{new Date(request.startDate).toLocaleDateString()}</dd>
          <dt>End Date</dt>
          <dd>{new Date(request.endDate).toLocaleDateString()}</dd>
          <dt>Duration</dt>
          <dd>{request.totalDays} {request.totalDays === 1 ? 'day' : 'days'}</dd>
          <dt>Created</dt>
          <dd>{new Date(request.createdAt).toLocaleDateString()}</dd>
          {request.status !== 'Pending' && request.decisionAt && (
            <>
              <dt>{request.status} by</dt>
              <dd>
                {request.approvedByName || 'Unknown'}
                {' '}on {new Date(request.decisionAt).toLocaleDateString()}
              </dd>
              {request.decisionReason && (
                <>
                  <dt>Reason</dt>
                  <dd>{request.decisionReason}</dd>
                </>
              )}
            </>
          )}
        </dl>

        {/* Admin can approve/reject, employees can only view */}
        {canDecide && (
          request.status === 'Pending' && (
            <div className="item-card-actions">
              <Button
                size="sm"
                variant="outline-success"
                onClick={() => {
                  setRequestToProcess(request);
                  setShowApproveModal(true);
                }}
              >
                <i className="bi bi-check-lg me-1" aria-hidden="true" />
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline-danger"
                onClick={() => handleReject(request)}
              >
                <i className="bi bi-x-lg me-1" aria-hidden="true" />
                Reject
              </Button>
            </div>
          )
        )}
      </Card.Body>
    </Card>
  );

  // Admins decide anything; a manager decides only their own reports, which the API
  // enforces regardless of what the UI offers.
  const renderLeaveRequestCard = makeRenderCard(isAdmin());
  const renderTeamRequestCard = makeRenderCard(true);

  return (
    <>
      {!isAdmin() && balances.length > 0 && (
        <div className="mb-4">
          <h2 className="section-title">My Balance ({new Date().getFullYear()})</h2>
          <LeaveBalanceCards balances={balances} compact />
        </div>
      )}

      {!isAdmin() && teamCount > 0 && (
        <Card className="mb-4">
          <Card.Body className="d-flex flex-wrap align-items-center gap-3">
            <span className="item-card-icon tone-amber" aria-hidden="true">
              <i className="bi bi-hourglass-split" />
            </span>
            <div className="flex-grow-1">
              <div className="fw-semibold">
                <strong>{teamCount}</strong> request{teamCount === 1 ? '' : 's'} from your team
                {teamCount === 1 ? ' is' : ' are'} waiting on you.
              </div>
              <small className="text-muted">As their manager, you can approve or reject them.</small>
            </div>
            <Button
              size="sm"
              variant={showTeam ? 'secondary' : 'primary'}
              onClick={() => setShowTeam(!showTeam)}
              aria-expanded={showTeam}
            >
              {showTeam ? 'Hide' : 'Review'}
            </Button>
          </Card.Body>
        </Card>
      )}

      {!isAdmin() && showTeam && (
        <div className="mb-5">
          <DataPage
            title="My Team's Requests"
            subtitle="Pending requests from people who report to you."
            apiEndpoint={API_URLS.LEAVE_REQUESTS.GET_MY_TEAM(false)}
            searchFields={['employeeName', 'leaveType', 'status']}
            dateFilter={{ label: 'Leave', startField: 'startDate', endField: 'endDate' }}
            personFilter={{ label: 'Employee', field: 'employeeName' }}
            renderCard={renderTeamRequestCard}
            searchPlaceholder="Search team requests..."
            showAddButton={false}
            emptyIcon="bi-people"
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
        emptyIcon="bi-calendar2"
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

      <Modal show={showApproveModal} onHide={() => { setShowApproveModal(false); setDecisionReason(''); }} centered>
        <Modal.Header closeButton>
          <Modal.Title>Approve Leave Request</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>
            Approve {requestToProcess?.totalDays}-day {requestToProcess?.leaveType?.toLowerCase()} leave
            for {requestToProcess?.employeeName}?
          </p>
          <Form.Group controlId="approve-reason">
            <Form.Label>Reason (optional)</Form.Label>
            <Form.Control
              as="textarea"
              rows={2}
              value={decisionReason}
              onChange={(e) => setDecisionReason(e.target.value)}
              placeholder="Recorded against this decision"
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => { setShowApproveModal(false); setDecisionReason(''); }}>
            Cancel
          </Button>
          <Button variant="success" onClick={handleApprove}>
            Approve
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default LeaveRequestsPage;
