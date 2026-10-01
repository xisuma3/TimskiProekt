import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Button, Card, Col, Nav, Row, Tab } from 'react-bootstrap';
import { Link } from 'react-router-dom';
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
import './SystemAnalysisPage.css';

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
  ok: { cls: 'is-success', text: 'OK' },
  slow: { cls: 'is-pending', text: 'Slow' },
  error: { cls: 'is-rejected', text: 'Error' },
};

const ACTIVITY_STYLE = {
  'leave-submitted': { icon: 'bi-calendar-plus', tone: 'tone-indigo' },
  'leave-approved': { icon: 'bi-check2-circle', tone: 'tone-green' },
  'leave-rejected': { icon: 'bi-x-circle', tone: 'tone-red' },
  document: { icon: 'bi-file-earmark-text', tone: 'tone-violet' },
  asset: { icon: 'bi-laptop', tone: 'tone-sky' },
  hire: { icon: 'bi-person-plus', tone: 'tone-amber' },
};

const Kpi = ({ label, value, hint, icon, tone }) => (
  <Card className="h-100 analysis-kpi" role="group" aria-label={label}>
    <div className="stat-card">
      <span className={`stat-icon tone-${tone}`} aria-hidden="true"><i className={`bi bi-${icon}`} /></span>
      <div className="min-w-0">
        <div className="stat-value">{value}</div>
        <div className="stat-label">{label}</div>
        {hint && <div className="stat-hint">{hint}</div>}
      </div>
    </div>
  </Card>
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
    <>
      <div className="analysis-filter" role="group" aria-label="Time period">
        <span className="analysis-filter-label">Period</span>
        {PERIODS.map((p) => (
          <Button
            key={p.key}
            size="sm"
            variant={p.key === period ? 'primary' : 'light'}
            aria-pressed={p.key === period}
            onClick={() => setPeriod(p.key)}
          >
            {p.label}
          </Button>
        ))}
      </div>

      <Row className="g-3 mb-4">
        <Col lg={4} sm={6}>
          <Kpi label="Headcount" value={dash(employees, (e) => e.length)} icon="people" tone="indigo" />
        </Col>
        <Col lg={4} sm={6}>
          <Kpi label="New hires" hint={periodLabel} value={dash(employees, (e) => newHires(e, range))} icon="person-plus" tone="amber" />
        </Col>
        <Col lg={4} sm={6}>
          <Kpi label="Approved leave days" hint={periodLabel} value={dash(requests, (r) => approvedLeaveDays(r, range).toLocaleString())} icon="calendar2-check" tone="green" />
        </Col>
        <Col lg={4} sm={6}>
          <Kpi label="Approval rate" hint="approved of decided" value={requestsInPeriod ? formatPercent(approvalRate(requestsInPeriod)) : '—'} icon="check2-circle" tone="sky" />
        </Col>
        <Col lg={4} sm={6}>
          <Kpi label="Median decision time" hint="submitted → decided" value={requestsInPeriod ? humanizeDuration(medianDecisionMs(requestsInPeriod)) : '—'} icon="stopwatch" tone="violet" />
        </Col>
        <Col lg={4} sm={6}>
          <Kpi
            label="Assets assigned"
            hint={assets ? `${assignment.assigned} of ${assignment.active} active` : undefined}
            value={assets ? formatPercent(assignment.pct) : '—'}
            icon="laptop"
            tone="indigo"
          />
        </Col>
      </Row>

      <Row className="g-4 mb-4">
        <Col lg={6}>
          <ChartCard
            title="Headcount by department"
            subtitle="Current employees"
            unavailable={!employees}
            empty={byDept.length === 0}
            table={{ columns: ['Department', 'Employees'], rows: byDept.map((d) => [d.label, d.value]) }}
          >
            <BarList data={byDept} />
          </ChartCard>
        </Col>
        <Col lg={6}>
          <ChartCard
            title="Leave days by type"
            subtitle={`Approved and pending, ${periodLabel}`}
            unavailable={!requests}
            empty={byType.length === 0}
            table={{ columns: ['Leave type', 'Days'], rows: byType.map((d) => [d.label, d.value]) }}
          >
            <BarList data={byType} unit=" d" />
          </ChartCard>
        </Col>
      </Row>

      <Row className="g-4 mb-4">
        <Col lg={8}>
          <ChartCard
            title="Approved leave days per month"
            subtitle="Last 12 months · multi-month requests split by day"
            unavailable={!requests}
            empty={perMonth.every((m) => m.value === 0)}
            table={{ columns: ['Month', 'Days'], rows: perMonth.map((m) => [m.fullLabel, m.value]) }}
          >
            <ColumnChart data={perMonth} unit=" d" />
          </ChartCard>
        </Col>
        <Col lg={4}>
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
                { key: 'approved', label: 'Approved', value: outcomes.Approved, colorVar: '--hr-status-approved' },
                { key: 'pending', label: 'Pending', value: outcomes.Pending, colorVar: '--hr-status-pending' },
                { key: 'rejected', label: 'Rejected', value: outcomes.Rejected, colorVar: '--hr-status-rejected' },
              ]}
            />
          </ChartCard>
        </Col>
      </Row>

      <ChartCard
        title="Hires per year"
        subtitle="By hire date, current employees"
        unavailable={!employees}
        empty={hires.length === 0}
        table={{ columns: ['Year', 'Hires'], rows: hires.map((h) => [h.label, h.value]) }}
      >
        <ColumnChart data={hires} height={200} />
      </ChartCard>
    </>
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
        <Alert variant="success" className="d-flex align-items-center gap-2">
          <i className="bi bi-check-circle" aria-hidden="true" /> All services responding
        </Alert>
      ) : (
        <Alert variant="warning" className="d-flex align-items-center gap-2">
          <i className="bi bi-exclamation-triangle" aria-hidden="true" />
          {failing} {failing === 1 ? 'service is' : 'services are'} slow or failing
        </Alert>
      )}

      <Row className="g-4 mb-4">
        <Col lg={7}>
          <Card className="h-100">
            <Card.Header className="py-3">
              API services
              <small className="d-block text-muted fw-normal">
                Measured from this browser · slow at {SLOW_MS} ms or more
              </small>
            </Card.Header>
            <Card.Body className="p-0">
              <div className="table-responsive">
                <table className="table mb-0 health-table">
                  <thead>
                    <tr>
                      <th scope="col" className="ps-4">Service</th>
                      <th scope="col">Status</th>
                      <th scope="col" className="num">Response</th>
                      <th scope="col" className="num pe-4">Records</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((r) => {
                      const state = serviceState(r);
                      const chip = STATE_CHIP[state];
                      return (
                        <tr key={r.key}>
                          <td className="ps-4 fw-semibold">{r.label}</td>
                          <td>
                            <span className={`status-chip ${chip.cls}`}>
                              {chip.text}
                              {state === 'error' && r.status ? ` · HTTP ${r.status}` : ''}
                            </span>
                          </td>
                          <td className="num">{r.ms} ms</td>
                          <td className="num pe-4">{r.count === null ? '—' : r.count.toLocaleString()}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={5}>
          <Card className="h-100">
            <Card.Header className="py-3">Data quality</Card.Header>
            <ul className="list-group list-group-flush">
              {checks.map((c) => (
                <li key={c.id} className="list-group-item px-4 py-3">
                  <div className="quality-item">
                    <span className="quality-count">{c.count === null ? '—' : c.count}</span>
                    <div className="quality-body">
                      <div className="d-flex flex-wrap align-items-center gap-2">
                        <span className="fw-semibold">{c.label}</span>
                        {c.count === null && <span className="status-chip">Unavailable</span>}
                        {c.count === 0 && <span className="status-chip is-success">OK</span>}
                        {c.count > 0 && (
                          <span className={`status-chip ${c.severity === 'info' ? 'is-info' : 'is-pending'}`}>
                            {c.severity === 'info' ? 'Info' : 'Needs attention'}
                          </span>
                        )}
                      </div>
                      <small>{c.explain}</small>
                      {c.count > 0 && (
                        <Link to={c.to} className="small fw-semibold text-decoration-none">
                          Review <i className="bi bi-arrow-right" aria-hidden="true" />
                        </Link>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </Col>
      </Row>

      <Card>
        <Card.Header className="py-3">
          Recent activity
          <small className="d-block text-muted fw-normal">
            Built from record timestamps. Erasures have their own audit log below; other edits and deletions are not recorded.
          </small>
        </Card.Header>
        {!anyActivitySource && <Card.Body><div className="chart-muted">Data unavailable</div></Card.Body>}
        {anyActivitySource && activity.length === 0 && (
          <Card.Body><div className="chart-muted">No activity yet</div></Card.Body>
        )}
        {activity.length > 0 && (
          <ul className="list-group list-group-flush">
            {activity.map((a) => {
              const style = ACTIVITY_STYLE[a.kind];
              return (
                <li key={a.id} className="list-group-item px-4 py-3">
                  <div className="activity-item">
                    <span className={`activity-icon ${style.tone}`} aria-hidden="true"><i className={`bi ${style.icon}`} /></span>
                    <div className="activity-body">
                      <div className="fw-semibold">{a.title}</div>
                      {a.detail && <small>{a.detail}</small>}
                    </div>
                    <time className="activity-time" dateTime={new Date(a.at).toISOString()}>
                      {formatRelative(a.at)}
                    </time>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </>
  );
};

const LoadingState = () => (
  <div aria-busy="true" aria-label="Loading analysis">
    <Row className="g-3 mb-4">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <Col xl={2} lg={4} sm={6} key={i}><div className="skeleton" style={{ height: 96 }} /></Col>
      ))}
    </Row>
    <Row className="g-4">
      <Col lg={6}><div className="skeleton" style={{ height: 260 }} /></Col>
      <Col lg={6}><div className="skeleton" style={{ height: 260 }} /></Col>
    </Row>
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
      <div className="page-header">
        <div>
          <h1>System Analysis</h1>
          <p>How the organisation is doing, and whether the system and its data are healthy.</p>
        </div>
        <div className="page-header-actions">
          {updatedAt && (
            <span className="analysis-updated" aria-live="polite">
              Updated {updatedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <Button variant="light" onClick={load} disabled={loading}>
            <i className="bi bi-arrow-clockwise me-2" aria-hidden="true" />
            {loading ? 'Refreshing…' : 'Refresh'}
          </Button>
        </div>
      </div>

      <Tab.Container defaultActiveKey="hr">
        <Nav variant="tabs" className="analysis-tabs">
          <Nav.Item>
            <Nav.Link eventKey="hr"><i className="bi bi-graph-up me-2" aria-hidden="true" />HR analytics</Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link eventKey="health"><i className="bi bi-heart-pulse me-2" aria-hidden="true" />System health</Nav.Link>
          </Nav.Item>
        </Nav>
        <Tab.Content>
          <Tab.Pane eventKey="hr">
            {!results ? <LoadingState /> : <HrAnalytics data={data} />}
          </Tab.Pane>
          <Tab.Pane eventKey="health">
            {!results ? <LoadingState /> : <SystemHealth results={results} data={data} />}
            <ErasureLogCard refreshKey={updatedAt ? updatedAt.getTime() : 0} />
          </Tab.Pane>
        </Tab.Content>
      </Tab.Container>
    </div>
  );
};

export default SystemAnalysisPage;
