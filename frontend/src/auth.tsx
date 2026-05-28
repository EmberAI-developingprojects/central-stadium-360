import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import type { UserRecord, UserRole } from "./data/store";

const SESSION_KEY = "tsengeldekh_session";
const USERS_KEY = "tsengeldekh_users";

export type Session = {
  identifier: string;
  fullname: string;
  avatar: string | null;
  bio: string;
  role: UserRole;
  loggedInAt: string;
};

export type LoginPayload = {
  identifier: string;
  fullname: string;
  avatar?: string | null;
  bio?: string;
  role?: UserRole;
};

type AuthContextValue = {
  session: Session | null;
  login: (account: LoginPayload) => Session;
  logout: () => void;
  updateSession: (patch: Partial<Session>) => void;
};

const AuthCtx = createContext<AuthContextValue | null>(null);

function readSession(): Session | null {
  try {
    return JSON.parse(
      localStorage.getItem(SESSION_KEY) || "null",
    ) as Session | null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(() => readSession());

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === SESSION_KEY) setSession(readSession());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const login = useCallback<AuthContextValue["login"]>((account) => {
    const next: Session = {
      identifier: account.identifier,
      fullname: account.fullname,
      avatar: account.avatar || null,
      bio: account.bio || "",
      role: account.role || "user",
      loggedInAt: new Date().toISOString(),
    };
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify(next));
    } catch {
      /* ignore quota errors */
    }
    setSession(next);
    return next;
  }, []);

  const logout = useCallback(() => {
    try {
      localStorage.removeItem(SESSION_KEY);
    } catch {
      /* ignore */
    }
    setSession(null);
  }, []);

  // Merge a partial patch into both the session AND the matching user record,
  // so profile edits stick across reloads and show up everywhere immediately.
  const updateSession = useCallback<AuthContextValue["updateSession"]>(
    (patch) => {
      setSession((prev) => {
        if (!prev) return prev;
        const next = { ...prev, ...patch };
        try {
          localStorage.setItem(SESSION_KEY, JSON.stringify(next));
        } catch {
          /* ignore */
        }
        try {
          const users = JSON.parse(
            localStorage.getItem(USERS_KEY) || "[]",
          ) as UserRecord[];
          const updated = users.map((u) =>
            u.identifier === prev.identifier ? { ...u, ...patch } : u,
          );
          localStorage.setItem(USERS_KEY, JSON.stringify(updated));
        } catch {
          /* ignore */
        }
        return next;
      });
    },
    [],
  );

  return (
    <AuthCtx.Provider value={{ session, login, logout, updateSession }}>
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function readUsers(): UserRecord[] {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY) || "[]") as UserRecord[];
  } catch {
    return [];
  }
}

export function writeUsers(users: UserRecord[]): void {
  try {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  } catch {
    /* ignore */
  }
}

// Route guard: bounce unauthenticated visitors to /login?next=…
export function useRequireAuth(): Session | null {
  const { session } = useAuth();
  const navigate = useNavigate();
  const loc = useLocation();
  useEffect(() => {
    if (!session || !session.identifier) {
      navigate(`/login?next=${encodeURIComponent(loc.pathname)}`, {
        replace: true,
      });
    }
  }, [session, navigate, loc.pathname]);
  return session;
}

// Auth-gated click: redirect to login then continue to `to`.
export function useGatedNavigate(): (to: string) => void {
  const { session } = useAuth();
  const navigate = useNavigate();
  return useCallback(
    (to: string) => {
      if (session && session.identifier) navigate(to);
      else navigate(`/login?next=${encodeURIComponent(to)}`);
    },
    [session, navigate],
  );
}

// Route guard for admin-only routes: anonymous users go to /login,
// non-admin signed-in users bounce to /watch.
export function useRequireAdmin(): Session | null {
  const { session } = useAuth();
  const navigate = useNavigate();
  const loc = useLocation();
  useEffect(() => {
    if (!session || !session.identifier) {
      navigate(`/login?next=${encodeURIComponent(loc.pathname)}`, {
        replace: true,
      });
    } else if (session.role !== "admin") {
      navigate("/watch", { replace: true });
    }
  }, [session, navigate, loc.pathname]);
  return session && session.role === "admin" ? session : null;
}

export function RequireAdmin({ children }: { children: ReactNode }) {
  const session = useRequireAdmin();
  if (!session) return null;
  return <>{children}</>;
}
