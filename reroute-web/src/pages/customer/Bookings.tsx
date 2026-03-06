import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarDays, Users, IndianRupee, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import Layout from '../../components/layout/Layout';
import { subscribeUserBookings, cancelBooking } from '../../services/bookingService';
import { APP_CONTACT } from '../../firebaseConfig';
import { Phone, Mail } from 'lucide-react';

type BookingStatus = 'confirmed' | 'pending' | 'payment_pending' | 'cancelled';
type TabOption = 'all' | 'upcoming' | 'past' | 'cancelled';

const STATUS_STYLES: Record<BookingStatus, { label: string; className: string; style?: React.CSSProperties }> = {
  confirmed: {
    label: 'Confirmed',
    className: 'badge-green',
  },
  pending: {
    label: 'Pending',
    className: 'badge-gold',
  },
  payment_pending: {
    label: 'Payment Pending',
    className: '',
    style: { background: '#1e40af22', color: '#3b82f6', border: '1px solid #3b82f688', borderRadius: '9999px', padding: '2px 10px', fontSize: '0.75rem', fontWeight: 600 },
  },
  cancelled: {
    label: 'Cancelled',
    className: 'badge-red',
  },
};

const TABS: { key: TabOption; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'past', label: 'Past' },
  { key: 'cancelled', label: 'Cancelled' },
];

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const config = STATUS_STYLES[status as BookingStatus];
  if (!config) return <span className="text-xs text-gray-400 capitalize">{status}</span>;
  if (config.style) return <span style={config.style}>{config.label}</span>;
  return <span className={config.className}>{config.label}</span>;
};

