import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { WishlistProvider } from './context/WishlistContext';
import { ToastProvider } from './context/ToastContext';

// Lazy-load all pages
const Welcome         = lazy(() => import('./pages/Welcome'));
const Login           = lazy(() => import('./pages/auth/Login'));
const ContactAdmin    = lazy(() => import('./pages/ContactAdmin'));

// Public — no login needed
const Explore         = lazy(() => import('./pages/customer/Explore'));
const FarmhouseDetail = lazy(() => import('./pages/customer/FarmhouseDetail'));

// Auth-required (customer)
const Bookings        = lazy(() => import('./pages/customer/Bookings'));
const Wishlist        = lazy(() => import('./pages/customer/Wishlist'));
const Profile         = lazy(() => import('./pages/customer/Profile'));

// Owner
const OwnerHome           = lazy(() => import('./pages/owner/OwnerHome'));
const MyFarmhouses        = lazy(() => import('./pages/owner/MyFarmhouses'));
const ManageBookings      = lazy(() => import('./pages/owner/ManageBookings'));
const ManageBlockedDates  = lazy(() => import('./pages/owner/ManageBlockedDates'));
const RegisterFarmhouse   = lazy(() => import('./pages/owner/RegisterFarmhouse'));

function Loader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-navy-900">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center shadow-gold animate-pulse">
          <span className="text-white font-bold text-xl">R</span>
        </div>
        <div className="w-5 h-5 border-2 border-gold-400 border-t-transparent rounded-full animate-spin" />
      </div>
    </div>
  );
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Loader />;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  return <>{children}</>;
}

function RequireOwner({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <Loader />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'owner' && user.role !== 'admin') return <Navigate to="/explore" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Suspense fallback={<Loader />}>
      <Routes>
        {/* Public */}
        <Route path="/"              element={<Welcome />} />
        <Route path="/login"         element={<Login />} />
        <Route path="/contact"       element={<ContactAdmin />} />
        <Route path="/explore"       element={<Explore />} />           {/* No login required */}
        <Route path="/farmhouse/:id" element={<FarmhouseDetail />} />   {/* No login required */}

        {/* Auth-required customer */}
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
