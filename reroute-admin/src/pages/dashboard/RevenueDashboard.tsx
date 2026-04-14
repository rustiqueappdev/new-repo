import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Select,
  MenuItem,
  FormControl,
  CircularProgress
} from '@mui/material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, TrendingDown } from '@mui/icons-material';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import MainLayout from '../../components/layout/MainLayout';

// Firebase booking structure matching the actual database
interface FirebaseBooking {
  booking_id: string;
  totalPrice?: number;
  discountApplied?: number;
  paymentStatus?: string;
  createdAt?: any;
  created_at?: any;
  farmhouseId?: string;
  farmhouse_id?: string;
  commission_percentage?: number;
  bookingType?: string;
}

const tsToDate = (ts: any): Date | null => {
  if (!ts) return null;
  try {
    if (ts?.toDate && typeof ts.toDate === 'function') return ts.toDate();
    const d = new Date(ts);
    return isNaN(d.getTime()) ? null : d;
  } catch { return null; }
};

const RevenueDashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('30days');
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [typeSplit, setTypeSplit] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalCommission: 0,
    averageBookingValue: 0,
    growthRate: 0,
    growthLabel: 'vs prior period'
  });

  const fetchRevenueData = useCallback(async () => {
    try {
      // Fetch bookings
      const bookingsSnapshot = await getDocs(collection(db, 'bookings'));
      const bookingsData = bookingsSnapshot.docs.map(doc => ({
        booking_id: doc.id,
        ...doc.data()
      })) as FirebaseBooking[];

      // Fetch farmhouses to get commission percentages
      const farmhousesSnapshot = await getDocs(collection(db, 'farmhouses'));
      const commissionMap: Record<string, number> = {};

      farmhousesSnapshot.docs.forEach(doc => {
        const data = doc.data();
        commissionMap[doc.id] = data.commission_percentage || 10;
      });

      // Attach commission percentage to each booking
      const enrichedBookings = bookingsData.map(booking => {
        const farmhouseId = booking.farmhouseId || booking.farmhouse_id;
        return {
          ...booking,
          commission_percentage: farmhouseId ? commissionMap[farmhouseId] || 10 : 10
        };
      });

      processRevenueData(enrichedBookings);
    } catch (error) {
      console.error('Error fetching revenue data:', error);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchRevenueData();
  }, [period, fetchRevenueData]);

  const processRevenueData = (bookings: FirebaseBooking[]) => {
    const days = period === '7days' ? 7 : period === '30days' ? 30 : 90;
    const now = Date.now();
    const windowMs = days * 86400000;

    const inWindow = (d: Date | null) => !!d && (now - d.getTime()) <= windowMs;
    const inPriorWindow = (d: Date | null) =>
      !!d && (now - d.getTime()) > windowMs && (now - d.getTime()) <= 2 * windowMs;

    const enriched = bookings.map(b => ({ ...b, _date: tsToDate(b.createdAt || b.created_at) }));
    const paidInWindow = enriched.filter(b => b.paymentStatus === 'paid' && inWindow(b._date));
    const paidPrior = enriched.filter(b => b.paymentStatus === 'paid' && inPriorWindow(b._date));

    const totalRevenue = paidInWindow.reduce((sum, b) => sum + (b.totalPrice || 0), 0);
    const priorRevenue = paidPrior.reduce((sum, b) => sum + (b.totalPrice || 0), 0);
    const growthRate = priorRevenue > 0
      ? ((totalRevenue - priorRevenue) / priorRevenue) * 100
      : totalRevenue > 0 ? 100 : 0;
    const growthLabel = `vs prior ${days} days`;

    const totalCommission = paidInWindow.reduce((sum, b) =>
      sum + ((b.totalPrice || 0) * (b.commission_percentage || 10) / 100), 0);
    const averageBookingValue = paidInWindow.length ? totalRevenue / paidInWindow.length : 0;

    setStats({ totalRevenue, totalCommission, averageBookingValue, growthRate, growthLabel });

    // Daily buckets for the selected window (fills zero-days)
    const buckets: Record<string, { date: string; revenue: number; commission: number }> = {};
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
      buckets[key] = { date: label, revenue: 0, commission: 0 };
    }
    paidInWindow.forEach(b => {
      if (!b._date) return;
      const key = b._date.toISOString().slice(0, 10);
      if (!buckets[key]) return;
      const commission = (b.commission_percentage || 10) / 100;
      buckets[key].revenue += b.totalPrice || 0;
      buckets[key].commission += (b.totalPrice || 0) * commission;
    });
    setRevenueData(Object.values(buckets));

    // Revenue by booking type
    const typeMap: Record<string, number> = {};
    paidInWindow.forEach(b => {
      const t = b.bookingType || 'unspecified';
      typeMap[t] = (typeMap[t] || 0) + (b.totalPrice || 0);
    });
    setTypeSplit(Object.entries(typeMap).map(([name, value]) => ({ name, value })));
  };

  if (loading) {
    return (
      <MainLayout>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '70vh' }}>
          <CircularProgress size={48} sx={{ color: '#10B981' }} />
        </Box>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 3 }}>
          <FormControl size='small' sx={{ minWidth: 150 }}>
            <Select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              displayEmpty
              sx={{ borderRadius: 2, backgroundColor: '#F9FAFB', '& fieldset': { borderColor: 'transparent' }, '&:hover fieldset': { borderColor: '#E5E7EB' }, '&.Mui-focused fieldset': { borderColor: '#10B981' } }}
            >
              <MenuItem value='7days'>Last 7 Days</MenuItem>
              <MenuItem value='30days'>Last 30 Days</MenuItem>
              <MenuItem value='90days'>Last 90 Days</MenuItem>
            </Select>
          </FormControl>
        </Box>

        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[
            { label: 'Total Revenue', value: `₹${stats.totalRevenue.toLocaleString()}`, color: '#3B82F6', bg: '#EFF6FF' },
            { label: 'Total Commission', value: `₹${stats.totalCommission.toLocaleString()}`, color: '#10B981', bg: '#ECFDF5' },
            { label: 'Avg Booking Value', value: `₹${Math.round(stats.averageBookingValue).toLocaleString()}`, color: '#8B5CF6', bg: '#F5F3FF' },
            {
              label: 'Revenue Growth',
              value: `${stats.growthRate >= 0 ? '+' : ''}${stats.growthRate.toFixed(1)}%`,
              color: stats.growthRate >= 0 ? '#10B981' : '#EF4444',
              bg: stats.growthRate >= 0 ? '#ECFDF5' : '#FEE2E2',
              helper: stats.growthLabel,
              showTrend: true,
            },
          ].map((stat) => (
            <Grid size={{ xs: 12, sm: 6, md: 3 }} key={stat.label}>
              <Card elevation={0} sx={{ border: '1px solid', borderColor: 'rgba(0,0,0,0.06)', borderRadius: 3 }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography sx={{ fontSize: '0.75rem', fontWeight: 500, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                      {stat.label}
                    </Typography>
                    {(stat as any).showTrend && (
                      stats.growthRate >= 0
                        ? <TrendingUp sx={{ fontSize: 18, color: '#10B981' }} />
                        : <TrendingDown sx={{ fontSize: 18, color: '#EF4444' }} />
                    )}
                  </Box>
                  <Typography sx={{ fontSize: '1.75rem', fontWeight: 700, color: (stat as any).showTrend ? stat.color : '#111827', lineHeight: 1.2, mt: 0.5 }}>
                    {stat.value}
                  </Typography>
                  {(stat as any).helper && (
                    <Typography sx={{ fontSize: '0.7rem', color: '#9CA3AF', mt: 0.5 }}>
                      {(stat as any).helper}
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        <Paper elevation={0} sx={{ p: 3, mb: 3, border: '1px solid', borderColor: 'rgba(0,0,0,0.06)', borderRadius: 3 }}>
          <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: '#111827', mb: 0.25 }}>Revenue Trend</Typography>
          <Typography sx={{ fontSize: '0.75rem', color: '#9CA3AF', mb: 2 }}>Daily paid revenue over the selected period</Typography>
          <ResponsiveContainer width='100%' height={300}>
            <LineChart data={revenueData}>
              <CartesianGrid strokeDasharray='3 3' stroke='#F3F4F6' vertical={false} />
              <XAxis dataKey='date' tick={{ fontSize: 11, fill: '#9CA3AF' }} interval={Math.max(0, Math.floor(revenueData.length / 10) - 1)} />
              <YAxis tick={{ fontSize: 12, fill: '#9CA3AF' }} tickFormatter={(v: number) => v >= 1000 ? `₹${(v / 1000).toFixed(0)}k` : `₹${v}`} />
              <Tooltip
                contentStyle={{ borderRadius: 8, border: '1px solid #E5E7EB', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                formatter={(v: any) => `₹${Math.round(v).toLocaleString('en-IN')}`}
              />
              <Line type='monotone' dataKey='revenue' stroke='#10B981' strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: '#10B981' }} />
            </LineChart>
          </ResponsiveContainer>
        </Paper>

        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 7 }}>
            <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'rgba(0,0,0,0.06)', borderRadius: 3, height: '100%' }}>
              <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: '#111827', mb: 0.25 }}>Commission Overview</Typography>
              <Typography sx={{ fontSize: '0.75rem', color: '#9CA3AF', mb: 2 }}>Daily platform commission earned</Typography>
              <ResponsiveContainer width='100%' height={300}>
                <BarChart data={revenueData}>
                  <CartesianGrid strokeDasharray='3 3' stroke='#F3F4F6' vertical={false} />
                  <XAxis dataKey='date' tick={{ fontSize: 11, fill: '#9CA3AF' }} interval={Math.max(0, Math.floor(revenueData.length / 10) - 1)} />
                  <YAxis tick={{ fontSize: 12, fill: '#9CA3AF' }} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #E5E7EB', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }} />
                  <Bar dataKey='commission' fill='#3B82F6' radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, md: 5 }}>
            <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'rgba(0,0,0,0.06)', borderRadius: 3, height: '100%' }}>
              <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: '#111827', mb: 0.25 }}>Revenue by Booking Type</Typography>
              <Typography sx={{ fontSize: '0.75rem', color: '#9CA3AF', mb: 2 }}>Where the money is coming from</Typography>
              {typeSplit.length === 0 ? (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
                  <Typography sx={{ fontSize: '0.85rem', color: '#9CA3AF' }}>No paid bookings in this period</Typography>
                </Box>
              ) : (
                <ResponsiveContainer width='100%' height={300}>
                  <PieChart>
                    <Pie
                      data={typeSplit} dataKey='value' cx='50%' cy='50%' innerRadius={60} outerRadius={100} paddingAngle={2} stroke='#fff' strokeWidth={2}
                      label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}
                    >
                      {typeSplit.map((_, i) => (
                        <Cell key={i} fill={['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B'][i % 4]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ borderRadius: 8, border: '1px solid #E5E7EB', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                      formatter={(v: any) => `₹${Math.round(v).toLocaleString('en-IN')}`}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </MainLayout>
  );
};

export default RevenueDashboard;