import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import type {
  Session as SbSession,
  User as SbUser,
} from "@supabase/supabase-js";
import { supabase } from "./lib/supabase";
import { api, type AuthSessionPayload, type MeResponse } from "./lib/api";
import type { UserRole } from "./data/store";

export type Session = {
  identifier: string;
  fullname: string;
  avatar: string | null;
  bio: string;
  phone: string;
  role: UserRole;
};

type SessionState = Session | null;

type AuthContextValue = {
  session: SessionState;
  loading: boolean;

  login: (input: { identifier: string; password: string }) => Promise<
    | { ok: true }
    | {
        ok: false;
        error: string;
        kind?: "phone" | "email";
        identifier?: string;
      }
  >;
  registerPhone: (input: {
    fullName: string;
    phone: string;
    password: string;
  }) => Promise<{ ok: true; phone: string } | { ok: false; error: string }>;
  registerEmail: (input: {
    fullName: string;
    email: string;
    password: string;
  }) => Promise<{ ok: true; email: string } | { ok: false; error: string }>;

  verifyPhone: (input: {
    phone: string;
    code: string;
  }) => Promise<{ ok: true } | { ok: false; error: string }>;

  resendCode: (
    identifier: string,
  ) => Promise<
    { ok: true; kind: "phone" | "email" } | { ok: false; error: string }
  >;
  logout: () => Promise<void>;

  updateSession: (patch: Partial<Session>) => Promise<void>;

  deleteAccount: () => Promise<{ ok: true } | { ok: false; error: string }>;
};

const AuthCtx = createContext<AuthContextValue | null>(null);

type SbUserMetadata = {
  full_name?: string;
  bio?: string;
  avatar?: string | null;
  phone?: string;
};

