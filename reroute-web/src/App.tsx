import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { WishlistProvider } from './context/WishlistContext';
import { ToastProvider } from './context/ToastContext';

// Lazy-load pages for performance
const Welcome          = lazy(() => import('./pages/Welcome'));
const Login            = lazy(() => import('./pages/auth/Login'));
const Register         = lazy(() => import('./pages/auth/Register'));
const ContactAdmin     = lazy(() => import('./pages/ContactAdmin'));

// Customer
const Explore          = lazy(() => import('./pages/customer/Explore'));
const FarmhouseDetail  = lazy(() => import('./pages/customer/FarmhouseDetail'));
const Bookings         = lazy(() => import('./pages/customer/Bookings'));
const Wishlist         = lazy(() => import('./pages/customer/Wishlist'));
const Profile          = lazy(() => import('./pages/customer/Profile'));

// Owner
const OwnerHome           = lazy(() => import('./pages/owner/OwnerHome'));
const MyFarmhouses        = lazy(() => import('./pages/owner/MyFarmhouses'));
const ManageBookings      = lazy(() => import('./pages/owner/ManageBookings'));
const ManageBlockedDates  = lazy(() => import('./pages/owner/ManageBlockedDates'));
const RegisterFarmhouse   = lazy(() => import('./pages/owner/RegisterFarmhouse'));

// Admin (lightweight pages — full admin panel is in /reroute-admin)
const AdminDashboard      = lazy(() => import('./pages/admin/Dashboard'));
const FarmhouseApprovals  = lazy(() => import('./pages/admin/FarmhouseApprovals'));
const AdminBookings       = lazy(() => import('./pages/admin/AdminBookings'));
const AdminCoupons        = lazy(() => import('./pages/admin/AdminCoupons'));
const AdminUsers          = lazy(() => import('./pages/admin/AdminUsers'));

function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-navy-900">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center shadow-gold animate-pulse">
          <span className="text-white font-bold text-xl">R</span>
        </div>
        <div className="w-6 h-6 border-2 border-gold-400 border-t-transparent rounded-full animate-spin" />
      </div>
    </div>
  );
}

/** Guard: redirect to /login if not authenticated */
function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <LoadingFallback />;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  return <>{children}</>;
}

/** Guard: redirect if not owner or admin */
function RequireOwner({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingFallback />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'owner' && user.role !== 'admin') return <Navigate to="/explore" replace />;
  return <>{children}</>;
}

/** Guard: admin only */
function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingFallback />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'admin') return <Navigate to="/explore" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        {/* Public */}
        <Route path="/"        element={<Welcome />} />
        <Route path="/login"   element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/contact" element={<ContactAdmin />} />

        {/* Customer */}
        <Route path="/explore" element={<RequireAuth><Explore /></RequireAuth>} />
        <Route path="/farmhouse/:id" element={<RequireAuth><FarmhouseDetail /></RequireAuth>} />
        <Route path="/bookings" element={<RequireAuth><Bookings /></RequireAuth>} />
        <Route path="/wishlist" element={<RequireAuth><Wishlist /></RequireAuth>} />
        <Route path="/profile"  element={<RequireAuth><Profile /></RequireAuth>} />

        {/* Owner */}
        <Route path="/owner"                       element={<RequireOwner><OwnerHome /></RequireOwner>} />
        <Route path="/owner/farmhouses"            element={<RequireOwner><MyFarmhouses /></RequireOwner>} />
        <Route path="/owner/bookings"              element={<RequireOwner><ManageBookings /></RequireOwner>} />
        <Route path="/owner/bookings/:farmhouseId" element={<RequireOwner><ManageBookings /></RequireOwner>} />
        <Route path="/owner/blocked/:farmhouseId"  element={<RequireOwner><ManageBlockedDates /></RequireOwner>} />
        <Route path="/owner/register"              element={<RequireOwner><RegisterFarmhouse /></RequireOwner>} />

        {/* Admin */}
        <Route path="/admin"           element={<RequireAdmin><AdminDashboard /></RequireAdmin>} />
        <Route path="/admin/approvals" element={<RequireAdmin><FarmhouseApprovals /></RequireAdmin>} />
        <Route path="/admin/bookings"  element={<RequireAdmin><AdminBookings /></RequireAdmin>} />
        <Route path="/admin/coupons"   element={<RequireAdmin><AdminCoupons /></RequireAdmin>} />
        <Route path="/admin/users"     element={<RequireAdmin><AdminUsers /></RequireAdmin>} />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <WishlistProvider>
            <ToastProvider>
              <AppRoutes />
            </ToastProvider>
          </WishlistProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
