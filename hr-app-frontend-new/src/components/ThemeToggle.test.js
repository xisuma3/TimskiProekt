import { fireEvent, render, screen } from '@testing-library/react';
import ThemeToggle from './ThemeToggle';

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute('data-bs-theme');
  window.matchMedia = jest.fn().mockReturnValue({
    matches: false,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  });
});

test('follows the system preference until the user chooses', () => {
  window.matchMedia.mockReturnValue({ matches: true, addEventListener: jest.fn(), removeEventListener: jest.fn() });
  render(<ThemeToggle />);
  expect(screen.getByRole('button', { name: /switch to light mode/i })).toBeInTheDocument();
  expect(localStorage.getItem('theme')).toBeNull();
});

test('toggling applies the theme to <html> and remembers it', () => {
  render(<ThemeToggle />);
  fireEvent.click(screen.getByRole('button', { name: /switch to dark mode/i }));

  expect(document.documentElement).toHaveAttribute('data-bs-theme', 'dark');
  expect(localStorage.getItem('theme')).toBe('dark');
  expect(screen.getByRole('button', { name: /switch to light mode/i })).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: /switch to light mode/i }));
  expect(document.documentElement).toHaveAttribute('data-bs-theme', 'light');
  expect(localStorage.getItem('theme')).toBe('light');
});
