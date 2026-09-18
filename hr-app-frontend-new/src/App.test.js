import { render, screen } from '@testing-library/react';
import LandingPage from './pages/LandingPage';

test('renders the landing page', () => {
  render(<LandingPage />);
  expect(
    screen.getByRole('heading', { name: /welcome to the hr management system/i })
  ).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /login/i })).toHaveAttribute('href', '/login');
  expect(screen.queryByRole('button', { name: /register/i })).not.toBeInTheDocument();
});
