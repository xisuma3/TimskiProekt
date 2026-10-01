import { fireEvent, render, screen } from '@testing-library/react';
import DataPage from './DataPage';
import { matchesDate, matchesPerson, personOptions } from './listFilters';
import { authenticatedFetch } from '../services/authService';

jest.mock('../services/authService', () => ({ authenticatedFetch: jest.fn() }));

const leave = (id, name, start, end) => ({ requestID: id, employeeName: name, startDate: `${start}T00:00:00`, endDate: `${end}T00:00:00` });

describe('matchesDate', () => {
  const span = { startField: 'startDate', endField: 'endDate' };
  const req = leave('1', 'Ana', '2026-06-10', '2026-06-14');

  test('a span shows when it overlaps the range, inclusive at both ends', () => {
    expect(matchesDate(req, span, '2026-06-14', '')).toBe(true);
    expect(matchesDate(req, span, '', '2026-06-10')).toBe(true);
    expect(matchesDate(req, span, '2026-06-01', '2026-06-30')).toBe(true);
    expect(matchesDate(req, span, '2026-06-15', '')).toBe(false);
    expect(matchesDate(req, span, '', '2026-06-09')).toBe(false);
  });

  test('a single date and a whole year', () => {
    expect(matchesDate({ hireDate: '2020-03-01T00:00:00' }, { field: 'hireDate' }, '2020-01-01', '2020-12-31')).toBe(true);
    expect(matchesDate({ year: 2026 }, { yearField: 'year' }, '2026-12-01', '')).toBe(true);
    expect(matchesDate({ year: 2025 }, { yearField: 'year' }, '2026-01-01', '')).toBe(false);
  });

  test('no range means no filtering; a missing date never matches a range', () => {
    expect(matchesDate({}, { field: 'assignmentDate' }, '', '')).toBe(true);
    expect(matchesDate({ assignmentDate: null }, { field: 'assignmentDate' }, '2026-01-01', '')).toBe(false);
  });
});

test('person options are sorted, de-duplicated, with the empty bucket last', () => {
  const cfg = { field: 'employeeName', emptyLabel: 'In stock' };
  const items = [{ employeeName: 'Bob' }, { employeeName: null }, { employeeName: 'Ana' }, { employeeName: 'Bob' }];
  expect(personOptions(items, cfg)).toEqual(['Ana', 'Bob', 'In stock']);
  expect(matchesPerson({ employeeName: null }, cfg, 'In stock')).toBe(true);
  expect(matchesPerson({ employeeName: 'Ana' }, cfg, 'Bob')).toBe(false);
});

test('DataPage filters by date range and person together, and clears', async () => {
  authenticatedFetch.mockResolvedValue({
    ok: true,
    json: async () => [
      leave('1', 'Ana Trajkovska', '2026-06-10', '2026-06-14'),
      leave('2', 'Bob Smith', '2026-06-12', '2026-06-12'),
      leave('3', 'Ana Trajkovska', '2026-08-01', '2026-08-05'),
    ],
  });
  render(
    <DataPage
      title="Leave Requests"
      apiEndpoint="/x"
      searchFields={['employeeName']}
      renderCard={(r) => <div>{`${r.employeeName} #${r.requestID}`}</div>}
      dateFilter={{ label: 'Leave', startField: 'startDate', endField: 'endDate' }}
      personFilter={{ label: 'Employee', field: 'employeeName' }}
    />
  );
  expect(await screen.findByText('Ana Trajkovska #3')).toBeInTheDocument();

  fireEvent.change(screen.getByLabelText('Leave from'), { target: { value: '2026-06-01' } });
  fireEvent.change(screen.getByLabelText('Leave to'), { target: { value: '2026-06-30' } });
  expect(screen.queryByText('Ana Trajkovska #3')).not.toBeInTheDocument();
  expect(screen.getByText('Bob Smith #2')).toBeInTheDocument();

  fireEvent.change(screen.getByLabelText('Employee'), { target: { value: 'Ana Trajkovska' } });
  expect(screen.getByText('Ana Trajkovska #1')).toBeInTheDocument();
  expect(screen.queryByText('Bob Smith #2')).not.toBeInTheDocument();
  expect(screen.getAllByText('1 of 3 shown').length).toBeGreaterThan(0);

  fireEvent.click(screen.getAllByRole('button', { name: /Clear filters/ })[0]);
  expect(screen.getByText('Ana Trajkovska #3')).toBeInTheDocument();
  expect(screen.getByText('Bob Smith #2')).toBeInTheDocument();
});

test('the person filter is hidden when the list holds only one person', async () => {
  authenticatedFetch.mockResolvedValue({ ok: true, json: async () => [leave('1', 'Me', '2026-06-10', '2026-06-11'), leave('2', 'Me', '2026-07-01', '2026-07-02')] });
  render(
    <DataPage
      title="My Leave Requests"
      apiEndpoint="/x"
      renderCard={(r) => <div>{r.requestID}</div>}
      dateFilter={{ label: 'Leave', startField: 'startDate', endField: 'endDate' }}
      personFilter={{ label: 'Employee', field: 'employeeName' }}
    />
  );
  await screen.findByText('1');
  expect(screen.getByLabelText('Leave from')).toBeInTheDocument();
  expect(screen.queryByLabelText('Employee')).not.toBeInTheDocument();
});
