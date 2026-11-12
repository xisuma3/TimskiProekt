import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CalendarCheck,
  CalendarPlus,
  CircleCheck,
  CircleX,
  FileText,
  HeartPulse,
  Laptop,
  LineChart,
  RotateCw,
  Timer,
  TriangleAlert,
  UserPlus,
  Users,
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import IconTile from '../components/app/IconTile';
import PageHeader from '../components/app/PageHeader';
import StatCard from '../components/app/StatCard';
import StatusBadge from '../components/app/StatusBadge';
import { authenticatedFetch } from '../services/authService';
import { API_URLS } from '../config/api';
import { BarList, ChartCard, ColumnChart, StackedBar } from '../components/charts/Charts';
import ErasureLogCard from '../components/ErasureLogCard';
import {
  PERIODS,
  approvalRate,
  approvedDaysPerMonth,
  approvedLeaveDays,
  assetAssignment,
  dataQualityChecks,
  formatPercent,
  formatRelative,
  headcountByDepartment,
  hiresPerYear,
  humanizeDuration,
  inRange,
  leaveDaysByType,
  medianDecisionMs,
  newHires,
  periodRange,
  recentActivity,
  requestOutcomes,
  serviceState,
  SLOW_MS,
} from './analytics/analyticsData';

const SOURCES = [
  { key: 'employees', label: 'Employees', url: () => API_URLS.EMPLOYEES.GET_ALL() },
  { key: 'departments', label: 'Departments', url: () => API_URLS.DEPARTMENTS.GET_ALL() },
  { key: 'assets', label: 'Assets', url: () => API_URLS.ASSETS.GET_ALL() },
  { key: 'requests', label: 'Leave requests', url: () => API_URLS.LEAVE_REQUESTS.GET_ALL() },
  { key: 'entitlements', label: 'Leave allowances', url: () => API_URLS.LEAVE_ENTITLEMENTS.GET_ALL() },
  { key: 'dossiers', label: 'Employee dossiers', url: () => API_URLS.EMPLOYEE_DOSSIERS.GET_ALL() },
  { key: 'templates', label: 'Document templates', url: () => API_URLS.DOCUMENT_TEMPLATES.GET_ALL() },
  { key: 'documents', label: 'Generated documents', url: () => API_URLS.GENERATED_DOCUMENTS.GET_ALL() },
];

const now = () => (typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now());

// Fetch one source, timing it. Never throws — a failure becomes { ok: false }.
const timedFetch = async (source) => {
  const t0 = now();
  try {
    const res = await authenticatedFetch(source.url());
    const ms = Math.round(now() - t0);
    if (!res.ok) return { ...source, ok: false, status: res.status, ms, count: null, data: null };
    const json = await res.json();
    const data = Array.isArray(json) ? json : json ? [json] : [];
    return { ...source, ok: true, status: res.status || 200, ms, count: data.length, data };
  } catch (err) {
    return { ...source, ok: false, status: null, ms: Math.round(now() - t0), count: null, data: null };
  }
};

const STATE_CHIP = {
  ok: { tone: 'success', text: 'OK' },
  slow: { tone: 'warning', text: 'Slow' },
  error: { tone: 'danger', text: 'Error' },
};

const ACTIVITY_STYLE = {
  'leave-submitted': { icon: CalendarPlus, tone: 'indigo' },
  'leave-approved': { icon: CircleCheck, tone: 'green' },
  'leave-rejected': { icon: CircleX, tone: 'red' },
  document: { icon: FileText, tone: 'violet' },
  asset: { icon: Laptop, tone: 'sky' },
  hire: { icon: UserPlus, tone: 'amber' },
};

// A StatCard exposed as a named group, so the number is announced with its label.
const Kpi = ({ label, value, hint, icon, tone }) => (
  <div role="group" aria-label={label} className="h-full">
    <StatCard className="h-full" label={label} value={value} hint={hint} icon={icon} tone={tone} />
  </div>
);

// Card whose body is a flush list or table: the header sits on the card's padding and
// the rows run edge to edge under a divider.
const ListCard = ({ title, description, className, children }) => (
  <Card className={cn('pb-0', className)}>
    <CardHeader>
      <CardTitle>{title}</CardTitle>
      {description && <CardDescription>{description}</CardDescription>}
    </CardHeader>
    {children}
  </Card>
);

