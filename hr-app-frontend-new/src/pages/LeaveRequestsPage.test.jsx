import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import LeaveRequestsPage from './LeaveRequestsPage';
import { authenticatedFetch } from '../services/authService';

vi.mock('../services/authService', () => ({
  authenticatedFetch: vi.fn(),
  isAdmin: () => true,
}));

const pending = {
  requestID: 'r1', employeeID: 'e1', employeeName: 'Ada Lovelace', leaveType: 'Vacation', status: 'Pending',
  startDate: '2024-05-01', endDate: '2024-05-03', totalDays: 3, createdAt: '2024-04-01',
};

let requests;
let decide;
let promptSpy;
let alertSpy;
let consoleError;
beforeEach(() => {
  localStorage.clear();
  requests = [pending];
  decide = vi.fn(async (url, options) => {
    requests = [{ ...pending, status: url.includes('reject') ? 'Rejected' : 'Approved' }];
    return { ok: true, options };
  });
  authenticatedFetch.mockReset();
  authenticatedFetch.mockImplementation((url, options = {}) => {
    if (options.method === 'PUT') return decide(url, options);
    if (url.includes('/Employee/')) return Promise.resolve({ ok: true, json: async () => [] });
    return Promise.resolve({ ok: true, json: async () => requests });
  });
  promptSpy = vi.spyOn(window, 'prompt').mockImplementation(() => null);
  alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
  consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  promptSpy.mockRestore();
  alertSpy.mockRestore();
  consoleError.mockRestore();
});

const openReject = async () => {
  fireEvent.click(await screen.findByRole('button', { name: 'Reject' }));
  return screen.findByRole('dialog', { name: 'Reject Leave Request' });
};

test('rejects through a dialog with an optional reason, then refetches the list', async () => {
  render(<LeaveRequestsPage />);
  const dialog = await openReject();
  expect(promptSpy).not.toHaveBeenCalled();
  expect(dialog).toHaveTextContent('Reject 3-day vacation leave for Ada Lovelace?');

  fireEvent.change(within(dialog).getByLabelText('Reason (optional)'), { target: { value: 'Busy sprint' } });
  fireEvent.click(within(dialog).getByRole('button', { name: 'Reject' }));

  await waitFor(() => expect(decide).toHaveBeenCalledTimes(1));
  const [url, options] = decide.mock.calls[0];
  expect(url).toMatch(/Reject\/r1\/reject$/);
  expect(JSON.parse(options.body)).toEqual({ reason: 'Busy sprint' });
  expect(await screen.findByText('Rejected')).toBeInTheDocument();
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

test('sends a null reason when none is given, like Approve', async () => {
  render(<LeaveRequestsPage />);
  const dialog = await openReject();
  fireEvent.click(within(dialog).getByRole('button', { name: 'Reject' }));

  await waitFor(() => expect(decide).toHaveBeenCalledTimes(1));
  expect(JSON.parse(decide.mock.calls[0][1].body)).toEqual({ reason: null });
});

test('cancelling the reject dialog sends nothing', async () => {
  render(<LeaveRequestsPage />);
  const dialog = await openReject();
  fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));

  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  expect(decide).not.toHaveBeenCalled();
});

test('shows a refused decision in the dialog instead of alert()', async () => {
  decide.mockResolvedValue({ ok: false, status: 409, text: async () => '{"message":"Only a pending request can be decided."}' });
  render(<LeaveRequestsPage />);

  fireEvent.click(await screen.findByRole('button', { name: 'Approve' }));
  const dialog = await screen.findByRole('dialog', { name: 'Approve Leave Request' });
  fireEvent.click(within(dialog).getByRole('button', { name: 'Approve' }));

  expect(await within(dialog).findByText('Only a pending request can be decided.')).toBeInTheDocument();
  expect(alertSpy).not.toHaveBeenCalled();
});
