import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import EmployeeModal from './EmployeeModal';
import { authenticatedFetch } from '../services/authService';

jest.mock('../services/authService', () => ({
  authenticatedFetch: jest.fn(),
  register: jest.fn(),
}));

test('preserves manager and mentor IDs when editing an employee', async () => {
  authenticatedFetch.mockResolvedValue({ ok: true, status: 204 });
  const employee = {
    employeeID: 'employee-id',
    firstName: 'Ada',
    lastName: 'Lovelace',
    email: 'ada@example.com',
    position: 'Engineer',
    departmentName: 'Engineering',
    hireDate: '2024-01-01',
    managerID: 'manager-id',
    managerName: 'Grace Hopper',
    mentorID: 'mentor-id',
    mentorName: 'Alan Turing',
  };

  render(
    <EmployeeModal
      show
      employee={employee}
      departments={[{ departmentID: 'department-id', name: 'Engineering' }]}
      onHide={jest.fn()}
      onSave={jest.fn()}
    />
  );

  fireEvent.click(screen.getByRole('button', { name: /update/i }));

  await waitFor(() => expect(authenticatedFetch).toHaveBeenCalled());
  const [, options] = authenticatedFetch.mock.calls[0];
  expect(JSON.parse(options.body)).toMatchObject({
    ManagerID: 'manager-id',
    MentorID: 'mentor-id',
  });
});
