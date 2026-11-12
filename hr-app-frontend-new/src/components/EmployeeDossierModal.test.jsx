import { fireEvent, render, screen } from '@testing-library/react';
import EmployeeDossierModal from './EmployeeDossierModal';
import { authenticatedFetch } from '../services/authService';

vi.mock('../services/authService', () => ({ authenticatedFetch: vi.fn() }));

const dossier = { dossierID: 'd1', employeeID: 'e1', employmentType: 'Full-Time' };
const employees = [{ employeeID: 'e1', firstName: 'Ada', lastName: 'Lovelace' }];

beforeEach(() => {
  authenticatedFetch.mockReset();
});

const submit = () => {
  render(<EmployeeDossierModal show onHide={() => {}} onSave={() => {}} dossier={dossier} employees={employees} />);
  fireEvent.click(screen.getByRole('button', { name: 'Update' }));
};

test('shows a useful message when an error response has no JSON body', async () => {
  authenticatedFetch.mockResolvedValue({ ok: false, status: 500, text: async () => '' });
  submit();
  expect(await screen.findByText('Failed to update dossier')).toBeInTheDocument();
});

test('shows the API message when the error response carries one', async () => {
  authenticatedFetch.mockResolvedValue({ ok: false, status: 400, text: async () => '{"message":"Employee already has a dossier"}' });
  submit();
  expect(await screen.findByText('Employee already has a dossier')).toBeInTheDocument();
});
