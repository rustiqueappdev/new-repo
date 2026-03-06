import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  MapPin,
  Users,
  Home,
  Star,
  Heart,
  Share2,
  ChevronLeft,
  ChevronRight,
  Tv,
  Flame,
  Droplets,
  Chess,
  Dices,
  Volleyball,
  Waves,
  Plus,
  Minus,
  Phone,
  ExternalLink,
  Calendar,
} from 'lucide-react';
import Layout from '../../components/layout/Layout';
import StarRating from '../../components/ui/StarRating';
import Modal from '../../components/ui/Modal';
import { useAuth } from '../../context/AuthContext';
import { useWishlist } from '../../context/WishlistContext';
import { useToast } from '../../context/ToastContext';
import { getFarmhouse } from '../../services/farmhouseService';
import { subscribeReviews, addReview } from '../../services/reviewService';
import { calculateTotal, fmt } from '../../utils/pricing';
import type { Farmhouse, Review } from '../../types/index';
import { APP_CONTACT } from '../../firebaseConfig';

type TabType = 'overview' | 'amenities' | 'reviews';
type BookingType = 'overnight' | 'dayuse';

const AMENITY_ICONS: Record<string, React.ReactNode> = {
  tv: <Tv size={20} />,
  geyser: <Droplets size={20} />,
  bonfire: <Flame size={20} />,
  chess: <Chess size={20} />,
  carroms: <Dices size={20} />,
  volleyball: <Volleyball size={20} />,
  pool: <Waves size={20} />,
};

const AMENITY_LABELS: Record<string, string> = {
  tv: 'TV',
  geyser: 'Geyser',
  bonfire: 'Bonfire',
  chess: 'Chess',
  carroms: 'Carroms',
  volleyball: 'Volleyball',
  pool: 'Pool',
};

function toDateString(date: Date): string {
  return date.toISOString().split('T')[0];
}

