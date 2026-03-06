import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { CalendarCheck } from 'lucide-react';
import Layout from '../../components/layout/Layout';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { adminVerifyPayment } from '../../services/bookingService';
import type { Booking } from '../../types/index';

type FilterTab = 'all' | 'payment_pending' | 'confirmed' | 'cancelled';

function fmt(n?: number) {
  if (n == null) return '—';
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

function StatusBadge({ status }: { status?: string }) {
  const map: Record<string, string> = {
    confirmed: 'badge-green',
    pending: 'badge-gold',
    cancelled: 'badge-red',
    payment_pending: 'badge-blue',
    utr_submitted: 'badge-blue',
  };
  return (
    <span className={`${map[status ?? ''] ?? 'badge-gold'} capitalize text-xs`}>
      {(status ?? '').replace(/_/g, ' ')}
    </span>
  );
}

function toTs(val: unknown): number {
  if (!val) return 0;
  if (typeof val === 'object' && val !== null && 'seconds' in val) return (val as { seconds: number }).seconds;
  return new Date(val as string).getTime() / 1000;
}

export default function AdminBookings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterTab>('all');
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    if ((user as any).role !== 'admin') { navigate('/'); return; }
  }, [user, navigate]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'bookings'), (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Booking));
      setBookings(list.sort((a, b) => toTs(b.createdAt) - toTs(a.createdAt)));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const filtered = bookings.filter((b) => {
    if (filter === 'all') return true;
    if (filter === 'payment_pending') return b.paymentStatus === 'payment_pending' || b.paymentStatus === 'utr_submitted';
    if (filter === 'confirmed') return b.status === 'confirmed';
    if (filter === 'cancelled') return b.status === 'cancelled';
    return true;
  });

  const handleVerify = async (id: string) => {
    setVerifyingId(id);
    try {
      await adminVerifyPayment(id);
      showToast('Payment verified!', 'success');
    } catch { showToast('Failed to verify payment', 'error'); }
    finally { setVerifyingId(null); }
  };

  const tabCounts = {
    all: bookings.length,
    payment_pending: bookings.filter((b) => b.paymentStatus === 'payment_pending' || b.paymentStatus === 'utr_submitted').length,
    confirmed: bookings.filter((b) => b.status === 'confirmed').length,
    cancelled: bookings.filter((b) => b.status === 'cancelled').length,
  };

  if (!user || (user as any).role !== 'admin') return null;

  return (
    <Layout>
      <div className="page-wrap max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">All Bookings</h1>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {(
            [
              { key: 'all', label: 'All' },
              { key: 'payment_pending', label: 'Pending Payment' },
              { key: 'confirmed', label: 'Confirmed' },
              { key: 'cancelled', label: 'Cancelled' },
            ] as { key: FilterTab; label: string }[]
          ).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition border ${
                filter === key
                  ? 'bg-yellow-500 text-white border-yellow-500'
                  : 'bg-white text-gray-600 border-gray-300 hover:border-yellow-400'
              }`}
            >
              {label} ({tabCounts[key]})
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-yellow-500" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="card text-center py-16">
            <CalendarCheck size={48} className="mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500">No bookings found.</p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block card overflow-x-auto p-0">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-3 text-gray-600 font-medium">ID</th>
                    <th className="text-left px-4 py-3 text-gray-600 font-medium">Farmhouse</th>
                    <th className="text-left px-4 py-3 text-gray-600 font-medium">Guest</th>
                    <th className="text-left px-4 py-3 text-gray-600 font-medium">Dates</th>
                    <th className="text-right px-4 py-3 text-gray-600 font-medium">Amount</th>
                    <th className="text-center px-4 py-3 text-gray-600 font-medium">Status</th>
                    <th className="text-center px-4 py-3 text-gray-600 font-medium">Payment</th>
                    <th className="text-left px-4 py-3 text-gray-600 font-medium">UTR</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map((b) => (
                    <tr key={b.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-400 font-mono text-xs">
                        {b.id?.slice(0, 8)}...
                      </td>
                      <td className="px-4 py-3 text-gray-800 max-w-[120px] truncate">
                        {b.farmhouseName ?? b.farmhouseId}
                      </td>
                      <td className="px-4 py-3 text-gray-600 max-w-[100px] truncate">
                        {b.userName ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                        {b.checkIn} → {b.checkOut}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold">{fmt(b.totalPrice)}</td>
                      <td className="px-4 py-3 text-center"><StatusBadge status={b.status} /></td>
                      <td className="px-4 py-3 text-center"><StatusBadge status={b.paymentStatus} /></td>
                      <td className="px-4 py-3 text-gray-500 font-mono text-xs">{b.utrNumber ?? '—'}</td>
                      <td className="px-4 py-3">
                        {(b.paymentStatus === 'utr_submitted' || b.paymentStatus === 'payment_pending') && (
                          <button
                            onClick={() => handleVerify(b.id!)}
                            disabled={verifyingId === b.id}
                            className="btn-primary text-xs py-1.5 px-3 whitespace-nowrap disabled:opacity-50"
                          >
                            {verifyingId === b.id ? 'Verifying...' : 'Verify'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-4">
              {filtered.map((b) => (
                <div key={b.id} className="card">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-semibold text-gray-800 text-sm">{b.farmhouseName ?? b.farmhouseId}</p>
                      <p className="text-xs text-gray-500">{b.userName}</p>
                    </div>
                    <StatusBadge status={b.status} />
                  </div>
                  <p className="text-xs text-gray-500 mb-2">{b.checkIn} → {b.checkOut}</p>
                  <div className="flex items-center justify-between mb-2">
                    <StatusBadge status={b.paymentStatus} />
                    <span className="font-bold text-sm">{fmt(b.totalPrice)}</span>
                  </div>
                  {b.utrNumber && (
                    <p className="text-xs text-gray-400 font-mono mb-2">UTR: {b.utrNumber}</p>
                  )}
                  {(b.paymentStatus === 'utr_submitted' || b.paymentStatus === 'payment_pending') && (
                    <button
                      onClick={() => handleVerify(b.id!)}
                      disabled={verifyingId === b.id}
                      className="btn-primary w-full text-sm disabled:opacity-50"
                    >
                      {verifyingId === b.id ? 'Verifying...' : 'Verify Payment'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
