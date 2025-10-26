import React, { useState, useEffect } from 'react';
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
import { Add, Delete, Edit } from '@mui/icons-material';
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
import { Coupon } from '../../types';
import MainLayout from '../../components/layout/MainLayout';

const CouponsManagement: React.FC = () => {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentCouponId, setCurrentCouponId] = useState('');
  const [formData, setFormData] = useState({
    code: '',
    discount_type: 'fixed_amount',
    discount_value: 0,
    valid_from: '',
    valid_until: '',
    max_uses: 1,
    min_booking_amount: 0,
    description: ''
  });

  useEffect(() => {
    fetchCoupons();
  }, []);

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
      alert('Please fill in all required fields');
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
        created_at: serverTimestamp()
      });
      setDialogOpen(false);
      fetchCoupons();
      resetForm();
      alert('Coupon created successfully!');
    } catch (error) {
      console.error('Error creating coupon:', error);
      alert('Failed to create coupon');
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
        description: formData.description
      });
      setDialogOpen(false);
      fetchCoupons();
      resetForm();
      alert('Coupon updated successfully!');
    } catch (error) {
      console.error('Error updating coupon:', error);
      alert('Failed to update coupon');
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
      description: coupon.description || ''
    });
    setDialogOpen(true);
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
      alert('Coupon deleted successfully');
    } catch (error) {
      console.error('Error deleting coupon:', error);
      alert('Failed to delete coupon');
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
      description: ''
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

        <TableContainer component={Paper} elevation={2}>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                <TableCell><strong>Code</strong></TableCell>
                <TableCell><strong>Discount</strong></TableCell>
                <TableCell><strong>Valid Period</strong></TableCell>
                <TableCell><strong>Usage</strong></TableCell>
                <TableCell><strong>Min. Amount</strong></TableCell>
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
              ) : (
                coupons.map((coupon) => (
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
                      {(coupon.min_booking_amount || 0) > 0 ? (
                        <Typography variant='body2'>
                          ₹{coupon.min_booking_amount?.toLocaleString()}
                        </Typography>
                      ) : (
                        <Typography variant='body2' color='text.secondary'>
                          None
                        </Typography>
                      )}
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
                      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
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
      </Box>
    </MainLayout>
  );
};

export default CouponsManagement;