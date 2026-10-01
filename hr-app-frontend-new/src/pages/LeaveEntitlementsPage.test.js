import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import LeaveEntitlementsPage from './LeaveEntitlementsPage';
import { authenticatedFetch } from '../services/authService';

jest.mock('../services/authService', () => ({ authenticatedFetch: jest.fn() }));
jest.mock('../components/LeaveEntitlementModal', () => ({ item, onSave }) => (
  <div data-testid="allowance-modal">
    {item ? `edit:${item.entitlementID}` : 'create'}
    <button onClick={onSave}>Save allowance</button>
  </div>
));

test('wires allowance create, edit, delete, and refresh through DataPage', async () => {
  const entitlement = {
    entitlementID: 'allowance-1',
    employeeID: 'employee-1',
    employeeName: 'Ada Lovelace',
    year: 2024,
    leaveType: 'Vacation',
    daysAllocated: 20,
    daysCarriedOver: 0,
    totalAvailable: 20,
  };
  authenticatedFetch.mockImplementation((url, options = {}) => {
    if (options.method === 'DELETE') return Promise.resolve({ ok: true });
    return Promise.resolve({
      ok: true,
      json: async () => url.includes('Employee') ? [{ employeeID: 'employee-1', firstName: 'Ada', lastName: 'Lovelace' }] : [entitlement],
    });
  });

  const { container } = render(<LeaveEntitlementsPage />);
  expect(await screen.findByText('Ada Lovelace')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'New Allowance' }));
  expect(screen.getByTestId('allowance-modal')).toHaveTextContent('create');
  fireEvent.click(screen.getByRole('button', { name: 'Save allowance' }));

  await waitFor(() => expect(authenticatedFetch).toHaveBeenCalledTimes(3));
  await waitFor(() => expect(container.querySelector('.btn-outline-primary')).not.toBeNull());
  fireEvent.click(container.querySelector('.btn-outline-primary'));
  expect(screen.getByTestId('allowance-modal')).toHaveTextContent('edit:allowance-1');

  fireEvent.click(container.querySelector('.btn-outline-danger'));
  fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
  await waitFor(() => expect(authenticatedFetch).toHaveBeenCalledWith(
    expect.any(String),
    { method: 'DELETE' }
  ));
});
