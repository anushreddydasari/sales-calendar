import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import Login from './components/Login.jsx';
import { setAuthToken, clearAuthToken, getAuthToken, apiUrl } from './utils/apiAuth';
import './App.css';

function Root() {
  const [config, setConfig] = useState(null);
  const [sessionKey, setSessionKey] = useState(0);

  const bump = useCallback(() => setSessionKey((k) => k + 1), []);

  useEffect(() => {
    fetch(apiUrl('/api/auth/config'))
      .then(async (r) => {
        const data = await r.json().catch(() => ({}));
        if (!r.ok) {
          console.warn('/api/auth/config failed:', r.status, '— restart backend after pulling latest code');
          return { loginRequired: false };
        }
        return data;
      })
      .then(setConfig)
      .catch(() => setConfig({ loginRequired: false }));
  }, []);

  useEffect(() => {
    const onLogout = () => bump();
    window.addEventListener('sc-auth-logout', onLogout);
    return () => window.removeEventListener('sc-auth-logout', onLogout);
  }, [bump]);

  if (!config) {
    return (
      <div className="login-root-loading">Loading…</div>
    );
  }

  const needLogin = config.loginRequired;
  const hasToken = !!getAuthToken();

  if (needLogin && !hasToken) {
    return (
      <Login
        onSuccess={(token, displayName) => {
          setAuthToken(token);
          try {
            sessionStorage.setItem('sc_display_name', displayName || 'SalesCalendar');
          } catch { /* ignore */ }
          bump();
        }}
      />
    );
  }

  let displayName = 'SalesCalendar';
  try {
    displayName = sessionStorage.getItem('sc_display_name') || displayName;
  } catch { /* ignore */ }

  return (
    <App
      showUserMenu={needLogin}
      displayName={displayName}
      onLogout={() => {
        clearAuthToken();
        try {
          sessionStorage.removeItem('sc_display_name');
        } catch { /* ignore */ }
        bump();
      }}
      key={sessionKey}
    />
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