function parseDateStr(str: string): Date {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function datesBetween(start: string, end: string): string[] {
  const result: string[] = [];
  const cur = parseDateStr(start);
  const last = parseDateStr(end);
  while (cur <= last) {
    result.push(toDateString(new Date(cur)));
    cur.setDate(cur.getDate() + 1);
  }
  return result;
}

export default function FarmhouseDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isWishlisted, toggleWishlist } = useWishlist();
  const { showToast } = useToast();

  const [farmhouse, setFarmhouse] = useState<Farmhouse | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [reviews, setReviews] = useState<Review[]>([]);

  // Booking state
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [bookingType, setBookingType] = useState<BookingType>('overnight');
  const [guestCount, setGuestCount] = useState(2);
  const [bookingLoading] = useState(false);

  // Review form state
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  // Load farmhouse
  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getFarmhouse(id)
      .then((data) => {
        setFarmhouse(data);
        setLoading(false);
      })
      .catch(() => {
        showToast('Failed to load farmhouse details', 'error');
        setLoading(false);
      });
  }, [id]);

  // Real-time reviews
  useEffect(() => {
    if (!id) return;
    const unsub = subscribeReviews(id, (data) => setReviews(data));
    return () => unsub();
  }, [id]);

  const photos: string[] = farmhouse?.photos ?? [];
  const bookedDates: string[] = farmhouse?.bookedDates ?? [];
  const blockedDates: string[] = farmhouse?.blockedDates ?? [];
  const unavailableDates = new Set([...bookedDates, ...blockedDates]);

  const isDateUnavailable = (dateStr: string) => unavailableDates.has(dateStr);

  const selectedDates = checkIn && checkOut ? datesBetween(checkIn, checkOut) : [];
  const hasConflict = selectedDates.some((d) => isDateUnavailable(d));

  const pricing = farmhouse?.pricing;

  const priceBreakdown = (() => {
    if (!checkIn || !checkOut || !pricing) return null;
    return calculateTotal({
      checkIn,
      checkOut,
      bookingType,
      pricing,
      guestCount,
    });
  })();

  const handleShare = async () => {
    const shareData = {
      title: farmhouse?.name ?? 'Farmhouse',
      text: `Check out ${farmhouse?.name} on Reroute!`,
      url: window.location.href,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(window.location.href);
        showToast('Link copied to clipboard!', 'success');
      }
    } catch {
      showToast('Could not share', 'error');
    }
  };

  // Booking flow: no payment processing — redirect to Contact Admin page
  const handleBookNow = () => {
    if (!user) { navigate('/login'); return; }
    if (!checkIn || !checkOut) { showToast('Please select check-in and check-out dates', 'error'); return; }
    if (hasConflict) { showToast('Some selected dates are unavailable', 'error'); return; }
    if (!farmhouse || !priceBreakdown) return;
    navigate('/contact', {
      state: {
        farmhouseName: farmhouse.name,
        checkIn,
        checkOut,
        guests: guestCount,
        totalPrice: priceBreakdown.total,
        bookingType,
      },
    });
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !id) return;
    setReviewSubmitting(true);
    try {
      await addReview(id, {
        userId: user.uid,
        userName: user.displayName ?? user.email ?? 'Anonymous',
        rating: reviewRating,
        comment: reviewComment,
      });
      setReviewComment('');
      setReviewRating(5);
      showToast('Review submitted!', 'success');
    } catch {
      showToast('Failed to submit review', 'error');
    } finally {
      setReviewSubmitting(false);
    }
  };

  const avgRating =
    reviews.length > 0
      ? (reviews.reduce((s, r) => s + (r.rating ?? 0), 0) / reviews.length).toFixed(1)
      : null;

  const today = toDateString(new Date());

  const amenities = farmhouse?.amenities ?? {};

  const amenityChips = Object.entries(AMENITY_LABELS)
    .filter(([key]) => {
      const val = (amenities as Record<string, unknown>)[key];
      return val && val !== 0 && val !== false;
    })
    .map(([key, label]) => {
      const val = (amenities as Record<string, unknown>)[key];
      const suffix = typeof val === 'number' && val > 1 ? ` x${val}` : '';
      return { key, label: label + suffix };
    });

  if (loading) {
    return (
      <Layout>
        <div className="page-wrap flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500" />
        </div>
      </Layout>
    );
  }

  if (!farmhouse) {
    return (
      <Layout>
        <div className="page-wrap text-center py-16">
          <p className="text-gray-500 text-lg">Farmhouse not found.</p>
          <button className="btn-primary mt-4" onClick={() => navigate(-1)}>
            Go Back
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="page-wrap max-w-6xl mx-auto pb-32 md:pb-8">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-4 pt-2">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft size={20} />
            <span className="text-sm font-medium">Back</span>
          </button>
          <div className="flex items-center gap-3">
            <button
              onClick={handleShare}
              className="p-2 rounded-full hover:bg-gray-100 transition"
              aria-label="Share"
            >
              <Share2 size={20} className="text-gray-600" />
            </button>
            <button
              onClick={() => toggleWishlist(farmhouse.id!)}
              className="p-2 rounded-full hover:bg-gray-100 transition"
              aria-label="Wishlist"
            >
              <Heart
                size={20}
                className={
                  isWishlisted(farmhouse.id!)
                    ? 'fill-red-500 text-red-500'
                    : 'text-gray-600'
                }
              />
            </button>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left / Main content */}
          <div className="flex-1 min-w-0">
            {/* Photo Gallery */}
            <div className="relative rounded-2xl overflow-hidden bg-gray-100 mb-3">
              {photos.length > 0 ? (
                <>
                  <img
                    src={photos[currentPhotoIndex]}
                    alt={`Photo ${currentPhotoIndex + 1}`}
                    className="w-full h-64 sm:h-96 object-cover"
                  />
                  {photos.length > 1 && (
                    <>
                      <button
                        onClick={() =>
                          setCurrentPhotoIndex((i) => (i - 1 + photos.length) % photos.length)
                        }
                        className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-2 shadow transition"
                        aria-label="Previous photo"
                      >
                        <ChevronLeft size={20} />
                      </button>
                      <button
                        onClick={() =>
                          setCurrentPhotoIndex((i) => (i + 1) % photos.length)
                        }
                        className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-2 shadow transition"
                        aria-label="Next photo"
                      >
                        <ChevronRight size={20} />
                      </button>
                      <div className="absolute bottom-3 right-3 bg-black/50 text-white text-xs px-2 py-1 rounded-full">
                        {currentPhotoIndex + 1} / {photos.length}
                      </div>
                    </>
                  )}
                </>
              ) : (
                <div className="w-full h-64 sm:h-96 flex items-center justify-center text-gray-400">
                  No photos available
                </div>
              )}
            </div>
            {/* Thumbnail strip */}
            {photos.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
                {photos.slice(0, 5).map((url, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentPhotoIndex(idx)}
                    className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition ${
                      idx === currentPhotoIndex
                        ? 'border-yellow-500'
                        : 'border-transparent'
                    }`}
                  >
                    <img
                      src={url}
                      alt={`Thumb ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}

            {/* Title & Info */}
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
              {farmhouse.name}
            </h1>
            <div className="flex flex-wrap gap-4 text-gray-600 text-sm mb-3">
              <span className="flex items-center gap-1">
                <MapPin size={16} className="text-yellow-500" />
                {farmhouse.area}, {farmhouse.city}
              </span>
              <span className="flex items-center gap-1">
                <Users size={16} className="text-yellow-500" />
                Up to {farmhouse.capacity} guests
              </span>
              <span className="flex items-center gap-1">
                <Home size={16} className="text-yellow-500" />
                {farmhouse.bedrooms} bedrooms
              </span>
            </div>

            {/* Rating */}
            {avgRating && (
              <div className="flex items-center gap-2 mb-4">
                <StarRating value={parseFloat(avgRating)} readOnly />
                <span className="font-semibold text-gray-800">{avgRating}</span>
                <span className="text-gray-500 text-sm">({reviews.length} reviews)</span>
              </div>
            )}

            {/* Tabs */}
            <div className="flex border-b border-gray-200 mb-6 gap-1">
              {(['overview', 'amenities', 'reviews'] as TabType[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 text-sm font-medium capitalize border-b-2 transition -mb-px ${
                    activeTab === tab
                      ? 'border-yellow-500 text-yellow-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div>
                  <h3 className="section-title">About</h3>
                  <p className="text-gray-600 leading-relaxed">
                    {farmhouse.description ?? 'No description provided.'}
                  </p>
                </div>
                <div>
                  <h3 className="section-title">Pricing</h3>
                  <div className="card overflow-hidden p-0">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left px-4 py-3 text-gray-600 font-medium">Type</th>
                          <th className="text-right px-4 py-3 text-gray-600 font-medium">Rate</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {pricing?.weeklyDay && (
                          <tr>
                            <td className="px-4 py-3 text-gray-700">Weekday – Day Use</td>
                            <td className="px-4 py-3 text-right gold-text font-semibold">
                              {fmt(pricing.weeklyDay)}
                            </td>
                          </tr>
                        )}
                        {pricing?.weeklyNight && (
                          <tr>
                            <td className="px-4 py-3 text-gray-700">Weekday – Overnight</td>
                            <td className="px-4 py-3 text-right gold-text font-semibold">
                              {fmt(pricing.weeklyNight)}
                            </td>
                          </tr>
                        )}
                        {pricing?.weekendDay && (
                          <tr>
                            <td className="px-4 py-3 text-gray-700">Weekend – Day Use</td>
                            <td className="px-4 py-3 text-right gold-text font-semibold">
                              {fmt(pricing.weekendDay)}
                            </td>
                          </tr>
                        )}
                        {pricing?.weekendNight && (
                          <tr>
                            <td className="px-4 py-3 text-gray-700">Weekend – Overnight</td>
                            <td className="px-4 py-3 text-right gold-text font-semibold">
                              {fmt(pricing.weekendNight)}
                            </td>
                          </tr>
                        )}
                        {pricing?.occasionalDay && (
                          <tr>
                            <td className="px-4 py-3 text-gray-700">Holiday – Day Use</td>
                            <td className="px-4 py-3 text-right gold-text font-semibold">
                              {fmt(pricing.occasionalDay)}
                            </td>
                          </tr>
                        )}
                        {pricing?.occasionalNight && (
                          <tr>
                            <td className="px-4 py-3 text-gray-700">Holiday – Overnight</td>
                            <td className="px-4 py-3 text-right gold-text font-semibold">
                              {fmt(pricing.occasionalNight)}
                            </td>
                          </tr>
                        )}
                        {pricing?.extraGuestPrice && (
                          <tr>
                            <td className="px-4 py-3 text-gray-700">Extra Guest / night</td>
                            <td className="px-4 py-3 text-right gold-text font-semibold">
                              {fmt(pricing.extraGuestPrice)}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
                {farmhouse.farmLink && (
                  <div>
                    <h3 className="section-title">Location</h3>
                    <a
                      href={farmhouse.farmLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-outline inline-flex items-center gap-2"
                    >
                      <MapPin size={16} />
                      Open in Maps
                      <ExternalLink size={14} />
                    </a>
                  </div>
                )}
                <div className="card bg-yellow-50 border border-yellow-200">
                  <div className="flex items-start gap-3">
                    <Phone size={18} className="text-yellow-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-gray-800">Need help?</p>
                      <p className="text-sm text-gray-600">
                        Contact us at{' '}
                        <a
                          href={`tel:${APP_CONTACT?.supportPhone}`}
                          className="text-yellow-700 font-semibold underline"
                        >
                          {APP_CONTACT?.supportPhone}
                        </a>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Amenities Tab */}
            {activeTab === 'amenities' && (
              <div>
                <h3 className="section-title">Amenities & Games</h3>
                {amenityChips.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {amenityChips.map(({ key, label }) => (
                      <div
                        key={key}
                        className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3"
                      >
                        <span className="text-yellow-500">
                          {AMENITY_ICONS[key]}
                        </span>
                        <span className="text-sm text-gray-700 font-medium">{label}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">No amenities listed.</p>
                )}
              </div>
            )}

            {/* Reviews Tab */}
            {activeTab === 'reviews' && (
              <div className="space-y-6">
                <h3 className="section-title">
                  Reviews {reviews.length > 0 && `(${reviews.length})`}
                </h3>
                {reviews.length === 0 ? (
                  <p className="text-gray-500">No reviews yet. Be the first!</p>
                ) : (
                  <div className="space-y-4">
                    {reviews.map((review) => (
                      <div key={review.id} className="card">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-semibold text-gray-800">{review.userName}</p>
                            <p className="text-xs text-gray-400">
                              {review.createdAt
                                ? new Date(
                                    typeof review.createdAt === 'object' &&
                                    'seconds' in (review.createdAt as object)
                                      ? (review.createdAt as { seconds: number }).seconds * 1000
                                      : (review.createdAt as string | number)
                                  ).toLocaleDateString()
                                : ''}
                            </p>
                          </div>
                          <StarRating value={review.rating} readOnly size="sm" />
                        </div>
                        <p className="text-gray-600 text-sm">{review.comment}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Write a review */}
                {user ? (
                  <div className="card">
                    <h4 className="font-semibold text-gray-800 mb-3">Write a Review</h4>
                    <form onSubmit={handleReviewSubmit} className="space-y-3">
                      <div>
                        <label className="label">Rating</label>
                        <StarRating
                          value={reviewRating}
                          onChange={setReviewRating}
                        />
                      </div>
                      <div>
                        <label className="label">Comment</label>
                        <textarea
                          className="input-field resize-none"
                          rows={3}
                          value={reviewComment}
                          onChange={(e) => setReviewComment(e.target.value)}
                          placeholder="Share your experience..."
                          required
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={reviewSubmitting}
                        className="btn-primary disabled:opacity-50"
                      >
                        {reviewSubmitting ? 'Submitting...' : 'Submit Review'}
                      </button>
                    </form>
                  </div>
                ) : (
                  <div className="card text-center text-gray-500">
                    <Link to="/login" className="text-yellow-600 font-semibold hover:underline">
                      Log in
                    </Link>{' '}
                    to write a review.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Booking Sidebar (desktop) */}
          <div className="hidden lg:block w-80 flex-shrink-0">
            <BookingPanel
              farmhouse={farmhouse}
              today={today}
              checkIn={checkIn}
              checkOut={checkOut}
              bookingType={bookingType}
              guestCount={guestCount}
              priceBreakdown={priceBreakdown}
              hasConflict={hasConflict}
              bookingLoading={bookingLoading}
              setCheckIn={setCheckIn}
              setCheckOut={setCheckOut}
              setBookingType={setBookingType}
              setGuestCount={setGuestCount}
              handleBookNow={handleBookNow}
            />
          </div>
        </div>

        {/* Sticky Mobile Booking Bar */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-xl z-40 p-4">
          <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="label text-xs">Check-in</label>
                  <input
                    type="date"
                    min={today}
                    value={checkIn}
                    onChange={(e) => setCheckIn(e.target.value)}
                    className="input-field text-sm py-2"
                  />
                </div>
                <div>
                  <label className="label text-xs">Check-out</label>
                  <input
                    type="date"
                    min={checkIn || today}
                    value={checkOut}
                    onChange={(e) => setCheckOut(e.target.value)}
                    className="input-field text-sm py-2"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between gap-3">
                <div className="flex rounded-lg border border-gray-300 overflow-hidden text-sm">
                  <button
                    onClick={() => setBookingType('overnight')}
                    className={`px-3 py-2 ${
                      bookingType === 'overnight'
                        ? 'bg-yellow-500 text-white'
                        : 'text-gray-600'
                    }`}
                  >
                    Overnight
                  </button>
                  <button
                    onClick={() => setBookingType('dayuse')}
                    className={`px-3 py-2 ${
                      bookingType === 'dayuse'
                        ? 'bg-yellow-500 text-white'
                        : 'text-gray-600'
                    }`}
                  >
                    Day Use
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setGuestCount((c) => Math.max(1, c - 1))}
                    className="p-1.5 rounded-full border border-gray-300 hover:bg-gray-100"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="text-sm font-medium w-6 text-center">{guestCount}</span>
                  <button
                    onClick={() =>
                      setGuestCount((c) =>
                        Math.min(farmhouse?.capacity ?? 20, c + 1)
                      )
                    }
                    className="p-1.5 rounded-full border border-gray-300 hover:bg-gray-100"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>
              {priceBreakdown && (
                <div className="text-sm text-gray-600 flex justify-between">
                  <span>Total</span>
                  <span className="font-bold text-gray-900 text-base">
                    {fmt(priceBreakdown.total)}
                  </span>
                </div>
              )}
              {hasConflict && (
                <p className="text-red-500 text-xs">
                  Some dates are unavailable. Please choose different dates.
                </p>
              )}
              <button
                onClick={handleBookNow}
                disabled={hasConflict}
                className="btn-primary w-full disabled:opacity-50"
              >
                Book Now — Contact to Confirm
              </button>
            </div>
        </div>
      </div>

    </Layout>
  );
}

interface BookingPanelProps {
  farmhouse: Farmhouse;
  today: string;
  checkIn: string;
  checkOut: string;
  bookingType: BookingType;
  guestCount: number;
  priceBreakdown: { base: number; platformFee: number; processingFee: number; total: number } | null;
  hasConflict: boolean;
  bookingLoading: boolean;
  setCheckIn: (v: string) => void;
  setCheckOut: (v: string) => void;
  setBookingType: (v: BookingType) => void;
  setGuestCount: (fn: (c: number) => number) => void;
  handleBookNow: () => void;
}

function BookingPanel({
  farmhouse,
  today,
  checkIn,
  checkOut,
  bookingType,
  guestCount,
  priceBreakdown,
  hasConflict,
  bookingLoading,
  setCheckIn,
  setCheckOut,
  setBookingType,
  setGuestCount,
  handleBookNow,
}: BookingPanelProps) {
  return (
    <div className="card sticky top-6 space-y-4">
      <h3 className="font-semibold text-gray-800 text-lg">Book this Farmhouse</h3>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Check-in</label>
          <input
            type="date"
            min={today}
            value={checkIn}
            onChange={(e) => setCheckIn(e.target.value)}
            className="input-field"
          />
        </div>
        <div>
          <label className="label">Check-out</label>
          <input
            type="date"
            min={checkIn || today}
            value={checkOut}
            onChange={(e) => setCheckOut(e.target.value)}
            className="input-field"
          />
        </div>
      </div>

      <div>
        <label className="label">Booking Type</label>
        <div className="flex rounded-lg border border-gray-300 overflow-hidden">
          <button
            onClick={() => setBookingType('overnight')}
            className={`flex-1 py-2 text-sm font-medium transition ${
              bookingType === 'overnight'
                ? 'bg-yellow-500 text-white'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            Overnight
          </button>
          <button
            onClick={() => setBookingType('dayuse')}
            className={`flex-1 py-2 text-sm font-medium transition border-l border-gray-300 ${
              bookingType === 'dayuse'
                ? 'bg-yellow-500 text-white'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            Day Use
          </button>
        </div>
      </div>

      <div>
        <label className="label">Guests</label>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setGuestCount((c) => Math.max(1, c - 1))}
            className="p-2 rounded-full border border-gray-300 hover:bg-gray-100"
          >
            <Minus size={16} />
          </button>
          <span className="font-medium text-gray-800 w-8 text-center">{guestCount}</span>
          <button
            onClick={() =>
              setGuestCount((c) => Math.min(farmhouse?.capacity ?? 20, c + 1))
            }
            className="p-2 rounded-full border border-gray-300 hover:bg-gray-100"
          >
            <Plus size={16} />
          </button>
          <span className="text-sm text-gray-400">max {farmhouse?.capacity}</span>
        </div>
      </div>

      {priceBreakdown && (
        <div className="bg-gray-50 rounded-xl p-3 space-y-2 text-sm">
          <div className="flex justify-between text-gray-600">
            <span>Base amount</span>
            <span>{fmt(priceBreakdown.base)}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>Platform fee (2%)</span>
            <span>{fmt(priceBreakdown.platformFee)}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>Processing fee</span>
            <span>{fmt(priceBreakdown.processingFee)}</span>
          </div>
          <div className="flex justify-between font-bold text-gray-900 pt-2 border-t border-gray-200">
            <span>Total</span>
            <span className="gold-text">{fmt(priceBreakdown.total)}</span>
          </div>
        </div>
      )}

      {hasConflict && (
        <p className="text-red-500 text-sm">
          Some dates are unavailable. Please choose different dates.
        </p>
      )}

      <button
        onClick={handleBookNow}
        disabled={hasConflict}
        className="btn-primary w-full disabled:opacity-50"
      >
        Book Now — Contact to Confirm
      </button>
    </div>
  );
}
