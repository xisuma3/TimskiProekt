import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import DepartmentsPage from './DepartmentsPage';
import { authenticatedFetch } from '../services/authService';

vi.mock('../services/authService', () => ({ authenticatedFetch: vi.fn() }));

test('filters departments by their name without requiring departmentName', async () => {
  authenticatedFetch.mockResolvedValue({
    ok: true,
    json: async () => [
      { departmentID: '1', name: 'Engineering', description: 'Builds products' },
      { departmentID: '2', name: 'Finance', description: 'Manages budgets' },
    ],
  });

  render(<DepartmentsPage />);

  expect(await screen.findByText('Engineering')).toBeInTheDocument();
  fireEvent.change(screen.getByPlaceholderText('Search departments...'), {
    target: { value: 'engineer' },
  });

  expect(screen.getByText('Engineering')).toBeInTheDocument();
  expect(screen.queryByText('Finance')).not.toBeInTheDocument();
});

test('delete confirmation shows the selected department\'s real name', async () => {
  authenticatedFetch.mockResolvedValue({
    ok: true,
    json: async () => [
      { departmentID: '1', name: 'Engineering', description: 'Builds products' },
    ],
  });

  render(<DepartmentsPage />);
  expect(await screen.findByText('Engineering')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Delete Engineering' }));

  expect(await screen.findByText('Confirm Delete')).toBeInTheDocument();
  expect(document.body.textContent).toContain('delete department "Engineering"?');
});

describe('deleting a department', () => {
  let alertSpy;
  beforeEach(() => {
    authenticatedFetch.mockReset();
    alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
  });
  afterEach(() => {
    alertSpy.mockRestore();
  });

  const list = (items) => ({ ok: true, json: async () => items });

  test('refetches the list after a successful delete instead of reloading', async () => {
    let departments = [{ departmentID: '1', name: 'Engineering' }, { departmentID: '2', name: 'Finance' }];
    authenticatedFetch.mockImplementation((url, options = {}) => {
      if (options.method === 'DELETE') {
        departments = departments.filter((d) => d.departmentID !== '1');
        return Promise.resolve({ ok: true });
      }
      return Promise.resolve(list(departments));
    });

    render(<DepartmentsPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'Delete Engineering' }));
    fireEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(screen.queryByText('Engineering')).not.toBeInTheDocument());
    expect(screen.getByText('Finance')).toBeInTheDocument();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(alertSpy).not.toHaveBeenCalled();
  });

  test('shows the API reason inline when the delete fails', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    authenticatedFetch.mockImplementation((url, options = {}) => (options.method === 'DELETE'
      ? Promise.resolve({ ok: false, status: 400, text: async () => 'Department still has employees' })
      : Promise.resolve(list([{ departmentID: '1', name: 'Engineering' }]))));

    try {
      render(<DepartmentsPage />);
      fireEvent.click(await screen.findByRole('button', { name: 'Delete Engineering' }));
      const dialog = await screen.findByRole('alertdialog');
      fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));

      expect(await within(dialog).findByText('Department still has employees')).toBeInTheDocument();
      expect(alertSpy).not.toHaveBeenCalled();
    } finally {
      consoleError.mockRestore();
    }
  });
});
