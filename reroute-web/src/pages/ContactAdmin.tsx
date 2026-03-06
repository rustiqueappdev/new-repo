// Replaces all payment/booking confirmation flows.
// No fake payment processing — user contacts admin directly.
import React from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { Phone, Mail, MessageCircle, ArrowLeft, CheckCircle } from 'lucide-react';
import Layout from '../components/layout/Layout';
import { APP_CONTACT } from '../firebaseConfig';

interface LocationState {
  farmhouseName?: string;
  checkIn?: string;
  checkOut?: string;
  guests?: number;
  totalPrice?: number;
  bookingType?: string;
}

export default function ContactAdmin() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = (location.state as LocationState) || {};

  const whatsappMsg = encodeURIComponent(
    `Hi! I'd like to book a farmhouse on ReRoute.\n\n` +
    (state.farmhouseName ? `Farmhouse: ${state.farmhouseName}\n` : '') +
    (state.checkIn ? `Check-in: ${state.checkIn}\n` : '') +
    (state.checkOut ? `Check-out: ${state.checkOut}\n` : '') +
    (state.guests ? `Guests: ${state.guests}\n` : '') +
    (state.totalPrice ? `Estimated Total: ₹${state.totalPrice.toLocaleString('en-IN')}\n` : '') +
    `\nPlease confirm availability.`
  );

  const whatsappNumber = APP_CONTACT.supportPhone.replace(/[^0-9]/g, '');

  return (
    <Layout>
      <div className="min-h-[80vh] flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-lg">

          {/* Back */}
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-500 hover:text-navy-800 dark:hover:text-gray-200 mb-8 transition-colors">
            <ArrowLeft size={18} /> Back
          </button>

          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center mx-auto mb-5 shadow-gold">
              <CheckCircle size={40} className="text-white" />
            </div>
            <h1 className="section-title">Almost There!</h1>
            <p className="mt-2 text-gray-500 dark:text-gray-400">
              To complete your booking, reach out to us directly. We'll confirm availability and finalize your stay.
            </p>
          </div>

          {/* Booking summary (if passed via state) */}
          {state.farmhouseName && (
            <div className="card p-5 mb-6 bg-gold-50 dark:bg-gold-900/20 border-gold-200 dark:border-gold-800">
              <h3 className="font-semibold text-navy-800 dark:text-gray-100 mb-3">Your Booking Request</h3>
              <div className="space-y-2 text-sm">
                {state.farmhouseName && <Row label="Farmhouse" value={state.farmhouseName} />}
                {state.checkIn && <Row label="Check-in" value={state.checkIn} />}
                {state.checkOut && <Row label="Check-out" value={state.checkOut} />}
                {state.guests && <Row label="Guests" value={`${state.guests} guests`} />}
                {state.bookingType && <Row label="Type" value={state.bookingType === 'dayuse' ? 'Day Use' : 'Overnight'} />}
                {state.totalPrice && (
                  <Row label="Estimated Total" value={`₹${state.totalPrice.toLocaleString('en-IN')}`} bold />
                )}
              </div>
            </div>
          )}

          {/* Contact options */}
          <div className="space-y-3">

            {/* WhatsApp */}
            <a
              href={`https://wa.me/${whatsappNumber}?text=${whatsappMsg}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-4 p-4 card hover:shadow-lg transition-all group"
            >
              <div className="w-12 h-12 rounded-xl bg-green-500 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                <MessageCircle size={24} className="text-white" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-navy-800 dark:text-gray-100">WhatsApp Us</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Fastest response — tap to open chat</p>
              </div>
              <span className="badge-green">Recommended</span>
            </a>

            {/* Phone */}
            <a
              href={`tel:${APP_CONTACT.supportPhone}`}
              className="flex items-center gap-4 p-4 card hover:shadow-lg transition-all group"
            >
              <div className="w-12 h-12 rounded-xl bg-blue-500 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                <Phone size={24} className="text-white" />
              </div>
              <div>
                <p className="font-semibold text-navy-800 dark:text-gray-100">Call Us</p>
                <p className="text-sm text-gold-600 dark:text-gold-400 font-medium">{APP_CONTACT.supportPhone}</p>
              </div>
            </a>

            {/* Email */}
            <a
              href={`mailto:${APP_CONTACT.supportEmail}?subject=Booking Enquiry${state.farmhouseName ? ' - ' + state.farmhouseName : ''}&body=${encodeURIComponent(
                `Hi,\n\nI'd like to book:\n` +
                (state.farmhouseName ? `Farmhouse: ${state.farmhouseName}\n` : '') +
                (state.checkIn ? `Check-in: ${state.checkIn}\n` : '') +
                (state.checkOut ? `Check-out: ${state.checkOut}\n` : '') +
                (state.guests ? `Guests: ${state.guests}\n` : '')
              )}`}
              className="flex items-center gap-4 p-4 card hover:shadow-lg transition-all group"
            >
              <div className="w-12 h-12 rounded-xl bg-gold-400 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                <Mail size={24} className="text-white" />
              </div>
              <div>
                <p className="font-semibold text-navy-800 dark:text-gray-100">Email Us</p>
                <p className="text-sm text-gold-600 dark:text-gold-400 font-medium">{APP_CONTACT.supportEmail}</p>
              </div>
            </a>
          </div>

          <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-8">
            We typically respond within 1–2 hours. Once confirmed, you'll receive booking details.
          </p>

          <div className="text-center mt-4">
            <Link to="/explore" className="btn-ghost text-sm">← Browse more farmhouses</Link>
          </div>
        </div>
      </div>
    </Layout>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-500 dark:text-gray-400">{label}</span>
      <span className={`text-navy-800 dark:text-gray-100 ${bold ? 'font-bold text-gold-600 dark:text-gold-400' : ''}`}>{value}</span>
    </div>
  );
}
