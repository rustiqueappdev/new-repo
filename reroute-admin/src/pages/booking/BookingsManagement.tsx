import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  CircularProgress
} from '@mui/material';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { Booking } from '../../types';
import MainLayout from '../../components/layout/MainLayout';

const BookingsManagement: React.FC = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filtered, setFiltered] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');

  const filterBookings = useCallback(() => {
    let result = bookings;

    if (statusFilter !== 'all') {
      result = result.filter(b => b.status === statusFilter);
    }

    if (paymentFilter !== 'all') {
      result = result.filter(b => b.payment_status === paymentFilter);
    }

    setFiltered(result);
  }, [bookings, statusFilter, paymentFilter]);

  const fetchBookings = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'bookings'));
      const data = snapshot.docs.map(doc => ({
        booking_id: doc.id,
        ...doc.data()
      })) as Booking[];
      setBookings(data);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  useEffect(() => {
    filterBookings();
  }, [statusFilter, paymentFilter, bookings, filterBookings]);

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
        <Typography variant='h4' fontWeight='bold' gutterBottom>
          Bookings Management
        </Typography>

        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid size={{ xs: 12, md: 4 }}>
            <FormControl fullWidth>
              <InputLabel>Booking Status</InputLabel>
              <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <MenuItem value='all'>All</MenuItem>
                <MenuItem value='confirmed'>Confirmed</MenuItem>
                <MenuItem value='cancelled'>Cancelled</MenuItem>
                <MenuItem value='completed'>Completed</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <FormControl fullWidth>
              <InputLabel>Payment Status</InputLabel>
              <Select value={paymentFilter} onChange={(e) => setPaymentFilter(e.target.value)}>
                <MenuItem value='all'>All</MenuItem>
                <MenuItem value='pending'>Pending</MenuItem>
                <MenuItem value='paid'>Paid</MenuItem>
                <MenuItem value='refunded'>Refunded</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>

        <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
          <Table sx={{ minWidth: { xs: 650, sm: 750 } }}>
            <TableHead>
              <TableRow>
                <TableCell>Booking ID</TableCell>
                <TableCell>Dates</TableCell>
                <TableCell>Guests</TableCell>
                <TableCell>Total Amount</TableCell>
                <TableCell>Commission</TableCell>
                <TableCell>Payment Status</TableCell>
                <TableCell>Booking Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align='center' sx={{ py: 4 }}>
                    <Typography color='text.secondary'>
                      No bookings found. Bookings will appear here once users make reservations through the mobile app.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((booking) => {
                  const startDate = booking.start_date?.toDate ?
                    new Date(booking.start_date.toDate()).toLocaleDateString() :
                    'N/A';
                  const endDate = booking.end_date?.toDate ?
                    new Date(booking.end_date.toDate()).toLocaleDateString() :
                    'N/A';

                  return (
                    <TableRow key={booking.booking_id}>
                      <TableCell>
                        {booking.booking_id ? booking.booking_id.substring(0, 8) : 'N/A'}
                      </TableCell>
                      <TableCell>
                        {startDate} - {endDate}
                      </TableCell>
                      <TableCell>{booking.guest_count || 0}</TableCell>
                      <TableCell>₹{booking.total_amount?.toLocaleString() || '0'}</TableCell>
                      <TableCell>₹{booking.commission_amount?.toLocaleString() || '0'}</TableCell>
                      <TableCell>
                        <Chip
                          label={booking.payment_status || 'pending'}
                          color={booking.payment_status === 'paid' ? 'success' : booking.payment_status === 'refunded' ? 'error' : 'warning'}
                          size='small'
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={booking.status || 'pending'}
                          color={booking.status === 'confirmed' ? 'success' : booking.status === 'cancelled' ? 'error' : 'info'}
                          size='small'
                        />
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </MainLayout>
  );
};

export default BookingsManagement;