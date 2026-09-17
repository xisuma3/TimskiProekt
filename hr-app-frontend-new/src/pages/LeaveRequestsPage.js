import React, { useState, useEffect } from 'react';
import { Card, Button, Badge, ButtonGroup, Modal, Form } from 'react-bootstrap';
import DataPage from '../components/DataPage';
import LeaveRequestModal from '../components/LeaveRequestModal';
import RoleBasedContent from '../components/RoleBasedContent';
import { authenticatedFetch, getUserInfo, isAdmin } from '../services/authService';
import { API_URLS } from '../config/api';

const LeaveRequestsPage = () => {
  const [showModal, setShowModal] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [requestToProcess, setRequestToProcess] = useState(null);
  const [decisionReason, setDecisionReason] = useState('');
  const [userInfo] = useState(getUserInfo());

  useEffect(() => {
    // Only admins need employee list for leave request management
    if (isAdmin()) {
      authenticatedFetch(API_URLS.EMPLOYEES.GET_ALL())
        .then(response => response.json())
        .then(data => setEmployees(data))
        .catch(err => console.error('Failed to fetch employees:', err));
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

  const getStatusBadge = (status) => {
    const variant = status === 'Approved' ? 'success' : 
                   status === 'Rejected' ? 'danger' : 'warning';
    return <Badge bg={variant}>{status}</Badge>;
  };

  const renderLeaveRequestCard = (request) => (
    <Card className="shadow" style={{ backgroundColor: '#1E293B', borderColor: '#6366F1', color: 'white' }}>
      <Card.Body>
        <div className="d-flex justify-content-between align-items-start mb-2">
          <Card.Title style={{ color: '#6366F1' }}>
            {isAdmin() ? request.employeeName : 'My Leave Request'}
          </Card.Title>
          {getStatusBadge(request.status)}
        </div>
        
        <Card.Subtitle className="mb-3" style={{ color: '#94A3B8' }}>
          {request.leaveType} Leave
        </Card.Subtitle>
        
        <Card.Text>
          <strong>Start Date:</strong> {new Date(request.startDate).toLocaleDateString()}<br/>
          <strong>End Date:</strong> {new Date(request.endDate).toLocaleDateString()}<br/>
          <strong>Duration:</strong> {request.totalDays} days<br/>
          <strong>Created:</strong> {new Date(request.createdAt).toLocaleDateString()}
        </Card.Text>

        {request.status !== 'Pending' && request.decisionAt && (
          <Card.Text style={{ color: '#94A3B8', fontSize: '0.875rem' }}>
            <strong>{request.status} by:</strong> {request.approvedByName || 'Unknown'}
            {' '}on {new Date(request.decisionAt).toLocaleDateString()}
            {request.decisionReason && (
              <><br/><strong>Reason:</strong> {request.decisionReason}</>
            )}
          </Card.Text>
        )}
        
        {/* Admin can approve/reject, employees can only view */}
        <RoleBasedContent allowedRoles={['Admin']}>
          {request.status === 'Pending' && (
            <div className="d-flex justify-content-end mt-3">
              <ButtonGroup size="sm">
                <Button
                  variant="outline-success"
                  onClick={() => {
                    setRequestToProcess(request);
                    setShowApproveModal(true);
                  }}
                >
                  Approve
                </Button>
                <Button
                  variant="outline-danger"
                  onClick={() => handleReject(request)}
                >
                  Reject
                </Button>
              </ButtonGroup>
            </div>
          )}
        </RoleBasedContent>
      </Card.Body>
    </Card>
  );

  return (
    <>
      <DataPage
        title={isAdmin() ? "Leave Requests" : "My Leave Requests"}
        apiEndpoint={isAdmin() ? API_URLS.LEAVE_REQUESTS.GET_ALL() : API_URLS.LEAVE_REQUESTS.GET_MY_REQUESTS()}
        searchFields={isAdmin() ? ['employeeName', 'leaveType', 'status'] : ['leaveType', 'status']}
        renderCard={renderLeaveRequestCard}
        searchPlaceholder={isAdmin() ? "Search leave requests..." : "Search my requests..."}
        showAddButton={true}
        onAddClick={handleAddClick}
      />

      <LeaveRequestModal
        show={showModal}
        onHide={() => setShowModal(false)}
        employees={employees}
        onSave={() => window.location.reload()}
      />

      <Modal show={showApproveModal} onHide={() => { setShowApproveModal(false); setDecisionReason(''); }} centered>
        <Modal.Header closeButton style={{ backgroundColor: '#1E293B', color: 'white', borderColor: '#28a745' }}>
          <Modal.Title>Approve Leave Request</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ backgroundColor: '#0F172A', color: 'white' }}>
          <p>
            Approve {requestToProcess?.totalDays}-day {requestToProcess?.leaveType?.toLowerCase()} leave
            for {requestToProcess?.employeeName}?
          </p>
          <Form.Group>
            <Form.Label style={{ color: '#94A3B8' }}>Reason (optional)</Form.Label>
            <Form.Control
              as="textarea"
              rows={2}
              value={decisionReason}
              onChange={(e) => setDecisionReason(e.target.value)}
              placeholder="Recorded against this decision"
              style={{ backgroundColor: '#1E293B', color: 'white', borderColor: '#374151' }}
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer style={{ backgroundColor: '#1E293B', borderColor: '#28a745' }}>
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