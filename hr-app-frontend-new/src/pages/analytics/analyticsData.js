// Pure analytics over the API's list responses. No fetching, no React — every
// function takes plain arrays (or null when that endpoint was unavailable).

const DAY_MS = 86400000;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Day number (days since epoch, UTC) from an API date string or a Date.
// API dates arrive as "2024-06-01T00:00:00"; only the calendar date matters,
// so read the date part directly instead of letting the timezone shift it.
export const toDayNumber = (value) => {
  if (value === null || value === undefined || value === '') return null;
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return Date.UTC(value.getFullYear(), value.getMonth(), value.getDate()) / DAY_MS;
  }
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value));
  if (!match) return null;
  return Date.UTC(+match[1], +match[2] - 1, +match[3]) / DAY_MS;
};

const dayToParts = (day) => {
  const d = new Date(day * DAY_MS);
  return { y: d.getUTCFullYear(), m: d.getUTCMonth(), d: d.getUTCDate() };
};

export const monthKey = (y, m) => `${y}-${String(m + 1).padStart(2, '0')}`;

// Leave counts inclusively: a same-day request is one day.
export const leaveDays = (req) => {
  const start = toDayNumber(req?.startDate);
  const end = toDayNumber(req?.endDate);
  if (start === null || end === null || end < start) return 0;
  return end - start + 1;
};

// Period presets for the filter row. `null` means all time.
export const PERIODS = [
  { key: 'last12', label: 'Last 12 months' },
  { key: 'year', label: 'This year' },
  { key: 'all', label: 'All time' },
];

export const periodRange = (period, now = new Date()) => {
  const today = toDayNumber(now);
  if (period === 'year') return { start: Date.UTC(now.getFullYear(), 0, 1) / DAY_MS, end: today };
  if (period === 'last12') {
    return { start: Date.UTC(now.getFullYear(), now.getMonth() - 11, 1) / DAY_MS, end: today };
  }
  return null;
};

export const inRange = (value, range) => {
  if (!range) return toDayNumber(value) !== null;
  const day = toDayNumber(value);
  return day !== null && day >= range.start && day <= range.end;
};

// Days of a request that fall inside the range (the whole request when range is null).
export const daysInRange = (req, range) => {
  const start = toDayNumber(req?.startDate);
  const end = toDayNumber(req?.endDate);
  if (start === null || end === null || end < start) return 0;
  if (!range) return end - start + 1;
  const from = Math.max(start, range.start);
  const to = Math.min(end, range.end);
  return to < from ? 0 : to - from + 1;
};

// { 'YYYY-MM': days } for one request, splitting across month boundaries.
export const splitDaysByMonth = (req) => {
  const out = {};
  const start = toDayNumber(req?.startDate);
  const end = toDayNumber(req?.endDate);
  if (start === null || end === null || end < start) return out;
  let day = start;
  while (day <= end) {
    const { y, m } = dayToParts(day);
    const nextMonth = Date.UTC(y, m + 1, 1) / DAY_MS;
    const last = Math.min(end, nextMonth - 1);
    const key = monthKey(y, m);
    out[key] = (out[key] || 0) + (last - day + 1);
    day = last + 1;
  }
  return out;
};

// The 12 calendar months ending with the current one, oldest first.
export const lastTwelveMonths = (now = new Date()) => {
  const months = [];
  for (let i = 11; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      key: monthKey(d.getFullYear(), d.getMonth()),
      label: MONTHS[d.getMonth()],
      fullLabel: `${MONTHS[d.getMonth()]} ${d.getFullYear()}`,
    });
  }
  return months;
};

export const approvedDaysPerMonth = (requests, now = new Date()) => {
  const months = lastTwelveMonths(now);
  const totals = Object.fromEntries(months.map((m) => [m.key, 0]));
  (requests || [])
    .filter((r) => r.status === 'Approved')
    .forEach((r) => {
      Object.entries(splitDaysByMonth(r)).forEach(([key, days]) => {
        if (key in totals) totals[key] += days;
      });
    });
  return months.map((m) => ({ label: m.label, fullLabel: m.fullLabel, value: totals[m.key] }));
};

const sortDesc = (entries) =>
  entries.sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));

export const headcountByDepartment = (employees) => {
  const counts = {};
  (employees || []).forEach((e) => {
    const name = e.departmentName || 'No department';
    counts[name] = (counts[name] || 0) + 1;
  });
  return sortDesc(Object.entries(counts).map(([label, value]) => ({ label, value })));
};

export const leaveDaysByType = (requests, range) => {
  const totals = {};
  (requests || [])
    .filter((r) => r.status !== 'Rejected')
    .forEach((r) => {
      const days = daysInRange(r, range);
      if (days > 0) totals[r.leaveType || 'Other'] = (totals[r.leaveType || 'Other'] || 0) + days;
    });
  return sortDesc(Object.entries(totals).map(([label, value]) => ({ label, value })));
};

