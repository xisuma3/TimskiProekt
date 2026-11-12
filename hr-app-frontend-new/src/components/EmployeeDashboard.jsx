import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Calendar, CalendarCheck, CalendarPlus, CalendarRange, Hourglass, IdCard, Laptop, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia } from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import IconTile from './app/IconTile';
import { MetaList } from './app/ItemCard';
import PageHeader, { SectionTitle } from './app/PageHeader';
import StatCard from './app/StatCard';
import StatusBadge from './app/StatusBadge';
import { STATUS_TONE } from './app/tones';
import { authenticatedFetch } from '../services/authService';
import { API_URLS } from '../config/api';
import { LeaveBalanceCards } from '../pages/LeaveEntitlementsPage';

// Anything that isn't Approved or Rejected reads as pending.
const statusTone = (status) => STATUS_TONE[status] || 'warning';

// Compact "nothing here" note for inside a card.
const EmptyNote = ({ icon: Icon, children }) => (
  <Empty className="gap-3 p-8">
    <EmptyHeader>
      <EmptyMedia variant="icon"><Icon aria-hidden="true" /></EmptyMedia>
      <EmptyDescription>{children}</EmptyDescription>
    </EmptyHeader>
  </Empty>
);

// A dashboard section: titled card with an optional link to the full page. `flush` drops
// the side and bottom padding so a divided list runs edge to edge.
const SectionCard = ({ title, to, linkText = 'View All', flush = false, children }) => (
  <Card className={cn('h-full', flush && 'pb-0')}>
    <CardHeader>
      <CardTitle>{title}</CardTitle>
      {to && (
        <CardAction>
          <Button variant="ghost" size="sm" asChild>
            <Link to={to}>
              {linkText}
              <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
        </CardAction>
      )}
    </CardHeader>
    <CardContent className={cn(flush && 'px-0')}>{children}</CardContent>
  </Card>
);

// One row of a divided list: icon tile, title and detail, a badge on the right.
const ListRow = ({ icon, tone, title, detail, badge }) => (
  <li className="flex items-center gap-3 px-6 py-3">
    <IconTile icon={icon} tone={tone} size="sm" />
    <div className="min-w-0 flex-1">
      <p className="truncate font-medium">{title}</p>
      <p className="truncate text-xs text-muted-foreground">{detail}</p>
    </div>
    {badge}
  </li>
);

