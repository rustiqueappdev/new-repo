import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Sun, Moon, Menu, X, ChevronDown, User, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userDrop, setUserDrop] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMobileOpen(false);
    setUserDrop(false);
  }, [location.pathname]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setUserDrop(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const initials = (user?.displayName || user?.email || 'U').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  async function doLogout() {
    await logout();
    toast.success('Signed out');
    navigate('/');
  }

  const NavLink = ({ to, children }: { to: string; children: React.ReactNode }) => {
    const active = location.pathname.startsWith(to);
    return (
      <Link to={to} className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${active ? 'text-gold-600 dark:text-gold-400 bg-gold-50 dark:bg-gold-900/20' : 'text-navy-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-navy-700'}`}>
        {children}
      </Link>
    );
  };

  return (
    <nav className="sticky top-0 z-50 bg-white/95 dark:bg-navy-800/95 backdrop-blur-md border-b border-gray-100 dark:border-navy-700 shadow-sm">
      <div className="page-wrap">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center shadow-gold">
              <span className="text-white font-bold">R</span>
            </div>
            <span className="text-xl font-bold text-navy-800 dark:text-white group-hover:text-gold-500 transition-colors">ReRoute</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {user?.role === 'customer' && (<>
              <NavLink to="/explore">Explore</NavLink>
              <NavLink to="/bookings">My Bookings</NavLink>
              <NavLink to="/wishlist">Wishlist</NavLink>
            </>)}
            {user?.role === 'owner' && (<>
              <NavLink to="/owner">Dashboard</NavLink>
              <NavLink to="/owner/farmhouses">My Farmhouses</NavLink>
              <NavLink to="/owner/bookings">Bookings</NavLink>
            </>)}
            {user?.role === 'admin' && (<>
              <NavLink to="/admin">Dashboard</NavLink>
              <NavLink to="/admin/approvals">Approvals</NavLink>
              <NavLink to="/admin/bookings">Bookings</NavLink>
            </>)}
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2">
            <button onClick={toggleTheme} className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-navy-700 transition-colors">
              {isDark ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            {user ? (
              <div className="relative" ref={dropRef}>
                <button onClick={() => setUserDrop(d => !d)} className="flex items-center gap-2 p-1 rounded-xl hover:bg-gray-100 dark:hover:bg-navy-700 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center overflow-hidden">
                    {user.photoURL
                      ? <img src={user.photoURL} alt="" className="w-full h-full object-cover" />
                      : <span className="text-white text-xs font-semibold">{initials}</span>}
                  </div>
                  <ChevronDown size={14} className="text-gray-500 hidden sm:block" />
                </button>
                {userDrop && (
                  <div className="absolute right-0 top-full mt-1 bg-white dark:bg-navy-800 border border-gray-200 dark:border-navy-600 rounded-xl shadow-lg py-1 min-w-48 z-50">
                    <div className="px-4 py-2 border-b border-gray-100 dark:border-navy-700">
                      <p className="font-medium text-navy-800 dark:text-gray-100 text-sm">{user.displayName}</p>
                      <p className="text-xs text-gray-500">{user.email}</p>
                      <span className="badge-gold mt-1 capitalize">{user.role}</span>
                    </div>
                    {user.role === 'customer' && (
                      <Link to="/profile" className="flex items-center gap-2 px-4 py-2 text-sm text-navy-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-navy-700">
                        <User size={14} /> Profile
                      </Link>
                    )}
                    <button onClick={doLogout} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20">
                      <LogOut size={14} /> Sign out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="hidden sm:flex items-center gap-2">
                <Link to="/login" className="btn-ghost text-sm">Sign in</Link>
                <Link to="/register" className="btn-primary !px-4 !py-2 text-sm">Get Started</Link>
              </div>
            )}

            <button onClick={() => setMobileOpen(o => !o)} className="md:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-navy-700 transition-colors">
              {mobileOpen ? <X size={20} className="text-navy-800 dark:text-gray-100" /> : <Menu size={20} className="text-navy-800 dark:text-gray-100" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-gray-100 dark:border-navy-700 bg-white dark:bg-navy-800 px-4 py-3 space-y-1">
          {user ? (<>
            {user.role === 'customer' && (<>
              <MLink to="/explore">Explore</MLink>
              <MLink to="/bookings">My Bookings</MLink>
              <MLink to="/wishlist">Wishlist</MLink>
              <MLink to="/profile">Profile</MLink>
            </>)}
            {user.role === 'owner' && (<>
              <MLink to="/owner">Dashboard</MLink>
              <MLink to="/owner/farmhouses">My Farmhouses</MLink>
              <MLink to="/owner/bookings">Bookings</MLink>
            </>)}
            {user.role === 'admin' && (<>
              <MLink to="/admin">Dashboard</MLink>
              <MLink to="/admin/approvals">Approvals</MLink>
              <MLink to="/admin/farmhouses">Farmhouses</MLink>
              <MLink to="/admin/bookings">Bookings</MLink>
              <MLink to="/admin/users">Users</MLink>
              <MLink to="/admin/coupons">Coupons</MLink>
            </>)}
            <button onClick={doLogout} className="w-full text-left px-4 py-2.5 text-sm text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20">
              Sign out
            </button>
          </>) : (<>
            <MLink to="/login">Sign in</MLink>
            <MLink to="/register">Get Started</MLink>
          </>)}
        </div>
      )}
    </nav>
  );
}

function MLink({ to, children }: { to: string; children: React.ReactNode }) {
  const active = useLocation().pathname.startsWith(to);
  return (
    <Link to={to} className={`block px-4 py-2.5 text-sm font-medium rounded-lg transition-colors ${active ? 'text-gold-600 dark:text-gold-400 bg-gold-50 dark:bg-gold-900/20' : 'text-navy-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-navy-700'}`}>
      {children}
    </Link>
  );
}