export const approvedLeaveDays = (requests, range) =>
  (requests || [])
    .filter((r) => r.status === 'Approved')
    .reduce((sum, r) => sum + daysInRange(r, range), 0);

// Requests submitted in the period, by outcome.
export const requestOutcomes = (requests, range) => {
  const counts = { Approved: 0, Pending: 0, Rejected: 0 };
  (requests || [])
    .filter((r) => inRange(r.createdAt, range))
    .forEach((r) => {
      if (r.status in counts) counts[r.status] += 1;
    });
  return counts;
};

// Approved / (approved + rejected). Null when nothing has been decided yet.
export const approvalRate = (requests) => {
  let approved = 0;
  let rejected = 0;
  (requests || []).forEach((r) => {
    if (r.status === 'Approved') approved += 1;
    if (r.status === 'Rejected') rejected += 1;
  });
  const decided = approved + rejected;
  return decided === 0 ? null : approved / decided;
};

export const medianDecisionMs = (requests) => {
  const durations = (requests || [])
    .filter((r) => r.decisionAt && r.createdAt)
    .map((r) => new Date(r.decisionAt).getTime() - new Date(r.createdAt).getTime())
    .filter((ms) => Number.isFinite(ms) && ms >= 0)
    .sort((a, b) => a - b);
  if (durations.length === 0) return null;
  const mid = Math.floor(durations.length / 2);
  return durations.length % 2 ? durations[mid] : (durations[mid - 1] + durations[mid]) / 2;
};

export const humanizeDuration = (ms) => {
  if (ms === null || ms === undefined || !Number.isFinite(ms)) return '—';
  const minutes = ms / 60000;
  if (minutes < 60) return `${Math.max(1, Math.round(minutes))} min`;
  const hours = minutes / 60;
  if (hours < 48) return `${Math.round(hours)} h`;
  const days = Math.round(hours / 24);
  return `${days} days`;
};

export const newHires = (employees, range) =>
  (employees || []).filter((e) => inRange(e.hireDate, range)).length;

export const hiresPerYear = (employees) => {
  const counts = {};
  (employees || []).forEach((e) => {
    const day = toDayNumber(e.hireDate);
    if (day === null) return;
    const { y } = dayToParts(day);
    counts[y] = (counts[y] || 0) + 1;
  });
  const years = Object.keys(counts).map(Number);
  if (years.length === 0) return [];
  const out = [];
  for (let y = Math.min(...years); y <= Math.max(...years); y += 1) {
    out.push({ label: String(y), fullLabel: String(y), value: counts[y] || 0 });
  }
  return out;
};

export const assetAssignment = (assets) => {
  const active = (assets || []).filter((a) => a.isActive);
  const assigned = active.filter((a) => a.employeeID).length;
  return { assigned, active: active.length, pct: active.length ? assigned / active.length : null };
};

// "Clean" axis ticks: 0..max in steps of 1/2/5 x 10^n, about four of them.
export const niceTicks = (max, target = 4) => {
  if (!max || max <= 0) return [0, 1];
  const raw = max / target;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 5, 10].map((s) => s * pow).find((s) => s >= raw) || 10 * pow;
  const top = Math.ceil(max / step) * step;
  const ticks = [];
  for (let v = 0; v <= top + step / 2; v += step) ticks.push(Math.round(v * 1e6) / 1e6);
  return ticks;
};

// API response time → service state.
export const SLOW_MS = 800;
export const serviceState = (result) => {
  if (!result || !result.ok) return 'error';
  return result.ms >= SLOW_MS ? 'slow' : 'ok';
};