const CardMessage = ({ children }) => (
  <CardContent className="pb-6">
    <p className="py-6 text-center text-sm text-muted-foreground">{children}</p>
  </CardContent>
);

const PeriodFilter = ({ period, onChange }) => (
  <div className="flex flex-wrap items-center gap-3" role="group" aria-label="Time period">
    <span className="text-sm font-medium text-muted-foreground">Period</span>
    <div className="inline-flex flex-wrap gap-1 rounded-lg bg-muted p-1">
      {PERIODS.map((p) => {
        const active = p.key === period;
        return (
          <Button
            key={p.key}
            size="sm"
            variant="ghost"
            className={cn(
              'h-7',
              active
                ? 'bg-background text-foreground shadow-sm hover:bg-background dark:bg-input/30 dark:hover:bg-input/30'
                : 'text-muted-foreground'
            )}
            aria-pressed={active}
            onClick={() => onChange(p.key)}
          >
            {p.label}
          </Button>
        );
      })}
    </div>
  </div>
);

const HrAnalytics = ({ data }) => {
  const [period, setPeriod] = useState('last12');
  const range = useMemo(() => periodRange(period), [period]);
  const periodLabel = PERIODS.find((p) => p.key === period).label.toLowerCase();

  const { employees, requests, assets } = data;

  const requestsInPeriod = useMemo(
    () => (requests ? requests.filter((r) => inRange(r.createdAt, range)) : null),
    [requests, range]
  );
  const byDept = useMemo(() => headcountByDepartment(employees), [employees]);
  const byType = useMemo(() => leaveDaysByType(requests, range), [requests, range]);
  const perMonth = useMemo(() => approvedDaysPerMonth(requests), [requests]);
  const outcomes = useMemo(() => requestOutcomes(requests, range), [requests, range]);
  const hires = useMemo(() => hiresPerYear(employees), [employees]);
  const assignment = useMemo(() => assetAssignment(assets), [assets]);

  const dash = (v, fn) => (v ? fn(v) : '—');
  const outcomeTotal = outcomes.Approved + outcomes.Pending + outcomes.Rejected;

  return (
    <div className="space-y-6">
      <PeriodFilter period={period} onChange={setPeriod} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Kpi label="Headcount" value={dash(employees, (e) => e.length)} icon={Users} tone="indigo" />
        <Kpi label="New hires" hint={periodLabel} value={dash(employees, (e) => newHires(e, range))} icon={UserPlus} tone="amber" />
        <Kpi
          label="Approved leave days"
          hint={periodLabel}
          value={dash(requests, (r) => approvedLeaveDays(r, range).toLocaleString())}
          icon={CalendarCheck}
          tone="green"
        />
        <Kpi
          label="Approval rate"
          hint="approved of decided"
          value={requestsInPeriod ? formatPercent(approvalRate(requestsInPeriod)) : '—'}
          icon={CircleCheck}
          tone="sky"
        />
        <Kpi
          label="Median decision time"
          hint="submitted → decided"
          value={requestsInPeriod ? humanizeDuration(medianDecisionMs(requestsInPeriod)) : '—'}
          icon={Timer}
          tone="violet"
        />
        <Kpi
          label="Assets assigned"
          hint={assets ? `${assignment.assigned} of ${assignment.active} active` : undefined}
          value={assets ? formatPercent(assignment.pct) : '—'}
          icon={Laptop}
          tone="indigo"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard
          title="Headcount by department"
          subtitle="Current employees"
          unavailable={!employees}
          empty={byDept.length === 0}
          table={{ columns: ['Department', 'Employees'], rows: byDept.map((d) => [d.label, d.value]) }}
        >
          <BarList data={byDept} />
        </ChartCard>
        <ChartCard
          title="Leave days by type"
          subtitle={`Approved and pending, ${periodLabel}`}
          unavailable={!requests}
          empty={byType.length === 0}
          table={{ columns: ['Leave type', 'Days'], rows: byType.map((d) => [d.label, d.value]) }}
        >
          <BarList data={byType} unit=" d" />
        </ChartCard>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ChartCard
            title="Approved leave days per month"
            subtitle="Last 12 months · multi-month requests split by day"
            unavailable={!requests}
            empty={perMonth.every((m) => m.value === 0)}
            table={{ columns: ['Month', 'Days'], rows: perMonth.map((m) => [m.fullLabel, m.value]) }}
          >
            <ColumnChart data={perMonth} unit=" d" />
          </ChartCard>
        </div>
        <ChartCard
          title="Request outcomes"
          subtitle={`Requests submitted, ${periodLabel}`}
          unavailable={!requests}
          empty={outcomeTotal === 0}
          table={{
            columns: ['Outcome', 'Requests'],
            rows: [['Approved', outcomes.Approved], ['Pending', outcomes.Pending], ['Rejected', outcomes.Rejected]],
          }}
        >
          <StackedBar
            segments={[
              { key: 'approved', label: 'Approved', value: outcomes.Approved, colorVar: '--chart-2' },
              { key: 'pending', label: 'Pending', value: outcomes.Pending, colorVar: '--chart-3' },
              { key: 'rejected', label: 'Rejected', value: outcomes.Rejected, colorVar: '--chart-4' },
            ]}
          />
        </ChartCard>
      </div>

      <ChartCard
        title="Hires per year"
        subtitle="By hire date, current employees"
        unavailable={!employees}
        empty={hires.length === 0}
        table={{ columns: ['Year', 'Hires'], rows: hires.map((h) => [h.label, h.value]) }}
      >
        <ColumnChart data={hires} height={200} />
      </ChartCard>
    </div>
  );
};