const Bookings: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabOption>('all');
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);

  // Auth guard
  useEffect(() => {
    if (user === null) navigate('/login');
  }, [user, navigate]);

  // Subscribe to user bookings
  useEffect(() => {
    if (!user) return;
    const unsub = subscribeUserBookings(user.uid, (data: any[]) => {
      setBookings(data);
      setLoading(false);
    });
    return () => unsub();
  }, [user]);

  const now = new Date();

  const filteredBookings = bookings.filter((b) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'cancelled') return b.status === 'cancelled';
    const checkOut = b.checkOut ? new Date(b.checkOut) : null;
    const checkIn = b.checkIn ? new Date(b.checkIn) : null;
    if (activeTab === 'upcoming') {
      return b.status !== 'cancelled' && checkIn && checkIn >= now;
    }
    if (activeTab === 'past') {
      return b.status !== 'cancelled' && checkOut && checkOut < now;
    }
    return true;
  });


  const handleCancel = async (bookingId: string) => {
    setCancellingId(bookingId);
    try {
      await cancelBooking(bookingId);
      showToast('Booking cancelled successfully.', 'success');
    } catch (err: any) {
      showToast(err?.message || 'Failed to cancel booking.', 'error');
    } finally {
      setCancellingId(null);
      setConfirmCancelId(null);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  if (user === null) return null;

  return (
    <Layout>
      <div className="page-wrap">
        <div className="mb-8">
          <h1 className="text-3xl font-bold" style={{ color: '#1b2838' }}>
            My <span className="gold-text">Bookings</span>
          </h1>
          <p className="text-gray-500 mt-1">Track and manage all your farmhouse reservations.</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-xl mb-6 w-fit" style={{ background: '#f3f4f6' }}>
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                activeTab === tab.key
                  ? 'bg-white shadow text-gray-900'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              style={
                activeTab === tab.key ? { color: '#1b2838' } : {}
              }
            >
              {tab.label}
              {tab.key === 'all' && bookings.length > 0 && (
                <span
                  className="ml-1.5 text-xs px-1.5 py-0.5 rounded-full font-bold"
                  style={{ background: '#D4AF37', color: '#1b2838' }}
                >
                  {bookings.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex justify-center items-center py-24">
            <div
              className="w-12 h-12 rounded-full border-4 animate-spin"
              style={{ borderColor: '#D4AF37', borderTopColor: 'transparent' }}
            />
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="text-center py-24">
            <p className="text-5xl mb-4">📋</p>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No bookings found</h3>
            <p className="text-gray-400 mb-4">
              {activeTab === 'all'
                ? "You haven't made any bookings yet."
                : `No ${activeTab} bookings found.`}
            </p>
            {activeTab === 'all' && (
              <button className="btn-primary" onClick={() => navigate('/explore')}>
                Explore Farmhouses
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredBookings.map((booking) => (
              <div key={booking.id} className="card hover:shadow-lg transition-shadow duration-200">
                <div className="flex flex-col sm:flex-row gap-4">
                  {/* Thumbnail */}
                  {booking.farmhousePhoto ? (
                    <img
                      src={booking.farmhousePhoto}
                      alt={booking.farmhouseName}
                      className="w-full sm:w-32 h-32 object-cover rounded-xl flex-shrink-0"
                    />
                  ) : (
                    <div
                      className="w-full sm:w-32 h-32 rounded-xl flex-shrink-0 flex items-center justify-center"
                      style={{ background: 'linear-gradient(135deg, #1b2838, #2d4060)' }}
                    >
                      <span className="text-3xl">🏡</span>
                    </div>
                  )}

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                      <h3
                        className="text-lg font-bold truncate"
                        style={{ color: '#1b2838' }}
                      >
                        {booking.farmhouseName || 'Farmhouse'}
                      </h3>
                      <div className="flex items-center gap-2 flex-wrap">
                        <StatusBadge status={booking.status} />
                        {booking.paymentStatus && booking.paymentStatus !== booking.status && (
                          <StatusBadge status={booking.paymentStatus} />
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <CalendarDays className="w-4 h-4 flex-shrink-0" style={{ color: '#D4AF37' }} />
                        <span>
                          {formatDate(booking.checkIn)} – {formatDate(booking.checkOut)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Users className="w-4 h-4 flex-shrink-0" style={{ color: '#D4AF37' }} />
                        <span>{booking.guests ?? '—'} Guests</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm font-semibold">
                        <IndianRupee className="w-4 h-4 flex-shrink-0" style={{ color: '#D4AF37' }} />
                        <span style={{ color: '#1b2838' }}>
                          {booking.totalPrice
                            ? `₹${booking.totalPrice.toLocaleString('en-IN')}`
                            : '—'}
                        </span>
                      </div>
                    </div>

                    {/* UTR if submitted */}
                    {booking.utr && (
                      <p className="text-xs text-gray-400 mb-3">
                        UTR: <span className="font-mono font-semibold">{booking.utr}</span>
                      </p>
                    )}

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2">
                      {/* Pending: show contact admin note */}
                      {(booking.status === 'pending' || booking.status === 'payment_pending') && (
                        <div className="w-full bg-gold-50 dark:bg-gold-900/20 rounded-xl p-3 flex flex-wrap gap-3 items-center">
                          <p className="text-sm text-navy-700 dark:text-gray-300 font-medium">To confirm this booking, contact us:</p>
                          <a href={`tel:${APP_CONTACT.supportPhone}`} className="flex items-center gap-1.5 text-sm font-semibold text-gold-600 dark:text-gold-400 hover:underline">
                            <Phone size={14} /> {APP_CONTACT.supportPhone}
                          </a>
                          <a href={`mailto:${APP_CONTACT.supportEmail}`} className="flex items-center gap-1.5 text-sm font-semibold text-gold-600 dark:text-gold-400 hover:underline">
                            <Mail size={14} /> {APP_CONTACT.supportEmail}
                          </a>
                        </div>
                      )}

                      {/* Cancel - only for confirmed or pending, and future bookings */}
                      {(booking.status === 'confirmed' || booking.status === 'pending') &&
                        booking.checkIn &&
                        new Date(booking.checkIn) > now && (
                          <button
                            className="btn-outline text-sm py-2 px-4 text-red-500 border-red-300 hover:bg-red-50"
                            onClick={() => setConfirmCancelId(booking.id)}
                          >
                            Cancel Booking
                          </button>
                        )}

                      {/* View Details */}
                      <button
                        className="btn-outline text-sm py-2 px-4"
                        onClick={() => navigate(`/farmhouse/${booking.farmhouseId}`)}
                      >
                        View Property
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>


      {/* Cancel Confirmation Dialog */}
      {confirmCancelId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0"
            style={{ background: 'rgba(0,0,0,0.5)' }}
            onClick={() => setConfirmCancelId(null)}
          />
          <div className="relative bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Cancel Booking?</h3>
                <p className="text-sm text-gray-500">This action cannot be undone.</p>
              </div>
            </div>
            <p className="text-gray-600 text-sm mb-6">
              Are you sure you want to cancel this booking? Refund policies may apply.
            </p>
            <div className="flex gap-3">
              <button
                className="btn-outline flex-1"
                onClick={() => setConfirmCancelId(null)}
                disabled={!!cancellingId}
              >
                Keep Booking
              </button>
              <button
                className="flex-1 py-2 px-4 rounded-xl font-semibold text-sm bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-60"
                onClick={() => handleCancel(confirmCancelId)}
                disabled={!!cancellingId}
              >
                {cancellingId === confirmCancelId ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Cancelling...
                  </span>
                ) : (
                  'Yes, Cancel'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default Bookings;
