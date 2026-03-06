import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import {
  Eye,
  CheckCircle,
  XCircle,
  Building2,
  MapPin,
  Users,
  Bed,
  Tv,
  Flame,
  Droplets,
  Chess,
  Dices,
  Volleyball,
  Waves,
} from 'lucide-react';
import Layout from '../../components/layout/Layout';
import Modal from '../../components/ui/Modal';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { updateFarmhouseStatus } from '../../services/farmhouseService';
import type { Farmhouse } from '../../types/index';

function StatusBadge({ status }: { status?: string }) {
  if (status === 'approved') return <span className="badge-green">Approved</span>;
  if (status === 'rejected') return <span className="badge-red">Rejected</span>;
  return <span className="badge-gold">Pending</span>;
}

function toDateLabel(val: unknown): string {
  if (!val) return '—';
  if (typeof val === 'object' && val !== null && 'seconds' in val) {
    return new Date((val as { seconds: number }).seconds * 1000).toLocaleDateString();
  }
  return new Date(val as string).toLocaleDateString();
}

function AmenityChip({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700">
      <span className="text-yellow-500">{icon}</span>
      {label}
    </div>
  );
}

const AMENITY_ICONS: Record<string, React.ReactNode> = {
  tv: <Tv size={16} />, geyser: <Droplets size={16} />, bonfire: <Flame size={16} />,
  chess: <Chess size={16} />, carroms: <Dices size={16} />, volleyball: <Volleyball size={16} />, pool: <Waves size={16} />,
};

