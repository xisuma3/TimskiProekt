import React, { useState } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import DateRangePicker, { firstBlockedBetween, monthCells, toDayNum } from './DateRangePicker';

// Controlled wrapper, the way LeaveRequestModal uses it.
const Harness = ({ booked = [], onChange = () => {} }) => {
  const [range, setRange] = useState({ start: '', end: '' });
  return (
    <DateRangePicker
      start={range.start}
      end={range.end}
      minDate="2030-06-01"
      booked={booked}
      onChange={(r) => { setRange(r); onChange(r); }}
    />
  );
};

// Accessible names are full dates, e.g. "Monday, June 10, 2030".
const day = (n) => screen.getByRole('button', { name: new RegExp(`June ${n}, 2030`) });

test('month grid starts on Monday', () => {
  const cells = monthCells(2030, 5); // June 2030 starts on a Saturday
  expect(cells.slice(0, 5)).toEqual([null, null, null, null, null]);
  expect(cells[5]).toBe(toDayNum('2030-06-01'));
});

test('first click sets the start, second sets the end, and the count is inclusive', () => {
  const onChange = jest.fn();
  render(<Harness onChange={onChange} />);

  fireEvent.click(day(10));
  expect(onChange).toHaveBeenLastCalledWith({ start: '2030-06-10', end: '' });
  expect(screen.getByText(/select the last day/)).toBeInTheDocument();

  fireEvent.click(day(14));
  expect(onChange).toHaveBeenLastCalledWith({ start: '2030-06-10', end: '2030-06-14' });
  expect(screen.getByText('5 days')).toBeInTheDocument();
});

test('clicking before the start begins a new range', () => {
  const onChange = jest.fn();
  render(<Harness onChange={onChange} />);
  fireEvent.click(day(10));
  fireEvent.click(day(5));
  expect(onChange).toHaveBeenLastCalledWith({ start: '2030-06-05', end: '' });
});

test('booked and past days cannot be picked, and a range cannot cross a booked day', () => {
  const onChange = jest.fn();
  render(<Harness onChange={onChange} booked={[{ startDate: '2030-06-12T00:00:00', endDate: '2030-06-13T00:00:00' }]} />);

  expect(day(12)).toBeDisabled();
  expect(day(12)).toHaveAccessibleName(/already requested/);

  fireEvent.click(day(10));
  fireEvent.click(day(15));
  expect(onChange).toHaveBeenLastCalledWith({ start: '2030-06-10', end: '' });
  expect(screen.getByRole('alert')).toHaveTextContent(/already requested/);
});

test('one-day leave: start and end on the same day', () => {
  const onChange = jest.fn();
  render(<Harness onChange={onChange} />);
  fireEvent.click(day(10));
  fireEvent.click(day(10));
  expect(onChange).toHaveBeenLastCalledWith({ start: '2030-06-10', end: '2030-06-10' });
  expect(screen.getByText('1 day')).toBeInTheDocument();
});

test('arrow keys move focus between days', () => {
  render(<Harness />);
  act(() => day(10).focus());
  fireEvent.keyDown(day(10), { key: 'ArrowRight' });
  expect(day(11)).toHaveFocus();
  fireEvent.keyDown(day(11), { key: 'ArrowDown' });
  expect(day(18)).toHaveFocus();
});

test('firstBlockedBetween finds the first booked day in a span', () => {
  const blocked = new Set([5, 7]);
  expect(firstBlockedBetween(1, 10, (d) => blocked.has(d))).toBe(5);
  expect(firstBlockedBetween(8, 10, (d) => blocked.has(d))).toBeNull();
});
