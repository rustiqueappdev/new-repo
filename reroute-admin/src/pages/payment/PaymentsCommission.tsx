import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  DialogActions,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  TrendingUp,
  Payment,
  PendingActions,
  CheckCircle,
  PersonOutline,
  HomeOutlined,
  Visibility,
  Download,
  SearchOutlined,
  FilterAltOutlined,
  RestartAltOutlined
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
  createdAt?: any;
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
  razorpayPaymentId?: string;
}

interface FarmhouseOption {
  id: string;
  name: string;
}

const PaymentsCommission: React.FC = () => {
  const { showSuccess, showError } = useSnackbar();
  const [bookings, setBookings] = useState<FirebaseBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<FirebaseBooking | null>(null);
  const [allFarmhouses, setAllFarmhouses] = useState<FarmhouseOption[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [farmhouseFilter, setFarmhouseFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalCommission: 0,
    pendingPayouts: 0,
    completedPayouts: 0
  });

  const fetchData = useCallback(async () => {
    try {
      // Fetch bookings, farmhouses (commission), and payments (Razorpay IDs) in parallel
      const [bookingsSnapshot, farmhousesSnapshot, paymentsSnapshot] = await Promise.all([
        getDocs(collection(db, 'bookings')),
        getDocs(collection(db, 'farmhouses')),
        getDocs(collection(db, 'payments')),
      ]);

      const bookingsData = bookingsSnapshot.docs.map(doc => ({
        booking_id: doc.id,
        ...doc.data()
      })) as FirebaseBooking[];

      const commissionMap: Record<string, number> = {};
      const farmhouseList: FarmhouseOption[] = [];
      farmhousesSnapshot.docs.forEach(doc => {
        const data = doc.data();
        commissionMap[doc.id] = data.commission_percentage || 10;
        const name = data.basicDetails?.name || data.name;
        if (name) farmhouseList.push({ id: doc.id, name });
      });
      setAllFarmhouses(farmhouseList.sort((a, b) => a.name.localeCompare(b.name)));

      const paymentMap: Record<string, string> = {};
      paymentsSnapshot.docs.forEach(d => {
        const data: any = d.data();
        const bid = data.bookingId || data.booking_id || d.id;
        if (bid && data.razorpayPaymentId) paymentMap[bid] = data.razorpayPaymentId;
      });

      const enrichedBookings = bookingsData.map(booking => {
        const farmhouseId = booking.farmhouseId || booking.farmhouse_id;
        return {
          ...booking,
          commission_percentage: farmhouseId ? commissionMap[farmhouseId] || 10 : 10,
          razorpayPaymentId: paymentMap[booking.booking_id || ''] || (booking as any).razorpayPaymentId,
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

  const ownerPayoutOf = (b: FirebaseBooking): number =>
    (b.totalPrice || 0) * (1 - (b.commission_percentage || 10) / 100);
  const commissionOf = (b: FirebaseBooking): number =>
    (b.totalPrice || 0) * ((b.commission_percentage || 10) / 100);

  // Parse createdAt from either Firestore Timestamp or ISO string to a Date
  const getBookingDate = (b: FirebaseBooking): Date | null => {
    if (!b.createdAt) return null;
    if (typeof b.createdAt === 'string') return new Date(b.createdAt);
    if (typeof b.createdAt.toDate === 'function') return b.createdAt.toDate();
    if (b.createdAt.seconds) return new Date(b.createdAt.seconds * 1000);
    return null;
  };

  // Paid bookings with search/farmhouse/date-range filters applied (shared scope for tabs + totals)
  const scopedPaidBookings = useMemo(() => {
    let list = bookings.filter(b => b.paymentStatus === 'paid');

    if (searchTerm.trim()) {
      const term = searchTerm.trim().toLowerCase();
      list = list.filter(b => (b.farmhouseName || '').toLowerCase().includes(term));
    }
    if (farmhouseFilter !== 'all') {
      list = list.filter(b => {
        const fid = b.farmhouseId || b.farmhouse_id;
        return fid === farmhouseFilter;
      });
    }
    if (dateFrom) {
      const from = new Date(dateFrom);
      from.setHours(0, 0, 0, 0);
      list = list.filter(b => {
        const d = getBookingDate(b);
        return d !== null && d >= from;
      });
    }
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      list = list.filter(b => {
        const d = getBookingDate(b);
        return d !== null && d <= to;
      });
    }
    return list;
  }, [bookings, searchTerm, farmhouseFilter, dateFrom, dateTo]);

  const filteredBookings = useMemo(() => {
    switch (activeTab) {
      case 1: return scopedPaidBookings.filter(b => !b.commission_paid_to_owner);
      case 2: return scopedPaidBookings.filter(b => b.commission_paid_to_owner);
      default: return scopedPaidBookings;
    }
  }, [scopedPaidBookings, activeTab]);

  const scopeTotals = useMemo(() => {
    const pendingAmt = scopedPaidBookings
      .filter(b => !b.commission_paid_to_owner)
      .reduce((s, b) => s + ownerPayoutOf(b), 0);
    const paidAmt = scopedPaidBookings
      .filter(b => b.commission_paid_to_owner)
      .reduce((s, b) => s + ownerPayoutOf(b), 0);
    const commissionAmt = scopedPaidBookings.reduce((s, b) => s + commissionOf(b), 0);
    const grossRevenue = scopedPaidBookings.reduce((s, b) => s + (b.totalPrice || 0), 0);
    return { pendingAmt, paidAmt, commissionAmt, grossRevenue, count: scopedPaidBookings.length };
  }, [scopedPaidBookings]);

  const filtersActive = searchTerm.trim() !== '' || farmhouseFilter !== 'all' || !!dateFrom || !!dateTo;
  const resetFilters = () => { setSearchTerm(''); setFarmhouseFilter('all'); setDateFrom(''); setDateTo(''); };

  const handleExportCSV = () => {
    if (filteredBookings.length === 0) {
      showError('No payments to export');
      return;
    }

    const headers = [
      'Booking ID', 'Razorpay Payment ID', 'User', 'Email', 'Farmhouse', 'Check-in', 'Check-out',
      'Total Amount', 'Commission %', 'Commission Amount', 'Owner Payout', 'Status'
    ];

    const csvData = filteredBookings.map(b => {
      const commPct = b.commission_percentage || 10;
      const commAmt = ((b.totalPrice || 0) * commPct / 100).toFixed(2);
      const ownerPayout = ((b.totalPrice || 0) * (1 - commPct / 100)).toFixed(2);
      return [
        b.booking_id || '',
        b.razorpayPaymentId || '',
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

        {/* Search & Filters */}
        <Paper elevation={0} sx={{ mb: 3, border: '1px solid', borderColor: 'rgba(0,0,0,0.06)', borderRadius: 3, overflow: 'hidden' }}>
          <Box sx={{ p: 2, display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
            <FilterAltOutlined sx={{ fontSize: 20, color: '#9CA3AF' }} />
            <TextField
              size='small'
              placeholder='Search farmhouse...'
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              sx={{ minWidth: 220, '& .MuiOutlinedInput-root': { borderRadius: 2, fontSize: '0.875rem' } }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position='start'>
                    <SearchOutlined sx={{ fontSize: 20, color: '#9CA3AF' }} />
                  </InputAdornment>
                ),
              }}
            />
            <FormControl size='small' sx={{ minWidth: 220 }}>
              <InputLabel>Farmhouse</InputLabel>
              <Select
                label='Farmhouse'
                value={farmhouseFilter}
                onChange={(e) => setFarmhouseFilter(e.target.value)}
                sx={{ borderRadius: 2, fontSize: '0.875rem' }}
              >
                <MenuItem value='all'>All farmhouses</MenuItem>
                {allFarmhouses.map(fh => (
                  <MenuItem key={fh.id} value={fh.id}>{fh.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              size='small'
              label='From (booking date)'
              type='date'
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ minWidth: 170, '& .MuiOutlinedInput-root': { borderRadius: 2, fontSize: '0.875rem' } }}
            />
            <TextField
              size='small'
              label='To (booking date)'
              type='date'
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ minWidth: 170, '& .MuiOutlinedInput-root': { borderRadius: 2, fontSize: '0.875rem' } }}
            />
            {filtersActive && (
              <Button
                size='small'
                startIcon={<RestartAltOutlined sx={{ fontSize: 18 }} />}
                onClick={resetFilters}
                sx={{ textTransform: 'none', color: '#6B7280', fontWeight: 600 }}
              >
                Reset
              </Button>
            )}
            <Box sx={{ flex: 1 }} />
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

          {filtersActive && (
            <Box sx={{ px: 2, pb: 1.5, display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
              <Chip label={`${scopeTotals.count} bookings`} size='small' color='primary' variant='outlined' />
              <Chip
                label={`Gross: ₹${scopeTotals.grossRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
                size='small' sx={{ bgcolor: '#EFF6FF', color: '#1D4ED8' }}
              />
              <Chip
                label={`Commission: ₹${scopeTotals.commissionAmt.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
                size='small' sx={{ bgcolor: '#ECFDF5', color: '#065F46' }}
              />
              <Chip
                label={`Pending payout: ₹${scopeTotals.pendingAmt.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
                size='small' sx={{ bgcolor: '#FEF3C7', color: '#92400E', fontWeight: 600 }}
              />
              <Chip
                label={`Paid payout: ₹${scopeTotals.paidAmt.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
                size='small' sx={{ bgcolor: '#D1FAE5', color: '#065F46' }}
              />
            </Box>
          )}

          <Tabs
            value={activeTab}
            onChange={(_, v) => setActiveTab(v)}
            sx={{
              '& .MuiTab-root': { textTransform: 'none', fontWeight: 600, fontSize: '0.85rem', color: '#6B7280', minHeight: 48 },
              '& .Mui-selected': { color: '#10B981 !important' },
              '& .MuiTabs-indicator': { backgroundColor: '#10B981' },
            }}
          >
            <Tab label={`All (${scopedPaidBookings.length})`} />
            <Tab label={`Pending (${scopedPaidBookings.filter(b => !b.commission_paid_to_owner).length})`} />
            <Tab label={`Paid (${scopedPaidBookings.filter(b => b.commission_paid_to_owner).length})`} />
          </Tabs>
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
                  <TableCell colSpan={9} align='center' sx={{ py: 5 }}>
                    <Typography color='text.secondary' sx={{ fontWeight: 500 }}>
                      {farmhouseFilter !== 'all'
                        ? 'Nothing found — no paid bookings for this property with the current filters.'
                        : activeTab === 1
                        ? 'No pending payouts. All commissions have been paid to owners.'
                        : activeTab === 2
                        ? 'No completed payouts yet.'
                        : 'No paid bookings found.'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredBookings.map((booking) => {
                  const commPct = booking.commission_percentage || 10;
                  const commission = commissionOf(booking);
                  const ownerPayout = ownerPayoutOf(booking);

                  return (
                    <TableRow key={booking.booking_id} hover sx={{ '&:hover': { backgroundColor: '#FAFAFA' }, '& td': { borderBottom: '1px solid #F3F4F6', py: 1.5 } }}>
                      <TableCell>
                        <Typography sx={{ fontSize: '0.8rem', fontFamily: 'monospace', color: '#6B7280', fontWeight: 500 }}>
                          {booking.booking_id?.substring(0, 8) || 'N/A'}
                        </Typography>
                        {booking.razorpayPaymentId ? (
                          <Tooltip title={`Razorpay: ${booking.razorpayPaymentId}`}>
                            <Typography sx={{ fontSize: '0.68rem', fontFamily: 'monospace', color: '#3B82F6', mt: 0.25 }}>
                              {booking.razorpayPaymentId}
                            </Typography>
                          </Tooltip>
                        ) : (
                          <Typography sx={{ fontSize: '0.68rem', color: '#D1D5DB', mt: 0.25 }}>
                            no payment id
                          </Typography>
                        )}
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
                          ₹{Math.round(commission).toLocaleString('en-IN')}
                        </Typography>
                        <Typography sx={{ fontSize: '0.65rem', color: '#9CA3AF' }}>({commPct}%)</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, color: '#111827' }}>
                          ₹{Math.round(ownerPayout).toLocaleString('en-IN')}
                        </Typography>
                        <Typography sx={{ fontSize: '0.65rem', color: '#9CA3AF' }}>({100 - commPct}%)</Typography>
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
                    Razorpay Payment ID
                  </Typography>
                  <Typography
                    variant='body1'
                    fontFamily='monospace'
                    gutterBottom
                    sx={{ color: selectedBooking.razorpayPaymentId ? '#3B82F6' : '#9CA3AF' }}
                  >
                    {selectedBooking.razorpayPaymentId || 'Not available'}
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
                    
                    <Typography variant='body2' color='success.main'>
                      Commission ({selectedBooking.commission_percentage || 10}%):
                    </Typography>
                    <Typography variant='body2' textAlign='right' color='success.main' fontWeight='medium'>
                      ₹{Math.round(commissionOf(selectedBooking)).toLocaleString('en-IN')}
                    </Typography>

                    <Typography variant='body2'>
                      Owner Payout ({100 - (selectedBooking.commission_percentage || 10)}%):
                    </Typography>
                    <Typography variant='body2' textAlign='right' fontWeight='bold'>
                      ₹{Math.round(ownerPayoutOf(selectedBooking)).toLocaleString('en-IN')}
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