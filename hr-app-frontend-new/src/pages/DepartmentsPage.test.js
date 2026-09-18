import { fireEvent, render, screen } from '@testing-library/react';
import DepartmentsPage from './DepartmentsPage';
import { authenticatedFetch } from '../services/authService';

jest.mock('../services/authService', () => ({ authenticatedFetch: jest.fn() }));

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

  const { container } = render(<DepartmentsPage />);
  expect(await screen.findByText('Engineering')).toBeInTheDocument();

  fireEvent.click(container.querySelector('.btn-outline-danger'));

  expect(await screen.findByText('Confirm Delete')).toBeInTheDocument();
  expect(document.body.textContent).toContain('delete department "Engineering"?');
});
