import { lazy, Suspense, useEffect, type ReactNode } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useAuth, RequireAdmin } from "./auth";
import Home from "./pages/Home";

// Lazy-load every non-landing page so the initial JS bundle only contains
// the homepage. Other routes are fetched on demand, which keeps first paint
// fast and shrinks the admin surface area for public visitors.
const Events = lazy(() => import("./pages/Events"));
const EventDetail = lazy(() => import("./pages/EventDetail"));
const PetitionsOverview = lazy(() => import("./pages/PetitionsOverview"));
const TransparencyDocument = lazy(() => import("./pages/TransparencyDocument"));
const Legal = lazy(() => import("./pages/Legal"));
const WatchVOD = lazy(() => import("./pages/WatchVOD"));
const WatchEventDetail = lazy(() => import("./pages/WatchEventDetail"));
const NewsDetail = lazy(() => import("./pages/NewsDetail"));
const News = lazy(() => import("./pages/News"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const RegisterPhone = lazy(() => import("./pages/RegisterPhone"));
const RegisterEmail = lazy(() => import("./pages/RegisterEmail"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const Watch = lazy(() => import("./pages/watch"));
const Settings = lazy(() => import("./pages/Settings"));
const Profile = lazy(() => import("./pages/Profile"));
const OrderDetail = lazy(() => import("./pages/OrderDetail"));
const History = lazy(() => import("./pages/History"));
const HistoryDetail = lazy(() => import("./pages/HistoryDetail"));
const AdminLayout = lazy(() => import("./admin/AdminLayout"));
const Dashboard = lazy(() => import("./admin/pages/Dashboard"));
const EventsList = lazy(() => import("./admin/pages/EventsList"));
const EventEdit = lazy(() => import("./admin/pages/EventEdit"));
const EventCreate = lazy(() => import("./admin/pages/EventCreate"));
const AdminEventDetail = lazy(() => import("./admin/pages/EventDetail"));
const OrdersList = lazy(() => import("./admin/pages/OrdersList"));
const OrderView = lazy(() => import("./admin/pages/OrderView"));
const UsersList = lazy(() => import("./admin/pages/UsersList"));
const UserView = lazy(() => import("./admin/pages/UserView"));
const Content = lazy(() => import("./admin/pages/Content"));
const HistoryAdmin = lazy(() => import("./admin/pages/History"));

function RouteFallback() {
  return (
    <div className="min-h-screen grid place-items-center bg-white">
      <div className="w-10 h-10 rounded-full border-[3px] border-solid border-black/10 border-t-black/50 [animation:routeSpin_0.9s_linear_infinite]" />
      <style>{`@keyframes routeSpin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function ScrollToTop() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) {
      const id = hash.slice(1);
      const tryScroll = () => {
        const el = document.getElementById(id);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
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
    return (
      <Navigate to={session.role === "admin" ? "/admin" : "/watch"} replace />
    );
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route
          path="/"
          element={
            <GuestOnly>
              <Home />
            </GuestOnly>
          }
        />
        <Route path="/events" element={<Events />} />
        <Route path="/events/:id" element={<EventDetail />} />
        <Route path="/transparency/petitions" element={<PetitionsOverview />} />
        <Route path="/transparency/:slug" element={<TransparencyDocument />} />
        <Route path="/legal" element={<Legal />} />
        <Route path="/news" element={<News />} />
        <Route path="/news/:id" element={<NewsDetail />} />
        <Route path="/history" element={<History />} />
        <Route path="/history/:id" element={<HistoryDetail />} />
        <Route
          path="/login"
          element={
            <GuestOnly>
              <Login />
            </GuestOnly>
          }
        />
        <Route
          path="/register"
          element={
            <GuestOnly>
              <Register />
            </GuestOnly>
          }
        />
        <Route
          path="/register/phone"
          element={
            <GuestOnly>
              <RegisterPhone />
            </GuestOnly>
          }
        />
        <Route
          path="/register/email"
          element={
            <GuestOnly>
              <RegisterEmail />
            </GuestOnly>
          }
        />
        <Route
          path="/forgot-password"
          element={
            <GuestOnly>
              <ForgotPassword />
            </GuestOnly>
          }
        />
        <Route path="/watch" element={<Watch />} />
        <Route path="/watch/events/:id" element={<WatchEventDetail />} />
        <Route path="/watch/:eventId/vod" element={<WatchVOD />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/orders/:code" element={<OrderDetail />} />
        <Route
          path="/admin"
          element={
            <RequireAdmin>
              <AdminLayout />
            </RequireAdmin>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="events" element={<EventsList />} />
          <Route path="events/new" element={<EventCreate />} />
          <Route path="events/:id" element={<AdminEventDetail />} />
          <Route path="events/:id/edit" element={<EventEdit />} />
          <Route path="orders" element={<OrdersList />} />
          <Route path="orders/:code" element={<OrderView />} />
          <Route path="users" element={<UsersList />} />
          <Route path="users/:id" element={<UserView />} />
          <Route path="content" element={<Content />} />
          <Route path="history" element={<HistoryAdmin />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </Suspense>
    </>
  );
}
