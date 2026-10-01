import {
  approvalRate,
  approvedDaysPerMonth,
  dataQualityChecks,
  daysInRange,
  headcountByDepartment,
  humanizeDuration,
  leaveDays,
  medianDecisionMs,
  niceTicks,
  periodRange,
  recentActivity,
  serviceState,
  splitDaysByMonth,
} from './analyticsData';

const NOW = new Date(2026, 9, 15); // 15 Oct 2026

test('leave days count inclusively, same-day leave is one day', () => {
  expect(leaveDays({ startDate: '2026-03-02T00:00:00', endDate: '2026-03-02T00:00:00' })).toBe(1);
  expect(leaveDays({ startDate: '2026-03-02', endDate: '2026-03-06' })).toBe(5);
  expect(leaveDays({ startDate: '2026-03-06', endDate: '2026-03-02' })).toBe(0);
});

test('a request spanning a month boundary is split by day', () => {
  expect(splitDaysByMonth({ startDate: '2026-01-29', endDate: '2026-02-03' })).toEqual({
    '2026-01': 3,
    '2026-02': 3,
  });
  // Across New Year too.
  expect(splitDaysByMonth({ startDate: '2025-12-31', endDate: '2026-01-01' })).toEqual({
    '2025-12': 1,
    '2026-01': 1,
  });
});

test('approved days per month covers the last 12 months and only approved requests', () => {
  const months = approvedDaysPerMonth(
    [
      { status: 'Approved', startDate: '2026-09-29', endDate: '2026-10-02' },
      { status: 'Pending', startDate: '2026-10-05', endDate: '2026-10-09' },
      { status: 'Approved', startDate: '2024-01-01', endDate: '2024-01-05' }, // outside window
    ],
    NOW
  );
  expect(months).toHaveLength(12);
  expect(months[11]).toMatchObject({ fullLabel: 'Oct 2026', value: 2 });
  expect(months[10]).toMatchObject({ fullLabel: 'Sep 2026', value: 2 });
  expect(months.reduce((s, m) => s + m.value, 0)).toBe(4);
});

test('days in range clips a request to the period', () => {
  const range = periodRange('year', NOW);
  expect(daysInRange({ startDate: '2025-12-30', endDate: '2026-01-02' }, range)).toBe(2);
  expect(daysInRange({ startDate: '2025-12-30', endDate: '2026-01-02' }, null)).toBe(4);
});

test('approval rate is null when nothing has been decided', () => {
  expect(approvalRate([{ status: 'Pending' }])).toBeNull();
  expect(approvalRate([])).toBeNull();
  expect(approvalRate([{ status: 'Approved' }, { status: 'Approved' }, { status: 'Rejected' }, { status: 'Pending' }]))
    .toBeCloseTo(2 / 3);
});

test('median decision time and its humanised form', () => {
  const h = 3600000;
  const reqs = [
    { createdAt: '2026-01-01T00:00:00', decisionAt: '2026-01-01T02:00:00' },
    { createdAt: '2026-01-01T00:00:00', decisionAt: '2026-01-01T04:00:00' },
    { createdAt: '2026-01-01T00:00:00' },
  ];
  expect(medianDecisionMs(reqs)).toBe(3 * h);
  expect(medianDecisionMs([])).toBeNull();
  expect(humanizeDuration(3 * h)).toBe('3 h');
  expect(humanizeDuration(5 * 24 * h)).toBe('5 days');
  expect(humanizeDuration(null)).toBe('—');
});

test('headcount buckets employees without a department', () => {
  expect(headcountByDepartment([
    { departmentName: 'IT' }, { departmentName: 'IT' }, { departmentName: null },
  ])).toEqual([{ label: 'IT', value: 2 }, { label: 'No department', value: 1 }]);
});

test('data-quality checks count problems and mark unavailable sources', () => {
  const employees = [
    { employeeID: 'a', departmentID: 'd1', managerID: 'm' },
    { employeeID: 'b', departmentID: null, managerID: null },
  ];
  const checks = dataQualityChecks(
    {
      employees,
      dossiers: [{ employeeID: 'a' }],
      entitlements: [{ employeeID: 'a', year: 2026 }, { employeeID: 'b', year: 2025 }],
      requests: [
        { status: 'Pending', createdAt: '2026-10-01T09:00:00' }, // 14 days old
        { status: 'Pending', createdAt: '2026-10-12T09:00:00' },
        { status: 'Approved', createdAt: '2026-01-01T09:00:00' },
      ],
      assets: [
        { isActive: true, employeeID: null, serialNumber: '' },
        { isActive: true, employeeID: 'a', serialNumber: 'SN1' },
      ],
      templates: null,
    },
    NOW
  );
  const byId = Object.fromEntries(checks.map((c) => [c.id, c.count]));
  expect(byId).toEqual({
    'no-department': 1,
    'no-manager': 1,
    'no-dossier': 1,
    'no-allowance': 1,
    'stale-pending': 1,
    'no-serial': 1,
    'in-stock': 1,
    'unused-templates': null,
  });
});

test('recent activity is newest first and includes decisions with the approver', () => {
  const items = recentActivity({
    requests: [{
      requestID: 'r1', employeeName: 'Ada', leaveType: 'Vacation', status: 'Approved',
      startDate: '2026-02-02', endDate: '2026-02-03',
      createdAt: '2026-01-10T10:00:00', decisionAt: '2026-01-11T10:00:00', approvedByName: 'Grace',
    }],
    employees: [{ employeeID: 'e1', firstName: 'Alan', lastName: 'Turing', hireDate: '2020-05-01' }],
    documents: null,
    assets: null,
  });
  expect(items.map((i) => i.kind)).toEqual(['leave-approved', 'leave-submitted', 'hire']);
  expect(items[0].title).toBe("Grace approved Ada's leave");
});

test('service state and axis ticks', () => {
  expect(serviceState({ ok: true, ms: 120 })).toBe('ok');
  expect(serviceState({ ok: true, ms: 1200 })).toBe('slow');
  expect(serviceState({ ok: false, ms: 50 })).toBe('error');
  expect(niceTicks(17)).toEqual([0, 5, 10, 15, 20]);
  expect(niceTicks(0)).toEqual([0, 1]);
});
