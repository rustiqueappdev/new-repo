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
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
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
}

const RevenueDashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('30days');
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalCommission: 0,
    averageBookingValue: 0,
    growthRate: 0
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
  }, []);

  useEffect(() => {
    fetchRevenueData();
  }, [period, fetchRevenueData]);

  const processRevenueData = (bookings: FirebaseBooking[]) => {
    // Only count paid bookings for revenue
    const paidBookings = bookings.filter(b => b.paymentStatus === 'paid');

    const totalRevenue = paidBookings.reduce((sum, b) => sum + (b.totalPrice || 0), 0);

    // Calculate commission using actual commission percentages
    const totalCommission = paidBookings.reduce((sum, b) => {
      const commission = (b.commission_percentage || 10) / 100;
      return sum + ((b.totalPrice || 0) * commission);
    }, 0);

    const averageBookingValue = totalRevenue / paidBookings.length || 0;

    setStats({
      totalRevenue,
      totalCommission,
      averageBookingValue,
      growthRate: 12.5 // TODO: Calculate actual growth rate
    });

    // Group by date
    const grouped = paidBookings.reduce((acc: any, booking) => {
      let dateObj;
      try {
        const timestamp = booking.createdAt || booking.created_at;
        if (timestamp?.toDate && typeof timestamp.toDate === 'function') {
          dateObj = timestamp.toDate();
        } else if (timestamp) {
          dateObj = new Date(timestamp);
        } else {
          dateObj = new Date();
        }
      } catch {
        dateObj = new Date();
      }

      const date = dateObj.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });

      if (!acc[date]) {
        acc[date] = { date, revenue: 0, commission: 0 };
      }

      const commission = (booking.commission_percentage || 10) / 100;
      acc[date].revenue += booking.totalPrice || 0;
      acc[date].commission += (booking.totalPrice || 0) * commission;

      return acc;
    }, {});

    setRevenueData(Object.values(grouped));
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
            { label: 'Growth Rate', value: `${stats.growthRate}%`, color: '#F59E0B', bg: '#FFFBEB' },
          ].map((stat) => (
            <Grid size={{ xs: 12, sm: 6, md: 3 }} key={stat.label}>
              <Card elevation={0} sx={{ border: '1px solid', borderColor: 'rgba(0,0,0,0.06)', borderRadius: 3 }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Typography sx={{ fontSize: '0.75rem', fontWeight: 500, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                    {stat.label}
                  </Typography>
                  <Typography sx={{ fontSize: '1.75rem', fontWeight: 700, color: '#111827', lineHeight: 1.2, mt: 0.5 }}>
                    {stat.value}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        <Paper elevation={0} sx={{ p: 3, mb: 3, border: '1px solid', borderColor: 'rgba(0,0,0,0.06)', borderRadius: 3 }}>
          <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: '#111827', mb: 2 }}>Revenue Trend</Typography>
          <ResponsiveContainer width='100%' height={300}>
            <LineChart data={revenueData}>
              <CartesianGrid strokeDasharray='3 3' stroke='#F3F4F6' />
              <XAxis dataKey='date' tick={{ fontSize: 12, fill: '#9CA3AF' }} />
              <YAxis tick={{ fontSize: 12, fill: '#9CA3AF' }} />
              <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #E5E7EB', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }} />
              <Line type='monotone' dataKey='revenue' stroke='#10B981' strokeWidth={2.5} dot={{ fill: '#10B981', r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </Paper>

        <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'rgba(0,0,0,0.06)', borderRadius: 3 }}>
          <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: '#111827', mb: 2 }}>Commission Overview</Typography>
          <ResponsiveContainer width='100%' height={300}>
            <BarChart data={revenueData}>
              <CartesianGrid strokeDasharray='3 3' stroke='#F3F4F6' />
              <XAxis dataKey='date' tick={{ fontSize: 12, fill: '#9CA3AF' }} />
              <YAxis tick={{ fontSize: 12, fill: '#9CA3AF' }} />
              <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #E5E7EB', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }} />
              <Bar dataKey='commission' fill='#3B82F6' radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Paper>
      </Box>
    </MainLayout>
  );
};

export default RevenueDashboard;