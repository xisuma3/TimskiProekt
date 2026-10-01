import React, { useState, useEffect } from 'react';
import { Card, Button, ProgressBar } from 'react-bootstrap';
import DataPage from '../components/DataPage';
import LeaveEntitlementModal from '../components/LeaveEntitlementModal';
import CarryOverModal from '../components/CarryOverModal';
import { authenticatedFetch } from '../services/authService';
import { API_URLS } from '../config/api';

const LeaveEntitlementsPage = () => {
  const [employees, setEmployees] = useState([]);
  const [showCarryOver, setShowCarryOver] = useState(false);
  // Bumped after a carry-over is applied so the list reloads with next year's allowances.
  const [listVersion, setListVersion] = useState(0);

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
    <Card className="item-card">
      <Card.Body>
        <div className="item-card-head">
          <span className="item-card-icon" aria-hidden="true"><i className="bi bi-calendar3" /></span>
          <div className="flex-grow-1 min-w-0">
            <Card.Title>{entitlement.employeeName}</Card.Title>
            <Card.Subtitle>{entitlement.leaveType} leave</Card.Subtitle>
          </div>
          <span className="status-chip is-primary">{entitlement.year}</span>
        </div>
        {entitlement.accrualMethod === 'Monthly' && (
          <div className="mb-2">
            <span className="status-chip is-info" title="1/12 of the allocation becomes available at the start of each month">
              Monthly accrual
            </span>
          </div>
        )}

        <dl className="meta-list">
          <dt>Allocated</dt>
          <dd>{entitlement.daysAllocated} days</dd>
          {entitlement.daysCarriedOver > 0 && (
            <>
              <dt>Carried over</dt>
              <dd>{entitlement.daysCarriedOver} days</dd>
            </>
          )}
          <dt>Total available</dt>
          <dd className="fw-semibold">{entitlement.totalAvailable} days</dd>
        </dl>

        <div className="item-card-actions">
          <Button
            size="sm"
            variant="outline-primary"
            className="btn-icon"
            onClick={() => onEdit(entitlement)}
            aria-label={`Edit ${entitlement.employeeName}'s ${entitlement.leaveType} allowance`}
          >
            <i className="bi bi-pencil" aria-hidden="true"></i>
          </Button>
          <Button
            size="sm"
            variant="outline-danger"
            className="btn-icon"
            onClick={() => onDelete(entitlement)}
            aria-label={`Delete ${entitlement.employeeName}'s ${entitlement.leaveType} allowance`}
          >
            <i className="bi bi-trash" aria-hidden="true"></i>
          </Button>
        </div>
      </Card.Body>
    </Card>
  );

  return (
    <>
    <DataPage
      key={listVersion}
      title="Leave Allowances"
      apiEndpoint={API_URLS.LEAVE_ENTITLEMENTS.GET_ALL()}
      searchFields={['employeeName', 'leaveType']}
      dateFilter={{ label: 'Year', yearField: 'year' }}
      personFilter={{ label: 'Employee', field: 'employeeName' }}
      renderCard={renderCard}
      subtitle="Yearly leave allowances per employee and leave type."
      emptyIcon="bi-calendar3"
      searchPlaceholder="Search allowances…"
      createButtonText="New Allowance"
      modalComponent={(props) => <LeaveEntitlementModal {...props} employees={employees} />}
      modalItemProp="item"
      onDelete={handleDelete}
      deleteConfirmText="Delete this allowance? The employee won't be able to request this leave type for that year until a new allowance is set."
      headerContent={
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-4">
          <small className="text-muted">
            <i className="bi bi-arrow-repeat me-1" aria-hidden="true" />
            At year end, move unused days into next year's allowances.
          </small>
          <Button variant="outline-secondary" size="sm" onClick={() => setShowCarryOver(true)}>
            <i className="bi bi-box-arrow-in-right me-1" aria-hidden="true" />
            Year-end carry-over
          </Button>
        </div>
      }
    />
    <CarryOverModal
      show={showCarryOver}
      onHide={() => setShowCarryOver(false)}
      onApplied={() => setListVersion((v) => v + 1)}
    />
    </>
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
    <div className="row g-3">
      {balances.map((b) => {
        // Monthly accrual: measure against what has accrued so far, not the full year.
        const monthly = b.accrualMethod === 'Monthly';
        const base = monthly ? (b.daysAvailable ?? b.totalAvailable) : b.totalAvailable;
        const used = base > 0
          ? Math.min(100, (b.daysCommitted / base) * 100)
          : 0;
        const tone = !b.isTracked ? 'red'
          : b.daysRemaining <= 0 ? 'red'
          : b.daysRemaining <= 3 ? 'amber'
          : 'green';

        return (
          <div key={b.leaveType} className={compact ? 'col-sm-6 col-lg-4 col-xl-3' : 'col-sm-6 col-lg-3'}>
            <Card className="h-100">
              <Card.Body className={compact ? 'p-3' : undefined}>
                <div className="d-flex align-items-center gap-3 mb-2">
                  <span className={`item-card-icon tone-${tone}`} aria-hidden="true">
                    <i className={`bi ${b.isTracked ? 'bi-calendar2-check' : 'bi-calendar-x'}`} />
                  </span>
                  <div className="flex-grow-1 min-w-0">
                    <div className="stat-label">{b.leaveType}</div>
                    {b.isTracked ? (
                      <div className="stat-value" style={{ fontSize: '1.5rem' }}>
                        {b.daysRemaining}
                        <small className="text-muted fw-normal" style={{ fontSize: '0.85rem' }}> / {base} days</small>
                      </div>
                    ) : (
                      <span className="status-chip">No allowance</span>
                    )}
                  </div>
                </div>

                {b.isTracked ? (
                  <>
                    <ProgressBar
                      now={used}
                      variant={b.daysRemaining <= 0 ? 'danger' : b.daysRemaining <= 3 ? 'warning' : 'success'}
                      aria-label={`${b.leaveType} allowance used`}
                    />
                    <small className="text-muted d-block mt-2">
                      {b.daysApproved} approved
                      {b.daysPending > 0 && `, ${b.daysPending} pending`}
                    </small>
                    {monthly && (
                      <small className="text-muted d-block">
                        <i className="bi bi-graph-up-arrow me-1" aria-hidden="true" />
                        {b.daysAccrued} of {b.daysAllocated} accrued so far
                        {b.daysCarriedOver > 0 && ` + ${b.daysCarriedOver} carried over`}
                      </small>
                    )}
                  </>
                ) : (
                  <small className="text-muted d-block">
                    No allowance set — this leave can't be requested yet
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
