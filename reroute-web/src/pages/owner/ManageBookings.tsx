import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CalendarCheck, ChevronDown } from 'lucide-react';
import Layout from '../../components/layout/Layout';
import { useAuth } from '../../context/AuthContext';
import { subscribeOwnerFarmhouses } from '../../services/farmhouseService';
import { subscribeAllBookings, adminVerifyPayment } from '../../services/bookingService';
import { useToast } from '../../context/ToastContext';
import type { Farmhouse, Booking } from '../../types/index';

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
  const cls = map[status ?? ''] ?? 'badge-gold';
  return <span className={`${cls} capitalize text-xs`}>{(status ?? 'pending').replace('_', ' ')}</span>;
}

export default function ManageBookings() {
  const { farmhouseId: paramFarmhouseId } = useParams<{ farmhouseId?: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { show } = useToast();

  const [farmhouses, setFarmhouses] = useState<Farmhouse[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedFarmhouseId, setSelectedFarmhouseId] = useState<string>(paramFarmhouseId ?? '');
  const [loading, setLoading] = useState(true);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    if ((user as any).role !== 'owner') { navigate('/login'); return; }
  }, [user, navigate]);

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeOwnerFarmhouses(user.uid, (list) => {
      setFarmhouses(list);
      if (!selectedFarmhouseId && list.length > 0) {
        setSelectedFarmhouseId(paramFarmhouseId ?? list[0].id ?? '');
      }
      setLoading(false);
    });
    return () => unsub();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeAllBookings((list) => {
      setBookings(list.filter((b) => (b as any).ownerId === user.uid));
    });
    return () => unsub();
  }, [user]);

  const displayed = selectedFarmhouseId
    ? bookings.filter((b) => b.farmhouseId === selectedFarmhouseId)
    : bookings;

  const sorted = [...displayed].sort((a, b) => {
    const ta = toTs(a.createdAt);
    const tb = toTs(b.createdAt);
    return tb - ta;
  });

  function toTs(val: unknown): number {
    if (!val) return 0;
    if (typeof val === 'object' && val !== null && 'seconds' in val) {
      return (val as { seconds: number }).seconds;
    }
    return new Date(val as string).getTime() / 1000;
  }

  const handleVerify = async (bookingId: string) => {
    setVerifyingId(bookingId);
    try {
      await adminVerifyPayment(bookingId);
      show('Payment verified!', 'success');
    } catch {
      show('Failed to verify payment', 'error');
    } finally {
      setVerifyingId(null);
    }
  };

  if (!user) return null;

  return (
    <Layout>
      <div className="page-wrap max-w-5xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Manage Bookings</h1>
          {farmhouses.length > 1 && (
            <div className="relative w-full sm:w-64">
              <select
                value={selectedFarmhouseId}
                onChange={(e) => setSelectedFarmhouseId(e.target.value)}
                className="input-field appearance-none pr-10"
              >
                <option value="">All Farmhouses</option>
                {farmhouses.map((fh) => (
                  <option key={fh.id} value={fh.id}>
                    {fh.name}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={16}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              />
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-yellow-500" />
          </div>
        ) : sorted.length === 0 ? (
          <div className="card text-center py-16">
            <CalendarCheck size={48} className="mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500">No bookings found.</p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden sm:block card overflow-x-auto p-0">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-3 text-gray-600 font-medium">Guest</th>
                    <th className="text-left px-4 py-3 text-gray-600 font-medium">Dates</th>
                    <th className="text-center px-4 py-3 text-gray-600 font-medium">Guests</th>
                    <th className="text-right px-4 py-3 text-gray-600 font-medium">Amount</th>
                    <th className="text-center px-4 py-3 text-gray-600 font-medium">Status</th>
                    <th className="text-center px-4 py-3 text-gray-600 font-medium">Payment</th>
                    <th className="text-left px-4 py-3 text-gray-600 font-medium">UTR</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {sorted.map((b) => (
                    <tr key={b.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-800 font-medium">{b.userName ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                        {b.checkInDate} → {b.checkOutDate}
                      </td>
                      <td className="px-4 py-3 text-center text-gray-600">{b.guests}</td>
                      <td className="px-4 py-3 text-right font-semibold">{fmt(b.totalPrice)}</td>
                      <td className="px-4 py-3 text-center">
                        <StatusBadge status={b.status} />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <StatusBadge status={b.paymentStatus} />
                      </td>
                      <td className="px-4 py-3 text-gray-500 font-mono text-xs">
                        {b.utrNumber ?? '—'}
                      </td>
                      <td className="px-4 py-3">
                        {(b.paymentStatus === 'utr_submitted' ||
                          b.status === 'payment_pending') && (
                          <button
                            onClick={() => handleVerify(b.id!)}
                            disabled={verifyingId === b.id}
                            className="btn-primary text-xs py-1.5 px-3 disabled:opacity-50 whitespace-nowrap"
                          >
                            {verifyingId === b.id ? 'Verifying...' : 'Verify Payment'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="sm:hidden space-y-4">
              {sorted.map((b) => (
                <div key={b.id} className="card">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-semibold text-gray-800">{b.userName ?? 'Guest'}</p>
                      <p className="text-sm text-gray-500">
                        {b.checkInDate} → {b.checkOutDate}
                      </p>
                    </div>
                    <StatusBadge status={b.status} />
                  </div>
                  <div className="flex items-center justify-between text-sm text-gray-600 mb-3">
                    <span>{b.guests} guests</span>
                    <span className="font-bold text-gray-900">{fmt(b.totalPrice)}</span>
                  </div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs text-gray-500">Payment:</span>
                    <StatusBadge status={b.paymentStatus} />
                    {b.utrNumber && (
                      <span className="text-xs font-mono text-gray-400 ml-1">UTR: {b.utrNumber}</span>
                    )}
                  </div>
                  {(b.paymentStatus === 'utr_submitted' || b.status === 'payment_pending') && (
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
