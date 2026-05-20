import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuth } from './auth.jsx';
import Home from './pages/Home.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Watch from './pages/Watch.jsx';
import Settings from './pages/Settings.jsx';
import Profile from './pages/Profile.jsx';
import OrderDetail from './pages/OrderDetail.jsx';

function ScrollToTop() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) return; // let in-page anchors handle themselves
    window.scrollTo(0, 0);
  }, [pathname, hash]);
  return null;
}

// Redirect logged-in visitors away from guest pages (home, login, register).
// Signed-in users should land on /watch instead of seeing the marketing site again.
function GuestOnly({ children }) {
  const { session } = useAuth();
  if (session && session.identifier) return <Navigate to="/watch" replace />;
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
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
