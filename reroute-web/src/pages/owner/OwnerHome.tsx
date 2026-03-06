import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Home,
  CalendarCheck,
  Clock,
  IndianRupee,
  PlusCircle,
  BookOpen,
  Building2,
} from 'lucide-react';
import Layout from '../../components/layout/Layout';
import { useAuth } from '../../context/AuthContext';
import { subscribeOwnerFarmhouses } from '../../services/farmhouseService';
import { subscribeAllBookings } from '../../services/bookingService';
import type { Farmhouse, Booking } from '../../types/index';

function fmt(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    confirmed: 'badge-green',
    pending: 'badge-gold',
    cancelled: 'badge-red',
    payment_pending: 'badge-blue',
    utr_submitted: 'badge-blue',
  };
  return (
    <span className={`${map[status] ?? 'badge-blue'} capitalize text-xs`}>
      {status.replace('_', ' ')}
    </span>
  );
}

export default function OwnerHome() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [farmhouses, setFarmhouses] = useState<Farmhouse[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    if ((user as any).role !== 'owner') {
      navigate('/login');
      return;
    }
  }, [user, navigate]);

  useEffect(() => {
    if (!user) return;
    const unsub1 = subscribeOwnerFarmhouses(user.uid, (list) => {
      setFarmhouses(list);
      setLoading(false);
    });
    return () => unsub1();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const unsub2 = subscribeAllBookings((list) => {
      setBookings(list.filter((b) => b.ownerId === user.uid));
    });
    return () => unsub2();
  }, [user]);

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const totalFarmhouses = farmhouses.length;
  const totalBookings = bookings.length;
  const pendingBookings = bookings.filter(
    (b) => b.status === 'pending' || b.paymentStatus === 'payment_pending' || b.paymentStatus === 'utr_submitted'
  ).length;
  const monthRevenue = bookings
    .filter((b) => {
      if (b.status !== 'confirmed') return false;
      const d = b.createdAt
        ? new Date(
            typeof b.createdAt === 'object' && 'seconds' in (b.createdAt as object)
              ? (b.createdAt as { seconds: number }).seconds * 1000
              : (b.createdAt as string | number)
          )
        : null;
      return d && d >= startOfMonth;
    })
    .reduce((sum, b) => sum + (b.totalPrice ?? 0), 0);

  const recentBookings = [...bookings]
    .sort((a, b) => {
      const ta = a.createdAt
        ? typeof a.createdAt === 'object' && 'seconds' in (a.createdAt as object)
          ? (a.createdAt as { seconds: number }).seconds
          : new Date(a.createdAt as string).getTime() / 1000
        : 0;
      const tb = b.createdAt
        ? typeof b.createdAt === 'object' && 'seconds' in (b.createdAt as object)
          ? (b.createdAt as { seconds: number }).seconds
          : new Date(b.createdAt as string).getTime() / 1000
        : 0;
      return tb - ta;
    })
    .slice(0, 5);

  const farmhouseMap = Object.fromEntries(farmhouses.map((f) => [f.id, f.name]));

  if (!user || (user as any).role !== 'owner') return null;

  return (
    <Layout>
      <div className="page-wrap max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Hello, {user.displayName ?? 'Owner'}!
          </h1>
          <p className="text-gray-500 mt-1">Manage your farmhouses and bookings.</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="card flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-xl">
              <Home size={22} className="text-yellow-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Total Farmhouses</p>
              <p className="text-2xl font-bold text-gray-900">{totalFarmhouses}</p>
            </div>
          </div>
          <div className="card flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-xl">
              <CalendarCheck size={22} className="text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Total Bookings</p>
              <p className="text-2xl font-bold text-gray-900">{totalBookings}</p>
            </div>
          </div>
          <div className="card flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-xl">
              <Clock size={22} className="text-orange-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Pending</p>
              <p className="text-2xl font-bold text-gray-900">{pendingBookings}</p>
            </div>
          </div>
          <div className="card flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-xl">
              <IndianRupee size={22} className="text-green-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">This Month</p>
              <p className="text-xl font-bold text-gray-900">{fmt(monthRevenue)}</p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="section-title">Quick Actions</h2>
          <div className="flex flex-wrap gap-3">
            <Link to="/owner/register" className="btn-primary flex items-center gap-2">
              <PlusCircle size={18} />
              Add New Farmhouse
            </Link>
            <Link to="/owner/bookings" className="btn-outline flex items-center gap-2">
              <BookOpen size={18} />
              View Bookings
            </Link>
            <Link to="/owner/farmhouses" className="btn-secondary flex items-center gap-2">
              <Building2 size={18} />
              My Farmhouses
            </Link>
          </div>
        </div>

        {/* Recent Bookings */}
        <div>
          <h2 className="section-title">Recent Bookings</h2>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500" />
            </div>
          ) : recentBookings.length === 0 ? (
            <div className="card text-center text-gray-500 py-10">
              <CalendarCheck size={40} className="mx-auto mb-3 text-gray-300" />
              <p>No bookings yet.</p>
            </div>
          ) : (
            <div className="card overflow-x-auto p-0">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-3 text-gray-600 font-medium">Farmhouse</th>
                    <th className="text-left px-4 py-3 text-gray-600 font-medium">Guest</th>
                    <th className="text-left px-4 py-3 text-gray-600 font-medium hidden sm:table-cell">Dates</th>
                    <th className="text-right px-4 py-3 text-gray-600 font-medium">Amount</th>
                    <th className="text-center px-4 py-3 text-gray-600 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {recentBookings.map((b) => (
                    <tr key={b.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-800 font-medium max-w-[120px] truncate">
                        {farmhouseMap[b.farmhouseId] ?? b.farmhouseName ?? b.farmhouseId}
                      </td>
                      <td className="px-4 py-3 text-gray-600 max-w-[100px] truncate">
                        {b.userName ?? 'Guest'}
                      </td>
                      <td className="px-4 py-3 text-gray-500 hidden sm:table-cell whitespace-nowrap">
                        {b.checkIn} → {b.checkOut}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-800">
                        {fmt(b.totalPrice ?? 0)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <StatusBadge status={b.status ?? 'pending'} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {recentBookings.length > 0 && (
            <div className="mt-3 text-right">
              <Link to="/owner/bookings" className="text-sm text-yellow-600 hover:underline">
                View all bookings →
              </Link>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
