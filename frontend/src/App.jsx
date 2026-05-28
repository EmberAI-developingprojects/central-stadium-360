import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import React, { useEffect } from 'react';
import { useAuth, RequireAdmin } from './auth.jsx';
import Home from './pages/Home.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Watch from './pages/Watch.jsx';
import Settings from './pages/Settings.jsx';
import Profile from './pages/Profile.jsx';
import OrderDetail from './pages/OrderDetail.jsx';
import AdminLayout from './admin/AdminLayout.jsx';
import Dashboard from './admin/pages/Dashboard.jsx';
import EventsList from './admin/pages/EventsList.jsx';
import EventEdit from './admin/pages/EventEdit.jsx';
import OrdersList from './admin/pages/OrdersList.jsx';
import OrderView from './admin/pages/OrderView.jsx';
import UsersList from './admin/pages/UsersList.jsx';
import UserView from './admin/pages/UserView.jsx';
import Content from './admin/pages/Content.jsx';

function ScrollToTop() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) return; // let in-page anchors handle themselves
    window.scrollTo(0, 0);
  }, [pathname, hash]);
  return null;
}

// Redirect logged-in visitors away from guest pages (home, login, register).
// Admins land in /admin; regular users land in /watch.
function GuestOnly({ children }) {
  const { session } = useAuth();
  if (session && session.identifier) {
    return <Navigate to={session.role === 'admin' ? '/admin' : '/watch'} replace />;
  }
  return children;
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<GuestOnly><Home /></GuestOnly>} />
        <Route path="/login" element={<GuestOnly><Login /></GuestOnly>} />
        <Route path="/register" element={<GuestOnly><Register /></GuestOnly>} />
        <Route path="/watch" element={<Watch />} />
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
          <Route path="users/:identifier" element={<UserView />} />
          <Route path="content" element={<Content />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
