import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import CarryOverModal from './CarryOverModal';
import { authenticatedFetch } from '../services/authService';

jest.mock('../services/authService', () => ({ authenticatedFetch: jest.fn() }));

const results = [
  { employeeID: 'e1', employeeName: 'Ana Trajkovska', leaveType: 'Vacation', unusedDays: 8, carriedDays: 5, action: 'Created', note: 'New 2026 allowance of 20 days (upfront).' },
  { employeeID: 'e2', employeeName: 'Bob Smith', leaveType: 'Vacation', unusedDays: 0, carriedDays: 0, action: 'Skipped', note: '14 days are already booked in 2026.' },
];

beforeEach(() => {
  authenticatedFetch.mockReset();
  jest.spyOn(window, 'confirm').mockReturnValue(true);
});
afterEach(() => window.confirm.mockRestore());

test('apply is only possible after a preview, and sends the chosen options', async () => {
  authenticatedFetch.mockResolvedValue({ ok: true, json: async () => results });
  const onApplied = jest.fn();
  render(<CarryOverModal show onHide={() => {}} onApplied={onApplied} />);

  expect(screen.getByRole('button', { name: 'Apply carry-over' })).toBeDisabled();

  fireEvent.change(screen.getByLabelText('Max days to carry'), { target: { value: '3' } });
  fireEvent.click(screen.getByLabelText('Sick'));
  fireEvent.click(screen.getByRole('button', { name: 'Preview' }));

  expect(await screen.findByText('Ana Trajkovska')).toBeInTheDocument();
  expect(screen.getByText(/Preview — nothing has been saved yet/)).toHaveTextContent('1 created · 1 skipped · 5 days carried in total');
  const previewBody = JSON.parse(authenticatedFetch.mock.calls[0][1].body);
  expect(previewBody).toMatchObject({ maxDays: 3, leaveTypes: ['Vacation', 'Sick'], preview: true });
  expect(onApplied).not.toHaveBeenCalled();

  fireEvent.click(screen.getByRole('button', { name: 'Apply carry-over' }));
  await waitFor(() => expect(onApplied).toHaveBeenCalled());
  expect(JSON.parse(authenticatedFetch.mock.calls[1][1].body).preview).toBe(false);
  expect(screen.getByText(/^Applied\./)).toBeInTheDocument();
});

test('changing an option discards the preview', async () => {
  authenticatedFetch.mockResolvedValue({ ok: true, json: async () => results });
  render(<CarryOverModal show onHide={() => {}} onApplied={() => {}} />);
  fireEvent.click(screen.getByRole('button', { name: 'Preview' }));
  await screen.findByText('Ana Trajkovska');

  fireEvent.change(screen.getByLabelText('From year'), { target: { value: '2024' } });
  expect(screen.queryByText('Ana Trajkovska')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Apply carry-over' })).toBeDisabled();
});

test('shows the API error inline', async () => {
  authenticatedFetch.mockResolvedValue({ ok: false, json: async () => ({ message: "The carry-over cap can't be negative." }) });
  render(<CarryOverModal show onHide={() => {}} onApplied={() => {}} />);
  fireEvent.click(screen.getByRole('button', { name: 'Preview' }));
  expect(await screen.findByText("The carry-over cap can't be negative.")).toBeInTheDocument();
});

test('needs at least one leave type', async () => {
  render(<CarryOverModal show onHide={() => {}} onApplied={() => {}} />);
  fireEvent.click(screen.getByLabelText('Vacation'));
  fireEvent.click(screen.getByRole('button', { name: 'Preview' }));
  expect(await screen.findByText('Choose at least one leave type.')).toBeInTheDocument();
  expect(authenticatedFetch).not.toHaveBeenCalled();
});
