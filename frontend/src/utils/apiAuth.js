const STORAGE_KEY = 'sc_auth_token';

/** Production: set VITE_API_URL on Render (e.g. https://your-api.onrender.com). Dev: leave unset → same-origin + Vite proxy. */
export function apiUrl(pathOrUrl) {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  const base = (import.meta.env.VITE_API_URL || '').trim().replace(/\/$/, '');
  const p = pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`;
  if (!base) return p;
  return `${base}${p}`;
}

export function getAuthToken() {
  try {
    return sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setAuthToken(token) {
  sessionStorage.setItem(STORAGE_KEY, token);
}

export function clearAuthToken() {
  sessionStorage.removeItem(STORAGE_KEY);
}

export function authHeaders() {
  const t = getAuthToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

/** Use for all /api calls except login & auth/config */
export async function authFetch(url, options = {}) {
  const headers = {
    ...(options.headers || {}),
    ...authHeaders(),
  };
  const res = await fetch(apiUrl(url), { ...options, headers });
  if (res.status === 401) {
    clearAuthToken();
    try {
      sessionStorage.removeItem('sc_display_name');
    } catch { /* ignore */ }
    window.dispatchEvent(new CustomEvent('sc-auth-logout'));
  }
  return res;
}