const SystemHealth = ({ results, data }) => {
  const failing = results.filter((r) => serviceState(r) !== 'ok').length;
  const checks = useMemo(() => dataQualityChecks(data), [data]);
  const activity = useMemo(() => recentActivity(data), [data]);
  const anyActivitySource = ['employees', 'requests', 'documents', 'assets'].some((k) => data[k]);

  return (
    <>
      {failing === 0 ? (
        <Alert className="border-success/40 bg-success/10 text-success">
          <CircleCheck aria-hidden="true" />
          <AlertDescription className="text-foreground">All services responding</AlertDescription>
        </Alert>
      ) : (
        <Alert className="border-warning/40 bg-warning/10 text-warning">
          <TriangleAlert aria-hidden="true" />
          <AlertDescription className="text-foreground">
            {failing} {failing === 1 ? 'service is' : 'services are'} slow or failing
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-12">
        <ListCard
          className="lg:col-span-7"
          title="API services"
          description={`Measured from this browser · slow at ${SLOW_MS} ms or more`}
        >
          <div className="border-t">
            <Table className="[&_tr>*:first-child]:pl-6 [&_tr>*:last-child]:pr-6">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead scope="col">Service</TableHead>
                  <TableHead scope="col">Status</TableHead>
                  <TableHead scope="col" className="text-right">Response</TableHead>
                  <TableHead scope="col" className="text-right">Records</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((r) => {
                  const state = serviceState(r);
                  const chip = STATE_CHIP[state];
                  return (
                    <TableRow key={r.key}>
                      <TableCell className="py-3 font-medium">{r.label}</TableCell>
                      <TableCell className="py-3">
                        <StatusBadge tone={chip.tone}>
                          {chip.text}
                          {state === 'error' && r.status ? ` · HTTP ${r.status}` : ''}
                        </StatusBadge>
                      </TableCell>
                      <TableCell className="py-3 text-right tabular-nums">{r.ms} ms</TableCell>
                      <TableCell className="py-3 text-right tabular-nums">
                        {r.count === null ? '—' : r.count.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </ListCard>

        <ListCard className="lg:col-span-5" title="Data quality">
          <ul className="divide-y border-t">
            {checks.map((c) => (
              <li key={c.id} className="px-6 py-4">
                <div className="flex items-start gap-3.5">
                  <span className="w-11 shrink-0 text-right text-xl leading-tight font-bold tabular-nums">
                    {c.count === null ? '—' : c.count}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{c.label}</span>
                      {c.count === null && <StatusBadge tone="muted">Unavailable</StatusBadge>}
                      {c.count === 0 && <StatusBadge tone="success">OK</StatusBadge>}
                      {c.count > 0 && (
                        <StatusBadge tone={c.severity === 'info' ? 'info' : 'warning'}>
                          {c.severity === 'info' ? 'Info' : 'Needs attention'}
                        </StatusBadge>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{c.explain}</p>
                    {c.count > 0 && (
                      <Link
                        to={c.to}
                        className="mt-1.5 inline-flex items-center gap-1 rounded-sm text-sm font-medium text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
                      >
                        Review <ArrowRight className="size-3.5" aria-hidden="true" />
                      </Link>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </ListCard>
      </div>

      <ListCard
        title="Recent activity"
        description="Built from record timestamps. Erasures have their own audit log below; other edits and deletions are not recorded."
      >
        {!anyActivitySource && <CardMessage>Data unavailable</CardMessage>}
        {anyActivitySource && activity.length === 0 && <CardMessage>No activity yet</CardMessage>}
        {activity.length > 0 && (
          <ul className="divide-y border-t">
            {activity.map((a) => {
              const style = ACTIVITY_STYLE[a.kind];
              return (
                <li key={a.id} className="flex flex-wrap items-start gap-3 px-6 py-3.5 sm:flex-nowrap">
                  <IconTile icon={style.icon} tone={style.tone} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">{a.title}</div>
                    {a.detail && <p className="text-sm text-muted-foreground">{a.detail}</p>}
                  </div>
                  <time
                    className="w-full shrink-0 pl-11 text-xs whitespace-nowrap text-muted-foreground sm:w-auto sm:pl-0"
                    dateTime={new Date(a.at).toISOString()}
                  >
                    {formatRelative(a.at)}
                  </time>
                </li>
              );
            })}
          </ul>
        )}
      </ListCard>
    </>
  );
};

const LoadingState = () => (
  <div className="space-y-6" aria-busy="true" aria-label="Loading analysis">
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <Skeleton key={i} className="h-24 rounded-xl" />
      ))}
    </div>
    <div className="grid gap-6 lg:grid-cols-2">
      <Skeleton className="h-64 rounded-xl" />
      <Skeleton className="h-64 rounded-xl" />
    </div>
  </div>
);

const SystemAnalysisPage = () => {
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState(null);
  const mounted = useRef(true);

  const load = useCallback(async () => {
    setLoading(true);
    const all = await Promise.all(SOURCES.map(timedFetch));
    if (!mounted.current) return;
    setResults(all);
    setUpdatedAt(new Date());
    setLoading(false);
  }, []);

  useEffect(() => {
    mounted.current = true;
    load();
    return () => {
      mounted.current = false;
    };
  }, [load]);

  const data = useMemo(
    () => Object.fromEntries((results || []).map((r) => [r.key, r.ok ? r.data : null])),
    [results]
  );

  return (
    <div>
      <PageHeader
        title="System Analysis"
        description="How the organisation is doing, and whether the system and its data are healthy."
        actions={(
          <>
            {updatedAt && (
              <span className="text-sm text-muted-foreground" aria-live="polite">
                Updated {updatedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
            <Button variant="outline" onClick={load} disabled={loading}>
              <RotateCw className={cn(loading && 'animate-spin motion-reduce:animate-none')} aria-hidden="true" />
              {loading ? 'Refreshing…' : 'Refresh'}
            </Button>
          </>
        )}
      />

      {/* Both panels stay mounted (forceMount, hidden while inactive) so switching tabs keeps
          the chosen period and doesn't re-fetch the erasure log. */}
      <Tabs defaultValue="hr" className="gap-6">
        <TabsList>
          <TabsTrigger value="hr" className="px-3">
            <LineChart aria-hidden="true" />HR analytics
          </TabsTrigger>
          <TabsTrigger value="health" className="px-3">
            <HeartPulse aria-hidden="true" />System health
          </TabsTrigger>
        </TabsList>
        <TabsContent value="hr" forceMount className="data-[state=inactive]:hidden">
          {!results ? <LoadingState /> : <HrAnalytics data={data} />}
        </TabsContent>
        <TabsContent value="health" forceMount className="space-y-6 data-[state=inactive]:hidden">
          {!results ? <LoadingState /> : <SystemHealth results={results} data={data} />}
          <ErasureLogCard refreshKey={updatedAt ? updatedAt.getTime() : 0} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SystemAnalysisPage;
