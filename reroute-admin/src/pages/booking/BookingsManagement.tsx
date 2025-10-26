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
  CircularProgress,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Avatar,
  Divider
} from '@mui/material';
import { 
  Visibility,
  PersonOutline,
  HomeOutlined,
  CalendarToday
} from '@mui/icons-material';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import MainLayout from '../../components/layout/MainLayout';

// Firebase booking structure (matches your actual data)
interface FirebaseBooking {
  booking_id?: string;
  bookingType?: string;
  checkInDate?: string;
  checkOutDate?: string;
  couponCode?: string | null;
  createdAt?: any;
  discountApplied?: number;
  farmhouseId?: string;
  farmhouseName?: string;
  guests?: number;
  originalPrice?: number;
  paymentStatus?: string;
  status?: string;
  totalPrice?: number;
  updatedAt?: any;
  userEmail?: string;
  userId?: string;
  userName?: string;
  userPhone?: string;
}

const BookingsManagement: React.FC = () => {
  const [bookings, setBookings] = useState<FirebaseBooking[]>([]);
  const [filtered, setFiltered] = useState<FirebaseBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<FirebaseBooking | null>(null);

  const filterBookings = useCallback(() => {
    let result = bookings;

    if (statusFilter !== 'all') {
      result = result.filter(b => b.status === statusFilter);
    }

    if (paymentFilter !== 'all') {
      result = result.filter(b => b.paymentStatus === paymentFilter);
    }

    setFiltered(result);
  }, [bookings, statusFilter, paymentFilter]);

  const fetchBookings = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'bookings'));
      const data = snapshot.docs.map(doc => ({
        booking_id: doc.id,
        ...doc.data()
      })) as FirebaseBooking[];
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

  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '70vh' }}>
          <CircularProgress size={60} />
        </Box>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box>
            <Typography variant='h4' fontWeight='bold' gutterBottom>
              Bookings Management
            </Typography>
            <Typography variant='body2' color='text.secondary'>
              Total Bookings: {bookings.length} | Showing: {filtered.length}
            </Typography>
          </Box>
        </Box>

        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid size={{ xs: 12, md: 4 }}>
            <FormControl fullWidth>
              <InputLabel>Booking Status</InputLabel>
              <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <MenuItem value='all'>All ({bookings.length})</MenuItem>
                <MenuItem value='confirmed'>
                  Confirmed ({bookings.filter(b => b.status === 'confirmed').length})
                </MenuItem>
                <MenuItem value='cancelled'>
                  Cancelled ({bookings.filter(b => b.status === 'cancelled').length})
                </MenuItem>
                <MenuItem value='completed'>
                  Completed ({bookings.filter(b => b.status === 'completed').length})
                </MenuItem>
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

        <TableContainer component={Paper} elevation={2}>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                <TableCell><strong>Booking ID</strong></TableCell>
                <TableCell><strong>User</strong></TableCell>
                <TableCell><strong>Farmhouse</strong></TableCell>
                <TableCell><strong>Dates</strong></TableCell>
                <TableCell><strong>Guests</strong></TableCell>
                <TableCell><strong>Amount</strong></TableCell>
                <TableCell><strong>Payment</strong></TableCell>
                <TableCell><strong>Status</strong></TableCell>
                <TableCell align='center'><strong>Actions</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align='center' sx={{ py: 4 }}>
                    <Typography color='text.secondary'>
                      {bookings.length === 0 
                        ? 'No bookings found. Bookings will appear here once users make reservations.'
                        : 'No bookings match the selected filters.'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((booking) => (
                  <TableRow key={booking.booking_id} hover>
                    <TableCell>
                      <Typography variant='body2' fontFamily='monospace'>
                        {booking.booking_id?.substring(0, 8) || 'N/A'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
                          <PersonOutline sx={{ fontSize: 18 }} />
                        </Avatar>
                        <Box>
                          <Typography variant='body2' fontWeight='bold'>
                            {booking.userName || 'Unknown User'}
                          </Typography>
                          <Typography variant='caption' color='text.secondary'>
                            {booking.userPhone || ''}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <HomeOutlined color='action' sx={{ fontSize: 18 }} />
                        <Typography variant='body2' fontWeight='medium'>
                          {booking.farmhouseName || 'N/A'}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <CalendarToday sx={{ fontSize: 14, color: 'text.secondary' }} />
                        <Typography variant='body2'>
                          {formatDate(booking.checkInDate)} - {formatDate(booking.checkOutDate)}
                        </Typography>
                      </Box>
                      <Typography variant='caption' color='text.secondary'>
                        {booking.bookingType === 'dayuse' ? 'Day Use' : 'Overnight'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={`${booking.guests || 0} guests`} size='small' variant='outlined' />
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant='body2' fontWeight='bold'>
                          ₹{booking.totalPrice?.toLocaleString() || '0'}
                        </Typography>
                        {(booking.discountApplied || 0) > 0 && (
                          <Typography variant='caption' color='success.main'>
                            -₹{booking.discountApplied} discount
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={booking.paymentStatus || 'pending'}
                        color={
                          booking.paymentStatus === 'paid' ? 'success' : 
                          booking.paymentStatus === 'refunded' ? 'error' : 
                          'warning'
                        }
                        size='small'
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={booking.status || 'pending'}
                        color={
                          booking.status === 'confirmed' ? 'success' : 
                          booking.status === 'cancelled' ? 'error' : 
                          'info'
                        }
                        size='small'
                      />
                    </TableCell>
                    <TableCell align='center'>
                      <IconButton 
                        size='small' 
                        color='primary'
                        onClick={() => {
                          setSelectedBooking(booking);
                          setDetailsModalOpen(true);
                        }}
                      >
                        <Visibility />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Booking Details Modal */}
        <Dialog 
          open={detailsModalOpen} 
          onClose={() => setDetailsModalOpen(false)} 
          maxWidth='md' 
          fullWidth
        >
          <DialogTitle>
            <Typography variant='h6' fontWeight='bold'>
              Booking Details
            </Typography>
          </DialogTitle>
          <DialogContent>
            {selectedBooking && (
              <Box sx={{ pt: 2 }}>
                {/* Booking Info */}
                <Paper sx={{ p: 3, mb: 3, bgcolor: '#f9f9f9' }}>
                  <Typography variant='subtitle1' fontWeight='bold' gutterBottom>
                    Booking Information
                  </Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 1.5 }}>
                    <Typography color='text.secondary'>Booking ID:</Typography>
                    <Typography fontFamily='monospace'>{selectedBooking.booking_id}</Typography>
                    
                    <Typography color='text.secondary'>Type:</Typography>
                    <Typography>{selectedBooking.bookingType === 'dayuse' ? 'Day Use' : 'Overnight'}</Typography>
                    
                    <Typography color='text.secondary'>Check-in:</Typography>
                    <Typography>{formatDate(selectedBooking.checkInDate)}</Typography>
                    
                    <Typography color='text.secondary'>Check-out:</Typography>
                    <Typography>{formatDate(selectedBooking.checkOutDate)}</Typography>
                    
                    <Typography color='text.secondary'>Guests:</Typography>
                    <Typography>{selectedBooking.guests}</Typography>
                  </Box>
                </Paper>

                <Divider sx={{ my: 2 }} />

                {/* User Info */}
                <Paper sx={{ p: 3, mb: 3 }}>
                  <Typography variant='subtitle1' fontWeight='bold' gutterBottom>
                    Guest Information
                  </Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 1.5 }}>
                    <Typography color='text.secondary'>Name:</Typography>
                    <Typography fontWeight='medium'>{selectedBooking.userName || 'N/A'}</Typography>
                    
                    <Typography color='text.secondary'>Email:</Typography>
                    <Typography>{selectedBooking.userEmail || 'N/A'}</Typography>
                    
                    <Typography color='text.secondary'>Phone:</Typography>
                    <Typography>{selectedBooking.userPhone || 'N/A'}</Typography>
                  </Box>
                </Paper>

                <Divider sx={{ my: 2 }} />

                {/* Farmhouse Info */}
                <Paper sx={{ p: 3, mb: 3 }}>
                  <Typography variant='subtitle1' fontWeight='bold' gutterBottom>
                    Farmhouse Information
                  </Typography>
                  <Typography fontWeight='medium'>{selectedBooking.farmhouseName || 'N/A'}</Typography>
                </Paper>

                <Divider sx={{ my: 2 }} />

                {/* Payment Info */}
                <Paper sx={{ p: 3 }}>
                  <Typography variant='subtitle1' fontWeight='bold' gutterBottom>
                    Payment Details
                  </Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 1.5 }}>
                    <Typography color='text.secondary'>Original Price:</Typography>
                    <Typography>₹{selectedBooking.originalPrice?.toLocaleString() || '0'}</Typography>
                    
                    {(selectedBooking.discountApplied || 0) > 0 && (
                      <>
                        <Typography color='text.secondary'>Discount:</Typography>
                        <Typography color='success.main'>
                          -₹{selectedBooking.discountApplied?.toLocaleString()}
                        </Typography>
                      </>
                    )}
                    
                    <Typography color='text.secondary'>Total Paid:</Typography>
                    <Typography fontWeight='bold' variant='h6' color='primary.main'>
                      ₹{selectedBooking.totalPrice?.toLocaleString() || '0'}
                    </Typography>
                    
                    <Typography color='text.secondary'>Payment Status:</Typography>
                    <Box>
                      <Chip
                        label={selectedBooking.paymentStatus || 'pending'}
                        color={selectedBooking.paymentStatus === 'paid' ? 'success' : 'warning'}
                        size='small'
                      />
                    </Box>
                    
                    <Typography color='text.secondary'>Booking Status:</Typography>
                    <Box>
                      <Chip
                        label={selectedBooking.status || 'pending'}
                        color={
                          selectedBooking.status === 'confirmed' ? 'success' : 
                          selectedBooking.status === 'cancelled' ? 'error' : 
                          'info'
                        }
                        size='small'
                      />
                    </Box>
                  </Box>
                </Paper>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDetailsModalOpen(false)}>Close</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </MainLayout>
  );
};

export default BookingsManagement;