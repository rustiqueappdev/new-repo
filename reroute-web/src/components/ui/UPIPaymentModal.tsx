import React, { useState, useEffect, useRef } from 'react';
import { X, Copy, Info } from 'lucide-react';
import QRCode from 'qrcode';
import { APP_CONTACT } from '../../firebaseConfig';
import { useToast } from '../../context/ToastContext';

interface Props {
  open: boolean;
  amount: number;
  bookingId?: string;
  onClose: () => void;
  onSubmit: (utr: string) => Promise<void>;
}

export default function UPIPaymentModal({ open, amount, bookingId, onClose, onSubmit }: Props) {
  const toast = useToast();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [utr, setUtr] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const upiLink = `upi://pay?pa=${APP_CONTACT.upiId}&pn=${encodeURIComponent(APP_CONTACT.upiName)}&am=${amount}&cu=INR${bookingId ? `&tn=${encodeURIComponent('Booking ' + bookingId)}` : ''}`;

  useEffect(() => {
    if (!open || !canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, upiLink, { width: 200, margin: 1, color: { dark: '#1b2838', light: '#ffffff' } });
  }, [open, upiLink]);

  if (!open) return null;

  async function handleSubmit() {
    if (!utr.trim()) return;
    setSubmitting(true);
    try {
      await onSubmit(utr.trim());
      setUtr('');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white dark:bg-navy-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="bg-gradient-to-r from-gold-500 to-gold-400 p-5 flex items-center justify-between sticky top-0">
          <div>
            <h2 className="text-white font-bold text-xl">Pay via UPI</h2>
            <p className="text-gold-100 text-sm">Scan QR or use UPI ID</p>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white transition-colors"><X size={22} /></button>
        </div>

        <div className="p-5 space-y-5">
          {/* Amount */}
          <div className="text-center bg-gold-50 dark:bg-gold-900/20 rounded-xl p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Amount to Pay</p>
            <p className="text-3xl font-bold text-navy-800 dark:text-white mt-1">₹{amount.toLocaleString('en-IN')}</p>
            {bookingId && <p className="text-xs text-gray-400 mt-1">Booking #{bookingId.slice(-8)}</p>}
          </div>

          {/* QR */}
          <div className="flex flex-col items-center gap-3">
            <div className="bg-white p-4 rounded-2xl shadow-card border border-gray-100">
              <canvas ref={canvasRef} />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
              Scan with GPay, PhonePe, Paytm, BHIM or any UPI app
            </p>
          </div>

          {/* UPI ID */}
          <div className="bg-gray-50 dark:bg-navy-700 rounded-xl p-3 flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400">UPI ID</p>
              <p className="font-semibold text-navy-800 dark:text-gray-100">{APP_CONTACT.upiId}</p>
            </div>
            <button onClick={() => { navigator.clipboard.writeText(APP_CONTACT.upiId); toast.success('UPI ID copied!'); }}
              className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-navy-600 transition-colors">
              <Copy size={16} className="text-gray-500" />
            </button>
          </div>

          {/* Steps */}
          <div className="text-sm bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 space-y-2">
            <p className="font-medium text-navy-700 dark:text-gray-300 flex items-center gap-2">
              <Info size={14} className="text-blue-500" /> How to pay
            </p>
            <ol className="list-decimal list-inside space-y-1 text-xs text-gray-600 dark:text-gray-400">
              <li>Open any UPI app (GPay / PhonePe / Paytm)</li>
              <li>Scan the QR code or enter UPI ID manually</li>
              <li>Enter amount: <strong>₹{amount.toLocaleString('en-IN')}</strong></li>
              <li>Add note: <em>Booking {bookingId?.slice(-8)}</em></li>
              <li>Complete payment &amp; note your <strong>UTR number</strong></li>
            </ol>
          </div>

          {/* UTR input */}
          <div>
            <label className="label">UTR / Transaction ID <span className="text-red-500">*</span></label>
            <input
              className="input-field"
              placeholder="e.g. 407812345678"
              value={utr}
              onChange={e => setUtr(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              maxLength={30}
            />
            <p className="text-xs text-gray-400 mt-1">Find UTR in your UPI app under payment history</p>
          </div>

          <button onClick={handleSubmit} disabled={!utr.trim() || submitting} className="btn-primary w-full">
            {submitting ? 'Submitting...' : 'Confirm Payment'}
          </button>
        </div>
      </div>
    </div>
  );
}
