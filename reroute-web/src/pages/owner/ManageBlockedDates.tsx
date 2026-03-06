import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import Layout from '../../components/layout/Layout';
import { useAuth } from '../../context/AuthContext';
import { getFarmhouse, updateBlockedDates } from '../../services/farmhouseService';
import { useToast } from '../../context/ToastContext';
import type { Farmhouse } from '../../types/index';

function toDateString(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

interface CalendarProps {
  year: number;
  month: number;
  bookedDates: Set<string>;
  blockedDates: Set<string>;
  onToggle: (dateStr: string) => void;
}

function MonthCalendar({ year, month, bookedDates, blockedDates, onToggle }: CalendarProps) {
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfWeek(year, month);
  const today = new Date();
  const todayStr = toDateString(today.getFullYear(), today.getMonth(), today.getDate());

  const cells: (string | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) =>
      toDateString(year, month, i + 1)
    ),
  ];

  // Pad to complete last row
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="card">
      <h3 className="font-semibold text-gray-800 text-center mb-4">
        {MONTH_NAMES[month]} {year}
      </h3>
      <div className="grid grid-cols-7 gap-1 mb-2">
        {WEEKDAYS.map((d) => (
          <div key={d} className="text-center text-xs text-gray-400 font-medium py-1">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((dateStr, idx) => {
          if (!dateStr) return <div key={idx} />;
          const isBooked = bookedDates.has(dateStr);
          const isBlocked = blockedDates.has(dateStr);
          const isPast = dateStr < todayStr;
          const day = parseInt(dateStr.split('-')[2]);

          let cls =
            'relative flex items-center justify-center rounded-lg h-9 text-sm cursor-pointer transition select-none ';
          if (isBooked) {
            cls += 'bg-blue-100 text-blue-700 font-semibold cursor-not-allowed';
          } else if (isBlocked) {
            cls += 'bg-red-100 text-red-700 font-semibold hover:bg-red-200';
          } else if (isPast) {
            cls += 'text-gray-300 cursor-not-allowed';
          } else {
            cls += 'text-gray-700 hover:bg-gray-100';
          }

          return (
            <button
              key={dateStr}
              className={cls}
              disabled={isBooked || isPast}
              onClick={() => !isBooked && !isPast && onToggle(dateStr)}
              title={isBooked ? 'Booked' : isBlocked ? 'Blocked (click to unblock)' : 'Click to block'}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function ManageBlockedDates() {
  const { farmhouseId } = useParams<{ farmhouseId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { show } = useToast();

  const [farmhouse, setFarmhouse] = useState<Farmhouse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [blockedSet, setBlockedSet] = useState<Set<string>>(new Set());
  const [bookedSet, setBookedSet] = useState<Set<string>>(new Set());
  const [dirty, setDirty] = useState(false);

  const now = new Date();
  const thisYear = now.getFullYear();
  const thisMonth = now.getMonth();
  const nextMonth = thisMonth === 11 ? 0 : thisMonth + 1;
  const nextMonthYear = thisMonth === 11 ? thisYear + 1 : thisYear;

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
  }, [user, navigate]);

  useEffect(() => {
    if (!farmhouseId) return;
    getFarmhouse(farmhouseId)
      .then((fh) => {
        setFarmhouse(fh);
        setBlockedSet(new Set(fh?.blockedDates ?? []));
        setBookedSet(new Set(fh?.bookedDates ?? []));
        setLoading(false);
      })
      .catch(() => {
        show('Failed to load farmhouse', 'error');
        setLoading(false);
      });
  }, [farmhouseId]);

  const handleToggle = (dateStr: string) => {
    setBlockedSet((prev) => {
      const next = new Set(prev);
      if (next.has(dateStr)) {
        next.delete(dateStr);
      } else {
        next.add(dateStr);
      }
      return next;
    });
    setDirty(true);
  };

  const handleSave = async () => {
    if (!farmhouseId) return;
    setSaving(true);
    try {
      await updateBlockedDates(farmhouseId, Array.from(blockedSet));
      show('Blocked dates updated!', 'success');
      setDirty(false);
    } catch {
      show('Failed to save blocked dates', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="page-wrap flex justify-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-yellow-500" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="page-wrap max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-full hover:bg-gray-100 transition"
          >
            <ArrowLeft size={20} className="text-gray-600" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Manage Blocked Dates</h1>
            {farmhouse && <p className="text-sm text-gray-500">{farmhouse.name}</p>}
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 mb-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-blue-100 border border-blue-300" />
            <span className="text-gray-600">Booked (by guests)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-red-100 border border-red-300" />
            <span className="text-gray-600">Blocked (by you)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-white border border-gray-300" />
            <span className="text-gray-600">Available</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <MonthCalendar
            year={thisYear}
            month={thisMonth}
            bookedDates={bookedSet}
            blockedDates={blockedSet}
            onToggle={handleToggle}
          />
          <MonthCalendar
            year={nextMonthYear}
            month={nextMonth}
            bookedDates={bookedSet}
            blockedDates={blockedSet}
            onToggle={handleToggle}
          />
        </div>

        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            {blockedSet.size} date{blockedSet.size !== 1 ? 's' : ''} blocked
            {dirty && <span className="text-orange-500 ml-2">• Unsaved changes</span>}
          </p>
          <button
            onClick={handleSave}
            disabled={saving || !dirty}
            className="btn-primary flex items-center gap-2 disabled:opacity-50"
          >
            <Save size={16} />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </Layout>
  );
}
