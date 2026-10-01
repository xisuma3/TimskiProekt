import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import LandingPage from './pages/LandingPage';

test('renders the landing page', () => {
  render(
    <MemoryRouter>
      <LandingPage />
    </MemoryRouter>
  );
  expect(
    screen.getByRole('heading', { level: 1, name: /people, leave and assets/i })
  ).toBeInTheDocument();
  const signInLinks = screen.getAllByRole('link', { name: /sign in/i });
  expect(signInLinks.length).toBeGreaterThan(0);
  signInLinks.forEach((link) => expect(link).toHaveAttribute('href', '/login'));
  expect(screen.queryByRole('link', { name: /register/i })).not.toBeInTheDocument();
});
