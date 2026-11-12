import { fireEvent, render, screen } from '@testing-library/react';
import LeaveCalendar, { layoutWeek, monthWeeks } from './LeaveCalendar';

const DAY = 24 * 60 * 60 * 1000;
const d = (s) => Math.floor(Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)) / DAY);
const req = (id, start, end, status = 'Approved', name = 'Ana Trajkovska') => ({
  requestID: id, employeeName: name, leaveType: 'Vacation', status,
  startDate: `${start}T00:00:00`, endDate: `${end}T00:00:00`, totalDays: 1,
});

test('weeks start on Monday and cover the whole month', () => {
  const weeks = monthWeeks(2026, 9); // October 2026 starts on a Thursday
  expect(weeks[0][0]).toBe(d('2026-09-28'));
  expect(weeks[0]).toContain(d('2026-10-01'));
  expect(weeks[weeks.length - 1]).toContain(d('2026-10-31'));
  weeks.forEach((w) => expect(w).toHaveLength(7));
});

test('a request is clipped to each week it crosses, and overlaps get their own lane', () => {
  const week = monthWeeks(2026, 9)[1]; // 5–11 Oct
  const segments = layoutWeek(week, [
    req('a', '2026-10-01', '2026-10-07'), // started the previous week
    req('b', '2026-10-06', '2026-10-08'), // overlaps a
    req('c', '2026-10-09', '2026-10-10'), // free lane again
  ]);
  const byId = Object.fromEntries(segments.map((s) => [s.r.requestID, s]));
  expect(byId.a.from).toBe(d('2026-10-05'));
  expect(byId.a.to).toBe(d('2026-10-07'));
  expect(byId.a.lane).toBe(0);
  expect(byId.b.lane).toBe(1);
  expect(byId.c.lane).toBe(0);
});

test('hides rejected leave until asked, and opens the request card on click', () => {
  const now = new Date();
  const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  render(
    <LeaveCalendar
      requests={[
        req('ok', `${ym}-10`, `${ym}-12`, 'Approved', 'Ana Trajkovska'),
        req('no', `${ym}-15`, `${ym}-15`, 'Rejected', 'Bob Smith'),
      ]}
      renderDetails={(r) => <div>Details for {r.employeeName}</div>}
    />
  );

  // May cross a week boundary, in which case it is drawn as one bar per week.
  expect(screen.getAllByRole('button', { name: /Ana Trajkovska, Vacation leave, Approved/ }).length).toBeGreaterThan(0);
  expect(screen.queryByRole('button', { name: /Bob Smith/ })).not.toBeInTheDocument();

  fireEvent.click(screen.getByLabelText('Show rejected'));
  expect(screen.getByRole('button', { name: /Bob Smith, Vacation leave, Rejected/ })).toBeInTheDocument();

  fireEvent.click(screen.getAllByRole('button', { name: /Ana Trajkovska/ })[0]);
  expect(screen.getByText('Details for Ana Trajkovska')).toBeInTheDocument();
});

test('month navigation moves between months', () => {
  render(<LeaveCalendar requests={[]} renderDetails={() => null} />);
  const title = () => screen.getByRole('heading', { level: 2 }).textContent;
  const start = title();
  fireEvent.click(screen.getByRole('button', { name: 'Next month' }));
  expect(title()).not.toBe(start);
  fireEvent.click(screen.getByRole('button', { name: 'Today' }));
  expect(title()).toBe(start);
});
