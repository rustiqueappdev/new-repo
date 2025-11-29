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
  Button,
  Grid,
  Card,
  CardContent,
  CircularProgress,
  Tabs,
  Tab,
  IconButton,
  Avatar,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import { 
  TrendingUp, 
  Payment, 
  PendingActions,
  CheckCircle,
  PersonOutline,
  HomeOutlined,
  Visibility
} from '@mui/icons-material';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useSnackbar } from '../../context/SnackbarContext';
import MainLayout from '../../components/layout/MainLayout';

// Firebase booking structure
interface FirebaseBooking {
  booking_id?: string;
  bookingType?: string;
  checkInDate?: string;
  checkOutDate?: string;
  farmhouseName?: string;
  farmhouseId?: string;
  farmhouse_id?: string;
  userName?: string;
  userEmail?: string;
  userPhone?: string;
  guests?: number;
  totalPrice?: number;
  originalPrice?: number;
  discountApplied?: number;
  paymentStatus?: string;
  status?: string;
  commission_paid_to_owner?: boolean;
  commission_percentage?: number;
}

const PaymentsCommission: React.FC = () => {
  const { showSuccess, showError } = useSnackbar();
  const [bookings, setBookings] = useState<FirebaseBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<FirebaseBooking | null>(null);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalCommission: 0,
    pendingPayouts: 0,
    completedPayouts: 0
  });

  const fetchData = useCallback(async () => {
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
        // Default to 10% if not set
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

      setBookings(enrichedBookings);
      calculateStats(enrichedBookings);
    } catch (error) {
      console.error('Error fetching payments:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const calculateStats = (data: FirebaseBooking[]) => {
    const paidBookings = data.filter(b => b.paymentStatus === 'paid');
    const totalRevenue = paidBookings.reduce((sum, b) => sum + (b.totalPrice || 0), 0);

    // Calculate total commission using actual farmhouse commission percentages
    const totalCommission = paidBookings.reduce((sum, b) => {
      const commission = (b.commission_percentage || 10) / 100;
      return sum + ((b.totalPrice || 0) * commission);
    }, 0);

    // Calculate pending payouts (amount owed to owners)
    const pendingPayouts = paidBookings
      .filter(b => !b.commission_paid_to_owner)
      .reduce((sum, b) => {
        const commission = (b.commission_percentage || 10) / 100;
        const ownerPayout = (b.totalPrice || 0) * (1 - commission);
        return sum + ownerPayout;
      }, 0);

    // Calculate completed payouts (amount already paid to owners)
    const completedPayouts = paidBookings
      .filter(b => b.commission_paid_to_owner)
      .reduce((sum, b) => {
        const commission = (b.commission_percentage || 10) / 100;
        const ownerPayout = (b.totalPrice || 0) * (1 - commission);
        return sum + ownerPayout;
      }, 0);

    setStats({ totalRevenue, totalCommission, pendingPayouts, completedPayouts });
  };

  const markAsPaid = async (bookingId: string | undefined) => {
    if (!bookingId) return;
    if (!window.confirm('Mark this payout as paid to owner?')) return;

    try {
      await updateDoc(doc(db, 'bookings', bookingId), {
        commission_paid_to_owner: true
      });
      fetchData();
      showSuccess('Payout marked as paid successfully!');
    } catch (error) {
      console.error('Error updating payout:', error);
      showError('Failed to update payout status');
    }
  };

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

  const getFilteredBookings = () => {
    const paidBookings = bookings.filter(b => b.paymentStatus === 'paid');
    
    switch (activeTab) {
      case 0: // All
        return paidBookings;
      case 1: // Pending
        return paidBookings.filter(b => !b.commission_paid_to_owner);
      case 2: // Paid
        return paidBookings.filter(b => b.commission_paid_to_owner);
      default:
        return paidBookings;
    }
  };

  const filteredBookings = getFilteredBookings();

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
        <Typography variant='h4' fontWeight='bold' gutterBottom>
          Payments & Commission
        </Typography>
        <Typography variant='body2' color='text.secondary' sx={{ mb: 3 }}>
          Track revenue, commission, and owner payouts
        </Typography>

        {/* Stats Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid size={{ xs: 12, md: 3 }}>
            <Card elevation={2}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <TrendingUp color='primary' />
                  <Typography variant='body2' color='text.secondary'>Total Revenue</Typography>
                </Box>
                <Typography variant='h4' color='primary.main'>
                  ₹{stats.totalRevenue.toLocaleString()}
                </Typography>
                <Typography variant='caption' color='text.secondary'>
                  From all paid bookings
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, md: 3 }}>
            <Card elevation={2}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Payment color='success' />
                  <Typography variant='body2' color='text.secondary'>Total Commission</Typography>
                </Box>
                <Typography variant='h4' color='success.main'>
                  ₹{stats.totalCommission.toLocaleString()}
                </Typography>
                <Typography variant='caption' color='text.secondary'>
                  Platform earnings (10%)
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, md: 3 }}>
            <Card elevation={2}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <PendingActions color='warning' />
                  <Typography variant='body2' color='text.secondary'>Pending Payouts</Typography>
                </Box>
                <Typography variant='h4' color='warning.main'>
                  ₹{stats.pendingPayouts.toLocaleString()}
                </Typography>
                <Typography variant='caption' color='text.secondary'>
                  To be paid to owners
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, md: 3 }}>
            <Card elevation={2}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <CheckCircle color='info' />
                  <Typography variant='body2' color='text.secondary'>Completed Payouts</Typography>
                </Box>
                <Typography variant='h4' color='info.main'>
                  ₹{stats.completedPayouts.toLocaleString()}
                </Typography>
                <Typography variant='caption' color='text.secondary'>
                  Already paid to owners
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Tabs */}
        <Paper elevation={2} sx={{ mb: 3 }}>
          <Tabs 
            value={activeTab} 
            onChange={(_, v) => setActiveTab(v)}
            sx={{ borderBottom: 1, borderColor: 'divider' }}
          >
            <Tab label={`All (${bookings.filter(b => b.paymentStatus === 'paid').length})`} />
            <Tab 
              label={`Pending (${bookings.filter(b => b.paymentStatus === 'paid' && !b.commission_paid_to_owner).length})`} 
            />
            <Tab 
              label={`Paid (${bookings.filter(b => b.paymentStatus === 'paid' && b.commission_paid_to_owner).length})`} 
            />
          </Tabs>
        </Paper>

        {/* Table */}
        <TableContainer component={Paper} elevation={2}>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                <TableCell><strong>Booking ID</strong></TableCell>
                <TableCell><strong>User</strong></TableCell>
                <TableCell><strong>Farmhouse</strong></TableCell>
                <TableCell><strong>Dates</strong></TableCell>
                <TableCell><strong>Amount</strong></TableCell>
                <TableCell><strong>Commission</strong></TableCell>
                <TableCell><strong>Owner Payout</strong></TableCell>
                <TableCell><strong>Status</strong></TableCell>
                <TableCell align='center'><strong>Actions</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredBookings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align='center' sx={{ py: 4 }}>
                    <Typography color='text.secondary'>
                      {activeTab === 1 
                        ? 'No pending payouts. All commissions have been paid to owners.'
                        : activeTab === 2
                        ? 'No completed payouts yet.'
                        : 'No paid bookings found.'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredBookings.map((booking) => {
                  const commission = (booking.totalPrice || 0) * 0.1;
                  const ownerPayout = (booking.totalPrice || 0) * 0.9;

                  return (
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
                        <Typography variant='body2'>
                          {formatDate(booking.checkInDate)}
                        </Typography>
                        <Typography variant='caption' color='text.secondary'>
                          to {formatDate(booking.checkOutDate)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant='body2' fontWeight='bold'>
                          ₹{booking.totalPrice?.toLocaleString() || '0'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant='body2' color='success.main' fontWeight='medium'>
                          ₹{commission.toLocaleString()}
                        </Typography>
                        <Typography variant='caption' color='text.secondary'>
                          (10%)
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant='body2' fontWeight='bold'>
                          ₹{ownerPayout.toLocaleString()}
                        </Typography>
                        <Typography variant='caption' color='text.secondary'>
                          (90%)
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={booking.commission_paid_to_owner ? 'Paid' : 'Pending'}
                          color={booking.commission_paid_to_owner ? 'success' : 'warning'}
                          size='small'
                        />
                      </TableCell>
                      <TableCell align='center'>
                        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                          <Tooltip title='View Details'>
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
                          </Tooltip>
                          {!booking.commission_paid_to_owner && (
                            <Button
                              size='small'
                              variant='contained'
                              color='success'
                              onClick={() => markAsPaid(booking.booking_id)}
                            >
                              Mark as Paid
                            </Button>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Details Modal */}
        <Dialog 
          open={detailsModalOpen} 
          onClose={() => setDetailsModalOpen(false)} 
          maxWidth='sm' 
          fullWidth
        >
          <DialogTitle>
            <Typography variant='h6' fontWeight='bold'>
              Payment Details
            </Typography>
          </DialogTitle>
          <DialogContent>
            {selectedBooking && (
              <Box sx={{ pt: 2 }}>
                <Paper sx={{ p: 3, mb: 2, bgcolor: '#f9f9f9' }}>
                  <Typography variant='subtitle2' color='text.secondary' gutterBottom>
                    Booking ID
                  </Typography>
                  <Typography variant='body1' fontFamily='monospace' gutterBottom>
                    {selectedBooking.booking_id}
                  </Typography>

                  <Typography variant='subtitle2' color='text.secondary' gutterBottom sx={{ mt: 2 }}>
                    Guest
                  </Typography>
                  <Typography variant='body1' fontWeight='bold'>
                    {selectedBooking.userName}
                  </Typography>
                  <Typography variant='body2' color='text.secondary'>
                    {selectedBooking.userEmail}
                  </Typography>
                  <Typography variant='body2' color='text.secondary'>
                    {selectedBooking.userPhone}
                  </Typography>

                  <Typography variant='subtitle2' color='text.secondary' gutterBottom sx={{ mt: 2 }}>
                    Farmhouse
                  </Typography>
                  <Typography variant='body1' fontWeight='medium'>
                    {selectedBooking.farmhouseName}
                  </Typography>

                  <Typography variant='subtitle2' color='text.secondary' gutterBottom sx={{ mt: 2 }}>
                    Payment Breakdown
                  </Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                    <Typography variant='body2'>Total Amount:</Typography>
                    <Typography variant='body2' textAlign='right' fontWeight='bold'>
                      ₹{selectedBooking.totalPrice?.toLocaleString()}
                    </Typography>
                    
                    <Typography variant='body2' color='success.main'>Commission (10%):</Typography>
                    <Typography variant='body2' textAlign='right' color='success.main' fontWeight='medium'>
                      ₹{((selectedBooking.totalPrice || 0) * 0.1).toLocaleString()}
                    </Typography>
                    
                    <Typography variant='body2'>Owner Payout (90%):</Typography>
                    <Typography variant='body2' textAlign='right' fontWeight='bold'>
                      ₹{((selectedBooking.totalPrice || 0) * 0.9).toLocaleString()}
                    </Typography>
                  </Box>

                  <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid #e0e0e0' }}>
                    <Chip
                      label={selectedBooking.commission_paid_to_owner ? 'Paid to Owner' : 'Pending Payment'}
                      color={selectedBooking.commission_paid_to_owner ? 'success' : 'warning'}
                    />
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

export default PaymentsCommission;