import { useEffect, type ReactNode } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth, RequireAdmin } from './auth';
import Home from './pages/Home';
import About from './pages/About';
import Events from './pages/Events';
import EventDetail from './pages/EventDetail';
import WatchEventDetail from './pages/WatchEventDetail';
import NewsDetail from './pages/NewsDetail';
import Login from './pages/Login';
import Register from './pages/Register';
import RegisterPhone from './pages/RegisterPhone';
import RegisterEmail from './pages/RegisterEmail';
import Watch from './pages/Watch';
import Settings from './pages/Settings';
import Profile from './pages/Profile';
import OrderDetail from './pages/OrderDetail';
import AdminLayout from './admin/AdminLayout';
import Dashboard from './admin/pages/Dashboard';
import EventsList from './admin/pages/EventsList';
import EventEdit from './admin/pages/EventEdit';
import OrdersList from './admin/pages/OrdersList';
import OrderView from './admin/pages/OrderView';
import UsersList from './admin/pages/UsersList';
import UserView from './admin/pages/UserView';
import Content from './admin/pages/Content';

function ScrollToTop() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) {
      // Wait for the destination route to mount before scrolling to the anchor.
      const id = hash.slice(1);
      const tryScroll = () => {
        const el = document.getElementById(id);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          return true;
        }
        return false;
      };
      if (tryScroll()) return;
      let attempts = 0;
      const timer = window.setInterval(() => {
        attempts += 1;
        if (tryScroll() || attempts > 20) window.clearInterval(timer);
      }, 50);
      return () => window.clearInterval(timer);
    }
    window.scrollTo(0, 0);
  }, [pathname, hash]);
  return null;
}

function GuestOnly({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  if (session && session.identifier) {
    return <Navigate to={session.role === 'admin' ? '/admin' : '/watch'} replace />;
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<GuestOnly><Home /></GuestOnly>} />
        <Route path="/about" element={<About />} />
        <Route path="/events" element={<Events />} />
        <Route path="/events/:id" element={<EventDetail />} />
        <Route path="/news/:id" element={<NewsDetail />} />
        <Route path="/login" element={<GuestOnly><Login /></GuestOnly>} />
        <Route path="/register" element={<GuestOnly><Register /></GuestOnly>} />
        <Route path="/register/phone" element={<GuestOnly><RegisterPhone /></GuestOnly>} />
        <Route path="/register/email" element={<GuestOnly><RegisterEmail /></GuestOnly>} />
        <Route path="/watch" element={<Watch />} />
        <Route path="/watch/events/:id" element={<WatchEventDetail />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/orders/:code" element={<OrderDetail />} />
        <Route path="/admin" element={<RequireAdmin><AdminLayout /></RequireAdmin>}>
          <Route index element={<Dashboard />} />
          <Route path="events" element={<EventsList />} />
          <Route path="events/new" element={<EventEdit />} />
          <Route path="events/:id" element={<EventEdit />} />
          <Route path="orders" element={<OrdersList />} />
          <Route path="orders/:code" element={<OrderView />} />
          <Route path="users" element={<UsersList />} />
          <Route path="users/:id" element={<UserView />} />
          <Route path="content" element={<Content />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
