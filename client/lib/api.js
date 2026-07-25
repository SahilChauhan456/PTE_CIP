// Fetch wrapper that attaches the JWT and a SWR-compatible fetcher.
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

const TOKEN_KEY = 'ptecip_token';
const USER_KEY = 'ptecip_user';

export function getToken() {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function getUser() {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(USER_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function setSession(token, user) {
  window.localStorage.setItem(TOKEN_KEY, token);
  window.localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(USER_KEY);
}

async function request(path, options = {}) {
  const token = getToken();
  // For file uploads the browser must set its own multipart boundary,
  // so never force a JSON Content-Type on FormData bodies.
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  if (res.status === 401 && typeof window !== 'undefined' && !path.startsWith('/auth')) {
    clearSession();
    if (window.location.pathname !== '/login') window.location.href = '/login';
  }

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const err = new Error((data && data.error) || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
}

// SWR fetcher: fetcher(path)
export const fetcher = (path) => request(path);

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body: JSON.stringify(body) }),
  put: (path, body) => request(path, { method: 'PUT', body: JSON.stringify(body) }),
  patch: (path, body) => request(path, { method: 'PATCH', body: JSON.stringify(body) }),
  del: (path) => request(path, { method: 'DELETE' }),
  // Multipart upload (profile pictures). Pass a FormData instance.
  upload: (path, formData) => request(path, { method: 'POST', body: formData }),
  // Google Sign-In: exchange the Google ID token for an app JWT.
  google: (credential) =>
    request('/auth/google', { method: 'POST', body: JSON.stringify({ credential }) }),
};

export { API_URL };
