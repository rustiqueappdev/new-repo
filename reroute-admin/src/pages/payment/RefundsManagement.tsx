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
  TableSortLabel,
  alpha
} from '@mui/material';
import {
  CurrencyRupee,
  Receipt,
  CheckCircle,
  HourglassEmpty,
  Cancel,
  Visibility,
  Download,
  SearchOutlined,
  FilterAltOutlined,
  RestartAltOutlined,
  PersonOutline,
  HomeOutlined,
  CalendarToday,
  ContentCopy
} from '@mui/icons-material';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useSnackbar } from '../../context/SnackbarContext';
import MainLayout from '../../components/layout/MainLayout';

interface Refund {
  id: string;
  refundId: string;
  bookingId: string;
  paymentId: string;
  userId: string;
  amount: number;
  reason: string;
  status: string;
  createdAt: number | null;
  updatedAt: number | null;
  farmhouseName: string;
  farmhouseId: string;
  userName: string;
  userEmail: string;
  userPhone: string;
  checkInDate: string;
  checkOutDate: string;
  totalPrice: number;
  originalPrice: number;
  bookingStatus: string;
  refundPercentage: number;
  bookingRefundAmount: number;
  refundDate: string;
  bookingRefundStatus: string;
  cancelledAt: number | null;
}

const getStatusInfo = (status: string): { label: string; bg: string; color: string } => {
  switch (status.toLowerCase()) {
    case 'processed':
    case 'completed':
    case 'success':
      return { label: 'Processed', bg: '#ECFDF5', color: '#059669' };
    case 'pending':
    case 'initiated':
      return { label: 'Pending', bg: '#FFFBEB', color: '#D97706' };
    case 'failed':
    case 'rejected':
      return { label: 'Failed', bg: '#FEF2F2', color: '#DC2626' };
    default:
      return { label: status || 'Unknown', bg: '#F3F4F6', color: '#6B7280' };
  }
};

const formatRefundAmount = (paise: number): string => {
  return `₹${(paise / 100).toLocaleString('en-IN')}`;
};

const formatDate = (dateStr: string | number | null): string => {
  if (!dateStr) return 'N/A';
  try {
    const d = typeof dateStr === 'number' ? new Date(dateStr) : new Date(dateStr);
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return String(dateStr);
  }
};

