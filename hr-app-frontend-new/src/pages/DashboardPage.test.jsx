import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import DashboardPage from './DashboardPage';
import { authenticatedFetch } from '../services/authService';

vi.mock('../services/authService', () => ({
  authenticatedFetch: vi.fn(),
  isAdmin: () => true,
}));

const ok = (body) => Promise.resolve({ ok: true, status: 200, json: async () => body });

const renderPage = () => render(<MemoryRouter><DashboardPage /></MemoryRouter>);

let consoleError;
beforeEach(() => {
  authenticatedFetch.mockReset();
  consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  consoleError.mockRestore();
});

test('shows an error with a retry instead of zeros when a fetch is refused', async () => {
  authenticatedFetch.mockImplementation((url) => (url.includes('LeaveRequest')
    ? Promise.resolve({ ok: false, status: 403, json: async () => ({}) })
    : ok([])));

  renderPage();

  expect(await screen.findByText('Failed to load dashboard data (HTTP 403).')).toBeInTheDocument();
  expect(screen.queryByText('Total Employees')).not.toBeInTheDocument();

  authenticatedFetch.mockImplementation((url) => ok(url.includes('Employee') ? [{ employeeID: '1' }] : []));
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }));

  expect(await screen.findByText('Total Employees')).toBeInTheDocument();
  expect(screen.queryByText(/Failed to load dashboard data/)).not.toBeInTheDocument();
});

test('lists recent requests newest first without reordering the fetched array', async () => {
  const leaveRequests = [
    { requestID: 'a', employeeName: 'Older Person', leaveType: 'Vacation', status: 'Approved', createdAt: '2024-01-01', startDate: '2024-02-01', endDate: '2024-02-02' },
    { requestID: 'b', employeeName: 'Newer Person', leaveType: 'Sick', status: 'Pending', createdAt: '2024-03-01', startDate: '2024-04-01', endDate: '2024-04-02' },
  ];
  authenticatedFetch.mockImplementation((url) => ok(url.includes('LeaveRequest') ? leaveRequests : []));

  renderPage();

  const newer = await screen.findByText('Newer Person');
  const older = screen.getByText('Older Person');
  expect(newer.compareDocumentPosition(older) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(leaveRequests.map((r) => r.requestID)).toEqual(['a', 'b']);
});