// Data-quality checks. Each check is null-count when a source it needs is unavailable.
export const dataQualityChecks = (
  { employees, dossiers, entitlements, requests, assets, templates },
  now = new Date()
) => {
  const year = now.getFullYear();
  const today = toDayNumber(now);
  const has = (...sources) => sources.every((s) => Array.isArray(s));
  const count = (sources, fn) => (has(...sources) ? fn() : null);

  const dossierIds = new Set((dossiers || []).map((d) => d.employeeID));
  const allowanceIds = new Set(
    (entitlements || []).filter((e) => Number(e.year) === year).map((e) => e.employeeID)
  );

  return [
    {
      id: 'no-department',
      label: 'Employees without a department',
      severity: 'warning',
      explain: 'They are missing from department headcount and reports.',
      to: '/employees',
      count: count([employees], () => employees.filter((e) => !e.departmentID).length),
    },
    {
      id: 'no-manager',
      label: 'Employees without a manager',
      severity: 'warning',
      explain: 'Only an admin can decide their leave — no manager is notified.',
      to: '/employees',
      count: count([employees], () => employees.filter((e) => !e.managerID).length),
    },
    {
      id: 'no-dossier',
      label: 'Employees without a dossier',
      severity: 'warning',
      explain: 'Documents that use dossier fields will render with blanks.',
      to: '/employee-dossiers',
      count: count([employees, dossiers], () => employees.filter((e) => !dossierIds.has(e.employeeID)).length),
    },
    {
      id: 'no-allowance',
      label: `Employees without a ${year} leave allowance`,
      severity: 'warning',
      explain: "They can't request leave this year until an allowance is set.",
      to: '/leave-allowances',
      count: count([employees, entitlements], () => employees.filter((e) => !allowanceIds.has(e.employeeID)).length),
    },
    {
      id: 'stale-pending',
      label: 'Leave requests pending for over 7 days',
      severity: 'warning',
      explain: 'Requests waiting more than a week for a decision.',
      to: '/leave-requests',
      count: count([requests], () =>
        requests.filter((r) => {
          const created = toDayNumber(r.createdAt);
          return r.status === 'Pending' && created !== null && today - created > 7;
        }).length
      ),
    },
    {
      id: 'no-serial',
      label: 'Assets without a serial number',
      severity: 'warning',
      explain: 'Hard to identify on a handover form or during an audit.',
      to: '/assets',
      count: count([assets], () => assets.filter((a) => !a.serialNumber).length),
    },
    {
      id: 'in-stock',
      label: 'Active assets in stock',
      severity: 'info',
      explain: 'Active equipment that nobody currently holds.',
      to: '/assets',
      count: count([assets], () => assets.filter((a) => a.isActive && !a.employeeID).length),
    },
    {
      id: 'unused-templates',
      label: 'Templates never used',
      severity: 'info',
      explain: 'No document has been generated from these yet.',
      to: '/document-templates',
      count: count([templates], () => templates.filter((t) => !t.generatedDocumentsCount).length),
    },
  ];
};

// Newest-first activity built from record timestamps (there is no audit log).
export const recentActivity = ({ employees, requests, documents, assets }, limit = 15) => {
  const items = [];
  const push = (at, item) => {
    const time = new Date(at).getTime();
    if (Number.isFinite(time)) items.push({ ...item, at: time });
  };

  (requests || []).forEach((r) => {
    push(r.createdAt, {
      id: `leave-submitted-${r.requestID}`,
      kind: 'leave-submitted',
      title: `${r.employeeName || 'An employee'} requested ${r.leaveType || ''} leave`.replace(/\s+/g, ' '),
      detail: `${leaveDays(r)} ${leaveDays(r) === 1 ? 'day' : 'days'}`,
    });
    if (r.decisionAt && (r.status === 'Approved' || r.status === 'Rejected')) {
      push(r.decisionAt, {
        id: `leave-decided-${r.requestID}`,
        kind: r.status === 'Approved' ? 'leave-approved' : 'leave-rejected',
        title: `${r.approvedByName || 'Someone'} ${r.status.toLowerCase()} ${r.employeeName || 'a'}'s leave`,
        detail: r.decisionReason || `${r.leaveType || ''} · ${leaveDays(r)} days`.trim(),
      });
    }
  });
  (documents || []).forEach((d) =>
    push(d.generatedDate, {
      id: `doc-${d.documentID}`,
      kind: 'document',
      title: `${d.templateName || 'A document'} generated`,
      detail: d.employeeName ? `For ${d.employeeName}` : '',
    })
  );
  (assets || [])
    .filter((a) => a.employeeID && a.assignmentDate)
    .forEach((a) =>
      push(a.assignmentDate, {
        id: `asset-${a.assetID}`,
        kind: 'asset',
        title: `${a.name || 'An asset'} assigned`,
        detail: a.employeeName ? `To ${a.employeeName}` : '',
      })
    );
  (employees || []).forEach((e) =>
    push(e.hireDate, {
      id: `hire-${e.employeeID}`,
      kind: 'hire',
      title: `${[e.firstName, e.lastName].filter(Boolean).join(' ') || 'An employee'} joined`,
      detail: [e.position, e.departmentName].filter(Boolean).join(' · '),
    })
  );

  return items.sort((a, b) => b.at - a.at).slice(0, limit);
};

export const formatRelative = (time, now = Date.now()) => {
  const diff = now - time;
  const abs = Math.abs(diff);
  const future = diff < 0;
  const fmt = (n, unit) => (future ? `in ${n} ${unit}` : `${n} ${unit} ago`);
  if (abs < 60000) return 'just now';
  if (abs < 3600000) return fmt(Math.round(abs / 60000), 'min');
  if (abs < DAY_MS) return fmt(Math.round(abs / 3600000), 'h');
  if (abs < 30 * DAY_MS) {
    const d = Math.round(abs / DAY_MS);
    return fmt(d, d === 1 ? 'day' : 'days');
  }
  return new Date(time).toLocaleDateString();
};

export const formatPercent = (ratio) =>
  ratio === null || ratio === undefined ? '—' : `${Math.round(ratio * 100)}%`;
