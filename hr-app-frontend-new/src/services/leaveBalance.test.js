import { asOfForYear, checkAllowance, daysInYear, inclusiveDays } from './leaveBalance';

const bal = (leaveType, totalAvailable, daysRemaining, isTracked = true) => ({
  leaveType, isTracked, totalAvailable, daysRemaining,
});

test('counts days inclusively and splits across New Year', () => {
  expect(inclusiveDays('2026-06-10', '2026-06-10')).toBe(1);
  expect(daysInYear('2026-12-30', '2027-01-02', 2026)).toBe(2);
  expect(daysInYear('2026-12-30', '2027-01-02', 2027)).toBe(2);
});

test('no allowance for the type blocks the request', () => {
  const r = checkAllowance({ 2026: [bal('Vacation', 20, 20)] }, '2026-06-01', '2026-06-03', 'Sick');
  expect(r.ok).toBe(false);
  expect(r.reason).toBe('none');
  expect(r.message).toMatch(/don't have a sick leave allowance for 2026/);
});

test('an untracked row counts as no allowance', () => {
  const r = checkAllowance({ 2026: [bal('Vacation', 0, 0, false)] }, '2026-06-01', '2026-06-01', 'Vacation');
  expect(r.reason).toBe('none');
});

test('5 days left and 6 requested is refused with a warning', () => {
  const r = checkAllowance({ 2026: [bal('Vacation', 20, 5)] }, '2026-06-01', '2026-06-06', 'Vacation');
  expect(r.ok).toBe(false);
  expect(r.reason).toBe('short');
  expect(r.message).toBe(
    "This request needs 6 days, but you'll only have 5 days of vacation leave left. Shorten it or ask HR about your allowance."
  );
});

test('exactly the remaining days is allowed', () => {
  const r = checkAllowance({ 2026: [bal('Vacation', 20, 5)] }, '2026-06-01', '2026-06-05', 'Vacation');
  expect(r.ok).toBe(true);
  expect(r.message).toBe("Uses 5 days of vacation leave. You'll have 0 days left in 2026 after this request.");
});

test('a New Year request needs an allowance in both years', () => {
  const r = checkAllowance({ 2026: [bal('Vacation', 20, 20)], 2027: [] }, '2026-12-30', '2027-01-02', 'Vacation');
  expect(r.reason).toBe('none');
  expect(r.message).toMatch(/for 2027/);
});

const monthly = (leaveType, allocated, accrued, remaining, carried = 0) => ({
  leaveType, isTracked: true, accrualMethod: 'Monthly',
  daysAllocated: allocated, daysAccrued: accrued, daysCarriedOver: carried,
  totalAvailable: allocated + carried, daysRemaining: remaining,
});

test('asOf is the request\'s last day within each year', () => {
  expect(asOfForYear('2026-06-10', 2026)).toBe('2026-06-10');
  expect(asOfForYear('2027-01-03', 2026)).toBe('2026-12-31');
  expect(asOfForYear('2027-01-03', 2027)).toBe('2027-01-03');
});

test('monthly accrual: a request beyond what will have accrued explains the accrual', () => {
  // 12 days a year, monthly; by 24 April 4 have accrued.
  const r = checkAllowance({ 2026: [monthly('Vacation', 12, 4, 4)] }, '2026-04-20', '2026-04-24', 'Vacation');
  expect(r.ok).toBe(false);
  expect(r.reason).toBe('short');
  expect(r.message).toMatch(/you'll only have 4 days of vacation leave left by/);
  expect(r.message).toMatch(/accrues monthly — 4 days will have accrued by then/);
});

test('monthly accrual: fits what will have accrued by the leave', () => {
  const r = checkAllowance({ 2026: [monthly('Vacation', 12, 10, 10)] }, '2026-10-01', '2026-10-07', 'Vacation');
  expect(r.ok).toBe(true);
  expect(r.message).toMatch(/3 days left in 2026 as of/);
});

test('a fully accrued monthly allowance reads like an upfront one', () => {
  const r = checkAllowance({ 2026: [monthly('Vacation', 12, 12, 1)] }, '2026-12-28', '2026-12-29', 'Vacation');
  expect(r.reason).toBe('short');
  expect(r.message).not.toMatch(/accrues monthly/);
});