import axios from 'axios';
import { register } from './authService';
import { API_URLS } from '../config/api';

vi.mock('axios', () => ({ default: { post: vi.fn() } }));

describe('register', () => {
  afterEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  test('attaches the caller Bearer token, since /api/Auth/register is Admin-only', async () => {
    localStorage.setItem('token', 'admin-token');
    axios.post.mockResolvedValue({ data: { Message: 'ok' } });

    await register({ email: 'new@example.com', password: 'Valid1!' });

    expect(axios.post).toHaveBeenCalledWith(
      API_URLS.REGISTER(),
      { email: 'new@example.com', password: 'Valid1!' },
      { headers: { Authorization: 'Bearer admin-token' } }
    );
  });

  test('sends no Authorization header when no token is stored', async () => {
    axios.post.mockResolvedValue({ data: { Message: 'ok' } });

    await register({ email: 'new@example.com', password: 'Valid1!' });

    expect(axios.post).toHaveBeenCalledWith(
      API_URLS.REGISTER(),
      { email: 'new@example.com', password: 'Valid1!' },
      { headers: {} }
    );
  });
});
