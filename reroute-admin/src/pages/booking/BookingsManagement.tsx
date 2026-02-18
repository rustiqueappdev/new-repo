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
  CircularProgress,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Divider,
  TextField,
  Alert,
  DialogContentText,
  Tooltip
} from '@mui/material';
import {
  Visibility,
  PersonOutline,
  HomeOutlined,
  Edit,
  Cancel as CancelIcon,
  Download,
  Refresh
} from '@mui/icons-material';
import { collection, getDocs, doc, updateDoc, serverTimestamp, addDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useSnackbar } from '../../context/SnackbarContext';
import { useAuth } from '../../context/AuthContext';
import MainLayout from '../../components/layout/MainLayout';
import EmptyState from '../../components/common/EmptyState';

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
  const { showSuccess, showError, showWarning } = useSnackbar();
  const { currentUser } = useAuth();
  const [bookings, setBookings] = useState<FirebaseBooking[]>([]);
  const [filtered, setFiltered] = useState<FirebaseBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [refundDialogOpen, setRefundDialogOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<FirebaseBooking | null>(null);
  const [processing, setProcessing] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [refundAmount, setRefundAmount] = useState(0);
  const [editData, setEditData] = useState({
    checkInDate: '',
    checkOutDate: '',
    guests: 0,
    totalPrice: 0
  });

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
      setLoading(true);
      const snapshot = await getDocs(collection(db, 'bookings'));
      const data = snapshot.docs.map(doc => ({
        booking_id: doc.id,
        ...doc.data()
      })) as FirebaseBooking[];
      setBookings(data);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      showError('Failed to load bookings');
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

  const handleOpenEdit = (booking: FirebaseBooking) => {
    setSelectedBooking(booking);
    setEditData({
      checkInDate: booking.checkInDate || '',
      checkOutDate: booking.checkOutDate || '',
      guests: booking.guests || 0,
      totalPrice: booking.totalPrice || 0
    });
    setEditModalOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedBooking?.booking_id) return;

    try {
      setProcessing(true);
      await updateDoc(doc(db, 'bookings', selectedBooking.booking_id), {
        checkInDate: editData.checkInDate,
        checkOutDate: editData.checkOutDate,
        guests: editData.guests,
        totalPrice: editData.totalPrice,
        updatedAt: serverTimestamp()
      });

      // Audit trail
      await addDoc(collection(db, 'audit_trail'), {
        action: 'booking_updated',
        entity_type: 'booking',
        entity_id: selectedBooking.booking_id,
        performed_by: currentUser?.email || 'admin',
        details: {
          booking_id: selectedBooking.booking_id,
          user_name: selectedBooking.userName,
          changes: editData
        },
        timestamp: serverTimestamp()
      });

      showSuccess('Booking updated successfully');
      fetchBookings();
      setEditModalOpen(false);
    } catch (error) {
      console.error('Error updating booking:', error);
      showError('Failed to update booking');
    } finally {
      setProcessing(false);
    }
  };

  const handleOpenCancelDialog = (booking: FirebaseBooking) => {
    setSelectedBooking(booking);
    setCancelReason('');
    setCancelDialogOpen(true);
  };

  const handleCancelBooking = async () => {
    if (!selectedBooking?.booking_id) return;
    if (!cancelReason.trim()) {
      showWarning('Please provide a cancellation reason');
      return;
    }

    try {
      setProcessing(true);
      await updateDoc(doc(db, 'bookings', selectedBooking.booking_id), {
        status: 'cancelled',
        cancellationReason: cancelReason,
        cancelledBy: currentUser?.email || 'admin',
        cancelledAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Audit trail
      await addDoc(collection(db, 'audit_trail'), {
        action: 'booking_cancelled',
        entity_type: 'booking',
        entity_id: selectedBooking.booking_id,
        performed_by: currentUser?.email || 'admin',
        details: {
          booking_id: selectedBooking.booking_id,
          user_name: selectedBooking.userName,
          reason: cancelReason
        },
        timestamp: serverTimestamp()
      });

      showSuccess('Booking cancelled successfully');
      fetchBookings();
      setCancelDialogOpen(false);

      // If payment was made, ask about refund
      if (selectedBooking.paymentStatus === 'paid') {
        setRefundAmount(selectedBooking.totalPrice || 0);
        setRefundDialogOpen(true);
      }
    } catch (error) {
      console.error('Error cancelling booking:', error);
      showError('Failed to cancel booking');
    } finally {
      setProcessing(false);
    }
  };

  const handleProcessRefund = async () => {
    if (!selectedBooking?.booking_id) return;

    try {
      setProcessing(true);
      await updateDoc(doc(db, 'bookings', selectedBooking.booking_id), {
        paymentStatus: 'refunded',
        refundAmount: refundAmount,
        refundedBy: currentUser?.email || 'admin',
        refundedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Audit trail
      await addDoc(collection(db, 'audit_trail'), {
        action: 'refund_processed',
        entity_type: 'booking',
        entity_id: selectedBooking.booking_id,
        performed_by: currentUser?.email || 'admin',
        details: {
          booking_id: selectedBooking.booking_id,
          user_name: selectedBooking.userName,
          refund_amount: refundAmount,
          original_amount: selectedBooking.totalPrice
        },
        timestamp: serverTimestamp()
      });

      showSuccess(`Refund of ₹${refundAmount.toLocaleString()} processed successfully`);
      fetchBookings();
      setRefundDialogOpen(false);
      setSelectedBooking(null);
    } catch (error) {
      console.error('Error processing refund:', error);
      showError('Failed to process refund');
    } finally {
      setProcessing(false);
    }
  };

  const handleExportCSV = () => {
    if (filtered.length === 0) {
      showWarning('No bookings to export');
      return;
    }

    const headers = [
      'Booking ID',
      'User Name',
      'User Email',
      'User Phone',
      'Farmhouse',
      'Check-in Date',
      'Check-out Date',
      'Booking Type',
      'Guests',
      'Original Price',
      'Discount',
      'Total Price',
      'Payment Status',
      'Booking Status',
      'Coupon Code',
      'Created At'
    ];

    const csvData = filtered.map(booking => [
      booking.booking_id || '',
      booking.userName || '',
      booking.userEmail || '',
      booking.userPhone || '',
      booking.farmhouseName || '',
      booking.checkInDate || '',
      booking.checkOutDate || '',
      booking.bookingType || '',
      booking.guests || 0,
      booking.originalPrice || 0,
      booking.discountApplied || 0,
      booking.totalPrice || 0,
      booking.paymentStatus || '',
      booking.status || '',
      booking.couponCode || '',
      booking.createdAt?.toDate ? booking.createdAt.toDate().toISOString() : ''
    ]);

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `bookings_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showSuccess(`Exported ${filtered.length} bookings to CSV`);
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
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Chip
              label={`${bookings.length} total`}
              size='small'
              sx={{ backgroundColor: '#F3F4F6', color: '#6B7280', fontWeight: 600, fontSize: '0.75rem' }}
            />
            {filtered.length !== bookings.length && (
              <Chip
                label={`${filtered.length} shown`}
                size='small'
                sx={{ backgroundColor: '#EFF6FF', color: '#3B82F6', fontWeight: 600, fontSize: '0.75rem' }}
              />
            )}
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title='Refresh'>
              <IconButton onClick={fetchBookings} sx={{ color: '#9CA3AF', backgroundColor: '#F3F4F6', '&:hover': { backgroundColor: '#E5E7EB' }, width: 36, height: 36 }}>
                <Refresh sx={{ fontSize: 20 }} />
              </IconButton>
            </Tooltip>
            <Button
              variant='contained'
              startIcon={<Download sx={{ fontSize: 18 }} />}
              onClick={handleExportCSV}
              disabled={filtered.length === 0}
              sx={{
                textTransform: 'none', fontWeight: 600, borderRadius: 2, px: 2.5,
                background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                boxShadow: 'none',
                '&:hover': { background: 'linear-gradient(135deg, #059669 0%, #047857 100%)', boxShadow: '0 4px 12px rgba(16,185,129,0.3)' },
                '&.Mui-disabled': { background: '#E5E7EB', color: '#9CA3AF' },
              }}
            >
              Export CSV
            </Button>
          </Box>
        </Box>

        <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'rgba(0,0,0,0.06)', borderRadius: 3, overflow: 'hidden', mb: 3 }}>
          <Box sx={{ p: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <FormControl size='small' sx={{ minWidth: 180 }}>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                displayEmpty
                sx={{ borderRadius: 2, backgroundColor: '#F9FAFB', '& fieldset': { borderColor: 'transparent' }, '&:hover fieldset': { borderColor: '#E5E7EB' }, '&.Mui-focused fieldset': { borderColor: '#10B981' } }}
              >
                <MenuItem value='all'>All Status ({bookings.length})</MenuItem>
                <MenuItem value='confirmed'>Confirmed ({bookings.filter(b => b.status === 'confirmed').length})</MenuItem>
                <MenuItem value='cancelled'>Cancelled ({bookings.filter(b => b.status === 'cancelled').length})</MenuItem>
                <MenuItem value='completed'>Completed ({bookings.filter(b => b.status === 'completed').length})</MenuItem>
              </Select>
            </FormControl>
            <FormControl size='small' sx={{ minWidth: 180 }}>
              <Select
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value)}
                displayEmpty
                sx={{ borderRadius: 2, backgroundColor: '#F9FAFB', '& fieldset': { borderColor: 'transparent' }, '&:hover fieldset': { borderColor: '#E5E7EB' }, '&.Mui-focused fieldset': { borderColor: '#10B981' } }}
              >
                <MenuItem value='all'>All Payments</MenuItem>
                <MenuItem value='pending'>Pending</MenuItem>
                <MenuItem value='paid'>Paid</MenuItem>
                <MenuItem value='refunded'>Refunded</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </Paper>

        {filtered.length === 0 ? (
          <EmptyState
            title={statusFilter !== 'all' || paymentFilter !== 'all' ? 'No bookings match your filters' : 'No bookings yet'}
            description={bookings.length === 0 ? 'Bookings will appear here once users make reservations' : 'Try adjusting your filters'}
            icon='search'
          />
        ) : (
          <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'rgba(0,0,0,0.06)', borderRadius: 3 }}>
            <Table>
              <TableHead>
                <TableRow sx={{ '& th': { backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB', color: '#6B7280', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', py: 1.5 } }}>
                  <TableCell>Booking</TableCell>
                  <TableCell>User</TableCell>
                  <TableCell>Farmhouse</TableCell>
                  <TableCell>Dates</TableCell>
                  <TableCell>Amount</TableCell>
                  <TableCell>Payment</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align='center'>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.map((booking) => (
                  <TableRow key={booking.booking_id} hover sx={{ '&:hover': { backgroundColor: '#FAFAFA' }, '& td': { borderBottom: '1px solid #F3F4F6', py: 1.5 } }}>
                    <TableCell>
                      <Typography sx={{ fontSize: '0.8rem', fontFamily: 'monospace', color: '#6B7280', fontWeight: 500 }}>
                        {booking.booking_id?.substring(0, 8) || 'N/A'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Box sx={{
                          width: 34, height: 34, borderRadius: '50%',
                          background: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: '#fff', flexShrink: 0,
                        }}>
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
                        to {formatDate(booking.checkOutDate)} · {booking.guests || 0} guests
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ fontSize: '0.9rem', fontWeight: 700, color: '#111827' }}>
                        ₹{booking.totalPrice?.toLocaleString() || '0'}
                      </Typography>
                      {(booking.discountApplied || 0) > 0 && (
                        <Typography sx={{ fontSize: '0.7rem', color: '#10B981', fontWeight: 500 }}>
                          -₹{booking.discountApplied} off
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={booking.paymentStatus || 'pending'}
                        size='small'
                        sx={{
                          backgroundColor: booking.paymentStatus === 'paid' ? '#ECFDF5' : booking.paymentStatus === 'refunded' ? '#FEF2F2' : '#FFFBEB',
                          color: booking.paymentStatus === 'paid' ? '#059669' : booking.paymentStatus === 'refunded' ? '#DC2626' : '#D97706',
                          fontWeight: 600, fontSize: '0.7rem', textTransform: 'capitalize',
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={booking.status || 'pending'}
                        size='small'
                        sx={{
                          backgroundColor: booking.status === 'confirmed' ? '#ECFDF5' : booking.status === 'cancelled' ? '#FEF2F2' : '#EFF6FF',
                          color: booking.status === 'confirmed' ? '#059669' : booking.status === 'cancelled' ? '#DC2626' : '#2563EB',
                          fontWeight: 600, fontSize: '0.7rem', textTransform: 'capitalize',
                        }}
                      />
                    </TableCell>
                    <TableCell align='center'>
                      <Box sx={{ display: 'flex', gap: 0.25, justifyContent: 'center' }}>
                        <Tooltip title='View'>
                          <IconButton
                            size='small'
                            onClick={() => { setSelectedBooking(booking); setDetailsModalOpen(true); }}
                            sx={{ color: '#9CA3AF', '&:hover': { color: '#6B7280', backgroundColor: '#F3F4F6' } }}
                          >
                            <Visibility sx={{ fontSize: 18 }} />
                          </IconButton>
                        </Tooltip>
                        {booking.status !== 'cancelled' && booking.status !== 'completed' && (
                          <>
                            <Tooltip title='Edit'>
                              <IconButton size='small' onClick={() => handleOpenEdit(booking)} sx={{ color: '#9CA3AF', '&:hover': { color: '#3B82F6', backgroundColor: '#EFF6FF' } }}>
                                <Edit sx={{ fontSize: 18 }} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title='Cancel'>
                              <IconButton size='small' onClick={() => handleOpenCancelDialog(booking)} sx={{ color: '#9CA3AF', '&:hover': { color: '#EF4444', backgroundColor: '#FEF2F2' } }}>
                                <CancelIcon sx={{ fontSize: 18 }} />
                              </IconButton>
                            </Tooltip>
                          </>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>

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

              <Paper sx={{ p: 3, mb: 3 }}>
                <Typography variant='subtitle1' fontWeight='bold' gutterBottom>
                  Farmhouse Information
                </Typography>
                <Typography fontWeight='medium'>{selectedBooking.farmhouseName || 'N/A'}</Typography>
              </Paper>

              <Divider sx={{ my: 2 }} />

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

      {/* Edit Modal */}
      <Dialog open={editModalOpen} onClose={() => setEditModalOpen(false)} maxWidth='sm' fullWidth>
        <DialogTitle>
          <Typography variant='h6' fontWeight='bold'>
            Edit Booking
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Alert severity='warning' sx={{ mt: 2, mb: 3 }}>
            Editing bookings may affect payments and availability. Please verify all changes carefully.
          </Alert>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              fullWidth
              type='date'
              label='Check-in Date'
              value={editData.checkInDate}
              onChange={(e) => setEditData({ ...editData, checkInDate: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              fullWidth
              type='date'
              label='Check-out Date'
              value={editData.checkOutDate}
              onChange={(e) => setEditData({ ...editData, checkOutDate: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              fullWidth
              type='number'
              label='Number of Guests'
              value={editData.guests}
              onChange={(e) => setEditData({ ...editData, guests: Number(e.target.value) })}
            />
            <TextField
              fullWidth
              type='number'
              label='Total Price (₹)'
              value={editData.totalPrice}
              onChange={(e) => setEditData({ ...editData, totalPrice: Number(e.target.value) })}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditModalOpen(false)} disabled={processing}>
            Cancel
          </Button>
          <Button onClick={handleSaveEdit} variant='contained' disabled={processing}>
            {processing ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Cancel Dialog */}
      <Dialog open={cancelDialogOpen} onClose={() => setCancelDialogOpen(false)} maxWidth='sm' fullWidth>
        <DialogTitle>Cancel Booking</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to cancel the booking for <strong>{selectedBooking?.userName}</strong>?
          </DialogContentText>
          <TextField
            fullWidth
            multiline
            rows={3}
            label='Cancellation Reason *'
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            sx={{ mt: 2 }}
            placeholder='Please provide a reason for cancellation...'
          />
          <Alert severity='info' sx={{ mt: 2 }}>
            If payment was already made, you will be prompted to process a refund after cancellation.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelDialogOpen(false)} disabled={processing}>
            Close
          </Button>
          <Button onClick={handleCancelBooking} color='error' variant='contained' disabled={processing}>
            {processing ? 'Cancelling...' : 'Cancel Booking'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Refund Dialog */}
      <Dialog open={refundDialogOpen} onClose={() => setRefundDialogOpen(false)} maxWidth='sm' fullWidth>
        <DialogTitle>Process Refund</DialogTitle>
        <DialogContent>
          <DialogContentText>
            The booking has been cancelled. Would you like to process a refund for <strong>{selectedBooking?.userName}</strong>?
          </DialogContentText>
          <TextField
            fullWidth
            type='number'
            label='Refund Amount (₹) *'
            value={refundAmount}
            onChange={(e) => setRefundAmount(Number(e.target.value))}
            sx={{ mt: 2 }}
            helperText={`Original amount: ₹${selectedBooking?.totalPrice?.toLocaleString() || '0'}`}
          />
          <Alert severity='success' sx={{ mt: 2 }}>
            Refund will be processed to the original payment method.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRefundDialogOpen(false)} disabled={processing}>
            Skip Refund
          </Button>
          <Button onClick={handleProcessRefund} color='success' variant='contained' disabled={processing}>
            {processing ? 'Processing...' : 'Process Refund'}
          </Button>
        </DialogActions>
      </Dialog>
    </MainLayout>
  );
};

export default BookingsManagement;