const EmployeeDashboard = () => {
  const [employeeData, setEmployeeData] = useState(null);
  const [assets, setAssets] = useState([]);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [dossier, setDossier] = useState(null);
  const [balances, setBalances] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEmployeeData = async () => {
      try {
        // Fetch employee profile
        const profileResponse = await authenticatedFetch(API_URLS.EMPLOYEES.GET_MY_PROFILE());
        if (profileResponse.ok) {
          const profileData = await profileResponse.json();
          setEmployeeData(profileData);
        }

        // Fetch employee assets
        const assetsResponse = await authenticatedFetch(API_URLS.ASSETS.GET_MY_ASSETS());
        if (assetsResponse.ok) {
          const assetsData = await assetsResponse.json();
          setAssets(assetsData);
        }

        // Fetch employee leave requests
        const leaveResponse = await authenticatedFetch(API_URLS.LEAVE_REQUESTS.GET_MY_REQUESTS());
        if (leaveResponse.ok) {
          const leaveData = await leaveResponse.json();
          setLeaveRequests(leaveData);
        }

        // Fetch employee dossier
        const dossierResponse = await authenticatedFetch(API_URLS.EMPLOYEE_DOSSIERS.GET_MY_DOSSIER());
        if (dossierResponse.ok) {
          const dossierData = await dossierResponse.json();
          // GetMyDossier returns a list (0 or 1) so it can back the dossier DataPage;
          // this card wants the single record.
          setDossier(Array.isArray(dossierData) ? dossierData[0] ?? null : dossierData);
        }

        // Leave balances for the current year
        const balanceResponse = await authenticatedFetch(API_URLS.LEAVE_ENTITLEMENTS.GET_MY_BALANCE());
        if (balanceResponse.ok) {
          setBalances(await balanceResponse.json());
        }

      } catch (error) {
        console.error('Failed to fetch employee data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEmployeeData();
  }, []);

  if (loading) {
    return (
      <div aria-busy="true" aria-label="Loading your dashboard" className="space-y-6">
        <Skeleton className="h-14 max-w-sm" />
        <div className="grid gap-4 md:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-72" />
      </div>
    );
  }

  const pendingCount = leaveRequests.filter((r) => r.status === 'Pending').length;

  return (
    <div>
      <PageHeader
        title={`Welcome back${employeeData?.firstName ? `, ${employeeData.firstName}` : ''}`}
        description="Your leave, equipment and records at a glance."
        actions={(
          <Button asChild>
            <Link to="/leave-requests">
              <CalendarPlus aria-hidden="true" />
              Request leave
            </Link>
          </Button>
        )}
      />

      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <StatCard
            to="/assets"
            label="Assets Assigned"
            value={assets.length}
            hint="Equipment in your custody"
            icon={Laptop}
            tone="indigo"
          />
          <StatCard
            to="/leave-requests"
            label="Leave Requests"
            value={leaveRequests.length}
            hint="Every request you have filed"
            icon={CalendarCheck}
            tone="green"
          />
          <StatCard
            to="/leave-requests"
            label="Awaiting decision"
            value={pendingCount}
            hint="Still pending approval"
            icon={Hourglass}
            tone="amber"
          />
        </div>

        {balances.length > 0 && (
          <section>
            <SectionTitle>My Leave Balance ({new Date().getFullYear()})</SectionTitle>
            <LeaveBalanceCards balances={balances} />
          </section>
        )}

        <div className="grid gap-4 lg:grid-cols-2">
          {/* Employee Profile Card */}
          <SectionCard title="My Profile">
            {employeeData ? (
              <MetaList
                items={[
                  { label: 'Name', value: `${employeeData.firstName} ${employeeData.lastName}` },
                  { label: 'Email', value: employeeData.email, fallback: '—' },
                  { label: 'Position', value: employeeData.position, fallback: '—' },
                  { label: 'Department', value: employeeData.departmentName, fallback: '—' },
                  { label: 'Hire Date', value: new Date(employeeData.hireDate).toLocaleDateString() },
                  { label: 'Manager', value: employeeData.managerName },
                ]}
              />
            ) : (
              <EmptyNote icon={User}>Profile information not available</EmptyNote>
            )}
          </SectionCard>

          {/* Dossier Status */}
          <SectionCard title="Employee Dossier" to="/employee-dossiers" linkText="View Dossier">
            {dossier ? (
              <MetaList
                items={[
                  { label: 'Employment Type', value: dossier.employmentType, fallback: '—' },
                  { label: 'Address', value: dossier.address, fallback: 'Not specified' },
                  { label: 'Emergency Contact', value: dossier.emergencyContact, fallback: 'Not specified' },
                ]}
              />
            ) : (
              <EmptyNote icon={IdCard}>
                Dossier not yet created. Contact HR to set up your employee dossier.
              </EmptyNote>
            )}
          </SectionCard>

          {/* Recent Assets */}
          <SectionCard title="My Assets" to="/assets" flush>
            {assets.length > 0 ? (
              <ul className="divide-y border-t">
                {assets.slice(0, 3).map(asset => (
                  <ListRow
                    key={asset.assetID}
                    icon={Laptop}
                    tone="indigo"
                    title={asset.name}
                    detail={`Serial: ${asset.serialNumber || '—'}`}
                    badge={(
                      <StatusBadge tone={asset.isActive ? 'success' : 'muted'}>
                        {asset.isActive ? 'Active' : 'Inactive'}
                      </StatusBadge>
                    )}
                  />
                ))}
              </ul>
            ) : (
              <EmptyNote icon={Laptop}>No assets assigned</EmptyNote>
            )}
          </SectionCard>

          {/* Recent Leave Requests */}
          <SectionCard title="Recent Leave Requests" to="/leave-requests" flush>
            {leaveRequests.length > 0 ? (
              <ul className="divide-y border-t">
                {leaveRequests.slice(0, 3).map(request => (
                  <ListRow
                    key={request.requestID}
                    icon={CalendarRange}
                    tone="sky"
                    title={request.leaveType}
                    detail={`${new Date(request.startDate).toLocaleDateString()} – ${new Date(request.endDate).toLocaleDateString()}`}
                    badge={<StatusBadge tone={statusTone(request.status)}>{request.status}</StatusBadge>}
                  />
                ))}
              </ul>
            ) : (
              <EmptyNote icon={Calendar}>No leave requests</EmptyNote>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  );
};

export default EmployeeDashboard;
