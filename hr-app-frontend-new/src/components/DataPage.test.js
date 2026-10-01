import { fireEvent, render, screen } from '@testing-library/react';
import DataPage from './DataPage';
import { authenticatedFetch } from '../services/authService';

jest.mock('../services/authService', () => ({
  authenticatedFetch: jest.fn(),
}));

test('clears a previous fetch error after a successful retry', async () => {
  const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
  authenticatedFetch
    .mockRejectedValueOnce(new Error('Unable to load items.'))
    .mockResolvedValueOnce({ ok: true, json: async () => [{ id: '1', name: 'Item' }] });

  try {
    const renderCard = (item) => <div>{item.name}</div>;
    const { rerender } = render(
      <DataPage title="Items" apiEndpoint="/items" renderCard={renderCard} />
    );

    expect(await screen.findByText('Unable to load items.')).toBeInTheDocument();

    rerender(<DataPage title="Items" apiEndpoint="/items-retry" renderCard={renderCard} />);

    expect(await screen.findByText('Item')).toBeInTheDocument();
    expect(screen.queryByText('Unable to load items.')).not.toBeInTheDocument();
    expect(consoleError).toHaveBeenCalledWith(expect.any(Error));
  } finally {
    consoleError.mockRestore();
  }
});

test('switches between grid and list view and remembers the choice per page', async () => {
  localStorage.clear();
  authenticatedFetch.mockResolvedValue({ ok: true, json: async () => [{ id: '1', name: 'Item' }] });
  const renderCard = (item) => <div>{item.name}</div>;
  const { container, unmount } = render(<DataPage title="Items" apiEndpoint="/items" renderCard={renderCard} />);
  await screen.findByText('Item');

  const grid = screen.getByRole('button', { name: 'Grid view' });
  const list = screen.getByRole('button', { name: 'List view' });
  expect(grid).toHaveAttribute('aria-pressed', 'true');
  expect(container.querySelector('.data-list')).toBeNull();

  fireEvent.click(list);
  expect(list).toHaveAttribute('aria-pressed', 'true');
  expect(container.querySelector('.data-list')).not.toBeNull();

  unmount();
  const again = render(<DataPage title="Items" apiEndpoint="/items" renderCard={renderCard} />);
  await screen.findByText('Item');
  expect(again.container.querySelector('.data-list')).not.toBeNull();
});
