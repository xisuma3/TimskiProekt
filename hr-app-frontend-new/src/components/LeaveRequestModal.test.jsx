import { fireEvent, render, screen } from '@testing-library/react';
import LeaveRequestModal from './LeaveRequestModal';
import { authenticatedFetch } from '../services/authService';

vi.mock('../services/authService', () => ({
  authenticatedFetch: vi.fn(),
  getUserInfo: () => ({ employeeId: 'me' }),
  isAdmin: () => false,
}));

beforeEach(() => {
  authenticatedFetch.mockReset();
  authenticatedFetch.mockResolvedValue({ ok: true, json: async () => [] });
});

test('a submit error goes away once the form is edited', async () => {
  render(<LeaveRequestModal show onHide={() => {}} onSave={() => {}} />);

  fireEvent.click(screen.getByRole('button', { name: 'Submit Request' }));
  expect(await screen.findByText(/Please choose/)).toBeInTheDocument();

  fireEvent.change(screen.getByLabelText(/Leave Type/), { target: { value: 'Vacation' } });
  expect(screen.queryByText(/Please choose/)).not.toBeInTheDocument();
});
