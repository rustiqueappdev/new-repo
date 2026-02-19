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
  Visibility,
  Download
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

  const handleExportCSV = () => {
    if (filteredBookings.length === 0) {
      showError('No payments to export');
      return;
    }

    const headers = [
      'Booking ID', 'User', 'Email', 'Farmhouse', 'Check-in', 'Check-out',
      'Total Amount', 'Commission %', 'Commission Amount', 'Owner Payout', 'Status'
    ];

    const csvData = filteredBookings.map(b => {
      const commPct = b.commission_percentage || 10;
      const commAmt = ((b.totalPrice || 0) * commPct / 100).toFixed(2);
      const ownerPayout = ((b.totalPrice || 0) * (1 - commPct / 100)).toFixed(2);
      return [
        b.booking_id || '',
        b.userName || '',
        b.userEmail || '',
        b.farmhouseName || '',
        b.checkInDate || '',
        b.checkOutDate || '',
        (b.totalPrice || 0).toString(),
        commPct.toString(),
        commAmt,
        ownerPayout,
        b.commission_paid_to_owner ? 'Paid' : 'Pending'
      ];
    });

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `payments_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showSuccess(`Exported ${filteredBookings.length} payments to CSV`);
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
        {/* Stats Cards */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[
            { label: 'Total Revenue', value: `₹${stats.totalRevenue.toLocaleString()}`, sub: 'From all paid bookings', color: '#3B82F6', bg: '#EFF6FF', icon: <TrendingUp sx={{ fontSize: 24 }} /> },
            { label: 'Total Commission', value: `₹${stats.totalCommission.toLocaleString()}`, sub: 'Platform earnings', color: '#10B981', bg: '#ECFDF5', icon: <Payment sx={{ fontSize: 24 }} /> },
            { label: 'Pending Payouts', value: `₹${stats.pendingPayouts.toLocaleString()}`, sub: 'To be paid to owners', color: '#F59E0B', bg: '#FFFBEB', icon: <PendingActions sx={{ fontSize: 24 }} /> },
            { label: 'Completed Payouts', value: `₹${stats.completedPayouts.toLocaleString()}`, sub: 'Already paid', color: '#8B5CF6', bg: '#F5F3FF', icon: <CheckCircle sx={{ fontSize: 24 }} /> },
          ].map((stat) => (
            <Grid size={{ xs: 12, sm: 6, md: 3 }} key={stat.label}>
              <Card elevation={0} sx={{ border: '1px solid', borderColor: 'rgba(0,0,0,0.06)', borderRadius: 3 }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <Box>
                      <Typography sx={{ fontSize: '0.75rem', fontWeight: 500, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                        {stat.label}
                      </Typography>
                      <Typography sx={{ fontSize: '1.5rem', fontWeight: 700, color: '#111827', lineHeight: 1.2, mt: 0.5 }}>
                        {stat.value}
                      </Typography>
                      <Typography sx={{ fontSize: '0.7rem', color: '#9CA3AF', mt: 0.5 }}>
                        {stat.sub}
                      </Typography>
                    </Box>
                    <Box sx={{ width: 44, height: 44, borderRadius: 2.5, backgroundColor: stat.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: stat.color, flexShrink: 0 }}>
                      {stat.icon}
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Tabs & Export */}
        <Paper elevation={0} sx={{ mb: 3, border: '1px solid', borderColor: 'rgba(0,0,0,0.06)', borderRadius: 3, overflow: 'hidden' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pr: 2 }}>
          <Tabs 
            value={activeTab} 
            onChange={(_, v) => setActiveTab(v)}
            sx={{
              '& .MuiTab-root': { textTransform: 'none', fontWeight: 600, fontSize: '0.85rem', color: '#6B7280', minHeight: 48 },
              '& .Mui-selected': { color: '#10B981 !important' },
              '& .MuiTabs-indicator': { backgroundColor: '#10B981' },
            }}
          >
            <Tab label={`All (${bookings.filter(b => b.paymentStatus === 'paid').length})`} />
            <Tab label={`Pending (${bookings.filter(b => b.paymentStatus === 'paid' && !b.commission_paid_to_owner).length})`} />
            <Tab label={`Paid (${bookings.filter(b => b.paymentStatus === 'paid' && b.commission_paid_to_owner).length})`} />
          </Tabs>
          <Button
            variant='outlined'
            startIcon={<Download sx={{ fontSize: 18 }} />}
            onClick={handleExportCSV}
            disabled={filteredBookings.length === 0}
            size='small'
            sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2, borderColor: '#E5E7EB', color: '#6B7280', '&:hover': { borderColor: '#10B981', color: '#10B981' } }}
          >
            Export CSV
          </Button>
          </Box>
        </Paper>

        {/* Table */}
        <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'rgba(0,0,0,0.06)', borderRadius: 3 }}>
          <Table>
            <TableHead>
              <TableRow sx={{ '& th': { backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB', color: '#6B7280', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', py: 1.5 } }}>
                <TableCell>Booking</TableCell>
                <TableCell>User</TableCell>
                <TableCell>Farmhouse</TableCell>
                <TableCell>Dates</TableCell>
                <TableCell>Amount</TableCell>
                <TableCell>Commission</TableCell>
                <TableCell>Owner Payout</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align='center'>Actions</TableCell>
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
                    <TableRow key={booking.booking_id} hover sx={{ '&:hover': { backgroundColor: '#FAFAFA' }, '& td': { borderBottom: '1px solid #F3F4F6', py: 1.5 } }}>
                      <TableCell>
                        <Typography sx={{ fontSize: '0.8rem', fontFamily: 'monospace', color: '#6B7280', fontWeight: 500 }}>
                          {booking.booking_id?.substring(0, 8) || 'N/A'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Box sx={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0 }}>
                            <PersonOutline sx={{ fontSize: 18 }} />
                          </Box>
                          <Box>
                            <Typography sx={{ fontWeight: 600, fontSize: '0.85rem', color: '#111827' }}>
                              {booking.userName || 'Unknown User'}
                            </Typography>
                            <Typography sx={{ fontSize: '0.7rem', color: '#9CA3AF' }}>
                              {booking.userPhone || ''}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                          <HomeOutlined sx={{ fontSize: 16, color: '#9CA3AF' }} />
                          <Typography sx={{ fontSize: '0.85rem', fontWeight: 500, color: '#374151' }}>
                            {booking.farmhouseName || 'N/A'}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ fontSize: '0.8rem', color: '#374151' }}>
                          {formatDate(booking.checkInDate)}
                        </Typography>
                        <Typography sx={{ fontSize: '0.7rem', color: '#9CA3AF' }}>
                          to {formatDate(booking.checkOutDate)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ fontSize: '0.9rem', fontWeight: 700, color: '#111827' }}>
                          ₹{booking.totalPrice?.toLocaleString() || '0'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ fontSize: '0.85rem', fontWeight: 600, color: '#10B981' }}>
                          ₹{commission.toLocaleString()}
                        </Typography>
                        <Typography sx={{ fontSize: '0.65rem', color: '#9CA3AF' }}>(10%)</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, color: '#111827' }}>
                          ₹{ownerPayout.toLocaleString()}
                        </Typography>
                        <Typography sx={{ fontSize: '0.65rem', color: '#9CA3AF' }}>(90%)</Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={booking.commission_paid_to_owner ? 'Paid' : 'Pending'}
                          size='small'
                          sx={{
                            backgroundColor: booking.commission_paid_to_owner ? '#ECFDF5' : '#FFFBEB',
                            color: booking.commission_paid_to_owner ? '#059669' : '#D97706',
                            fontWeight: 600, fontSize: '0.7rem',
                          }}
                        />
                      </TableCell>
                      <TableCell align='center'>
                        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center', alignItems: 'center' }}>
                          <Tooltip title='View'>
                            <IconButton size='small' onClick={() => { setSelectedBooking(booking); setDetailsModalOpen(true); }} sx={{ color: '#9CA3AF', '&:hover': { color: '#6B7280', backgroundColor: '#F3F4F6' } }}>
                              <Visibility sx={{ fontSize: 18 }} />
                            </IconButton>
                          </Tooltip>
                          {!booking.commission_paid_to_owner && (
                            <Button
                              size='small'
                              onClick={() => markAsPaid(booking.booking_id)}
                              sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.75rem', borderRadius: 1.5, px: 1.5, py: 0.5, backgroundColor: '#ECFDF5', color: '#059669', '&:hover': { backgroundColor: '#D1FAE5' } }}
                            >
                              Mark Paid
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