export default function FarmhouseApprovals() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [farmhouses, setFarmhouses] = useState<Farmhouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFarmhouse, setSelectedFarmhouse] = useState<Farmhouse | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    if ((user as any).role !== 'admin') { navigate('/'); return; }
  }, [user, navigate]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'farmhouses'), (snap) => {
      setFarmhouses(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Farmhouse)));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const filtered = farmhouses.filter((f) =>
    filter === 'all' ? true : f.status === filter
  );

  const handleApprove = async (id: string) => {
    setActionLoading(id + '-approve');
    try {
      await updateFarmhouseStatus(id, 'approved');
      showToast('Farmhouse approved!', 'success');
      setSelectedFarmhouse(null);
    } catch { showToast('Failed to approve', 'error'); }
    finally { setActionLoading(null); }
  };

  const handleReject = async (id: string) => {
    setActionLoading(id + '-reject');
    try {
      await updateFarmhouseStatus(id, 'rejected');
      showToast('Farmhouse rejected', 'success');
      setSelectedFarmhouse(null);
    } catch { showToast('Failed to reject', 'error'); }
    finally { setActionLoading(null); }
  };

  if (!user || (user as any).role !== 'admin') return null;

  return (
    <Layout>
      <div className="page-wrap max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Farmhouse Approvals</h1>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {(['all', 'pending', 'approved', 'rejected'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition capitalize border ${
                filter === f
                  ? 'bg-yellow-500 text-white border-yellow-500'
                  : 'bg-white text-gray-600 border-gray-300 hover:border-yellow-400'
              }`}
            >
              {f} {f !== 'all' && `(${farmhouses.filter((fh) => fh.status === f).length})`}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-yellow-500" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="card text-center py-16">
            <Building2 size={48} className="mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500">No farmhouses found.</p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden sm:block card overflow-x-auto p-0">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-3 text-gray-600 font-medium">Farmhouse</th>
                    <th className="text-left px-4 py-3 text-gray-600 font-medium">Owner</th>
                    <th className="text-left px-4 py-3 text-gray-600 font-medium">City</th>
                    <th className="text-left px-4 py-3 text-gray-600 font-medium">Submitted</th>
                    <th className="text-center px-4 py-3 text-gray-600 font-medium">Status</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map((fh) => (
                    <tr key={fh.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-800">{fh.name}</td>
                      <td className="px-4 py-3 text-gray-600 max-w-[160px] truncate">{fh.ownerEmail ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{fh.city}</td>
                      <td className="px-4 py-3 text-gray-500">{toDateLabel(fh.createdAt)}</td>
                      <td className="px-4 py-3 text-center"><StatusBadge status={fh.status} /></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 justify-end">
                          <button
                            onClick={() => setSelectedFarmhouse(fh)}
                            className="btn-outline text-xs py-1.5 px-3 flex items-center gap-1"
                          >
                            <Eye size={14} />
                            View
                          </button>
                          {fh.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleApprove(fh.id!)}
                                disabled={!!actionLoading}
                                className="p-1.5 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg transition"
                              >
                                <CheckCircle size={16} />
                              </button>
                              <button
                                onClick={() => handleReject(fh.id!)}
                                disabled={!!actionLoading}
                                className="p-1.5 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition"
                              >
                                <XCircle size={16} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="sm:hidden space-y-4">
              {filtered.map((fh) => (
                <div key={fh.id} className="card">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-semibold text-gray-800">{fh.name}</p>
                      <p className="text-sm text-gray-500">{fh.city} · {toDateLabel(fh.createdAt)}</p>
                    </div>
                    <StatusBadge status={fh.status} />
                  </div>
                  <p className="text-sm text-gray-500 mb-3">{fh.ownerEmail}</p>
                  <div className="flex gap-2 flex-wrap">
                    <button onClick={() => setSelectedFarmhouse(fh)} className="btn-outline text-xs py-1.5 px-3 flex items-center gap-1">
                      <Eye size={13} /> View
                    </button>
                    {fh.status === 'pending' && (
                      <>
                        <button onClick={() => handleApprove(fh.id!)} className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1">
                          <CheckCircle size={13} /> Approve
                        </button>
                        <button onClick={() => handleReject(fh.id!)} className="text-xs py-1.5 px-3 bg-red-100 text-red-700 rounded-lg flex items-center gap-1">
                          <XCircle size={13} /> Reject
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Detail Modal */}
        {selectedFarmhouse && (
          <Modal
            isOpen
            onClose={() => setSelectedFarmhouse(null)}
            title={selectedFarmhouse.name}
          >
            <div className="space-y-5 overflow-y-auto max-h-[70vh]">
              {/* Photos */}
              {selectedFarmhouse.photos && selectedFarmhouse.photos.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {selectedFarmhouse.photos.map((url, i) => (
                    <img key={i} src={url} alt={`Photo ${i + 1}`} className="w-full h-28 object-cover rounded-xl" />
                  ))}
                </div>
              )}

              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2 text-gray-600">
                  <MapPin size={16} className="text-yellow-500" />
                  {selectedFarmhouse.area}, {selectedFarmhouse.city}
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Users size={16} className="text-yellow-500" />
                  {selectedFarmhouse.capacity} guests
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Bed size={16} className="text-yellow-500" />
                  {selectedFarmhouse.bedrooms} bedrooms
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <StatusBadge status={selectedFarmhouse.status} />
                </div>
              </div>

              {/* Description */}
              {selectedFarmhouse.description && (
                <div>
                  <h4 className="font-semibold text-gray-700 mb-1 text-sm">Description</h4>
                  <p className="text-sm text-gray-600">{selectedFarmhouse.description}</p>
                </div>
              )}

              {/* Amenities */}
              {selectedFarmhouse.amenities && (
                <div>
                  <h4 className="font-semibold text-gray-700 mb-2 text-sm">Amenities</h4>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(selectedFarmhouse.amenities).map(([key, val]) => {
                      if (!val || val === 0 || val === false) return null;
                      const suffix = typeof val === 'number' && val > 1 ? ` x${val}` : '';
                      return <AmenityChip key={key} icon={AMENITY_ICONS[key]} label={key + suffix} />;
                    })}
                  </div>
                </div>
              )}

              {/* KYC */}
              {(selectedFarmhouse as any).basicDetails?.kyc && (
                <div>
                  <h4 className="font-semibold text-gray-700 mb-2 text-sm">KYC Info</h4>
                  <div className="bg-gray-50 rounded-xl p-3 text-sm space-y-1">
                    {Object.entries((selectedFarmhouse as any).basicDetails.kyc).map(([k, v]) => (
                      <div key={k} className="flex justify-between">
                        <span className="text-gray-500 capitalize">{k}</span>
                        <span className="font-medium text-gray-800">{v as string}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              {selectedFarmhouse.status === 'pending' && (
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => handleApprove(selectedFarmhouse.id!)}
                    disabled={!!actionLoading}
                    className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <CheckCircle size={16} />
                    {actionLoading === selectedFarmhouse.id + '-approve' ? 'Approving...' : 'Approve'}
                  </button>
                  <button
                    onClick={() => handleReject(selectedFarmhouse.id!)}
                    disabled={!!actionLoading}
                    className="flex-1 py-2 bg-red-100 text-red-700 hover:bg-red-200 rounded-xl font-medium transition flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <XCircle size={16} />
                    {actionLoading === selectedFarmhouse.id + '-reject' ? 'Rejecting...' : 'Reject'}
                  </button>
                </div>
              )}
            </div>
          </Modal>
        )}
      </div>
    </Layout>
  );
}
