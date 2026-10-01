import { checkAllowance, daysInYear, inclusiveDays } from './leaveBalance';

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
    'This request needs 6 days, but you only have 5 days of vacation leave left. Shorten it or ask HR about your allowance.'
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
