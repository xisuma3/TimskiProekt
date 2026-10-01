import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import ApprovalCoverPage from './ApprovalCoverPage';
import { authenticatedFetch } from '../services/authService';

let mockAdmin = false;
jest.mock('../services/authService', () => ({
  authenticatedFetch: jest.fn(),
  isAdmin: () => mockAdmin,
}));

const ok = (body) => Promise.resolve({ ok: true, status: 200, json: async () => body });
const fail = (status, body = {}) => Promise.resolve({ ok: false, status, json: async () => body });

const delegation = (id, over) => ({
  delegationID: id,
  delegatorEmployeeID: 'me',
  delegatorName: 'Mia Manager',
  delegateEmployeeID: 'pat',
  delegateName: 'Pat Peer',
  startDate: '2030-06-01T00:00:00',
  endDate: '2030-06-14T00:00:00',
  note: 'Away on holiday',
  status: 'Active',
  ...over,
});

const mockApi = ({ mine = [], all = [], employees = null, onCreate, onRevoke } = {}) =>
  authenticatedFetch.mockImplementation((url, options = {}) => {
    if (url.includes('GetMyProfile')) return ok({ employeeID: 'me' });
    if (url.includes('ApprovalDelegation/GetMine')) return ok(mine);
    if (url.includes('ApprovalDelegation/GetAll')) return ok(all);
    if (url.includes('Employee/GetDirectory')) return employees ? ok(employees) : fail(500);
    if (url.includes('ApprovalDelegation/Create')) return onCreate(JSON.parse(options.body));
    if (url.includes('ApprovalDelegation/Revoke')) return onRevoke(url);
    return fail(404);
  });

beforeEach(() => {
  authenticatedFetch.mockReset();
  mockAdmin = false;
});

test('splits cover I gave from cover I hold, with Revoke vs Decline', async () => {
  mockApi({
    mine: [
      delegation('given'),
      delegation('held', {
        delegatorEmployeeID: 'dana', delegatorName: 'Dana Director', delegateEmployeeID: 'me', delegateName: 'Mia Manager',
        status: 'Scheduled',
      }),
      delegation('old', { status: 'Ended' }),
    ],
  });
  render(<ApprovalCoverPage />);

  const given = await screen.findByRole('region', { name: 'Covering for me' });
  const held = screen.getByRole('region', { name: "I'm covering" });
  expect(within(given).getAllByText('Pat Peer covers Mia Manager')).toHaveLength(2); // active + ended
  expect(within(given).getAllByRole('button', { name: /Revoke/ })).toHaveLength(1); // Ended has no action
  expect(within(held).getByText('Mia Manager covers Dana Director')).toBeInTheDocument();
  expect(within(held).getByRole('button', { name: /Decline/ })).toBeInTheDocument();
  expect(screen.queryByRole('region', { name: 'All delegations' })).not.toBeInTheDocument();
});

test('a manager (non-admin) can pick their own cover from the directory', async () => {
  mockApi({ employees: [
    { employeeID: 'me', name: 'Mia Manager', position: 'Team Lead' },
    { employeeID: 'pat', name: 'Pat Peer', position: 'Engineer' },
  ] });
  render(<ApprovalCoverPage />);
  await screen.findByRole('region', { name: 'Covering for me' });
  fireEvent.click(screen.getByRole('button', { name: /Arrange cover/ }));

  const delegateSelect = await screen.findByLabelText('Covered by *');
  expect(within(delegateSelect).getByRole('option', { name: 'Pat Peer · Engineer' })).toBeInTheDocument();
  // Nobody covers themselves, and only admins act on behalf of someone else.
  expect(within(delegateSelect).queryByRole('option', { name: /Mia Manager/ })).not.toBeInTheDocument();
  expect(screen.queryByLabelText('On behalf of')).not.toBeInTheDocument();
});

test('if the directory can not be loaded the form explains instead of an empty picker', async () => {
  mockApi();
  render(<ApprovalCoverPage />);
  await screen.findByRole('region', { name: 'Covering for me' });
  fireEvent.click(screen.getByRole('button', { name: /Arrange cover/ }));
  expect(await screen.findByText('Directory unavailable')).toBeInTheDocument();
});

test('an admin arranges cover on behalf of a manager and sees server errors', async () => {
  mockAdmin = true;
  const onCreate = jest.fn()
    .mockReturnValueOnce(fail(409, { message: 'There is already a delegation covering 2030-06-01 to 2030-06-14. Revoke it first.' }))
    .mockReturnValueOnce(ok(delegation('new')));
  mockApi({
    employees: [
      { employeeID: 'mia', name: 'Mia Manager' },
      { employeeID: 'pat', name: 'Pat Peer' },
    ],
    onCreate,
  });
  render(<ApprovalCoverPage />);
  expect(await screen.findByRole('region', { name: 'All delegations' })).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: /Arrange cover/ }));
  fireEvent.change(await screen.findByLabelText('On behalf of'), { target: { value: 'mia' } });
  const delegateSelect = screen.getByLabelText('Covered by *');
  // The delegator can't be chosen to cover themselves.
  expect(within(delegateSelect).queryByRole('option', { name: 'Mia Manager' })).not.toBeInTheDocument();
  fireEvent.change(delegateSelect, { target: { value: 'pat' } });

  const save = () => fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Arrange cover' }));
  save();
  expect(await screen.findByText(/choose the first and last day/)).toBeInTheDocument();
  expect(onCreate).not.toHaveBeenCalled();
});

test('revoking asks for confirmation, then calls the API', async () => {
  const onRevoke = jest.fn(() => Promise.resolve({ ok: true, status: 204, json: async () => ({}) }));
  mockApi({ mine: [delegation('given')], onRevoke });
  render(<ApprovalCoverPage />);

  fireEvent.click(await screen.findByRole('button', { name: /Revoke/ }));
  const dialog = await screen.findByRole('dialog');
  expect(dialog).toHaveTextContent("End Pat Peer's cover of Mia Manager's approvals now?");
  fireEvent.click(within(dialog).getByRole('button', { name: 'Revoke' }));
  await waitFor(() => expect(onRevoke).toHaveBeenCalledWith(expect.stringContaining('/Revoke/given')));
});
