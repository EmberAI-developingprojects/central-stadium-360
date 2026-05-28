import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import type { ComponentType } from 'react';
import { useAuth } from '../auth';
import './styles.css';

type NavItem = { to: string; end?: boolean; label: string; icon: ComponentType };

const NAV: NavItem[] = [
  { to: '/admin', end: true, label: 'Хяналт', icon: IconGrid },
  { to: '/admin/events', label: 'Арга хэмжээ', icon: IconCalendar },
  { to: '/admin/orders', label: 'Захиалга', icon: IconReceipt },
  { to: '/admin/users', label: 'Хэрэглэгч', icon: IconUsers },
  { to: '/admin/content', label: 'Контент', icon: IconLayout },
];

const PAGE_TITLES: Record<string, string> = {
  '/admin': 'Хяналтын самбар',
  '/admin/events': 'Арга хэмжээ',
  '/admin/events/new': 'Шинэ арга хэмжээ',
  '/admin/orders': 'Захиалга',
  '/admin/users': 'Хэрэглэгч',
  '/admin/content': 'Контент засварлагч',
};

export default function AdminLayout() {
  const loc = useLocation();
  const navigate = useNavigate();
  const { session, logout } = useAuth();

  const title = PAGE_TITLES[loc.pathname]
    || (loc.pathname.startsWith('/admin/events/') ? 'Арга хэмжээ засах'
      : loc.pathname.startsWith('/admin/orders/') ? 'Захиалгын дэлгэрэнгүй'
      : loc.pathname.startsWith('/admin/users/') ? 'Хэрэглэгчийн дэлгэрэнгүй'
      : 'Админ');

  const initials = (session?.fullname || session?.identifier || 'A')
    .split(/\s+/).map((s) => s[0]).slice(0, 2).join('').toUpperCase();

  const onLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar" aria-label="Админ цэс">
        <div className="admin-brand">
          <div className="admin-brand-mark">TC</div>
          <div className="admin-brand-text">
            <strong>Төв Цэнгэлдэх</strong>
            <span>Админ панел</span>
          </div>
        </div>

        <nav className="admin-nav">
          {NAV.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => (isActive ? 'is-active' : undefined)}
              >
                <Icon />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="admin-sidebar-footer">
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

      <div className="admin-main">
        <header className="admin-topbar">
          <h1>{title}</h1>
          <div className="admin-topbar-spacer" />
          <div className="admin-topbar-user">
            <span>{session?.fullname || session?.identifier}</span>
            <span className="avatar" aria-hidden="true">{initials}</span>
          </div>
        </header>
        <main className="admin-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

/* ---------- icons (inline so we don't need an icon lib) ---------- */
function IconGrid() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="7" height="7" rx="1"/>
      <rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="3" y="14" width="7" height="7" rx="1"/>
      <rect x="14" y="14" width="7" height="7" rx="1"/>
    </svg>
  );
}
function IconCalendar() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="18" height="18" rx="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  );
}
function IconReceipt() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 2h14v20l-3-2-3 2-3-2-2 2-3-2V2z"/>
      <line x1="9" y1="8" x2="15" y2="8"/>
      <line x1="9" y1="12" x2="15" y2="12"/>
      <line x1="9" y1="16" x2="13" y2="16"/>
    </svg>
  );
}
function IconUsers() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  );
}
function IconLayout() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="2"/>
      <line x1="3" y1="9" x2="21" y2="9"/>
      <line x1="9" y1="21" x2="9" y2="9"/>
    </svg>
  );
}
function IconExternal() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
      <polyline points="15 3 21 3 21 9"/>
      <line x1="10" y1="14" x2="21" y2="3"/>
    </svg>
  );
}
function IconLogout() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
      <polyline points="16 17 21 12 16 7"/>
      <line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  );
}
