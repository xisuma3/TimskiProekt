import { readErrorMessage } from './apiError';

const res = (body) => ({ text: async () => body });

test('uses the message or title from a JSON body', async () => {
  expect(await readErrorMessage(res('{"message":"Already decided"}'), 'Fallback')).toBe('Already decided');
  expect(await readErrorMessage(res('{"title":"One or more validation errors occurred."}'), 'Fallback'))
    .toBe('One or more validation errors occurred.');
});

test('uses short plain text, as BadRequest("...") sends it', async () => {
  expect(await readErrorMessage(res('Department still has employees'), 'Fallback')).toBe('Department still has employees');
});

test('falls back when there is no usable body', async () => {
  expect(await readErrorMessage(res(''), 'Fallback')).toBe('Fallback');
  expect(await readErrorMessage(res('{}'), 'Fallback')).toBe('Fallback');
  expect(await readErrorMessage(res('<html>502 Bad Gateway</html>'), 'Fallback')).toBe('Fallback');
  expect(await readErrorMessage({ text: async () => { throw new Error('stream'); } }, 'Fallback')).toBe('Fallback');
});