const formatDateTime = (ts: number | null): string => {
  if (!ts) return 'N/A';
  return new Date(ts).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const RefundsManagement: React.FC = () => {
  const { showSuccess, showError } = useSnackbar();
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedRefund, setSelectedRefund] = useState<Refund | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const fetchRefunds = useCallback(async () => {
    try {
      const functions = getFunctions();
      const getRefundsFn = httpsCallable(functions, 'getRefunds');
      const result = await getRefundsFn();
      const data = result.data as { refunds: Refund[] };
      setRefunds(data.refunds || []);
    } catch (error) {
      console.error('Error fetching refunds:', error);
      showError('Failed to load refunds');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRefunds();
  }, [fetchRefunds]);

  const stats = useMemo(() => {
    const total = refunds.length;
    const processed = refunds.filter(
      (r) => ['processed', 'completed', 'success'].includes(r.status.toLowerCase())
    ).length;
    const pending = refunds.filter(
      (r) => ['pending', 'initiated'].includes(r.status.toLowerCase())
    ).length;
    const failed = refunds.filter(
      (r) => ['failed', 'rejected'].includes(r.status.toLowerCase())
    ).length;
    const totalAmount = refunds.reduce((sum, r) => sum + r.amount / 100, 0);
    return { total, processed, pending, failed, totalAmount };
  }, [refunds]);

  const filteredRefunds = useMemo(() => {
    let list = [...refunds];

    if (activeTab === 1) {
      list = list.filter((r) =>
        ['processed', 'completed', 'success'].includes(r.status.toLowerCase())
      );
    } else if (activeTab === 2) {
      list = list.filter((r) =>
        ['pending', 'initiated'].includes(r.status.toLowerCase())
      );
    } else if (activeTab === 3) {
      list = list.filter((r) =>
        ['failed', 'rejected'].includes(r.status.toLowerCase())
      );
    }

    if (searchTerm.trim()) {
      const term = searchTerm.trim().toLowerCase();
      list = list.filter(
        (r) =>
          (r.userName || '').toLowerCase().includes(term) ||
          (r.farmhouseName || '').toLowerCase().includes(term) ||
          (r.refundId || '').toLowerCase().includes(term) ||
          (r.bookingId || '').toLowerCase().includes(term)
      );
    }

    if (dateFrom) {
      const from = new Date(dateFrom).getTime();
      list = list.filter((r) => r.createdAt && r.createdAt >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo).getTime() + 86400000;
      list = list.filter((r) => r.createdAt && r.createdAt <= to);
    }

    list.sort((a, b) => {
      const aTime = a.createdAt || 0;
      const bTime = b.createdAt || 0;
      return sortOrder === 'desc' ? bTime - aTime : aTime - bTime;
    });

    return list;
  }, [refunds, activeTab, searchTerm, dateFrom, dateTo, sortOrder]);

  const filtersActive = searchTerm.trim() !== '' || !!dateFrom || !!dateTo;
  const resetFilters = () => {
    setSearchTerm('');
    setDateFrom('');
    setDateTo('');
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showSuccess('Copied to clipboard');
  };

  const handleExportCSV = () => {
    if (filteredRefunds.length === 0) {
      showError('No refunds to export');
      return;
    }

    const headers = [
      'Refund ID', 'Booking ID', 'Payment ID', 'User', 'Email',
      'Farmhouse', 'Refund Amount', 'Original Price', 'Refund %',
      'Reason', 'Status', 'Created At',
    ];

    const csvData = filteredRefunds.map((r) => [
      r.refundId,
      r.bookingId,
      r.paymentId,
      r.userName,
      r.userEmail,
      r.farmhouseName,
      (r.amount / 100).toString(),
      (r.totalPrice || 0).toString(),
      (r.refundPercentage || 0).toString(),
      r.reason,
      r.status,
      r.createdAt ? new Date(r.createdAt).toISOString() : '',
    ]);

    const csvContent = [
      headers.join(','),
      ...csvData.map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `refunds_export_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showSuccess(`Exported ${filteredRefunds.length} refunds to CSV`);
  };

  if (loading) {
    return (
      <MainLayout>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '70vh' }}>
          <CircularProgress size={48} sx={{ color: '#F59E0B' }} />
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
            {
              label: 'Total Refunds',
              value: stats.total.toString(),
              sub: 'All refund requests',
              color: '#3B82F6',
              bg: '#EFF6FF',
              icon: <Receipt sx={{ fontSize: 24 }} />,
            },
            {
              label: 'Total Refunded',
              value: `₹${stats.totalAmount.toLocaleString('en-IN')}`,
              sub: 'Amount returned to users',
              color: '#F59E0B',
              bg: '#FFFBEB',
              icon: <CurrencyRupee sx={{ fontSize: 24 }} />,
            },
            {
              label: 'Processed',
              value: stats.processed.toString(),
              sub: 'Successfully completed',
              color: '#10B981',
              bg: '#ECFDF5',
              icon: <CheckCircle sx={{ fontSize: 24 }} />,
            },
            {
              label: 'Pending',
              value: stats.pending.toString(),
              sub: 'Awaiting processing',
              color: '#EF4444',
              bg: '#FEF2F2',
              icon: <HourglassEmpty sx={{ fontSize: 24 }} />,
            },
          ].map((stat) => (
            <Grid size={{ xs: 12, sm: 6, md: 3 }} key={stat.label}>
              <Card
                elevation={0}
                sx={{
                  border: '1px solid',
                  borderColor: 'rgba(0,0,0,0.06)',
                  borderRadius: 3,
                }}
              >
                <CardContent sx={{ p: 2.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <Box>
                      <Typography
                        sx={{
                          fontSize: '0.75rem',
                          fontWeight: 500,
                          color: '#6B7280',
                          textTransform: 'uppercase',
                          letterSpacing: '0.03em',
                        }}
                      >
                        {stat.label}
                      </Typography>
                      <Typography
                        sx={{
                          fontSize: '1.5rem',
                          fontWeight: 700,
                          color: '#111827',
                          lineHeight: 1.2,
                          mt: 0.5,
                        }}
                      >
                        {stat.value}
                      </Typography>
                      <Typography sx={{ fontSize: '0.7rem', color: '#9CA3AF', mt: 0.5 }}>
                        {stat.sub}
                      </Typography>
                    </Box>
                    <Box
                      sx={{
                        width: 44,
                        height: 44,
                        borderRadius: 2.5,
                        backgroundColor: stat.bg,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: stat.color,
                        flexShrink: 0,
                      }}
                    >
                      {stat.icon}
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Filters */}
        <Paper
          elevation={0}
          sx={{
            mb: 3,
            border: '1px solid',
            borderColor: 'rgba(0,0,0,0.06)',
            borderRadius: 3,
            overflow: 'hidden',
          }}
        >
          <Box sx={{ p: 2, display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
            <FilterAltOutlined sx={{ fontSize: 20, color: '#9CA3AF' }} />
            <TextField
              size="small"
              placeholder="Search user, farmhouse, or refund ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              sx={{
                minWidth: 280,
                '& .MuiOutlinedInput-root': { borderRadius: 2, fontSize: '0.875rem' },
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchOutlined sx={{ fontSize: 20, color: '#9CA3AF' }} />
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              size="small"
              label="From"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{
                minWidth: 160,
                '& .MuiOutlinedInput-root': { borderRadius: 2, fontSize: '0.875rem' },
              }}
            />
            <TextField
              size="small"
              label="To"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{
                minWidth: 160,
                '& .MuiOutlinedInput-root': { borderRadius: 2, fontSize: '0.875rem' },
              }}
            />
            {filtersActive && (
              <Button
                size="small"
                startIcon={<RestartAltOutlined sx={{ fontSize: 18 }} />}
                onClick={resetFilters}
                sx={{ textTransform: 'none', color: '#6B7280', fontWeight: 600 }}
              >
                Reset
              </Button>
            )}
            <Box sx={{ flex: 1 }} />
            <Button
              variant="outlined"
              startIcon={<Download sx={{ fontSize: 18 }} />}
              onClick={handleExportCSV}
              disabled={filteredRefunds.length === 0}
              size="small"
              sx={{
                textTransform: 'none',
                fontWeight: 600,
                borderRadius: 2,
                borderColor: '#E5E7EB',
                color: '#6B7280',
                '&:hover': { borderColor: '#F59E0B', color: '#F59E0B' },
              }}
            >
              Export CSV
            </Button>
          </Box>

          <Tabs
            value={activeTab}
            onChange={(_, v) => setActiveTab(v)}
            sx={{
              '& .MuiTab-root': {
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '0.85rem',
                color: '#6B7280',
                minHeight: 48,
              },
              '& .Mui-selected': { color: '#F59E0B !important' },
              '& .MuiTabs-indicator': { backgroundColor: '#F59E0B' },
            }}
          >
            <Tab label={`All (${refunds.length})`} />
            <Tab label={`Processed (${stats.processed})`} />
            <Tab label={`Pending (${stats.pending})`} />
            <Tab label={`Failed (${stats.failed})`} />
          </Tabs>
        </Paper>

        {/* Table */}
        <TableContainer
          component={Paper}
          elevation={0}
          sx={{
            border: '1px solid',
            borderColor: 'rgba(0,0,0,0.06)',
            borderRadius: 3,
          }}
        >
          <Table>
            <TableHead>
              <TableRow
                sx={{
                  '& th': {
                    backgroundColor: '#F9FAFB',
                    borderBottom: '1px solid #E5E7EB',
                    color: '#6B7280',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    py: 1.5,
                  },
                }}
              >
                <TableCell>Refund ID</TableCell>
                <TableCell>
                  <TableSortLabel
                    active
                    direction={sortOrder}
                    onClick={() => setSortOrder((o) => (o === 'desc' ? 'asc' : 'desc'))}
                  >
                    Date
                  </TableSortLabel>
                </TableCell>
                <TableCell>User</TableCell>
                <TableCell>Farmhouse</TableCell>
                <TableCell>Booking Amount</TableCell>
                <TableCell>Refund Amount</TableCell>
                <TableCell>Reason</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredRefunds.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 5 }}>
                    <Typography color="text.secondary" sx={{ fontWeight: 500 }}>
                      {filtersActive
                        ? 'No refunds match the current filters.'
                        : 'No refunds found.'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredRefunds.map((refund) => {
                  const statusInfo = getStatusInfo(refund.status);
                  return (
                    <TableRow
                      key={refund.id}
                      hover
                      sx={{
                        '&:hover': { backgroundColor: '#FAFAFA' },
                        '& td': { borderBottom: '1px solid #F3F4F6', py: 1.5 },
                      }}
                    >
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Tooltip title={refund.refundId || refund.id}>
                            <Typography
                              sx={{
                                fontSize: '0.78rem',
                                fontFamily: 'monospace',
                                color: '#F59E0B',
                                fontWeight: 600,
                                cursor: 'pointer',
                              }}
                              onClick={() => copyToClipboard(refund.refundId || refund.id)}
                            >
                              {(refund.refundId || refund.id).length > 16
                                ? `${(refund.refundId || refund.id).substring(0, 16)}...`
                                : refund.refundId || refund.id}
                            </Typography>
                          </Tooltip>
                        </Box>
                        {refund.paymentId && (
                          <Tooltip title={`Payment: ${refund.paymentId}`}>
                            <Typography
                              sx={{
                                fontSize: '0.68rem',
                                fontFamily: 'monospace',
                                color: '#3B82F6',
                                mt: 0.25,
                                cursor: 'pointer',
                              }}
                              onClick={() => copyToClipboard(refund.paymentId)}
                            >
                              {refund.paymentId}
                            </Typography>
                          </Tooltip>
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ fontSize: '0.8rem', color: '#374151', whiteSpace: 'nowrap' }}>
                          {formatDate(refund.createdAt)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Box
                            sx={{
                              width: 34,
                              height: 34,
                              borderRadius: '50%',
                              background: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#fff',
                              flexShrink: 0,
                            }}
                          >
                            <PersonOutline sx={{ fontSize: 18 }} />
                          </Box>
                          <Box>
                            <Typography sx={{ fontWeight: 600, fontSize: '0.85rem', color: '#111827' }}>
                              {refund.userName || 'Unknown User'}
                            </Typography>
                            <Typography sx={{ fontSize: '0.7rem', color: '#9CA3AF' }}>
                              {refund.userEmail || ''}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                          <HomeOutlined sx={{ fontSize: 16, color: '#9CA3AF' }} />
                          <Typography sx={{ fontSize: '0.85rem', fontWeight: 500, color: '#374151' }}>
                            {refund.farmhouseName || 'N/A'}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ fontSize: '0.85rem', fontWeight: 600, color: '#6B7280' }}>
                          {refund.totalPrice ? `₹${refund.totalPrice.toLocaleString('en-IN')}` : 'N/A'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ fontSize: '0.9rem', fontWeight: 700, color: '#DC2626' }}>
                          {formatRefundAmount(refund.amount)}
                        </Typography>
                        {refund.refundPercentage > 0 && (
                          <Typography sx={{ fontSize: '0.65rem', color: '#9CA3AF' }}>
                            ({refund.refundPercentage}%)
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography
                          sx={{
                            fontSize: '0.8rem',
                            color: '#374151',
                            maxWidth: 150,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {refund.reason || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={statusInfo.label}
                          size="small"
                          sx={{
                            backgroundColor: statusInfo.bg,
                            color: statusInfo.color,
                            fontWeight: 600,
                            fontSize: '0.7rem',
                          }}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title="View Details">
                          <IconButton
                            size="small"
                            onClick={() => {
                              setSelectedRefund(refund);
                              setDetailsOpen(true);
                            }}
                            sx={{
                              color: '#9CA3AF',
                              '&:hover': { color: '#6B7280', backgroundColor: '#F3F4F6' },
                            }}
                          >
                            <Visibility sx={{ fontSize: 18 }} />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Details Dialog */}
        <Dialog
          open={detailsOpen}
          onClose={() => setDetailsOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle sx={{ pb: 1 }}>
            <Typography variant="h6" fontWeight="bold">
              Refund Details
            </Typography>
          </DialogTitle>
          <DialogContent>
            {selectedRefund && (
              <Box sx={{ pt: 1 }}>
                {/* Refund Info */}
                <Paper
                  sx={{
                    p: 2.5,
                    mb: 2,
                    bgcolor: alpha('#F59E0B', 0.04),
                    border: '1px solid',
                    borderColor: alpha('#F59E0B', 0.15),
                    borderRadius: 2,
                  }}
                >
                  <Typography sx={{ fontSize: '0.7rem', fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em', mb: 1 }}>
                    Refund Information
                  </Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                    <Box>
                      <Typography sx={{ fontSize: '0.7rem', color: '#9CA3AF' }}>Refund ID</Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Typography sx={{ fontSize: '0.82rem', fontFamily: 'monospace', fontWeight: 600, color: '#F59E0B' }}>
                          {selectedRefund.refundId || selectedRefund.id}
                        </Typography>
                        <IconButton size="small" onClick={() => copyToClipboard(selectedRefund.refundId || selectedRefund.id)}>
                          <ContentCopy sx={{ fontSize: 14, color: '#9CA3AF' }} />
                        </IconButton>
                      </Box>
                    </Box>
                    <Box>
                      <Typography sx={{ fontSize: '0.7rem', color: '#9CA3AF' }}>Status</Typography>
                      <Chip
                        label={getStatusInfo(selectedRefund.status).label}
                        size="small"
                        sx={{
                          mt: 0.25,
                          backgroundColor: getStatusInfo(selectedRefund.status).bg,
                          color: getStatusInfo(selectedRefund.status).color,
                          fontWeight: 600,
                          fontSize: '0.75rem',
                        }}
                      />
                    </Box>
                    <Box>
                      <Typography sx={{ fontSize: '0.7rem', color: '#9CA3AF' }}>Refund Amount</Typography>
                      <Typography sx={{ fontSize: '1.25rem', fontWeight: 700, color: '#DC2626' }}>
                        {formatRefundAmount(selectedRefund.amount)}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography sx={{ fontSize: '0.7rem', color: '#9CA3AF' }}>Refund Date</Typography>
                      <Typography sx={{ fontSize: '0.85rem', fontWeight: 500, color: '#374151' }}>
                        {formatDateTime(selectedRefund.createdAt)}
                      </Typography>
                    </Box>
                  </Box>
                  {selectedRefund.reason && (
                    <Box sx={{ mt: 1.5 }}>
                      <Typography sx={{ fontSize: '0.7rem', color: '#9CA3AF' }}>Reason</Typography>
                      <Typography sx={{ fontSize: '0.85rem', color: '#374151', mt: 0.25 }}>
                        {selectedRefund.reason}
                      </Typography>
                    </Box>
                  )}
                </Paper>

                {/* Payment IDs */}
                <Paper
                  sx={{
                    p: 2.5,
                    mb: 2,
                    bgcolor: alpha('#3B82F6', 0.04),
                    border: '1px solid',
                    borderColor: alpha('#3B82F6', 0.15),
                    borderRadius: 2,
                  }}
                >
                  <Typography sx={{ fontSize: '0.7rem', fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em', mb: 1 }}>
                    Payment References
                  </Typography>
                  {[
                    { label: 'Payment ID', value: selectedRefund.paymentId, color: '#3B82F6' },
                    { label: 'Booking ID', value: selectedRefund.bookingId, color: '#8B5CF6' },
                  ].map((item) => (
                    <Box key={item.label} sx={{ mb: 1 }}>
                      <Typography sx={{ fontSize: '0.7rem', color: '#9CA3AF' }}>{item.label}</Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Typography sx={{ fontSize: '0.82rem', fontFamily: 'monospace', fontWeight: 500, color: item.color }}>
                          {item.value || 'N/A'}
                        </Typography>
                        {item.value && (
                          <IconButton size="small" onClick={() => copyToClipboard(item.value)}>
                            <ContentCopy sx={{ fontSize: 14, color: '#9CA3AF' }} />
                          </IconButton>
                        )}
                      </Box>
                    </Box>
                  ))}
                </Paper>

                {/* User & Booking */}
                <Paper sx={{ p: 2.5, bgcolor: '#F9FAFB', borderRadius: 2 }}>
                  <Typography sx={{ fontSize: '0.7rem', fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em', mb: 1 }}>
                    Booking Details
                  </Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                    <Box>
                      <Typography sx={{ fontSize: '0.7rem', color: '#9CA3AF' }}>Guest</Typography>
                      <Typography sx={{ fontSize: '0.85rem', fontWeight: 600, color: '#111827' }}>
                        {selectedRefund.userName || 'N/A'}
                      </Typography>
                      <Typography sx={{ fontSize: '0.75rem', color: '#6B7280' }}>
                        {selectedRefund.userEmail || ''}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography sx={{ fontSize: '0.7rem', color: '#9CA3AF' }}>Farmhouse</Typography>
                      <Typography sx={{ fontSize: '0.85rem', fontWeight: 600, color: '#111827' }}>
                        {selectedRefund.farmhouseName || 'N/A'}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography sx={{ fontSize: '0.7rem', color: '#9CA3AF' }}>Check-in</Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <CalendarToday sx={{ fontSize: 14, color: '#9CA3AF' }} />
                        <Typography sx={{ fontSize: '0.85rem', color: '#374151' }}>
                          {formatDate(selectedRefund.checkInDate)}
                        </Typography>
                      </Box>
                    </Box>
                    <Box>
                      <Typography sx={{ fontSize: '0.7rem', color: '#9CA3AF' }}>Check-out</Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <CalendarToday sx={{ fontSize: 14, color: '#9CA3AF' }} />
                        <Typography sx={{ fontSize: '0.85rem', color: '#374151' }}>
                          {formatDate(selectedRefund.checkOutDate)}
                        </Typography>
                      </Box>
                    </Box>
                    <Box>
                      <Typography sx={{ fontSize: '0.7rem', color: '#9CA3AF' }}>Original Amount</Typography>
                      <Typography sx={{ fontSize: '0.95rem', fontWeight: 700, color: '#111827' }}>
                        {selectedRefund.totalPrice
                          ? `₹${selectedRefund.totalPrice.toLocaleString('en-IN')}`
                          : 'N/A'}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography sx={{ fontSize: '0.7rem', color: '#9CA3AF' }}>Booking Status</Typography>
                      <Typography sx={{ fontSize: '0.85rem', fontWeight: 500, color: '#DC2626' }}>
                        {selectedRefund.bookingStatus || 'N/A'}
                      </Typography>
                    </Box>
                  </Box>
                  {selectedRefund.cancelledAt && (
                    <Box sx={{ mt: 1.5 }}>
                      <Typography sx={{ fontSize: '0.7rem', color: '#9CA3AF' }}>Cancelled At</Typography>
                      <Typography sx={{ fontSize: '0.85rem', color: '#374151' }}>
                        {formatDateTime(selectedRefund.cancelledAt)}
                      </Typography>
                    </Box>
                  )}
                </Paper>
              </Box>
            )}
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setDetailsOpen(false)} sx={{ textTransform: 'none', fontWeight: 600 }}>
              Close
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </MainLayout>
  );
};

export default RefundsManagement;
