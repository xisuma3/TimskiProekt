import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Building2, Calendar, CalendarCheck, Hourglass, Laptop, Users } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia } from '@/components/ui/empty';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import PageHeader from '../components/app/PageHeader';
import StatCard from '../components/app/StatCard';
import StatusBadge from '../components/app/StatusBadge';
import { STATUS_TONE } from '../components/app/tones';
import EmployeeDashboard from '../components/EmployeeDashboard';
import { authenticatedFetch, isAdmin } from '../services/authService';
import { API_URLS } from '../config/api';

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

// Progress indicator colours; the shadcn Progress paints its indicator bg-primary.
const METER_TONE = {
  success: '*:data-[slot=progress-indicator]:bg-success',
  warning: '*:data-[slot=progress-indicator]:bg-warning',
};

const Meter = ({ label, percent, tone, ariaLabel, detail }) => (
  <div>
    <div className="mb-2 flex items-baseline justify-between gap-2 text-sm">
      <span className="font-medium">{label}</span>
      <span className="tabular-nums text-muted-foreground">{percent}%</span>
    </div>
    {/* The shadcn Progress keeps `value` off the Radix root, so state it for assistive tech. */}
    <Progress value={percent} aria-label={ariaLabel} className={cn('h-2', METER_TONE[tone])} />
    <p className="mt-2 text-xs text-muted-foreground">{detail}</p>
  </div>
);

const DashboardPage = () => {
  const [stats, setStats] = useState({
    totalEmployees: 0,
    pendingLeaveRequests: 0,
    totalLeaveRequests: 0,
    totalAssets: 0,
    totalDepartments: 0,
    activeAssets: 0,
    recentLeaveRequests: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      // Only fetch admin stats if user is admin
      if (!isAdmin()) {
        setLoading(false);
        return;
      }

      try {
        const [employees, leaveRequests, assets, departments] = await Promise.all([
          authenticatedFetch(API_URLS.EMPLOYEES.GET_ALL()).then(r => r.json()),
          authenticatedFetch(API_URLS.LEAVE_REQUESTS.GET_ALL()).then(r => r.json()),
          authenticatedFetch(API_URLS.ASSETS.GET_ALL()).then(r => r.json()),
          authenticatedFetch(API_URLS.DEPARTMENTS.GET_ALL()).then(r => r.json())
        ]);

        const pendingRequests = leaveRequests.filter(req => req.status === 'Pending');
        const activeAssets = assets.filter(asset => asset.isActive);
        const recentRequests = leaveRequests
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .slice(0, 5);

        setStats({
          totalEmployees: employees.length,
          pendingLeaveRequests: pendingRequests.length,
          totalLeaveRequests: leaveRequests.length,
          totalAssets: assets.length,
          totalDepartments: departments.length,
          activeAssets: activeAssets.length,
          recentLeaveRequests: recentRequests
        });
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const pct = (part, whole) => (whole > 0 ? Math.round((part / whole) * 100) : 0);

  if (loading) {
    return (
      <div aria-busy="true" aria-label="Loading dashboard" className="space-y-6">
        <Skeleton className="h-14 max-w-xs" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-80" />
      </div>
    );
  }

  // Show employee dashboard for employees
  if (!isAdmin()) {
    return <EmployeeDashboard />;
  }

  const assetUse = pct(stats.activeAssets, stats.totalAssets);
  const pendingShare = pct(stats.pendingLeaveRequests, stats.totalLeaveRequests);

  // Show admin dashboard for admins
  return (
    <div>
      <PageHeader
        title="HR Dashboard"
        description="What needs your attention across the organisation today."
        actions={(
          <Button asChild>
            <Link to="/leave-requests">
              <CalendarCheck aria-hidden="true" />
              Review leave requests
            </Link>
          </Button>
        )}
      />

      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            to="/employees"
            label="Total Employees"
            value={stats.totalEmployees}
            hint="Currently employed"
            icon={Users}
            tone="indigo"
          />
          <StatCard
            to="/leave-requests"
            label="Pending Leave Requests"
            value={stats.pendingLeaveRequests}
            hint="Awaiting a decision"
            icon={Hourglass}
            tone="amber"
          />
          <StatCard
            to="/assets"
            label="Active Assets"
            value={stats.activeAssets}
            hint={`of ${stats.totalAssets} in inventory`}
            icon={Laptop}
            tone="green"
          />
          <StatCard
            to="/departments"
            label="Departments"
            value={stats.totalDepartments}
            hint="Teams across the organisation"
            icon={Building2}
            tone="violet"
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Recent Leave Requests</CardTitle>
              <CardDescription>The latest requests, newest first.</CardDescription>
              <CardAction>
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/leave-requests">
                    View all
                    <ArrowRight aria-hidden="true" />
                  </Link>
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent className="px-0">
              {stats.recentLeaveRequests.length === 0 ? (
                <EmptyNote icon={Calendar}>No recent leave requests</EmptyNote>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="pl-6">Employee</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Dates</TableHead>
                      <TableHead className="pr-6 text-right">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stats.recentLeaveRequests.map((request) => (
                      <TableRow key={request.requestID}>
                        <TableCell className="pl-6">
                          <div className="flex items-center gap-3">
                            <Avatar aria-hidden="true">
                              <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                                {(request.employeeName || '?').charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{request.employeeName}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{request.leaveType}</TableCell>
                        <TableCell className="tabular-nums text-muted-foreground">
                          {new Date(request.startDate).toLocaleDateString()} – {new Date(request.endDate).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="pr-6 text-right">
                          <StatusBadge tone={statusTone(request.status)}>{request.status}</StatusBadge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>At a glance</CardTitle>
              <CardDescription>How equipment and approvals stand right now.</CardDescription>
            </CardHeader>
            <CardContent className="gap-6">
              <Meter
                label="Asset utilisation"
                percent={assetUse}
                tone="success"
                ariaLabel="Asset utilisation"
                detail={`${stats.activeAssets} of ${stats.totalAssets} assets active`}
              />
              <Meter
                label="Requests awaiting a decision"
                percent={pendingShare}
                tone="warning"
                ariaLabel="Share of leave requests pending"
                detail={`${stats.pendingLeaveRequests} of ${stats.totalLeaveRequests} requests pending`}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
