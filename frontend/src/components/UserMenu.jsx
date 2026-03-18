import { useState, useRef, useEffect } from 'react';
import './UserMenu.css';

export default function UserMenu({ displayName, onLogout }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function close(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);

  return (
    <div className="user-menu" ref={ref}>
      <button
        type="button"
        className={`user-menu-trigger${open ? ' user-menu-trigger--open' : ''}`}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="true"
      >
        <span className="user-menu-avatar" aria-hidden>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" fill="#a78bfa"/>
          </svg>
        </span>
        <span className="user-menu-name">{displayName || 'SalesCalendar'}</span>
        <span className="user-menu-caret" aria-hidden>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="user-menu-dropdown" role="menu">
          <button
            type="button"
            className="user-menu-logout"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onLogout();
            }}
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
}
