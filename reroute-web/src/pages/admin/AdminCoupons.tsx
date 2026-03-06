import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusCircle, Tag, ToggleLeft, ToggleRight } from 'lucide-react';
import Layout from '../../components/layout/Layout';
import Modal from '../../components/ui/Modal';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { subscribeCoupons, createCoupon, toggleCoupon } from '../../services/couponService';
import type { Coupon } from '../../types/index';

function toDateLabel(val: unknown): string {
  if (!val) return '—';
  if (typeof val === 'object' && val !== null && 'seconds' in val) {
    return new Date((val as { seconds: number }).seconds * 1000).toLocaleDateString();
  }
  return new Date(val as string).toLocaleDateString();
}

const emptyForm: Omit<Coupon, 'id' | 'usedCount' | 'createdAt'> = {
  code: '',
  type: 'percent',
  value: 0,
  validUntil: '',
  active: true,
  maxUses: 100,
  minOrderAmount: 0,
};

export default function AdminCoupons() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    if ((user as any).role !== 'admin') { navigate('/'); return; }
  }, [user, navigate]);

  useEffect(() => {
    const unsub = subscribeCoupons((list) => {
      setCoupons(list.sort((a, b) => toTs(b.createdAt) - toTs(a.createdAt)));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  function toTs(val: unknown): number {
    if (!val) return 0;
    if (typeof val === 'object' && val !== null && 'seconds' in val) return (val as { seconds: number }).seconds;
    return new Date(val as string).getTime() / 1000;
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.code.trim()) { showToast('Coupon code is required', 'error'); return; }
    setSaving(true);
    try {
      await createCoupon({
        ...form,
        code: form.code.toUpperCase().trim(),
        value: Number(form.value),
        maxUses: Number(form.maxUses),
        minOrderAmount: Number(form.minOrderAmount),
      } as Omit<Coupon, 'id'>);
      showToast('Coupon created!', 'success');
      setShowModal(false);
      setForm({ ...emptyForm });
    } catch { showToast('Failed to create coupon', 'error'); }
    finally { setSaving(false); }
  };

  const handleToggle = async (id: string, active: boolean) => {
    setTogglingId(id);
    try {
      await toggleCoupon(id, !active);
      showToast(`Coupon ${!active ? 'activated' : 'deactivated'}`, 'success');
    } catch { showToast('Failed to update coupon', 'error'); }
    finally { setTogglingId(null); }
  };

  const setField = <K extends keyof typeof form>(key: K, val: (typeof form)[K]) => {
    setForm((prev) => ({ ...prev, [key]: val }));
  };

  if (!user || (user as any).role !== 'admin') return null;

  return (
    <Layout>
      <div className="page-wrap max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Coupons</h1>
          <button
            onClick={() => setShowModal(true)}
            className="btn-primary flex items-center gap-2"
          >
            <PlusCircle size={18} />
            Add Coupon
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-yellow-500" />
          </div>
        ) : coupons.length === 0 ? (
          <div className="card text-center py-16">
            <Tag size={48} className="mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500">No coupons yet.</p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden sm:block card overflow-x-auto p-0">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-3 text-gray-600 font-medium">Code</th>
                    <th className="text-left px-4 py-3 text-gray-600 font-medium">Type</th>
                    <th className="text-right px-4 py-3 text-gray-600 font-medium">Value</th>
                    <th className="text-center px-4 py-3 text-gray-600 font-medium">Valid Until</th>
                    <th className="text-center px-4 py-3 text-gray-600 font-medium">Used</th>
                    <th className="text-center px-4 py-3 text-gray-600 font-medium">Max Uses</th>
                    <th className="text-center px-4 py-3 text-gray-600 font-medium">Active</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {coupons.map((c) => (
                    <tr key={c.id} className={`hover:bg-gray-50 ${!c.active ? 'opacity-50' : ''}`}>
                      <td className="px-4 py-3 font-mono font-bold text-yellow-700">{c.code}</td>
                      <td className="px-4 py-3 text-gray-600 capitalize">{c.type}</td>
                      <td className="px-4 py-3 text-right font-semibold">
                        {c.type === 'percent' ? `${c.value}%` : `₹${c.value}`}
                      </td>
                      <td className="px-4 py-3 text-center text-gray-500">{toDateLabel(c.validUntil)}</td>
                      <td className="px-4 py-3 text-center text-gray-600">{c.usedCount ?? 0}</td>
                      <td className="px-4 py-3 text-center text-gray-600">{c.maxUses ?? '∞'}</td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleToggle(c.id!, c.active ?? false)}
                          disabled={togglingId === c.id}
                          className="transition disabled:opacity-50"
                          title={c.active ? 'Deactivate' : 'Activate'}
                        >
                          {c.active ? (
                            <ToggleRight size={28} className="text-green-500" />
                          ) : (
                            <ToggleLeft size={28} className="text-gray-400" />
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="sm:hidden space-y-4">
              {coupons.map((c) => (
                <div key={c.id} className={`card ${!c.active ? 'opacity-60' : ''}`}>
                  <div className="flex items-start justify-between mb-2">
                    <span className="font-mono font-bold text-yellow-700 text-lg">{c.code}</span>
                    <button
                      onClick={() => handleToggle(c.id!, c.active ?? false)}
                      disabled={togglingId === c.id}
                    >
                      {c.active ? (
                        <ToggleRight size={26} className="text-green-500" />
                      ) : (
                        <ToggleLeft size={26} className="text-gray-400" />
                      )}
                    </button>
                  </div>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>Type: <span className="font-medium capitalize">{c.type}</span></p>
                    <p>Value: <span className="font-medium">{c.type === 'percent' ? `${c.value}%` : `₹${c.value}`}</span></p>
                    <p>Used: <span className="font-medium">{c.usedCount ?? 0} / {c.maxUses ?? '∞'}</span></p>
                    <p>Valid until: <span className="font-medium">{toDateLabel(c.validUntil)}</span></p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Add Coupon Modal */}
        <Modal isOpen={showModal} onClose={() => { setShowModal(false); setForm({ ...emptyForm }); }} title="Add New Coupon">
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="label">Coupon Code *</label>
              <input
                className="input-field uppercase"
                value={form.code}
                onChange={(e) => setField('code', e.target.value.toUpperCase())}
                placeholder="e.g. SUMMER20"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Type</label>
                <select
                  className="input-field"
                  value={form.type}
                  onChange={(e) => setField('type', e.target.value as 'percent' | 'flat')}
                >
                  <option value="percent">Percent (%)</option>
                  <option value="flat">Flat (₹)</option>
                </select>
              </div>
              <div>
                <label className="label">Value</label>
                <input
                  type="number"
                  min={0}
                  className="input-field"
                  value={form.value}
                  onChange={(e) => setField('value', Number(e.target.value))}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Max Uses</label>
                <input
                  type="number"
                  min={1}
                  className="input-field"
                  value={form.maxUses}
                  onChange={(e) => setField('maxUses', Number(e.target.value))}
                />
              </div>
              <div>
                <label className="label">Min Order (₹)</label>
                <input
                  type="number"
                  min={0}
                  className="input-field"
                  value={form.minOrderAmount}
                  onChange={(e) => setField('minOrderAmount', Number(e.target.value))}
                />
              </div>
            </div>
            <div>
              <label className="label">Valid Until</label>
              <input
                type="date"
                className="input-field"
                value={form.validUntil as string}
                onChange={(e) => setField('validUntil', e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="coupon-active"
                checked={form.active}
                onChange={(e) => setField('active', e.target.checked)}
                className="w-4 h-4 accent-yellow-500"
              />
              <label htmlFor="coupon-active" className="text-sm text-gray-700">Active immediately</label>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => { setShowModal(false); setForm({ ...emptyForm }); }}
                className="btn-outline flex-1"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="btn-primary flex-1 disabled:opacity-50"
              >
                {saving ? 'Creating...' : 'Create Coupon'}
              </button>
            </div>
          </form>
        </Modal>
      </div>
    </Layout>
  );
}
