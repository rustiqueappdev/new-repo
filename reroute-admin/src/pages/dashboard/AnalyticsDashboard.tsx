import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  CircularProgress,
  Chip,
  Avatar,
  LinearProgress,
  Divider,
} from '@mui/material';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, LineChart, Line, Legend, AreaChart, Area,
} from 'recharts';
import {
  EventNote, CheckCircleOutline, CancelOutlined, TrendingDown, TrendingUp,
  CurrencyRupee, Schedule, PaidOutlined, HourglassEmpty, Star, LocalOffer,
  Person, EmojiEvents, WarningAmberOutlined, Verified, GroupAdd,
} from '@mui/icons-material';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import MainLayout from '../../components/layout/MainLayout';

// Brand palette (matches existing pages)
const COLOR = {
  green: '#10B981',
  greenBg: '#ECFDF5',
  blue: '#3B82F6',
  blueBg: '#EFF6FF',
  purple: '#8B5CF6',
  purpleBg: '#F5F3FF',
  amber: '#F59E0B',
  amberBg: '#FFFBEB',
  red: '#EF4444',
  redBg: '#FEE2E2',
  pink: '#EC4899',
  pinkBg: '#FCE7F3',
  ink: '#111827',
  muted: '#6B7280',
  faint: '#9CA3AF',
  border: 'rgba(0,0,0,0.06)',
  rule: '#F3F4F6',
};

const STATUS_COLORS: Record<string, string> = {
  confirmed: COLOR.green,
  completed: COLOR.blue,
  cancelled: COLOR.red,
  pending: COLOR.amber,
};

const PIE_COLORS = [COLOR.green, COLOR.blue, COLOR.amber, COLOR.red, COLOR.purple, COLOR.pink];

