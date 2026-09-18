import React, { useState, useEffect } from 'react';
import { Card, Badge, Button, ButtonGroup, ProgressBar } from 'react-bootstrap';
import DataPage from '../components/DataPage';
import LeaveEntitlementModal from '../components/LeaveEntitlementModal';
import { authenticatedFetch } from '../services/authService';
import { API_URLS } from '../config/api';

const LeaveEntitlementsPage = () => {
  const [employees, setEmployees] = useState([]);

  useEffect(() => {
    authenticatedFetch(API_URLS.EMPLOYEES.GET_ALL())
      .then((r) => r.json())
      .then(setEmployees)
      .catch((err) => console.error('Failed to fetch employees:', err));
  }, []);

  const handleDelete = async (item) => {
    const response = await authenticatedFetch(
      API_URLS.LEAVE_ENTITLEMENTS.DELETE(item.entitlementID),
      { method: 'DELETE' }
    );
    if (!response.ok) throw new Error('Failed to delete the allowance');
  };

  const renderCard = (entitlement, onEdit, onDelete) => (
    <Card className="shadow h-100" style={{ backgroundColor: '#1E293B', borderColor: '#6366F1', color: 'white' }}>
      <Card.Body>
        <div className="d-flex justify-content-between align-items-start mb-2">
          <Card.Title style={{ color: '#6366F1' }}>{entitlement.employeeName}</Card.Title>
          <Badge bg="secondary">{entitlement.year}</Badge>
        </div>

        <Card.Subtitle className="mb-3" style={{ color: '#94A3B8' }}>
          {entitlement.leaveType} leave
        </Card.Subtitle>

        <Card.Text>
          <strong>Allocated:</strong> {entitlement.daysAllocated} days<br />
          {entitlement.daysCarriedOver > 0 && (
            <><strong>Carried over:</strong> {entitlement.daysCarriedOver} days<br /></>
          )}
          <strong>Total available:</strong> {entitlement.totalAvailable} days
        </Card.Text>
        <div className="d-flex justify-content-end">
          <ButtonGroup size="sm">
            <Button variant="outline-primary" onClick={() => onEdit(entitlement)}>
              <i className="bi bi-pencil"></i>
            </Button>
            <Button variant="outline-danger" onClick={() => onDelete(entitlement)}>
              <i className="bi bi-trash"></i>
            </Button>
          </ButtonGroup>
        </div>
      </Card.Body>
    </Card>
  );

  return (
    <DataPage
      title="Leave Allowances"
      apiEndpoint={API_URLS.LEAVE_ENTITLEMENTS.GET_ALL()}
      searchFields={['employeeName', 'leaveType']}
      renderCard={renderCard}
      searchPlaceholder="Search allowances…"
      createButtonText="New Allowance"
      modalComponent={(props) => <LeaveEntitlementModal {...props} employees={employees} />}
      modalItemProp="item"
      onDelete={handleDelete}
      deleteConfirmText="Delete this allowance? The leave type becomes uncapped for that year."
    />
  );
};

/**
 * Standing for one employee across every leave type. Pending days are shown alongside
 * approved ones because both are held against the balance — an employee with 2 days left
 * should not be able to file three more requests and have them all approvable.
 */
export const LeaveBalanceCards = ({ balances = [], compact = false }) => {
  if (!balances.length) return null;

  return (
    <div className={compact ? 'd-flex flex-wrap gap-2' : 'row'}>
      {balances.map((b) => {
        const used = b.totalAvailable > 0
          ? Math.min(100, (b.daysCommitted / b.totalAvailable) * 100)
          : 0;

        return (
          <div key={b.leaveType} className={compact ? '' : 'col-md-3 mb-3'} style={compact ? { minWidth: 180 } : {}}>
            <Card style={{ backgroundColor: '#1E293B', borderColor: '#374151', color: 'white' }}>
              <Card.Body className="py-2 px-3">
                <div className="d-flex justify-content-between align-items-center">
                  <small style={{ color: '#94A3B8' }}>{b.leaveType}</small>
                  {!b.isTracked && <Badge bg="secondary">Uncapped</Badge>}
                </div>

                {b.isTracked ? (
                  <>
                    <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#6366F1' }}>
                      {b.daysRemaining}
                      <span style={{ fontSize: '0.8rem', color: '#94A3B8' }}> / {b.totalAvailable} days</span>
                    </div>
                    <ProgressBar
                      now={used}
                      variant={b.daysRemaining <= 0 ? 'danger' : b.daysRemaining <= 3 ? 'warning' : 'success'}
                      style={{ height: 6, backgroundColor: '#374151' }}
                    />
                    <small style={{ color: '#94A3B8' }}>
                      {b.daysApproved} approved
                      {b.daysPending > 0 && `, ${b.daysPending} pending`}
                    </small>
                  </>
                ) : (
                  <small style={{ color: '#94A3B8' }}>
                    No allowance set — not capped
                  </small>
                )}
              </Card.Body>
            </Card>
          </div>
        );
      })}
    </div>
  );
};

export default LeaveEntitlementsPage;
