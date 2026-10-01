import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SystemAnalysisPage from './SystemAnalysisPage';
import { authenticatedFetch } from '../services/authService';

jest.mock('../services/authService', () => ({ authenticatedFetch: jest.fn() }));

const employees = [
  { employeeID: 'e1', firstName: 'Ada', lastName: 'Lovelace', departmentID: 'd1', departmentName: 'IT', managerID: null, hireDate: '2021-03-01' },
  { employeeID: 'e2', firstName: 'Alan', lastName: 'Turing', departmentID: 'd1', departmentName: 'IT', managerID: 'e1', hireDate: '2022-06-01' },
];

const respond = (data, ok = true, status = 200) => Promise.resolve({ ok, status, json: async () => data });

beforeEach(() => {
  authenticatedFetch.mockImplementation((url) => {
    if (url.includes('/Employee/')) return respond(employees);
    if (url.includes('/GeneratedDocument/')) return respond(null, false, 500);
    return respond([]);
  });
});

const renderPage = () =>
  render(
    <MemoryRouter>
      <SystemAnalysisPage />
    </MemoryRouter>
  );

test('renders both sections and the headcount KPI', async () => {
  renderPage();
  expect(screen.getByRole('tab', { name: /hr analytics/i })).toBeInTheDocument();
  expect(screen.getByRole('tab', { name: /system health/i })).toBeInTheDocument();

  expect(await screen.findByText('Headcount')).toBeInTheDocument();
  expect(screen.getByRole('group', { name: 'Headcount' })).toHaveTextContent('2');
  expect(screen.getByText('Headcount by department')).toBeInTheDocument();
});

test('a failing endpoint shows as an error without breaking the page', async () => {
  renderPage();
  await screen.findByText('Headcount');
  fireEvent.click(screen.getByRole('tab', { name: /system health/i }));

  expect(await screen.findByText(/1 service is slow or failing/i)).toBeInTheDocument();
  expect(screen.getByRole('row', { name: /generated documents/i })).toHaveTextContent('HTTP 500');
  const managerCheck = screen.getAllByRole('listitem').find((li) => within(li).queryByText('Employees without a manager'));
  expect(managerCheck).toHaveTextContent(/^1Employees without a manager/);
});
