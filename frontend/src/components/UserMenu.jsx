import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth.jsx';

const TICKETS_KEY = 'tsengeldekh_tickets';

function ticketCountFor(session) {
  if (!session) return 0;
  try {
    const all = JSON.parse(localStorage.getItem(TICKETS_KEY) || '[]');
    return all.filter((t) => !t.user || t.user === session.identifier).length;
  } catch {
    return 0;
  }
}

export default function UserMenu() {
  const { session, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const triggerRef = useRef(null);

  // Close on outside click + Esc
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!session || !session.identifier) return null;

  const label = session.fullname || session.identifier;
  const initial = (label || '?').trim().charAt(0).toUpperCase();
  const avatar = session.avatar;
  const ticketCount = ticketCountFor(session);

  const go = (to) => {
    setOpen(false);
    navigate(to);
  };

  const onLogout = () => {
    setOpen(false);
    logout();
    navigate('/');
  };

  return (
    <div className={`user-menu${open ? ' is-open' : ''}`} ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className="user-menu-trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span className={`user-menu-avatar${avatar ? ' has-image' : ''}`} aria-hidden="true">
          {avatar ? <img src={avatar} alt="" /> : initial}
        </span>
        <span className="user-menu-name">{label}</span>
        <svg className="user-menu-caret" viewBox="0 0 10 6" fill="none" stroke="currentColor"
             strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M1 1l4 4 4-4"/>
        </svg>
      </button>

      <div className="user-menu-panel" role="menu" hidden={!open}>
        <div className="user-menu-head">
          <span className={`user-menu-avatar lg${avatar ? ' has-image' : ''}`} aria-hidden="true">
            {avatar ? <img src={avatar} alt="" /> : initial}
          </span>
          <div>
            <strong className="user-menu-fullname">{label}</strong>
            <span className="user-menu-id">{session.identifier}</span>
          </div>
        </div>

        <div className="user-menu-sep" role="separator"></div>

        <button type="button" className="user-menu-item" role="menuitem" onClick={() => go('/profile')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0116 0"/>
          </svg>
          <span>Хувийн булан</span>
        </button>

        <button type="button" className="user-menu-item" role="menuitem" onClick={() => go('/watch#tickets')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M2 9a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4z"/>
            <line x1="13" y1="5" x2="13" y2="7"/>
            <line x1="13" y1="11" x2="13" y2="13"/>
            <line x1="13" y1="17" x2="13" y2="19"/>
          </svg>
          <span>Худалдан авалтын түүх</span>
          {ticketCount > 0 && <span className="user-menu-badge">{ticketCount}</span>}
        </button>

        <button type="button" className="user-menu-item" role="menuitem" onClick={() => go('/settings')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1A2 2 0 1 1 4.3 17l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1A2 2 0 1 1 7 4.3l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1A2 2 0 1 1 19.7 7l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>
          </svg>
          <span>Тохиргоо</span>
        </button>

        <div className="user-menu-sep" role="separator"></div>

        <button type="button" className="user-menu-item is-danger" role="menuitem" onClick={onLogout}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          <span>Гарах</span>
        </button>
      </div>
    </div>
  );
}
