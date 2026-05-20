import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const SESSION_KEY = 'tsengeldekh_session';
const USERS_KEY = 'tsengeldekh_users';

const AuthCtx = createContext(null);

function readSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => readSession());

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === SESSION_KEY) setSession(readSession());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const login = useCallback((account) => {
    const next = {
      identifier: account.identifier,
      fullname: account.fullname,
      avatar: account.avatar || null,
      bio: account.bio || '',
      loggedInAt: new Date().toISOString(),
    };
    try { localStorage.setItem(SESSION_KEY, JSON.stringify(next)); } catch {}
    setSession(next);
    return next;
  }, []);

  const logout = useCallback(() => {
    try { localStorage.removeItem(SESSION_KEY); } catch {}
    setSession(null);
  }, []);

  // Merge a partial patch into both the session AND the matching user record,
  // so profile edits stick across reloads and show up everywhere immediately.
  const updateSession = useCallback((patch) => {
    setSession((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...patch };
      try { localStorage.setItem(SESSION_KEY, JSON.stringify(next)); } catch {}
      try {
        const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
        const updated = users.map((u) => (u.identifier === prev.identifier ? { ...u, ...patch } : u));
        localStorage.setItem(USERS_KEY, JSON.stringify(updated));
      } catch {}
      return next;
    });
  }, []);

  return (
    <AuthCtx.Provider value={{ session, login, logout, updateSession }}>
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function readUsers() {
  try { return JSON.parse(localStorage.getItem(USERS_KEY) || '[]'); }
  catch { return []; }
}

export function writeUsers(users) {
  try { localStorage.setItem(USERS_KEY, JSON.stringify(users)); } catch {}
}

// Route guard: bounce unauthenticated visitors to /login?next=…
export function useRequireAuth() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const loc = useLocation();
  useEffect(() => {
    if (!session || !session.identifier) {
      navigate(`/login?next=${encodeURIComponent(loc.pathname)}`, { replace: true });
    }
  }, [session, navigate, loc.pathname]);
  return session;
}

// Auth-gated click: redirect to login then continue to `to`.
export function useGatedNavigate() {
  const { session } = useAuth();
  const navigate = useNavigate();
  return useCallback((to) => {
    if (session && session.identifier) navigate(to);
    else navigate(`/login?next=${encodeURIComponent(to)}`);
  }, [session, navigate]);
}
