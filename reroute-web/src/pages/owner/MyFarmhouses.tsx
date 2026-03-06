import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  PlusCircle,
  MapPin,
  Users,
  Building2,
  CalendarOff,
  PenLine,
  BookOpen,
  Bed,
} from 'lucide-react';
import Layout from '../../components/layout/Layout';
import { useAuth } from '../../context/AuthContext';
import { subscribeOwnerFarmhouses } from '../../services/farmhouseService';
import type { Farmhouse } from '../../types/index';

function StatusBadge({ status }: { status?: string }) {
  if (status === 'approved') return <span className="badge-green">Approved</span>;
  if (status === 'rejected') return <span className="badge-red">Rejected</span>;
  return <span className="badge-gold">Pending</span>;
}

function fmt(n?: number) {
  if (!n) return '—';
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

export default function MyFarmhouses() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [farmhouses, setFarmhouses] = useState<Farmhouse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    if ((user as any).role !== 'owner') { navigate('/login'); return; }
  }, [user, navigate]);

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeOwnerFarmhouses(user.uid, (list) => {
      setFarmhouses(list);
      setLoading(false);
    });
    return () => unsub();
  }, [user]);

  if (!user) return null;

  return (
    <Layout>
      <div className="page-wrap max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">My Farmhouses</h1>
          <Link to="/owner/register" className="btn-primary flex items-center gap-2">
            <PlusCircle size={18} />
            Add New
          </Link>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-yellow-500" />
          </div>
        ) : farmhouses.length === 0 ? (
          <div className="card text-center py-16">
            <Building2 size={48} className="mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">No farmhouses yet</h3>
            <p className="text-gray-500 mb-6">Get started by listing your first farmhouse.</p>
            <Link to="/owner/register" className="btn-primary inline-flex items-center gap-2">
              <PlusCircle size={18} />
              Add Farmhouse
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {farmhouses.map((fh) => (
              <FarmhouseCard key={fh.id} farmhouse={fh} />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}

function FarmhouseCard({ farmhouse }: { farmhouse: Farmhouse }) {
  const photo = farmhouse.photos?.[0];
  const pricing = farmhouse.pricing;

  return (
    <div className="card overflow-hidden p-0 flex flex-col">
      <div className="relative h-44 bg-gray-100">
        {photo ? (
          <img src={photo} alt={farmhouse.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <Building2 size={40} />
          </div>
        )}
        <div className="absolute top-3 left-3">
          <StatusBadge status={farmhouse.status} />
        </div>
      </div>
      <div className="p-4 flex-1 flex flex-col">
        <h3 className="font-semibold text-gray-900 text-base mb-1 truncate">{farmhouse.name}</h3>
        <div className="flex items-center gap-1 text-gray-500 text-sm mb-2">
          <MapPin size={14} />
          <span className="truncate">{farmhouse.area}, {farmhouse.city}</span>
        </div>
        <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
          <span className="flex items-center gap-1">
            <Users size={14} />
            {farmhouse.capacity} guests
          </span>
          <span className="flex items-center gap-1">
            <Bed size={14} />
            {farmhouse.bedrooms} beds
          </span>
        </div>
        {pricing?.weeklyNight && (
          <p className="text-sm text-gray-600 mb-3">
            From <span className="gold-text font-semibold">{fmt(pricing.weeklyNight)}</span> / night
          </p>
        )}
        <div className="flex flex-wrap gap-2 mt-auto pt-2 border-t border-gray-100">
          <Link
            to={`/owner/bookings/${farmhouse.id}`}
            className="btn-outline flex items-center gap-1 text-xs py-1.5 px-3"
          >
            <BookOpen size={14} />
            Bookings
          </Link>
          <Link
            to={`/owner/blocked-dates/${farmhouse.id}`}
            className="btn-ghost flex items-center gap-1 text-xs py-1.5 px-3"
          >
            <CalendarOff size={14} />
            Blocked Dates
          </Link>
          <Link
            to={`/owner/edit/${farmhouse.id}`}
            className="btn-ghost flex items-center gap-1 text-xs py-1.5 px-3"
          >
            <PenLine size={14} />
            Edit
          </Link>
        </div>
      </div>
    </div>
  );
}
