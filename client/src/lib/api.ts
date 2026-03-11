function getApiUrl(): string {
  // NEXT_PUBLIC_API_URL is baked at build time
  // Production: http://159.223.65.161/api (goes through nginx)
  // Development: http://localhost:3001 (direct to NestJS)
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    return `http://${hostname}:3001`;
  }
  return 'http://localhost:3001';
}

const API_URL = getApiUrl();

async function fetchApi<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || `HTTP ${res.status}`);
  }

  return res.json();
}

export const api = {
  // Auth
  guestLogin: (username?: string) =>
    fetchApi<{ token: string; refreshToken: string; user: { id: string; username: string } }>(
      '/auth/guest',
      { method: 'POST', body: JSON.stringify({ username }) },
    ),
  login: (email: string, password: string) =>
    fetchApi<{ token: string; refreshToken: string; user: { id: string; username: string; email: string } }>(
      '/auth/login',
      { method: 'POST', body: JSON.stringify({ email, password }) },
    ),
  register: (username: string, email: string, password: string) =>
    fetchApi<{ token: string; refreshToken: string; user: { id: string; username: string; email: string } }>(
      '/auth/register',
      { method: 'POST', body: JSON.stringify({ username, email, password }) },
    ),
  // Profile
  getProfile: () =>
    fetchApi<{ id: string; username: string; email?: string; gamesPlayed: number; gamesWon: number }>(
      '/users/profile',
    ),
};
