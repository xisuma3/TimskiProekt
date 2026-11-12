import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import AssetModal from './AssetModal';
import { authenticatedFetch } from '../services/authService';

vi.mock('../services/authService', () => ({ authenticatedFetch: vi.fn() }));

const employees = [
  { employeeID: 'e1', firstName: 'Ada', lastName: 'Lovelace' },
  { employeeID: 'e2', firstName: 'Alan', lastName: 'Turing' },
];

beforeEach(() => {
  authenticatedFetch.mockReset();
  authenticatedFetch.mockResolvedValue({ ok: true });
});

test('offers an initial holder when creating, and sends it', async () => {
  render(<AssetModal show onHide={() => {}} onSave={() => {}} employees={employees} />);

  fireEvent.change(screen.getByLabelText('Asset Name *'), { target: { value: 'Laptop' } });
  fireEvent.change(screen.getByLabelText('Description *'), { target: { value: 'ThinkPad' } });
  fireEvent.change(screen.getByLabelText('Assigned To'), { target: { value: 'e2' } });
  fireEvent.click(screen.getByRole('button', { name: 'Create' }));

  await waitFor(() => expect(authenticatedFetch).toHaveBeenCalled());
  expect(JSON.parse(authenticatedFetch.mock.calls[0][1].body).employeeID).toBe('e2');
});

test('shows the holder read-only when editing and points to the Custody action', () => {
  const asset = {
    assetID: 'a1', name: 'Laptop', description: 'ThinkPad', isActive: true,
    employeeID: 'e1', employeeName: 'Ada Lovelace', isAssigned: true,
  };
  render(<AssetModal show onHide={() => {}} onSave={() => {}} asset={asset} employees={employees} />);

  expect(screen.queryByLabelText('Assigned To')).not.toBeInTheDocument();
  const holder = screen.getByLabelText('Held by');
  expect(holder).toHaveValue('Ada Lovelace');
  expect(holder).toBeDisabled();
  expect(screen.getByText(/use the Custody action/)).toBeInTheDocument();
});

test('shows an unassigned asset as in stock when editing', () => {
  const asset = { assetID: 'a2', name: 'Monitor', description: '24 inch', isActive: true, isAssigned: false };
  render(<AssetModal show onHide={() => {}} onSave={() => {}} asset={asset} employees={employees} />);
  expect(screen.getByLabelText('Held by')).toHaveValue('In stock');
});
