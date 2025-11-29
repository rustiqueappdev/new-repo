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
  InputLabel,
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
          <CircularProgress />
        </Box>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
          <Typography variant='h4' fontWeight='bold'>
            Revenue Dashboard
          </Typography>
          <FormControl sx={{ minWidth: 150 }}>
            <InputLabel>Period</InputLabel>
            <Select value={period} onChange={(e) => setPeriod(e.target.value)}>
              <MenuItem value='7days'>Last 7 Days</MenuItem>
              <MenuItem value='30days'>Last 30 Days</MenuItem>
              <MenuItem value='90days'>Last 90 Days</MenuItem>
            </Select>
          </FormControl>
        </Box>

        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid size={{ xs: 12, md: 3 }}>
            <Card>
              <CardContent>
                <Typography variant='body2' color='text.secondary'>Total Revenue</Typography>
                <Typography variant='h4'>₹{stats.totalRevenue.toLocaleString()}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, md: 3 }}>
            <Card>
              <CardContent>
                <Typography variant='body2' color='text.secondary'>Total Commission</Typography>
                <Typography variant='h4' color='success.main'>₹{stats.totalCommission.toLocaleString()}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, md: 3 }}>
            <Card>
              <CardContent>
                <Typography variant='body2' color='text.secondary'>Avg Booking Value</Typography>
                <Typography variant='h4'>₹{Math.round(stats.averageBookingValue).toLocaleString()}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, md: 3 }}>
            <Card>
              <CardContent>
                <Typography variant='body2' color='text.secondary'>Growth Rate</Typography>
                <Typography variant='h4' color='primary'>{stats.growthRate}%</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant='h6' gutterBottom>Revenue Trend</Typography>
          <ResponsiveContainer width='100%' height={300}>
            <LineChart data={revenueData}>
              <CartesianGrid strokeDasharray='3 3' />
              <XAxis dataKey='date' />
              <YAxis />
              <Tooltip />
              <Line type='monotone' dataKey='revenue' stroke='#4CAF50' strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </Paper>

        <Paper sx={{ p: 3 }}>
          <Typography variant='h6' gutterBottom>Commission Overview</Typography>
          <ResponsiveContainer width='100%' height={300}>
            <BarChart data={revenueData}>
              <CartesianGrid strokeDasharray='3 3' />
              <XAxis dataKey='date' />
              <YAxis />
              <Tooltip />
              <Bar dataKey='commission' fill='#2196F3' />
            </BarChart>
          </ResponsiveContainer>
        </Paper>
      </Box>
    </MainLayout>
  );
};

export default RevenueDashboard;