import { render, screen } from '@testing-library/react';
import ErasureLogCard from './ErasureLogCard';
import { authenticatedFetch } from '../services/authService';

jest.mock('../services/authService', () => ({ authenticatedFetch: jest.fn(), isAdmin: () => true }));

const record = (id, performedAt, reason) => ({
  erasureRecordID: id,
  employeeID: `${id}-employee-0000-0000`,
  performedByEmployeeID: 'admin-id',
  performedByName: 'System Administrator',
  performedAt,
  requestedBy: 'The employee, by email',
  requestReceivedAt: null,
  reason,
});

beforeEach(() => authenticatedFetch.mockReset());

test('lists erasures newest first with who, why and the erased record id', async () => {
  authenticatedFetch.mockResolvedValue({
    ok: true,
    json: async () => [
      record('aaaaaaaa', '2026-09-01T10:00:00', 'Older request'),
      { ...record('bbbbbbbb', '2026-10-01T09:30:00', 'Art. 17 request'), requestReceivedAt: '2026-09-28T00:00:00' },
    ],
  });
  render(<ErasureLogCard />);

  const reasons = await screen.findAllByText(/request$/);
  expect(reasons.map((r) => r.textContent)).toEqual(['Art. 17 request', 'Older request']);
  expect(screen.getAllByText('System Administrator')).toHaveLength(2);
  expect(screen.getAllByText('The employee, by email')).toHaveLength(2);
  expect(screen.getByTitle('bbbbbbbb-employee-0000-0000')).toHaveTextContent('bbbbbbbb…');
  expect(screen.getAllByText('—').length).toBeGreaterThan(0); // no received date on the older one
});

test('shows an empty state when nothing has been erased', async () => {
  authenticatedFetch.mockResolvedValue({ ok: true, json: async () => [] });
  render(<ErasureLogCard />);
  expect(await screen.findByText('No erasures have been performed.')).toBeInTheDocument();
});

test('says so when the log cannot be loaded', async () => {
  authenticatedFetch.mockResolvedValue({ ok: false, status: 500, json: async () => ({}) });
  render(<ErasureLogCard />);
  expect(await screen.findByText('Erasure log unavailable')).toBeInTheDocument();
});
