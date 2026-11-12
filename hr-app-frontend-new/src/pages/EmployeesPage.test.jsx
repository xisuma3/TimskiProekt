import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { TooltipProvider } from '@/components/ui/tooltip';
import EmployeesPage from './EmployeesPage';
import { authenticatedFetch } from '../services/authService';

vi.mock('../services/authService', () => ({ authenticatedFetch: vi.fn() }));

const ada = { employeeID: 'e1', firstName: 'Ada', lastName: 'Lovelace', position: 'Engineer', hireDate: '2020-01-01' };
const alan = { employeeID: 'e2', firstName: 'Alan', lastName: 'Turing', position: 'Analyst', hireDate: '2021-01-01' };

let alertSpy;
let consoleError;
beforeEach(() => {
  authenticatedFetch.mockReset();
  alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
  consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  alertSpy.mockRestore();
  consoleError.mockRestore();
});

// The app shell provides the TooltipProvider the card actions need.
const renderPage = () => render(<TooltipProvider><EmployeesPage /></TooltipProvider>);

const retire = async (name) => {
  fireEvent.click(await screen.findByRole('button', { name: `Retire ${name}` }));
  const dialog = await screen.findByRole('alertdialog');
  fireEvent.click(within(dialog).getByRole('button', { name: 'Retire' }));
  return dialog;
};

test('refetches the directory after retiring someone', async () => {
  let employees = [ada, alan];
  authenticatedFetch.mockImplementation((url, options = {}) => {
    if (options.method === 'DELETE') {
      employees = employees.filter((e) => e.employeeID !== 'e1');
      return Promise.resolve({ ok: true });
    }
    return Promise.resolve({ ok: true, json: async () => (url.includes('Department') ? [] : employees) });
  });

  renderPage();
  await retire('Ada Lovelace');

  await waitFor(() => expect(screen.queryByText('Ada Lovelace')).not.toBeInTheDocument());
  expect(screen.getByText('Alan Turing')).toBeInTheDocument();
  expect(alertSpy).not.toHaveBeenCalled();
});

test('shows a failed retire inline, with a fallback when the response has no body', async () => {
  authenticatedFetch.mockImplementation((url, options = {}) => (options.method === 'DELETE'
    ? Promise.resolve({ ok: false, status: 500, text: async () => '' })
    : Promise.resolve({ ok: true, json: async () => (url.includes('Department') ? [] : [ada]) })));

  renderPage();
  const dialog = await retire('Ada Lovelace');

  expect(await within(dialog).findByText('Failed to retire employee')).toBeInTheDocument();
  expect(alertSpy).not.toHaveBeenCalled();
});
