import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Grid,
  Alert,
  CircularProgress,
  Switch,
  FormControlLabel,
  Tooltip
} from '@mui/material';
import { Add, Delete, Edit, Download, Visibility, Public, Lock } from '@mui/icons-material';
import { 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  doc, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useSnackbar } from '../../context/SnackbarContext';
import { Coupon } from '../../types';
import MainLayout from '../../components/layout/MainLayout';

const CouponsManagement: React.FC = () => {
  const { showSuccess, showError, showWarning } = useSnackbar();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [filtered, setFiltered] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentCouponId, setCurrentCouponId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [formData, setFormData] = useState({
    code: '',
    discount_type: 'fixed_amount',
    discount_value: 0,
    valid_from: '',
    valid_until: '',
    max_uses: 1,
    min_booking_amount: 0,
    description: '',
    visibility: 'public' as 'public' | 'private'
  });
  const [usageDialogOpen, setUsageDialogOpen] = useState(false);
  const [selectedCouponUsage, setSelectedCouponUsage] = useState<any>(null);

  useEffect(() => {
    fetchCoupons();
  }, []);

  const filterCoupons = useCallback(() => {
    let result = coupons;

    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      result = result.filter(c =>
        c.code?.toLowerCase().includes(search) ||
        c.description?.toLowerCase().includes(search)
      );
    }

    if (statusFilter !== 'all') {
      if (statusFilter === 'active') {
        result = result.filter(c => c.is_active);
      } else if (statusFilter === 'inactive') {
        result = result.filter(c => !c.is_active);
      } else if (statusFilter === 'expired') {
        const now = new Date();
        result = result.filter(c => {
          const validUntil = c.valid_until?.toDate ? c.valid_until.toDate() : new Date(c.valid_until);
          return validUntil < now;
        });
      }
    }

    setFiltered(result);
  }, [coupons, searchTerm, statusFilter]);

  useEffect(() => {
    filterCoupons();
  }, [filterCoupons]);

  const fetchCoupons = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'coupons'));
      const data = snapshot.docs.map(doc => ({
        coupon_id: doc.id,
        ...doc.data()
      })) as Coupon[];
      setCoupons(data.sort((a, b) => {
        const dateA = a.created_at?.toDate ? a.created_at.toDate() : new Date(0);
        const dateB = b.created_at?.toDate ? b.created_at.toDate() : new Date(0);
        return dateB.getTime() - dateA.getTime();
      }));
    } catch (error) {
      console.error('Error fetching coupons:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.code || formData.discount_value <= 0) {
      showWarning('Please fill in all required fields');
      return;
    }

    try {
      await addDoc(collection(db, 'coupons'), {
        code: formData.code.toUpperCase(),
        discount_type: formData.discount_type,
        discount_value: formData.discount_value,
        valid_from: new Date(formData.valid_from),
        valid_until: new Date(formData.valid_until),
        max_uses: formData.max_uses,
        current_uses: 0,
        is_active: true,
        min_booking_amount: formData.min_booking_amount,
        description: formData.description,
        visibility: formData.visibility,
        used_by: [], // Track who used this coupon
        created_at: serverTimestamp()
      });
      setDialogOpen(false);
      fetchCoupons();
      resetForm();
      showSuccess('Coupon created successfully!');
    } catch (error) {
      console.error('Error creating coupon:', error);
      showError('Failed to create coupon');
    }
  };

  const handleEdit = async () => {
    if (!currentCouponId) return;

    try {
      await updateDoc(doc(db, 'coupons', currentCouponId), {
        code: formData.code.toUpperCase(),
        discount_type: formData.discount_type,
        discount_value: formData.discount_value,
        valid_from: new Date(formData.valid_from),
        valid_until: new Date(formData.valid_until),
        max_uses: formData.max_uses,
        min_booking_amount: formData.min_booking_amount,
        description: formData.description,
        visibility: formData.visibility
      });
      setDialogOpen(false);
      fetchCoupons();
      resetForm();
      showSuccess('Coupon updated successfully!');
    } catch (error) {
      console.error('Error updating coupon:', error);
      showError('Failed to update coupon');
    }
  };

  const openEditDialog = (coupon: Coupon) => {
    setEditMode(true);
    setCurrentCouponId(coupon.coupon_id);

    const validFrom = coupon.valid_from?.toDate ?
      coupon.valid_from.toDate() :
      new Date(coupon.valid_from);
    const validUntil = coupon.valid_until?.toDate ?
      coupon.valid_until.toDate() :
      new Date(coupon.valid_until);

    setFormData({
      code: coupon.code || '',
      discount_type: coupon.discount_type || 'fixed_amount',
      discount_value: coupon.discount_value || 0,
      valid_from: validFrom.toISOString().split('T')[0],
      valid_until: validUntil.toISOString().split('T')[0],
      max_uses: coupon.max_uses || 1,
      min_booking_amount: coupon.min_booking_amount || 0,
      description: coupon.description || '',
      visibility: (coupon as any).visibility || 'public'
    });
    setDialogOpen(true);
  };

  const handleViewUsage = (coupon: Coupon) => {
    setSelectedCouponUsage(coupon);
    setUsageDialogOpen(true);
  };

  const toggleActive = async (couponId: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'coupons', couponId), {
        is_active: !currentStatus
      });
      fetchCoupons();
    } catch (error) {
      console.error('Error toggling coupon status:', error);
    }
  };

  const handleDelete = async (couponId: string) => {
    if (!window.confirm('Are you sure you want to delete this coupon? This action cannot be undone.')) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'coupons', couponId));
      fetchCoupons();
      showSuccess('Coupon deleted successfully');
    } catch (error) {
      console.error('Error deleting coupon:', error);
      showError('Failed to delete coupon');
    }
  };

  const resetForm = () => {
    setFormData({
      code: '',
      discount_type: 'fixed_amount',
      discount_value: 0,
      valid_from: '',
      valid_until: '',
      max_uses: 1,
      min_booking_amount: 0,
      description: '',
      visibility: 'public'
    });
    setEditMode(false);
    setCurrentCouponId('');
  };

  const formatDate = (date: any) => {
    if (!date) return 'N/A';
    try {
      const d = date.toDate ? date.toDate() : new Date(date);
      return d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return 'N/A';
    }
  };

  const handleExportCSV = () => {
    if (filtered.length === 0) {
      showError('No coupons to export');
      return;
    }

    const headers = [
      'Code', 'Discount Type', 'Discount Value', 'Valid From', 'Valid Until',
      'Max Uses', 'Current Uses', 'Min Booking Amount', 'Description', 'Status', 'Created At'
    ];

    const csvData = filtered.map(coupon => [
      coupon.code || '',
      coupon.discount_type || '',
      coupon.discount_value || 0,
      formatDate(coupon.valid_from),
      formatDate(coupon.valid_until),
      coupon.max_uses || 0,
      coupon.current_uses || 0,
      coupon.min_booking_amount || 0,
      (coupon.description || '').replace(/"/g, '""'),
      coupon.is_active ? 'Active' : 'Inactive',
      formatDate(coupon.created_at)
    ]);

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `coupons_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showSuccess(`Exported ${filtered.length} coupons to CSV`);
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
              Coupons Management
            </Typography>
            <Typography variant='body2' color='text.secondary'>
              Total Coupons: {coupons.length} | Active: {coupons.filter(c => c.is_active).length}
            </Typography>
          </Box>
          <Button 
            variant='contained' 
            startIcon={<Add />} 
            onClick={() => {
              resetForm();
              setDialogOpen(true);
            }}
            size='large'
          >
            Create Coupon
          </Button>
        </Box>

        <Alert severity='info' sx={{ mb: 3 }}>
          <strong>Pro Tip:</strong> You can edit max uses at any time. Set a high number for unlimited-style coupons.
        </Alert>

        {/* Search and Filters */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid size={{ xs: 12, md: 5 }}>
            <TextField
              fullWidth
              placeholder='Search by coupon code or description...'
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <MenuItem value='all'>All ({coupons.length})</MenuItem>
                <MenuItem value='active'>Active ({coupons.filter(c => c.is_active).length})</MenuItem>
                <MenuItem value='inactive'>Inactive ({coupons.filter(c => !c.is_active).length})</MenuItem>
                <MenuItem value='expired'>Expired</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <Button
              fullWidth
              variant='outlined'
              startIcon={<Download />}
              onClick={handleExportCSV}
              disabled={filtered.length === 0}
              sx={{ height: '56px' }}
            >
              Export to CSV ({filtered.length} coupons)
            </Button>
          </Grid>
        </Grid>

        <TableContainer component={Paper} elevation={2}>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                <TableCell><strong>Code</strong></TableCell>
                <TableCell><strong>Discount</strong></TableCell>
                <TableCell><strong>Visibility</strong></TableCell>
                <TableCell><strong>Valid Period</strong></TableCell>
                <TableCell><strong>Usage</strong></TableCell>
                <TableCell><strong>Status</strong></TableCell>
                <TableCell align='center'><strong>Actions</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {coupons.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align='center' sx={{ py: 4 }}>
                    <Typography color='text.secondary' gutterBottom>
                      No coupons created yet
                    </Typography>
                    <Typography variant='body2' color='text.secondary'>
                      Click "Create Coupon" to add your first discount coupon
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align='center' sx={{ py: 4 }}>
                    <Typography color='text.secondary' gutterBottom>
                      No coupons match your filters
                    </Typography>
                    <Typography variant='body2' color='text.secondary'>
                      Try adjusting your search or filters
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((coupon) => (
                  <TableRow key={coupon.coupon_id} hover>
                    <TableCell>
                      <Typography variant='body1' fontWeight='bold' fontFamily='monospace'>
                        {coupon.code}
                      </Typography>
                      {coupon.description && (
                        <Typography variant='caption' color='text.secondary'>
                          {coupon.description}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={
                          coupon.discount_type === 'percentage'
                            ? `${coupon.discount_value}% OFF`
                            : `₹${coupon.discount_value} OFF`
                        }
                        color='primary'
                        size='small'
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        icon={(coupon as any).visibility === 'private' ? <Lock /> : <Public />}
                        label={(coupon as any).visibility === 'private' ? 'Private' : 'Public'}
                        color={(coupon as any).visibility === 'private' ? 'warning' : 'success'}
                        size='small'
                        variant='outlined'
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant='body2'>
                        {formatDate(coupon.valid_from)}
                      </Typography>
                      <Typography variant='body2' color='text.secondary'>
                        to {formatDate(coupon.valid_until)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant='body2' fontWeight='medium'>
                          {coupon.current_uses || 0} / {coupon.max_uses}
                        </Typography>
                        <Typography variant='caption' color='text.secondary'>
                          {coupon.max_uses - (coupon.current_uses || 0)} remaining
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={coupon.is_active}
                            onChange={() => toggleActive(coupon.coupon_id, coupon.is_active)}
                            size='small'
                          />
                        }
                        label={
                          <Typography variant='caption'>
                            {coupon.is_active ? 'Active' : 'Inactive'}
                          </Typography>
                        }
                      />
                    </TableCell>
                    <TableCell align='center'>
                      <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                        <Tooltip title='View Usage'>
                          <IconButton
                            size='small'
                            color='info'
                            onClick={() => handleViewUsage(coupon)}
                          >
                            <Visibility />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title='Edit Coupon'>
                          <IconButton
                            size='small'
                            color='primary'
                            onClick={() => openEditDialog(coupon)}
                          >
                            <Edit />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title='Delete Coupon'>
                          <IconButton
                            size='small'
                            color='error'
                            onClick={() => handleDelete(coupon.coupon_id)}
                          >
                            <Delete />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Create/Edit Dialog */}
        <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth='sm' fullWidth>
          <DialogTitle>
            <Typography variant='h6' fontWeight='bold'>
              {editMode ? 'Edit Coupon' : 'Create New Coupon'}
            </Typography>
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 0.5 }}>
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label='Coupon Code *'
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  placeholder='DIWALI50'
                  inputProps={{ style: { textTransform: 'uppercase' } }}
                />
              </Grid>
              <Grid size={{ xs: 6 }}>
                <FormControl fullWidth>
                  <InputLabel>Discount Type *</InputLabel>
                  <Select
                    value={formData.discount_type}
                    onChange={(e) => setFormData({ ...formData, discount_type: e.target.value })}
                  >
                    <MenuItem value='fixed_amount'>Fixed Amount (₹)</MenuItem>
                    <MenuItem value='percentage'>Percentage (%)</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 6 }}>
                <TextField
                  fullWidth
                  type='number'
                  label={`Discount Value * ${formData.discount_type === 'percentage' ? '(%)' : '(₹)'}`}
                  value={formData.discount_value}
                  onChange={(e) => setFormData({ ...formData, discount_value: Number(e.target.value) })}
                  inputProps={{ min: 0 }}
                />
              </Grid>
              <Grid size={{ xs: 6 }}>
                <TextField
                  fullWidth
                  type='date'
                  label='Valid From *'
                  InputLabelProps={{ shrink: true }}
                  value={formData.valid_from}
                  onChange={(e) => setFormData({ ...formData, valid_from: e.target.value })}
                />
              </Grid>
              <Grid size={{ xs: 6 }}>
                <TextField
                  fullWidth
                  type='date'
                  label='Valid Until *'
                  InputLabelProps={{ shrink: true }}
                  value={formData.valid_until}
                  onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                />
              </Grid>
              <Grid size={{ xs: 6 }}>
                <TextField
                  fullWidth
                  type='number'
                  label='Maximum Uses *'
                  value={formData.max_uses}
                  onChange={(e) => setFormData({ ...formData, max_uses: Number(e.target.value) })}
                  inputProps={{ min: 1 }}
                  helperText='Can be edited later'
                />
              </Grid>
              <Grid size={{ xs: 6 }}>
                <TextField
                  fullWidth
                  type='number'
                  label='Min. Booking Amount (₹)'
                  value={formData.min_booking_amount}
                  onChange={(e) => setFormData({ ...formData, min_booking_amount: Number(e.target.value) })}
                  inputProps={{ min: 0 }}
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <FormControl fullWidth>
                  <InputLabel>Visibility *</InputLabel>
                  <Select
                    value={formData.visibility}
                    onChange={(e) => setFormData({ ...formData, visibility: e.target.value as 'public' | 'private' })}
                  >
                    <MenuItem value='public'>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Public color='success' fontSize='small' />
                        Public - Visible to all users in app
                      </Box>
                    </MenuItem>
                    <MenuItem value='private'>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Lock color='warning' fontSize='small' />
                        Private - Users must enter code manually
                      </Box>
                    </MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  label='Description'
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder='e.g., Diwali special offer for all users'
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <Alert severity='info' sx={{ mt: 1 }}>
                  <strong>Public coupons</strong> will be displayed to all users in the mobile app.
                  <strong> Private coupons</strong> require users to enter the code manually.
                </Alert>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => {
              setDialogOpen(false);
              resetForm();
            }}>
              Cancel
            </Button>
            <Button
              onClick={editMode ? handleEdit : handleCreate}
              variant='contained'
            >
              {editMode ? 'Update' : 'Create'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Usage Tracking Dialog */}
        <Dialog open={usageDialogOpen} onClose={() => setUsageDialogOpen(false)} maxWidth='sm' fullWidth>
          <DialogTitle>
            <Typography variant='h6' fontWeight='bold'>
              Coupon Usage Details
            </Typography>
          </DialogTitle>
          <DialogContent>
            {selectedCouponUsage && (
              <Box>
                <Paper sx={{ p: 2, mb: 2, bgcolor: 'grey.50' }}>
                  <Typography variant='h6' fontFamily='monospace'>
                    {selectedCouponUsage.code}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
                    <Chip
                      label={selectedCouponUsage.discount_type === 'percentage'
                        ? `${selectedCouponUsage.discount_value}% OFF`
                        : `₹${selectedCouponUsage.discount_value} OFF`}
                      color='primary'
                      size='small'
                    />
                    <Chip
                      icon={(selectedCouponUsage as any).visibility === 'private' ? <Lock /> : <Public />}
                      label={(selectedCouponUsage as any).visibility === 'private' ? 'Private' : 'Public'}
                      color={(selectedCouponUsage as any).visibility === 'private' ? 'warning' : 'success'}
                      size='small'
                      variant='outlined'
                    />
                  </Box>
                </Paper>

                <Typography variant='subtitle1' fontWeight='bold' gutterBottom>
                  Usage Statistics
                </Typography>
                <Paper sx={{ p: 2, mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography>Total Uses:</Typography>
                    <Typography fontWeight='bold'>
                      {selectedCouponUsage.current_uses || 0} / {selectedCouponUsage.max_uses}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography>Remaining:</Typography>
                    <Typography fontWeight='bold' color='success.main'>
                      {selectedCouponUsage.max_uses - (selectedCouponUsage.current_uses || 0)}
                    </Typography>
                  </Box>
                </Paper>

                <Typography variant='subtitle1' fontWeight='bold' gutterBottom>
                  Users Who Used This Coupon
                </Typography>
                {(selectedCouponUsage as any).used_by && (selectedCouponUsage as any).used_by.length > 0 ? (
                  <Paper sx={{ p: 2, maxHeight: 200, overflow: 'auto' }}>
                    {(selectedCouponUsage as any).used_by.map((usage: any, idx: number) => (
                      <Box key={idx} sx={{ display: 'flex', justifyContent: 'space-between', py: 1, borderBottom: idx < (selectedCouponUsage as any).used_by.length - 1 ? '1px solid #eee' : 'none' }}>
                        <Typography variant='body2'>
                          {usage.user_email || usage.user_id || 'Unknown User'}
                        </Typography>
                        <Typography variant='caption' color='text.secondary'>
                          {usage.used_at ? formatDate(usage.used_at) : 'N/A'}
                        </Typography>
                      </Box>
                    ))}
                  </Paper>
                ) : (
                  <Paper sx={{ p: 3, textAlign: 'center', bgcolor: 'grey.50' }}>
                    <Typography color='text.secondary'>
                      No one has used this coupon yet
                    </Typography>
                  </Paper>
                )}
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setUsageDialogOpen(false)} variant='outlined'>
              Close
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </MainLayout>
  );
};

export default CouponsManagement;