function sessionFromSupabase(
  user: SbUser | null | undefined,
  profile: MeResponse | null,
): SessionState {
  if (!user) return null;
  const md = (user.user_metadata ?? {}) as SbUserMetadata;
  const identifier =
    profile?.phone || profile?.email || user.phone || user.email || "";
  if (!identifier) return null;
  return {
    identifier,
    fullname: profile?.full_name || md.full_name || "",
    avatar: md.avatar ?? null,
    bio: md.bio ?? "",
    phone: md.phone ?? (profile?.phone || user.phone || ""),
    role: profile?.role ?? "user",
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<SessionState>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    let cancelled = false;

    const hydrate = async (sb: SbSession | null) => {

      if (!sb?.user) {
        if (!cancelled) setSession(null);
        return;
      }

      const res = await api.me();
      if (cancelled) return;
      if (res.ok) {
        setSession(sessionFromSupabase(sb.user, res.data));
      } else if (res.status === 403 && res.error === "account_deleted") {
        console.warn("[auth] /me reported account_deleted; signing out");
        await supabase!.auth.signOut().catch(() => undefined);
        if (!cancelled) setSession(null);
      } else {

        console.warn("[auth] /me failed:", res.error, "status:", res.status);
      }
    };

    supabase.auth.getSession().then(({ data }) => {
      void hydrate(data.session).finally(() => {
        if (!cancelled) setLoading(false);
      });
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, sb) => {
      void hydrate(sb);
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  const hydrateFromPayload = useCallback(
    async (payload: AuthSessionPayload) => {
      if (!supabase) return;
      await supabase.auth.setSession({
        access_token: payload.session.access_token,
        refresh_token: payload.session.refresh_token,
      });

      setSession({
        identifier: payload.user.phone || payload.user.email || "",
        fullname: "",
        avatar: null,
        bio: "",
        phone: payload.user.phone || "",
        role: payload.user.role,
      });
    },
    [],
  );

  const login = useCallback<AuthContextValue["login"]>(
    async (input) => {
      const res = await api.login(input);
      if (!res.ok) {
        if (res.status === 403 && res.error === "not_verified") {
          const details = res.details as {
            kind?: "phone" | "email";
            identifier?: string;
          };
          return {
            ok: false,
            error: "not_verified",
            kind: details?.kind,
            identifier: details?.identifier,
          };
        }
        return { ok: false, error: res.error };
      }
      await hydrateFromPayload(res.data);
      return { ok: true };
    },
    [hydrateFromPayload],
  );

  const registerPhone = useCallback<AuthContextValue["registerPhone"]>(
    async (input) => {
      const res = await api.registerPhone(input);
      if (!res.ok) return { ok: false, error: res.error };
      return { ok: true, phone: res.data.phone };
    },
    [],
  );

  const registerEmail = useCallback<AuthContextValue["registerEmail"]>(
    async (input) => {
      const res = await api.registerEmail(input);
      if (!res.ok) return { ok: false, error: res.error };
      return { ok: true, email: res.data.email };
    },
    [],
  );

  const verifyPhone = useCallback<AuthContextValue["verifyPhone"]>(
    async (input) => {
      const res = await api.verifyPhone(input);
      if (!res.ok) return { ok: false, error: res.error };
      await hydrateFromPayload(res.data);
      return { ok: true };
    },
    [hydrateFromPayload],
  );

  const resendCode = useCallback<AuthContextValue["resendCode"]>(
    async (identifier) => {
      const res = await api.resendCode({ identifier });
      if (!res.ok) return { ok: false, error: res.error };
      return { ok: true, kind: res.data.kind };
    },
    [],
  );

  const logout = useCallback(async () => {
    if (supabase) {
      await supabase.auth.signOut().catch(() => undefined);
    }
    setSession(null);
  }, []);

  const updateSession = useCallback<AuthContextValue["updateSession"]>(
    async (patch) => {
      if (!supabase) return;
      const md: Partial<SbUserMetadata> = {};
      if (typeof patch.fullname === "string") md.full_name = patch.fullname;
      if (typeof patch.bio === "string") md.bio = patch.bio;
      if (patch.avatar !== undefined) md.avatar = patch.avatar;
      if (typeof patch.phone === "string") md.phone = patch.phone;
      if (Object.keys(md).length > 0) {
        await supabase.auth.updateUser({ data: md });
      }
      setSession((prev) => (prev ? { ...prev, ...patch } : prev));
    },
    [],
  );

  const deleteAccount = useCallback<
    AuthContextValue["deleteAccount"]
  >(async () => {
    const res = await api.deleteAccount();
    if (!res.ok) return { ok: false, error: res.error };
    await logout();
    return { ok: true };
  }, [logout]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      loading,
      login,
      registerPhone,
      registerEmail,
      verifyPhone,
      resendCode,
      logout,
      updateSession,
      deleteAccount,
    }),
    [
      session,
      loading,
      login,
      registerPhone,
      registerEmail,
      verifyPhone,
      resendCode,
      logout,
      updateSession,
      deleteAccount,
    ],
  );

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function useRequireAuth(): Session | null {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const loc = useLocation();
  useEffect(() => {
    if (loading) return;
    if (!session) {
      navigate(`/login?next=${encodeURIComponent(loc.pathname)}`, {
        replace: true,
      });
    }
  }, [session, loading, navigate, loc.pathname]);
  return session;
}

export function useGatedNavigate(): (to: string) => void {
  const { session } = useAuth();
  const navigate = useNavigate();
  return useCallback(
    (to: string) => {
      if (session) navigate(to);
      else navigate(`/login?next=${encodeURIComponent(to)}`);
    },
    [session, navigate],
  );
}

export function useRequireAdmin(): Session | null {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const loc = useLocation();
  useEffect(() => {
    if (loading) return;
    if (!session) {
      navigate(`/login?next=${encodeURIComponent(loc.pathname)}`, {
        replace: true,
      });
    } else if (session.role !== "admin") {
      navigate("/watch", { replace: true });
    }
  }, [session, loading, navigate, loc.pathname]);
  return session && session.role === "admin" ? session : null;
}

export function RequireAdmin({ children }: { children: ReactNode }) {
  const session = useRequireAdmin();
  if (!session) return null;
  return <>{children}</>;
}

export type LoginPayload = { identifier: string; password: string };

export function readUsers(): never[] {
  return [];
}

export function writeUsers(_: unknown[]): void {

}
