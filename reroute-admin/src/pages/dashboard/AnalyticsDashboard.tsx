import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  CircularProgress
} from '@mui/material';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import MainLayout from '../../components/layout/MainLayout';

const AnalyticsDashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [bookingStatusData, setBookingStatusData] = useState<any[]>([]);
  const [popularFarmhouses, setPopularFarmhouses] = useState<any[]>([]);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const bookingsSnap = await getDocs(collection(db, 'bookings'));

      const bookings = bookingsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Booking status distribution
      const statusCounts = bookings.reduce((acc: any, booking: any) => {
        acc[booking.status] = (acc[booking.status] || 0) + 1;
        return acc;
      }, {});
      
      setBookingStatusData(
        Object.entries(statusCounts).map(([name, value]) => ({ name, value }))
      );

      // Popular farmhouses
      const farmhouseCounts = bookings.reduce((acc: any, booking: any) => {
        acc[booking.farmhouse_id] = (acc[booking.farmhouse_id] || 0) + 1;
        return acc;
      }, {});

      setPopularFarmhouses(
        Object.entries(farmhouseCounts)
          .map(([id, count]) => ({ name: id.substring(0, 8), bookings: count }))
          .sort((a: any, b: any) => b.bookings - a.bookings)
          .slice(0, 5)
      );

    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ['#4CAF50', '#2196F3', '#FF9800', '#F44336'];

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
        <Grid container spacing={2.5}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'rgba(0,0,0,0.06)', borderRadius: 3 }}>
              <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: '#111827', mb: 0.5 }}>Booking Status Distribution</Typography>
              <Typography sx={{ fontSize: '0.75rem', color: '#9CA3AF', mb: 2 }}>Breakdown by current status</Typography>
              <ResponsiveContainer width='100%' height={300}>
                <PieChart>
                  <Pie
                    data={bookingStatusData}
                    cx='50%'
                    cy='50%'
                    labelLine={false}
                    label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    innerRadius={50}
                    fill='#8884d8'
                    dataKey='value'
                    strokeWidth={2}
                    stroke='#fff'
                  >
                    {bookingStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #E5E7EB', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }} />
                </PieChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'rgba(0,0,0,0.06)', borderRadius: 3 }}>
              <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: '#111827', mb: 0.5 }}>Top Popular Farmhouses</Typography>
              <Typography sx={{ fontSize: '0.75rem', color: '#9CA3AF', mb: 2 }}>Most booked properties</Typography>
              <ResponsiveContainer width='100%' height={300}>
                <BarChart data={popularFarmhouses}>
                  <CartesianGrid strokeDasharray='3 3' stroke='#F3F4F6' />
                  <XAxis dataKey='name' tick={{ fontSize: 11, fill: '#9CA3AF' }} />
                  <YAxis tick={{ fontSize: 12, fill: '#9CA3AF' }} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #E5E7EB', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }} />
                  <Bar dataKey='bookings' fill='#10B981' radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </MainLayout>
  );
};

export default AnalyticsDashboard;