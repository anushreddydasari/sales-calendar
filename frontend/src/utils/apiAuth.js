const STORAGE_KEY = 'sc_auth_token';

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
  const res = await fetch(url, { ...options, headers });
  if (res.status === 401) {
    clearAuthToken();
    try {
      sessionStorage.removeItem('sc_display_name');
    } catch { /* ignore */ }
    window.dispatchEvent(new CustomEvent('sc-auth-logout'));
  }
  return res;
}
