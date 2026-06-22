import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import type { ComponentType } from "react";
import { useAuth } from "../auth";
import { ConfirmProvider } from "./components/ConfirmDialog";
import { ToastProvider } from "./components/Toast";
import {
  ADMIN_AVATAR_CLS,
  ADMIN_BRAND_CLS,
  ADMIN_BRAND_MARK_CLS,
  ADMIN_BRAND_TEXT_CLS,
  ADMIN_CONTENT_CLS,
  ADMIN_MAIN_CLS,
  ADMIN_NAV_CLS,
  ADMIN_SHELL_CLS,
  ADMIN_SIDEBAR_CLS,
  ADMIN_SIDEBAR_FOOTER_CLS,
  ADMIN_TOPBAR_CLS,
  ADMIN_TOPBAR_SPACER_CLS,
  ADMIN_TOPBAR_USER_CLS,
} from "./_adminStyles";

type NavItem = {
  to: string;
  end?: boolean;
  label: string;
  icon: ComponentType;
};

const NAV: NavItem[] = [
  { to: "/admin", end: true, label: "Хяналт", icon: IconGrid },
  { to: "/admin/events", label: "Арга хэмжээ", icon: IconCalendar },
  { to: "/admin/orders", label: " Борлуулалт", icon: IconReceipt },
  { to: "/admin/kiosk", label: "Касс", icon: IconKiosk },
  { to: "/admin/users", label: "Хэрэглэгч", icon: IconUsers },
  { to: "/admin/content", label: "Контент", icon: IconLayout },
  { to: "/admin/history", label: "Түүхэн хэсэг", icon: IconHistory },
];

const PAGE_TITLES: Record<string, string> = {
  "/admin": "Хяналтын самбар",
  "/admin/events": "Арга хэмжээ",
  "/admin/events/new": "Шинэ арга хэмжээ",
  "/admin/orders": "Захиалга",
  "/admin/kiosk": "Касс — биечлэн тасалбар",
  "/admin/users": "Хэрэглэгч",
  "/admin/content": "Контент засварлагч",
  "/admin/history": "Түүхэн хэсэг",
};

export default function AdminLayout() {
  const loc = useLocation();
  const navigate = useNavigate();
  const { session, logout } = useAuth();

  const title =
    PAGE_TITLES[loc.pathname] ||
    (loc.pathname.startsWith("/admin/events/")
      ? "Арга хэмжээ засах"
      : loc.pathname.startsWith("/admin/orders/")
        ? "Захиалгын дэлгэрэнгүй"
        : loc.pathname.startsWith("/admin/users/")
          ? "Хэрэглэгчийн дэлгэрэнгүй"
          : "Админ");

  const initials = (session?.fullname || session?.identifier || "A")
    .split(/\s+/)
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const onLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <ToastProvider>
      <ConfirmProvider>
        <AdminShell
          title={title}
          initials={initials}
          fullname={session?.fullname}
          identifier={session?.identifier}
          onLogout={onLogout}
        />
      </ConfirmProvider>
    </ToastProvider>
  );
}

function AdminShell({
  title,
  initials,
  fullname,
  identifier,
  onLogout,
}: {
  title: string;
  initials: string;
  fullname?: string;
  identifier?: string;
  onLogout: () => void;
}) {
  return (
    <div className={ADMIN_SHELL_CLS}>
      <aside className={ADMIN_SIDEBAR_CLS} aria-label="Админ цэс">
        <div className={ADMIN_BRAND_CLS}>
          <div className={ADMIN_BRAND_MARK_CLS}>TC</div>
          <div className={ADMIN_BRAND_TEXT_CLS}>
            <strong>Төв Цэнгэлдэх</strong>
            <span>Админ панел</span>
          </div>
        </div>

        <nav className={ADMIN_NAV_CLS}>
          {NAV.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  isActive ? "is-active" : undefined
                }
              >
                <Icon />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className={ADMIN_SIDEBAR_FOOTER_CLS}>
          <a href="/" target="_blank" rel="noreferrer">
            <IconExternal />
            <span>Сайтыг үзэх</span>
          </a>
          <button type="button" onClick={onLogout}>
            <IconLogout />
            <span>Гарах</span>
          </button>
        </div>
      </aside>

      <div className={ADMIN_MAIN_CLS}>
        <header className={ADMIN_TOPBAR_CLS}>
          <h1>{title}</h1>
          <div className={ADMIN_TOPBAR_SPACER_CLS} />
          <div className={ADMIN_TOPBAR_USER_CLS}>
            <span>{fullname || identifier}</span>
            <span className={ADMIN_AVATAR_CLS} aria-hidden="true">
              {initials}
            </span>
          </div>
        </header>
        <main className={ADMIN_CONTENT_CLS}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function IconGrid() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}
function IconCalendar() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}
function IconReceipt() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 2h14v20l-3-2-3 2-3-2-2 2-3-2V2z" />
      <line x1="9" y1="8" x2="15" y2="8" />
      <line x1="9" y1="12" x2="15" y2="12" />
      <line x1="9" y1="16" x2="13" y2="16" />
    </svg>
  );
}
function IconKiosk() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 9l1-5h16l1 5" />
      <path d="M4 9v11a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V9" />
      <path d="M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0" />
      <rect x="9" y="14" width="6" height="7" />
    </svg>
  );
}
function IconUsers() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
function IconLayout() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <line x1="3" y1="9" x2="21" y2="9" />
      <line x1="9" y1="21" x2="9" y2="9" />
    </svg>
  );
}
function IconHistory() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
      <polyline points="3 3 3 8 8 8" />
      <polyline points="12 7 12 12 15 14" />
    </svg>
  );
}
function IconExternal() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}
function IconLogout() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}
