import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import LoginPage from './LoginPage';
import { login } from '../services/authService';

jest.mock('../services/authService', () => ({
  login: jest.fn(),
  fetchEmployeeDetails: jest.fn(),
}));

const renderAndSubmit = () => {
  render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>
  );
  fireEvent.change(screen.getByLabelText(/work email/i), { target: { value: 'a@b.com' } });
  fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: 'secret' } });
  fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
};

beforeEach(() => login.mockReset());

test('shows a generic message for rejected credentials', async () => {
  login.mockRejectedValue({ response: { status: 401 } });
  renderAndSubmit();
  expect(await screen.findByRole('alert')).toHaveTextContent(/email or password is incorrect/i);
  expect(screen.getByRole('button', { name: /sign in/i })).toBeEnabled();
});

test('distinguishes an unreachable server from bad credentials', async () => {
  login.mockRejectedValue(new Error('Network Error'));
  renderAndSubmit();
  expect(await screen.findByRole('alert')).toHaveTextContent(/can.t reach the server/i);
});

test('toggles password visibility', () => {
  render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>
  );
  const password = screen.getByLabelText(/^password$/i);
  expect(password).toHaveAttribute('type', 'password');
  fireEvent.click(screen.getByRole('button', { name: /show password/i }));
  expect(password).toHaveAttribute('type', 'text');
});
