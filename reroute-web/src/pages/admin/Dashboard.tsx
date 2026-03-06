import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  Clock,
  Users,
  CalendarCheck,
  IndianRupee,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  limit,
  updateDoc,
  doc,
} from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import Layout from '../../components/layout/Layout';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { adminVerifyPayment } from '../../services/bookingService';
import type { Farmhouse, Booking } from '../../types/index';

function fmt(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

function StatusBadge({ status }: { status?: string }) {
  const map: Record<string, string> = {
    approved: 'badge-green',
    pending: 'badge-gold',
    rejected: 'badge-red',
    confirmed: 'badge-green',
    cancelled: 'badge-red',
    payment_pending: 'badge-blue',
    utr_submitted: 'badge-blue',
  };
  return (
    <span className={`${map[status ?? ''] ?? 'badge-gold'} capitalize text-xs`}>
      {(status ?? '').replace('_', ' ')}
    </span>
  );
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: string;
}
function StatCard({ icon, label, value, color }: StatCardProps) {
  return (
    <div className="card flex items-center gap-4">
      <div className={`p-3 rounded-xl ${color}`}>{icon}</div>
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [farmhouses, setFarmhouses] = useState<Farmhouse[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [userCount, setUserCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    if ((user as any).role !== 'admin') { navigate('/'); return; }
  }, [user, navigate]);

  useEffect(() => {
    const unsub1 = onSnapshot(collection(db, 'farmhouses'), (snap) => {
      setFarmhouses(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Farmhouse)));
    });
    const unsub2 = onSnapshot(collection(db, 'bookings'), (snap) => {
      setBookings(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Booking)));
      setLoading(false);
    });
    const unsub3 = onSnapshot(collection(db, 'users'), (snap) => {
      setUserCount(snap.size);
    });
    return () => { unsub1(); unsub2(); unsub3(); };
  }, []);

  const pendingFarmhouses = farmhouses.filter((f) => f.status === 'pending');
  const totalRevenue = bookings
    .filter((b) => b.status === 'confirmed')
    .reduce((sum, b) => sum + (b.totalPrice ?? 0), 0);

  const recentPending = pendingFarmhouses.slice(0, 5);
  const recentBookings = [...bookings]
    .sort((a, b) => toTs(b.createdAt) - toTs(a.createdAt))
    .slice(0, 5);

  function toTs(val: unknown): number {
    if (!val) return 0;
    if (typeof val === 'object' && val !== null && 'seconds' in val) return (val as { seconds: number }).seconds;
    return new Date(val as string).getTime() / 1000;
  }

  const handleApprove = async (id: string) => {
    try {
      await updateDoc(doc(db, 'farmhouses', id), { status: 'approved' });
      showToast('Farmhouse approved!', 'success');
    } catch { showToast('Failed to approve', 'error'); }
  };

  const handleReject = async (id: string) => {
    try {
      await updateDoc(doc(db, 'farmhouses', id), { status: 'rejected' });
      showToast('Farmhouse rejected', 'success');
    } catch { showToast('Failed to reject', 'error'); }
  };

  const handleVerify = async (id: string) => {
    try {
      await adminVerifyPayment(id);
      showToast('Payment verified!', 'success');
    } catch { showToast('Failed to verify', 'error'); }
  };

  if (!user || (user as any).role !== 'admin') return null;

  return (
    <Layout>
      <div className="page-wrap max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Admin Dashboard</h1>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-yellow-500" />
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <StatCard
                icon={<Building2 size={22} className="text-yellow-600" />}
                label="Total Farmhouses"
                value={farmhouses.length}
                color="bg-yellow-100"
              />
              <StatCard
                icon={<Clock size={22} className="text-orange-600" />}
                label="Pending Approvals"
                value={pendingFarmhouses.length}
                color="bg-orange-100"
              />
              <StatCard
                icon={<Users size={22} className="text-blue-600" />}
                label="Total Users"
                value={userCount}
                color="bg-blue-100"
              />
              <StatCard
                icon={<CalendarCheck size={22} className="text-green-600" />}
                label="Total Bookings"
                value={bookings.length}
                color="bg-green-100"
              />
            </div>

            {/* Revenue card */}
            <div className="card flex items-center gap-4 mb-8 bg-gradient-to-r from-yellow-50 to-yellow-100 border border-yellow-200">
              <div className="p-3 bg-yellow-500 rounded-xl">
                <IndianRupee size={24} className="text-white" />
              </div>
              <div>
                <p className="text-sm text-yellow-700">Total Revenue (Confirmed)</p>
                <p className="text-3xl font-bold gold-text">{fmt(totalRevenue)}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Pending Farmhouses */}
              <div>
                <h2 className="section-title">Pending Approvals</h2>
                {recentPending.length === 0 ? (
                  <div className="card text-center text-gray-400 py-8">No pending approvals</div>
                ) : (
                  <div className="space-y-3">
                    {recentPending.map((fh) => (
                      <div key={fh.id} className="card flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-800 truncate">{fh.name}</p>
                          <p className="text-sm text-gray-500 truncate">{fh.city} · {fh.ownerEmail}</p>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          <button
                            onClick={() => handleApprove(fh.id!)}
                            className="p-1.5 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg transition"
                            title="Approve"
                          >
                            <CheckCircle size={18} />
                          </button>
                          <button
                            onClick={() => handleReject(fh.id!)}
                            className="p-1.5 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition"
                            title="Reject"
                          >
                            <XCircle size={18} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Recent Bookings */}
              <div>
                <h2 className="section-title">Recent Bookings</h2>
                {recentBookings.length === 0 ? (
                  <div className="card text-center text-gray-400 py-8">No bookings yet</div>
                ) : (
                  <div className="space-y-3">
                    {recentBookings.map((b) => (
                      <div key={b.id} className="card">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-semibold text-gray-800 text-sm">{b.farmhouseName ?? b.farmhouseId}</p>
                            <p className="text-xs text-gray-500">{b.userName} · {b.checkIn} → {b.checkOut}</p>
                          </div>
                          <StatusBadge status={b.status} />
                        </div>
                        <div className="flex items-center justify-between">
                          <StatusBadge status={b.paymentStatus} />
                          <span className="font-bold text-sm">{fmt(b.totalPrice ?? 0)}</span>
                        </div>
                        {(b.paymentStatus === 'utr_submitted' || b.paymentStatus === 'payment_pending') && (
                          <button
                            onClick={() => handleVerify(b.id!)}
                            className="btn-primary w-full text-xs py-1.5 mt-2"
                          >
                            Verify Payment
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