const tsToDate = (ts: any): Date | null => {
  if (!ts) return null;
  try {
    if (ts?.toDate && typeof ts.toDate === 'function') return ts.toDate();
    const d = new Date(ts);
    return isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
};

const fmtINR = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;
const pct = (n: number) => `${(isFinite(n) ? n : 0).toFixed(1)}%`;

const SectionHeader: React.FC<{ title: string; subtitle?: string }> = ({ title, subtitle }) => (
  <Box sx={{ mt: 4, mb: 2 }}>
    <Typography sx={{ fontWeight: 700, fontSize: '1.1rem', color: COLOR.ink, letterSpacing: '-0.01em' }}>
      {title}
    </Typography>
    {subtitle && (
      <Typography sx={{ fontSize: '0.8rem', color: COLOR.faint, mt: 0.25 }}>{subtitle}</Typography>
    )}
    <Divider sx={{ mt: 1.5, borderColor: COLOR.rule }} />
  </Box>
);

const KpiCard: React.FC<{
  label: string;
  value: string;
  icon: React.ReactNode;
  color: string;
  bg: string;
  delta?: { value: number; positiveIsGood?: boolean };
  helper?: string;
}> = ({ label, value, icon, color, bg, delta, helper }) => {
  const isUp = (delta?.value ?? 0) >= 0;
  const positive = delta ? (delta.positiveIsGood !== false ? isUp : !isUp) : true;
  return (
    <Paper
      elevation={0}
      sx={{
        p: 2.25, borderRadius: 3, border: '1px solid', borderColor: COLOR.border,
        height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        transition: 'transform .15s ease, box-shadow .15s ease',
        '&:hover': { transform: 'translateY(-1px)', boxShadow: '0 4px 14px rgba(0,0,0,0.04)' },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1.5 }}>
        <Avatar variant='rounded' sx={{ bgcolor: bg, color, width: 36, height: 36, borderRadius: 2 }}>
          {icon}
        </Avatar>
        {delta !== undefined && (
          <Chip
            size='small'
            icon={isUp ? <TrendingUp sx={{ fontSize: 14 }} /> : <TrendingDown sx={{ fontSize: 14 }} />}
            label={`${isUp ? '+' : ''}${delta.value.toFixed(1)}%`}
            sx={{
              height: 22, fontSize: '0.7rem', fontWeight: 600,
              bgcolor: positive ? COLOR.greenBg : COLOR.redBg,
              color: positive ? COLOR.green : COLOR.red,
              '& .MuiChip-icon': { color: positive ? COLOR.green : COLOR.red, ml: '4px' },
            }}
          />
        )}
      </Box>
      <Typography sx={{ fontSize: '0.72rem', fontWeight: 600, color: COLOR.muted, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {label}
      </Typography>
      <Typography sx={{ fontSize: '1.6rem', fontWeight: 700, color: COLOR.ink, lineHeight: 1.15, mt: 0.25 }}>
        {value}
      </Typography>
      {helper && (
        <Typography sx={{ fontSize: '0.7rem', color: COLOR.faint, mt: 0.5 }}>{helper}</Typography>
      )}
    </Paper>
  );
};

const ChartCard: React.FC<{ title: string; subtitle?: string; children: React.ReactNode; height?: number }> = ({
  title, subtitle, children, height,
}) => (
  <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: COLOR.border, height: height ? height + 80 : undefined }}>
    <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', color: COLOR.ink, mb: 0.25 }}>{title}</Typography>
    {subtitle && (
      <Typography sx={{ fontSize: '0.75rem', color: COLOR.faint, mb: 2 }}>{subtitle}</Typography>
    )}
    <Box sx={{ mt: subtitle ? 0 : 1.5 }}>{children}</Box>
  </Paper>
);

const tooltipStyle = { borderRadius: 8, border: '1px solid #E5E7EB', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', fontSize: 12 };

const AnalyticsDashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<any[]>([]);
  const [farmhouses, setFarmhouses] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [coupons, setCoupons] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const [bSnap, fSnap, uSnap, rSnap, cSnap] = await Promise.all([
          getDocs(collection(db, 'bookings')),
          getDocs(collection(db, 'farmhouses')),
          getDocs(collection(db, 'users')),
          getDocs(collection(db, 'reviews')).catch(() => ({ docs: [] } as any)),
          getDocs(collection(db, 'coupons')).catch(() => ({ docs: [] } as any)),
        ]);

        const fh = fSnap.docs.map((d: any) => ({ farmhouse_id: d.id, ...d.data() }));
        const commissionMap: Record<string, number> = {};
        const farmhouseNameMap: Record<string, string> = {};
        const farmhouseOwnerMap: Record<string, string> = {};
        fh.forEach((f: any) => {
          commissionMap[f.farmhouse_id] = f.commission_percentage ?? f.commissionPercentage ?? 10;
          farmhouseNameMap[f.farmhouse_id] = f.basicDetails?.name || f.name || f.farmhouse_id.substring(0, 8);
          farmhouseOwnerMap[f.farmhouse_id] = f.ownerId || f.owner_id || '';
        });

        const bs = bSnap.docs.map((d: any) => {
          const data = d.data();
          const fid = data.farmhouseId || data.farmhouse_id;
          return {
            booking_id: d.id,
            ...data,
            _farmhouseId: fid,
            _farmhouseName: data.farmhouseName || farmhouseNameMap[fid] || 'Unknown',
            _ownerId: farmhouseOwnerMap[fid] || data.ownerId || '',
            _commissionPct: commissionMap[fid] ?? 10,
            _createdAt: tsToDate(data.createdAt || data.created_at),
            _checkIn: tsToDate(data.checkInDate || data.start_date),
          };
        });

        setBookings(bs);
        setFarmhouses(fh);
        setUsers(uSnap.docs.map((d: any) => ({ user_id: d.id, ...d.data(), _createdAt: tsToDate(d.data().created_at || d.data().createdAt) })));
        setReviews(rSnap.docs.map((d: any) => ({ review_id: d.id, ...d.data() })));
        setCoupons(cSnap.docs.map((d: any) => ({ coupon_id: d.id, ...d.data() })));
      } catch (e) {
        console.error('Analytics fetch error', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ============ DERIVED METRICS ============
  const m = useMemo(() => {
    const total = bookings.length;
    const confirmed = bookings.filter(b => b.status === 'confirmed').length;
    const cancelled = bookings.filter(b => b.status === 'cancelled').length;
    const completed = bookings.filter(b => b.status === 'completed').length;
    const cancellationRate = total ? (cancelled / total) * 100 : 0;

    const paid = bookings.filter(b => b.paymentStatus === 'paid');
    const failed = bookings.filter(b => b.paymentStatus === 'failed').length;
    const pendingPayments = bookings.filter(b => b.paymentStatus === 'pending' || b.paymentStatus === 'utr_submitted').length;
    const paymentSuccess = (paid.length + failed) > 0 ? (paid.length / (paid.length + failed)) * 100 : 0;

    const revenue = paid.reduce((s, b) => s + (b.totalPrice || 0), 0);
    const avgBookingValue = paid.length ? revenue / paid.length : 0;

    // Avg lead time (days between createdAt and checkIn) — only for bookings with both
    const leadTimes = bookings
      .filter(b => b._createdAt && b._checkIn)
      .map(b => Math.max(0, (b._checkIn.getTime() - b._createdAt.getTime()) / 86400000));
    const avgLead = leadTimes.length ? leadTimes.reduce((a, b) => a + b, 0) / leadTimes.length : 0;

    // Period-over-period: last 30 days vs prior 30 days (by createdAt)
    const now = Date.now();
    const d30 = 30 * 86400000;
    const last30 = bookings.filter(b => b._createdAt && now - b._createdAt.getTime() <= d30);
    const prior30 = bookings.filter(b => b._createdAt && now - b._createdAt.getTime() > d30 && now - b._createdAt.getTime() <= 2 * d30);
    const bookingsDelta = prior30.length ? ((last30.length - prior30.length) / prior30.length) * 100 : 0;
    const last30Rev = last30.filter(b => b.paymentStatus === 'paid').reduce((s, b) => s + (b.totalPrice || 0), 0);
    const prior30Rev = prior30.filter(b => b.paymentStatus === 'paid').reduce((s, b) => s + (b.totalPrice || 0), 0);
    const revenueDelta = prior30Rev ? ((last30Rev - prior30Rev) / prior30Rev) * 100 : 0;

    return {
      total, confirmed, cancelled, completed, cancellationRate,
      paid: paid.length, failed, pendingPayments, paymentSuccess,
      revenue, avgBookingValue, avgLead,
      bookingsDelta, revenueDelta,
    };
  }, [bookings]);

  // Bookings over time (last 90 days, by createdAt)
  const bookingsOverTime = useMemo(() => {
    const buckets: Record<string, { date: string; bookings: number; revenue: number }> = {};
    const now = new Date();
    for (let i = 89; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
      buckets[key] = { date: label, bookings: 0, revenue: 0 };
    }
    bookings.forEach(b => {
      if (!b._createdAt) return;
      const key = b._createdAt.toISOString().slice(0, 10);
      if (buckets[key]) {
        buckets[key].bookings += 1;
        if (b.paymentStatus === 'paid') buckets[key].revenue += b.totalPrice || 0;
      }
    });
    return Object.values(buckets);
  }, [bookings]);

  // Booking status for donut
  const statusData = useMemo(() => {
    const counts: Record<string, number> = {};
    bookings.forEach(b => { counts[b.status || 'unknown'] = (counts[b.status || 'unknown'] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [bookings]);

  // Booking type split (overnight vs dayuse)
  const typeData = useMemo(() => {
    const counts: Record<string, number> = {};
    bookings.forEach(b => {
      const t = b.bookingType || 'unspecified';
      counts[t] = (counts[t] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [bookings]);

  // Day-of-week pattern (by checkInDate)
  const dowData = useMemo(() => {
    const names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const counts = [0, 0, 0, 0, 0, 0, 0];
    bookings.forEach(b => { if (b._checkIn) counts[b._checkIn.getDay()] += 1; });
    return names.map((day, i) => ({ day, bookings: counts[i] }));
  }, [bookings]);

  // Month seasonality (by checkInDate)
  const monthData = useMemo(() => {
    const names = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const counts = Array(12).fill(0);
    bookings.forEach(b => { if (b._checkIn) counts[b._checkIn.getMonth()] += 1; });
    return names.map((month, i) => ({ month, bookings: counts[i] }));
  }, [bookings]);

  // Top farmhouses by revenue + bookings
  const topFarmhouses = useMemo(() => {
    const map: Record<string, { id: string; name: string; bookings: number; revenue: number }> = {};
    bookings.forEach(b => {
      const id = b._farmhouseId;
      if (!id) return;
      if (!map[id]) map[id] = { id, name: b._farmhouseName, bookings: 0, revenue: 0 };
      map[id].bookings += 1;
      if (b.paymentStatus === 'paid') map[id].revenue += b.totalPrice || 0;
    });
    return Object.values(map).sort((a, b) => b.revenue - a.revenue);
  }, [bookings]);

  // Top owners
  const topOwners = useMemo(() => {
    const map: Record<string, { ownerId: string; properties: Set<string>; bookings: number; revenue: number }> = {};
    bookings.forEach(b => {
      const oid = b._ownerId;
      if (!oid) return;
      if (!map[oid]) map[oid] = { ownerId: oid, properties: new Set(), bookings: 0, revenue: 0 };
      map[oid].properties.add(b._farmhouseId);
      map[oid].bookings += 1;
      if (b.paymentStatus === 'paid') map[oid].revenue += b.totalPrice || 0;
    });
    const userMap: Record<string, any> = {};
    users.forEach(u => { userMap[u.user_id] = u; });
    return Object.values(map)
      .map(o => ({
        ownerId: o.ownerId,
        name: userMap[o.ownerId]?.name || `Owner ${o.ownerId.substring(0, 6)}`,
        properties: o.properties.size,
        bookings: o.bookings,
        revenue: o.revenue,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 8);
  }, [bookings, users]);

  // Underperforming farmhouses (approved + 0 bookings in last 60 days)
  const underperforming = useMemo(() => {
    const now = Date.now();
    const cutoff = 60 * 86400000;
    const recentBookingFhIds = new Set(
      bookings.filter(b => b._createdAt && now - b._createdAt.getTime() <= cutoff).map(b => b._farmhouseId)
    );
    const approvedStatuses = new Set(['approved', 'active']);
    return farmhouses
      .filter(f => approvedStatuses.has(f.status) && !recentBookingFhIds.has(f.farmhouse_id))
      .map(f => ({
        id: f.farmhouse_id,
        name: f.basicDetails?.name || f.name || f.farmhouse_id.substring(0, 8),
        location: f.basicDetails?.locationText || f.basicDetails?.area || '—',
      }))
      .slice(0, 8);
  }, [bookings, farmhouses]);

  // Coupon usage
  const couponStats = useMemo(() => {
    const used = bookings.filter(b => b.couponCode);
    const totalDiscount = used.reduce((s, b) => s + (b.discountApplied || 0), 0);
    const codeCounts: Record<string, { code: string; uses: number; discount: number }> = {};
    used.forEach(b => {
      const c = b.couponCode as string;
      if (!codeCounts[c]) codeCounts[c] = { code: c, uses: 0, discount: 0 };
      codeCounts[c].uses += 1;
      codeCounts[c].discount += b.discountApplied || 0;
    });
    const top = Object.values(codeCounts).sort((a, b) => b.uses - a.uses).slice(0, 5);
    const redemption = bookings.length ? (used.length / bookings.length) * 100 : 0;
    return { totalUsed: used.length, totalDiscount, top, redemption, activeCoupons: coupons.filter(c => c.is_active).length };
  }, [bookings, coupons]);

  // Reviews summary
  const reviewStats = useMemo(() => {
    if (!reviews.length) return { count: 0, avg: 0, top: [], worst: [] };
    const avg = reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviews.length;
    const byFh: Record<string, { id: string; name: string; sum: number; count: number }> = {};
    reviews.forEach((r: any) => {
      const id = r.farmhouseId;
      if (!id) return;
      if (!byFh[id]) byFh[id] = { id, name: r.farmhouseName || 'Unknown', sum: 0, count: 0 };
      byFh[id].sum += r.rating || 0;
      byFh[id].count += 1;
    });
    const ranked = Object.values(byFh)
      .filter(f => f.count >= 1)
      .map(f => ({ id: f.id, name: f.name, avg: f.sum / f.count, count: f.count }));
    return {
      count: reviews.length,
      avg,
      top: [...ranked].sort((a, b) => b.avg - a.avg).slice(0, 4),
      worst: [...ranked].sort((a, b) => a.avg - b.avg).slice(0, 3).filter(r => r.avg < 4),
    };
  }, [reviews]);

  // New users / new owners (last 12 weeks, weekly buckets)
  const userGrowth = useMemo(() => {
    const weeks: { week: string; users: number; owners: number }[] = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const start = new Date(now);
      start.setDate(start.getDate() - i * 7);
      const label = start.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
      weeks.push({ week: label, users: 0, owners: 0 });
    }
    const startMs = now.getTime() - 12 * 7 * 86400000;
    users.forEach(u => {
      if (!u._createdAt || u._createdAt.getTime() < startMs) return;
      const idx = Math.floor((now.getTime() - u._createdAt.getTime()) / (7 * 86400000));
      const bucket = 11 - idx;
      if (bucket < 0 || bucket >= 12) return;
      if (u.role === 'owner') weeks[bucket].owners += 1;
      else weeks[bucket].users += 1;
    });
    return weeks;
  }, [users]);

  // KYC funnel for owners
  const kycFunnel = useMemo(() => {
    const owners = users.filter(u => u.role === 'owner');
    const approved = owners.filter(u => u.kyc_status === 'approved' || u.owner_kyc?.status === 'approved').length;
    const pending = owners.filter(u => u.kyc_status === 'pending' || u.owner_kyc?.status === 'pending').length;
    const rejected = owners.filter(u => u.kyc_status === 'rejected' || u.owner_kyc?.status === 'rejected').length;
    return {
      total: owners.length,
      approved, pending, rejected,
      approvedPct: owners.length ? (approved / owners.length) * 100 : 0,
      pendingPct: owners.length ? (pending / owners.length) * 100 : 0,
      rejectedPct: owners.length ? (rejected / owners.length) * 100 : 0,
    };
  }, [users]);

  if (loading) {
    return (
      <MainLayout>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '70vh' }}>
          <CircularProgress size={48} sx={{ color: COLOR.green }} />
        </Box>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Box>
        {/* Header */}
        <Box sx={{ mb: 3 }}>
          <Typography sx={{ fontSize: '1.5rem', fontWeight: 700, color: COLOR.ink, letterSpacing: '-0.02em' }}>
            Analytics Overview
          </Typography>
          <Typography sx={{ fontSize: '0.85rem', color: COLOR.faint, mt: 0.5 }}>
            Performance, customer behaviour, and operational health at a glance
          </Typography>
        </Box>

        {/* ============ PERFORMANCE OVERVIEW ============ */}
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <KpiCard
              label='Total Bookings' value={m.total.toLocaleString()}
              icon={<EventNote sx={{ fontSize: 20 }} />} color={COLOR.blue} bg={COLOR.blueBg}
              delta={{ value: m.bookingsDelta }}
              helper='Last 30d vs prior 30d'
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <KpiCard
              label='Confirmed' value={m.confirmed.toLocaleString()}
              icon={<CheckCircleOutline sx={{ fontSize: 20 }} />} color={COLOR.green} bg={COLOR.greenBg}
              helper={`${m.completed} completed`}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <KpiCard
              label='Cancellations' value={m.cancelled.toLocaleString()}
              icon={<CancelOutlined sx={{ fontSize: 20 }} />} color={COLOR.red} bg={COLOR.redBg}
              helper={`${pct(m.cancellationRate)} of all bookings`}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <KpiCard
              label='Cancellation Rate' value={pct(m.cancellationRate)}
              icon={<TrendingDown sx={{ fontSize: 20 }} />} color={COLOR.amber} bg={COLOR.amberBg}
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <KpiCard
              label='Avg Booking Value' value={fmtINR(m.avgBookingValue)}
              icon={<CurrencyRupee sx={{ fontSize: 20 }} />} color={COLOR.purple} bg={COLOR.purpleBg}
              delta={{ value: m.revenueDelta }}
              helper='Across paid bookings'
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <KpiCard
              label='Avg Lead Time' value={`${Math.round(m.avgLead)} days`}
              icon={<Schedule sx={{ fontSize: 20 }} />} color={COLOR.blue} bg={COLOR.blueBg}
              helper='Booking → check-in'
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <KpiCard
              label='Payment Success' value={pct(m.paymentSuccess)}
              icon={<PaidOutlined sx={{ fontSize: 20 }} />} color={COLOR.green} bg={COLOR.greenBg}
              helper={`${m.paid} paid · ${m.failed} failed`}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <KpiCard
              label='Pending Payments' value={m.pendingPayments.toLocaleString()}
              icon={<HourglassEmpty sx={{ fontSize: 20 }} />} color={COLOR.amber} bg={COLOR.amberBg}
              helper='Awaiting verification'
            />
          </Grid>
        </Grid>

        {/* ============ TRENDS ============ */}
        <SectionHeader title='Trends' subtitle='Volume and growth over time' />
        <Grid container spacing={2.5}>
          <Grid size={{ xs: 12, lg: 8 }}>
            <ChartCard title='Bookings & Revenue (Last 90 days)' subtitle='By booking creation date'>
              <ResponsiveContainer width='100%' height={280}>
                <AreaChart data={bookingsOverTime}>
                  <defs>
                    <linearGradient id='bkGrad' x1='0' y1='0' x2='0' y2='1'>
                      <stop offset='5%' stopColor={COLOR.green} stopOpacity={0.25} />
                      <stop offset='95%' stopColor={COLOR.green} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray='3 3' stroke={COLOR.rule} vertical={false} />
                  <XAxis dataKey='date' tick={{ fontSize: 11, fill: COLOR.faint }} interval={Math.max(0, Math.floor(bookingsOverTime.length / 10) - 1)} />
                  <YAxis tick={{ fontSize: 11, fill: COLOR.faint }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Area type='monotone' dataKey='bookings' stroke={COLOR.green} strokeWidth={2.5} fill='url(#bkGrad)' />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>
          </Grid>
          <Grid size={{ xs: 12, lg: 4 }}>
            <ChartCard title='User Growth' subtitle='New signups, last 12 weeks'>
              <ResponsiveContainer width='100%' height={280}>
                <LineChart data={userGrowth}>
                  <CartesianGrid strokeDasharray='3 3' stroke={COLOR.rule} vertical={false} />
                  <XAxis dataKey='week' tick={{ fontSize: 10, fill: COLOR.faint }} interval={1} />
                  <YAxis tick={{ fontSize: 11, fill: COLOR.faint }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 12 }} iconType='circle' />
                  <Line type='monotone' dataKey='users' stroke={COLOR.blue} strokeWidth={2.5} dot={false} name='Customers' />
                  <Line type='monotone' dataKey='owners' stroke={COLOR.purple} strokeWidth={2.5} dot={false} name='Owners' />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
          </Grid>
        </Grid>

        {/* ============ PATTERNS ============ */}
        <SectionHeader title='Patterns' subtitle='When and how customers book' />
        <Grid container spacing={2.5}>
          <Grid size={{ xs: 12, md: 6 }}>
            <ChartCard title='Booking Status' subtitle='Distribution by current state'>
              <ResponsiveContainer width='100%' height={260}>
                <PieChart>
                  <Pie data={statusData} dataKey='value' cx='50%' cy='50%' innerRadius={60} outerRadius={100} paddingAngle={2} stroke='#fff' strokeWidth={2}
                    label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {statusData.map((entry, i) => (
                      <Cell key={i} fill={STATUS_COLORS[entry.name] || PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <ChartCard title='Booking Type' subtitle='Overnight vs Day-use'>
              <ResponsiveContainer width='100%' height={260}>
                <PieChart>
                  <Pie data={typeData} dataKey='value' cx='50%' cy='50%' innerRadius={60} outerRadius={100} paddingAngle={2} stroke='#fff' strokeWidth={2}
                    label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {typeData.map((_, i) => (<Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <ChartCard title='Day of Week' subtitle='Check-ins by weekday'>
              <ResponsiveContainer width='100%' height={260}>
                <BarChart data={dowData}>
                  <CartesianGrid strokeDasharray='3 3' stroke={COLOR.rule} vertical={false} />
                  <XAxis dataKey='day' tick={{ fontSize: 12, fill: COLOR.faint }} />
                  <YAxis tick={{ fontSize: 12, fill: COLOR.faint }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey='bookings' fill={COLOR.green} radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <ChartCard title='Seasonality' subtitle='Check-ins by month'>
              <ResponsiveContainer width='100%' height={260}>
                <BarChart data={monthData}>
                  <CartesianGrid strokeDasharray='3 3' stroke={COLOR.rule} vertical={false} />
                  <XAxis dataKey='month' tick={{ fontSize: 12, fill: COLOR.faint }} />
                  <YAxis tick={{ fontSize: 12, fill: COLOR.faint }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey='bookings' fill={COLOR.purple} radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </Grid>
        </Grid>

        {/* ============ TOP PERFORMERS ============ */}
        <SectionHeader title='Top Performers' subtitle='Best farmhouses, best owners, and properties needing attention' />
        <Grid container spacing={2.5}>
          <Grid size={{ xs: 12, lg: 6 }}>
            <ChartCard title='Top Farmhouses' subtitle='Ranked by paid revenue'>
              <Box sx={{ mt: 1 }}>
                {topFarmhouses.slice(0, 6).map((f, i) => {
                  const max = topFarmhouses[0]?.revenue || 1;
                  return (
                    <Box key={f.id} sx={{ mb: 1.5 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Avatar sx={{ width: 22, height: 22, fontSize: '0.7rem', bgcolor: i < 3 ? COLOR.green : COLOR.faint, color: '#fff', fontWeight: 700 }}>
                            {i + 1}
                          </Avatar>
                          <Typography sx={{ fontSize: '0.85rem', fontWeight: 600, color: COLOR.ink }}>{f.name}</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                          <Typography sx={{ fontSize: '0.75rem', color: COLOR.faint }}>{f.bookings} bookings</Typography>
                          <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, color: COLOR.ink, minWidth: 80, textAlign: 'right' }}>{fmtINR(f.revenue)}</Typography>
                        </Box>
                      </Box>
                      <LinearProgress
                        variant='determinate' value={(f.revenue / max) * 100}
                        sx={{ height: 6, borderRadius: 3, bgcolor: COLOR.rule, '& .MuiLinearProgress-bar': { bgcolor: COLOR.green, borderRadius: 3 } }}
                      />
                    </Box>
                  );
                })}
                {topFarmhouses.length === 0 && <Typography sx={{ fontSize: '0.85rem', color: COLOR.faint, textAlign: 'center', py: 4 }}>No bookings yet</Typography>}
              </Box>
            </ChartCard>
          </Grid>
          <Grid size={{ xs: 12, lg: 6 }}>
            <ChartCard title='Top Owners' subtitle='Highest-earning property owners'>
              <Box sx={{ mt: 1 }}>
                {topOwners.map((o, i) => (
                  <Box key={o.ownerId} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 1.25, borderBottom: i < topOwners.length - 1 ? `1px solid ${COLOR.rule}` : 'none' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Avatar sx={{ bgcolor: i === 0 ? COLOR.amberBg : COLOR.blueBg, color: i === 0 ? COLOR.amber : COLOR.blue, width: 32, height: 32 }}>
                        {i === 0 ? <EmojiEvents sx={{ fontSize: 18 }} /> : <Person sx={{ fontSize: 18 }} />}
                      </Avatar>
                      <Box>
                        <Typography sx={{ fontSize: '0.85rem', fontWeight: 600, color: COLOR.ink }}>{o.name}</Typography>
                        <Typography sx={{ fontSize: '0.7rem', color: COLOR.faint }}>{o.properties} properties · {o.bookings} bookings</Typography>
                      </Box>
                    </Box>
                    <Typography sx={{ fontSize: '0.9rem', fontWeight: 700, color: COLOR.ink }}>{fmtINR(o.revenue)}</Typography>
                  </Box>
                ))}
                {topOwners.length === 0 && <Typography sx={{ fontSize: '0.85rem', color: COLOR.faint, textAlign: 'center', py: 4 }}>No owners with bookings yet</Typography>}
              </Box>
            </ChartCard>
          </Grid>

          <Grid size={{ xs: 12 }}>
            <ChartCard title='Needs Attention' subtitle='Approved farmhouses with no bookings in the last 60 days'>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mt: 1 }}>
                {underperforming.length === 0 ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: COLOR.green, py: 1 }}>
                    <CheckCircleOutline sx={{ fontSize: 18 }} />
                    <Typography sx={{ fontSize: '0.85rem', fontWeight: 500 }}>All approved farmhouses have recent activity</Typography>
                  </Box>
                ) : (
                  underperforming.map(f => (
                    <Chip
                      key={f.id}
                      icon={<WarningAmberOutlined sx={{ fontSize: 16 }} />}
                      label={`${f.name} · ${f.location}`}
                      sx={{ bgcolor: COLOR.amberBg, color: COLOR.amber, fontWeight: 500, fontSize: '0.75rem', height: 28, '& .MuiChip-icon': { color: COLOR.amber } }}
                    />
                  ))
                )}
              </Box>
            </ChartCard>
          </Grid>
        </Grid>

        {/* ============ CUSTOMER & OPS ============ */}
        <SectionHeader title='Customer & Operations' subtitle='Reviews, coupons, and onboarding health' />
        <Grid container spacing={2.5}>
          <Grid size={{ xs: 12, md: 4 }}>
            <ChartCard title='Reviews' subtitle={`${reviewStats.count} reviews collected`}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                <Star sx={{ fontSize: 36, color: COLOR.amber }} />
                <Box>
                  <Typography sx={{ fontSize: '2rem', fontWeight: 700, color: COLOR.ink, lineHeight: 1 }}>
                    {reviewStats.avg.toFixed(1)}
                  </Typography>
                  <Typography sx={{ fontSize: '0.7rem', color: COLOR.faint }}>average rating</Typography>
                </Box>
              </Box>
              <Typography sx={{ fontSize: '0.7rem', fontWeight: 600, color: COLOR.muted, textTransform: 'uppercase', letterSpacing: '0.04em', mb: 1 }}>Top Rated</Typography>
              {reviewStats.top.length === 0 && <Typography sx={{ fontSize: '0.8rem', color: COLOR.faint }}>No reviews yet</Typography>}
              {reviewStats.top.map(r => (
                <Box key={r.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 0.5 }}>
                  <Typography sx={{ fontSize: '0.8rem', color: COLOR.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }}>{r.name}</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Star sx={{ fontSize: 14, color: COLOR.amber }} />
                    <Typography sx={{ fontSize: '0.8rem', fontWeight: 600 }}>{r.avg.toFixed(1)}</Typography>
                  </Box>
                </Box>
              ))}
              {reviewStats.worst.length > 0 && (
                <>
                  <Typography sx={{ fontSize: '0.7rem', fontWeight: 600, color: COLOR.red, textTransform: 'uppercase', letterSpacing: '0.04em', mt: 2, mb: 1 }}>Needs Improvement</Typography>
                  {reviewStats.worst.map(r => (
                    <Box key={r.id} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
                      <Typography sx={{ fontSize: '0.8rem', color: COLOR.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }}>{r.name}</Typography>
                      <Typography sx={{ fontSize: '0.8rem', fontWeight: 600, color: COLOR.red }}>{r.avg.toFixed(1)}</Typography>
                    </Box>
                  ))}
                </>
              )}
            </ChartCard>
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <ChartCard title='Coupons' subtitle={`${couponStats.activeCoupons} active · ${couponStats.totalUsed} redeemed`}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Avatar variant='rounded' sx={{ bgcolor: COLOR.pinkBg, color: COLOR.pink, width: 44, height: 44, borderRadius: 2 }}>
                  <LocalOffer />
                </Avatar>
                <Box>
                  <Typography sx={{ fontSize: '1.5rem', fontWeight: 700, color: COLOR.ink, lineHeight: 1 }}>
                    {fmtINR(couponStats.totalDiscount)}
                  </Typography>
                  <Typography sx={{ fontSize: '0.7rem', color: COLOR.faint }}>total discount given</Typography>
                </Box>
              </Box>
              <Typography sx={{ fontSize: '0.7rem', color: COLOR.muted, mb: 1 }}>
                Redemption rate: <strong style={{ color: COLOR.ink }}>{pct(couponStats.redemption)}</strong>
              </Typography>
              <Typography sx={{ fontSize: '0.7rem', fontWeight: 600, color: COLOR.muted, textTransform: 'uppercase', letterSpacing: '0.04em', mt: 2, mb: 1 }}>Top Codes</Typography>
              {couponStats.top.length === 0 && <Typography sx={{ fontSize: '0.8rem', color: COLOR.faint }}>No coupons used yet</Typography>}
              {couponStats.top.map(c => (
                <Box key={c.code} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 0.5 }}>
                  <Chip label={c.code} size='small' sx={{ bgcolor: COLOR.pinkBg, color: COLOR.pink, fontFamily: 'monospace', fontWeight: 600, fontSize: '0.7rem', height: 22 }} />
                  <Box sx={{ display: 'flex', gap: 1.5 }}>
                    <Typography sx={{ fontSize: '0.75rem', color: COLOR.faint }}>{c.uses} uses</Typography>
                    <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: COLOR.ink }}>{fmtINR(c.discount)}</Typography>
                  </Box>
                </Box>
              ))}
            </ChartCard>
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <ChartCard title='Owner KYC' subtitle={`${kycFunnel.total} total owners`}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Avatar variant='rounded' sx={{ bgcolor: COLOR.greenBg, color: COLOR.green, width: 44, height: 44, borderRadius: 2 }}>
                  <Verified />
                </Avatar>
                <Box>
                  <Typography sx={{ fontSize: '1.5rem', fontWeight: 700, color: COLOR.ink, lineHeight: 1 }}>
                    {pct(kycFunnel.approvedPct)}
                  </Typography>
                  <Typography sx={{ fontSize: '0.7rem', color: COLOR.faint }}>verified</Typography>
                </Box>
              </Box>

              {[
                { label: 'Approved', count: kycFunnel.approved, pctVal: kycFunnel.approvedPct, color: COLOR.green },
                { label: 'Pending', count: kycFunnel.pending, pctVal: kycFunnel.pendingPct, color: COLOR.amber },
                { label: 'Rejected', count: kycFunnel.rejected, pctVal: kycFunnel.rejectedPct, color: COLOR.red },
              ].map(row => (
                <Box key={row.label} sx={{ mb: 1.25 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography sx={{ fontSize: '0.8rem', color: COLOR.ink, fontWeight: 500 }}>{row.label}</Typography>
                    <Typography sx={{ fontSize: '0.75rem', color: COLOR.faint }}>{row.count} · {pct(row.pctVal)}</Typography>
                  </Box>
                  <LinearProgress
                    variant='determinate' value={row.pctVal}
                    sx={{ height: 6, borderRadius: 3, bgcolor: COLOR.rule, '& .MuiLinearProgress-bar': { bgcolor: row.color, borderRadius: 3 } }}
                  />
                </Box>
              ))}

              <Box sx={{ mt: 2, p: 1.5, bgcolor: COLOR.blueBg, borderRadius: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <GroupAdd sx={{ fontSize: 18, color: COLOR.blue }} />
                <Typography sx={{ fontSize: '0.75rem', color: COLOR.blue, fontWeight: 500 }}>
                  {users.filter(u => u.role === 'user').length} customers · {users.filter(u => u.role === 'owner').length} owners
                </Typography>
              </Box>
            </ChartCard>
          </Grid>
        </Grid>
      </Box>
    </MainLayout>
  );
};

export default AnalyticsDashboard;
