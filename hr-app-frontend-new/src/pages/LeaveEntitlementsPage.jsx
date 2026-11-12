import { useState, useEffect } from 'react';
import { CalendarCheck, CalendarDays, CalendarX, LogIn, Pencil, Repeat, Trash2, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import IconTile from '../components/app/IconTile';
import ItemCard, { MetaList } from '../components/app/ItemCard';
import StatusBadge from '../components/app/StatusBadge';
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
    <ItemCard
      icon={CalendarDays}
      tone="indigo"
      title={entitlement.employeeName}
      subtitle={`${entitlement.leaveType} leave`}
      badge={<StatusBadge tone="primary">{entitlement.year}</StatusBadge>}
      actions={(
        <>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => onEdit(entitlement)}
            aria-label={`Edit ${entitlement.employeeName}'s ${entitlement.leaveType} allowance`}
          >
            <Pencil aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => onDelete(entitlement)}
            aria-label={`Delete ${entitlement.employeeName}'s ${entitlement.leaveType} allowance`}
          >
            <Trash2 aria-hidden="true" />
          </Button>
        </>
      )}
    >
      {entitlement.accrualMethod === 'Monthly' && (
        <div className="mb-3">
          <span title="1/12 of the allocation becomes available at the start of each month">
            <StatusBadge tone="info">Monthly accrual</StatusBadge>
          </span>
        </div>
      )}

      <MetaList
        items={[
          { label: 'Allocated', value: `${entitlement.daysAllocated} days` },
          entitlement.daysCarriedOver > 0 && { label: 'Carried over', value: `${entitlement.daysCarriedOver} days` },
          { label: 'Total available', value: <span className="font-semibold">{entitlement.totalAvailable} days</span> },
        ]}
      />
    </ItemCard>
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
      emptyIcon={CalendarDays}
      searchPlaceholder="Search allowances…"
      createButtonText="New Allowance"
      modalComponent={(props) => <LeaveEntitlementModal {...props} employees={employees} />}
      modalItemProp="item"
      onDelete={handleDelete}
      deleteConfirmText="Delete this allowance? The employee won't be able to request this leave type for that year until a new allowance is set."
      headerContent={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Repeat className="size-4 shrink-0" aria-hidden="true" />
            At year end, move unused days into next year's allowances.
          </p>
          <Button variant="outline" size="sm" onClick={() => setShowCarryOver(true)}>
            <LogIn aria-hidden="true" />
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

// Bar colour by what's left: red when used up, amber when nearly, green otherwise.
const PROGRESS_TONE = {
  red: '*:data-[slot=progress-indicator]:bg-destructive',
  amber: '*:data-[slot=progress-indicator]:bg-warning',
  green: '*:data-[slot=progress-indicator]:bg-success',
};

/**
 * Standing for one employee across every leave type. Pending days are shown alongside
 * approved ones because both are held against the balance — an employee with 2 days left
 * should not be able to file three more requests and have them all approvable.
 */
export const LeaveBalanceCards = ({ balances = [], compact = false }) => {
  if (!balances.length) return null;

  return (
    <div className={cn('grid gap-4 sm:grid-cols-2', compact ? 'lg:grid-cols-3 xl:grid-cols-4' : 'lg:grid-cols-4')}>
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
          <Card key={b.leaveType} className="h-full gap-0 py-0">
            <CardContent className={cn('flex flex-col gap-2', compact ? 'p-4' : 'p-5')}>
              <div className="flex items-center gap-3">
                <IconTile icon={b.isTracked ? CalendarCheck : CalendarX} tone={tone} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-muted-foreground">{b.leaveType}</p>
                  {b.isTracked ? (
                    <p className="text-2xl font-semibold tabular-nums tracking-tight">
                      {b.daysRemaining}
                      <span className="text-sm font-normal text-muted-foreground"> / {base} days</span>
                    </p>
                  ) : (
                    <StatusBadge tone="muted">No allowance</StatusBadge>
                  )}
                </div>
              </div>

              {b.isTracked ? (
                <>
                  <Progress
                    value={used}
                    className={cn('mt-1 h-2', PROGRESS_TONE[tone])}
                    aria-label={`${b.leaveType} allowance used`}
                  />
                  <p className="text-xs text-muted-foreground">
                    {b.daysApproved} approved
                    {b.daysPending > 0 && `, ${b.daysPending} pending`}
                  </p>
                  {monthly && (
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <TrendingUp className="size-3.5 shrink-0" aria-hidden="true" />
                      <span>
                        {b.daysAccrued} of {b.daysAllocated} accrued so far
                        {b.daysCarriedOver > 0 && ` + ${b.daysCarriedOver} carried over`}
                      </span>
                    </p>
                  )}
                </>
              ) : (
                <p className="text-xs text-muted-foreground">
                  No allowance set — this leave can't be requested yet
                </p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default LeaveEntitlementsPage;
