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
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  IconButton,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Tooltip,
  Tabs,
  Tab,
  Alert,
  Rating
} from '@mui/material';
import {
  Visibility,
  Edit,
  CheckCircle,
  Cancel,
  Image as ImageIcon,
  Add,
  Map,
  Phone,
  KingBed,
  Group,
  AttachMoney,
  AccountBalance,
  Badge,
  Close,
  PersonOutline
} from '@mui/icons-material';
import { collection, getDocs, doc, updateDoc, addDoc, serverTimestamp, query, where, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useSnackbar } from '../../context/SnackbarContext';
import { useAuth } from '../../context/AuthContext';
import MainLayout from '../../components/layout/MainLayout';
import { tryDecrypt } from '../../utils/decryption';
import EmptyState from '../../components/common/EmptyState';

interface FarmhouseData {
  farmhouse_id?: string;
  basicDetails?: {
    name?: string;
    locationText?: string;
    description?: string;
    city?: string;
    area?: string;
    capacity?: string;
    bedrooms?: string;
    contactPhone1?: string;
    contactPhone2?: string;
    mapLink?: string;
  };
  pricing?: {
    weekendDay?: string;
    weekendNight?: string;
    weeklyDay?: string;
    weeklyNight?: string;
    occasionalDay?: string;
    occasionalNight?: string;
    customPricing?: Array<{
      name?: string;
      date?: string;
      dayPrice?: string;
      nightPrice?: string;
      startDate?: string;
      endDate?: string;
    }>;
  };
  photoUrls?: string[];
  amenities?: Record<string, boolean> | string[];
  rules?: string[];
  name?: string;
  location?: string;
  locationText?: string;
  description?: string;
  base_rate?: number;
  baseRate?: number;
  commission_percentage?: number;
  commissionPercentage?: number;
  status?: string;
  propertyType?: 'farmhouse' | 'resort';
  max_guests?: number;
  maxGuests?: number;
  images?: string[];
  owner_id?: string;
  ownerId?: string;
  created_at?: any;
  createdAt?: any;
  kyc?: {
    agreedToTerms?: boolean;
    panNumber?: string;
    companyPANUrl?: string | null;
    labourDocUrl?: string | null;
    person1?: {
      name?: string;
      phone?: string;
    };
    person2?: {
      name?: string | null;
      phone?: string | null;
    };
    bankDetails?: {
      accountNumber?: string;
      ifscCode?: string;
      accountHolderName?: string;
      branchName?: string;
    };
  };
}

const AllFarmhouses: React.FC = () => {
  const { showSuccess, showError } = useSnackbar();
  const { currentUser } = useAuth();
  const [farmhouses, setFarmhouses] = useState<FarmhouseData[]>([]);
  const [filtered, setFiltered] = useState<FarmhouseData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedFarmhouse, setSelectedFarmhouse] = useState<FarmhouseData | null>(null);
  const [detailsTab, setDetailsTab] = useState(0);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [farmhouseReviews, setFarmhouseReviews] = useState<any[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [editData, setEditData] = useState({
    commission_percentage: 0,
    status: 'approved'
  });
  const [createData, setCreateData] = useState({
    name: '',
    location: '',
    city: '',
    area: '',
    description: '',
    base_rate: 0,
    commission_percentage: 10,
    max_guests: 0,
    bedrooms: 0,
    status: 'approved'
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchFarmhouses();
  }, []);

  const fetchFarmhouses = async () => {
    try {
      setLoading(true);
      const snapshot = await getDocs(collection(db, 'farmhouses'));
      const data = snapshot.docs.map(doc => ({
        farmhouse_id: doc.id,
        ...doc.data()
      })) as FarmhouseData[];
      setFarmhouses(data);
    } catch (error) {
      console.error('Error fetching farmhouses:', error);
      showError('Failed to load farmhouses');
    } finally {
      setLoading(false);
    }
  };

  const filterFarmhouses = useCallback(() => {
    let result = farmhouses;

    if (searchTerm) {
      result = result.filter(f => {
        const name = f.basicDetails?.name || f.name || '';
        const location = f.basicDetails?.locationText || f.locationText || f.location || '';
        return (
          name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          location.toLowerCase().includes(searchTerm.toLowerCase())
        );
      });
    }

    if (statusFilter !== 'all') {
      result = result.filter(f => f.status === statusFilter);
    }

    if (typeFilter !== 'all') {
      result = result.filter(f => (f.propertyType || 'farmhouse') === typeFilter);
    }

    setFiltered(result);
  }, [farmhouses, searchTerm, statusFilter, typeFilter]);

  useEffect(() => {
    filterFarmhouses();
  }, [filterFarmhouses]);

  const handleViewDetails = (farmhouse: FarmhouseData) => {
    setSelectedFarmhouse(farmhouse);
    setDetailsModalOpen(true);
    setDetailsTab(0);
    if (farmhouse.farmhouse_id) fetchFarmhouseReviews(farmhouse.farmhouse_id);
  };

  const handleEdit = (farmhouse: FarmhouseData) => {
    setSelectedFarmhouse(farmhouse);
    setEditData({
      commission_percentage: farmhouse.commission_percentage || farmhouse.commissionPercentage || 0,
      status: farmhouse.status || 'approved'
    });
    setEditModalOpen(true);
  };

  const handleOpenCreateDialog = () => {
    setCreateData({
      name: '',
      location: '',
      city: '',
      area: '',
      description: '',
      base_rate: 0,
      commission_percentage: 10,
      max_guests: 0,
      bedrooms: 0,
      status: 'approved'
    });
    setCreateModalOpen(true);
  };

  const handleCreateFarmhouse = async () => {
    if (!createData.name.trim() || !createData.location.trim()) {
      showError('Please fill in all required fields');
      return;
    }

    try {
      setSaving(true);

      const newFarmhouse = {
        basicDetails: {
          name: createData.name,
          locationText: createData.location,
          city: createData.city,
          area: createData.area,
          description: createData.description,
          capacity: createData.max_guests.toString(),
          bedrooms: createData.bedrooms.toString(),
        },
        // Legacy fields for compatibility
        name: createData.name,
        location: createData.location,
        description: createData.description,
        base_rate: createData.base_rate,
        baseRate: createData.base_rate,
        commission_percentage: createData.commission_percentage,
        commissionPercentage: createData.commission_percentage,
        max_guests: createData.max_guests,
        maxGuests: createData.max_guests,
        status: createData.status,
        created_at: serverTimestamp(),
        createdAt: serverTimestamp(),
        images: [],
        amenities: {}
      };

      const docRef = await addDoc(collection(db, 'farmhouses'), newFarmhouse);

      // Add audit trail
      await addDoc(collection(db, 'audit_trail'), {
        action: 'farmhouse_created',
        entity_type: 'farmhouse',
        entity_id: docRef.id,
        performed_by: currentUser?.email || 'admin',
        details: {
          farmhouse_name: createData.name,
          location: createData.location
        },
        timestamp: serverTimestamp()
      });

      showSuccess('Farmhouse created successfully');
      fetchFarmhouses();
      setCreateModalOpen(false);
    } catch (error) {
      console.error('Error creating farmhouse:', error);
      showError('Failed to create farmhouse');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!selectedFarmhouse?.farmhouse_id) return;

    try {
      setSaving(true);
      await updateDoc(doc(db, 'farmhouses', selectedFarmhouse.farmhouse_id), {
        commission_percentage: editData.commission_percentage,
        commissionPercentage: editData.commission_percentage,
        status: editData.status,
        updated_at: serverTimestamp()
      });

      // Update local state immediately
      setFarmhouses(prev => prev.map(f =>
        f.farmhouse_id === selectedFarmhouse.farmhouse_id
          ? { ...f, commission_percentage: editData.commission_percentage, commissionPercentage: editData.commission_percentage, status: editData.status }
          : f
      ));
      setEditModalOpen(false);
      showSuccess('Farmhouse updated successfully');

      // Audit trail + admin notification (non-blocking)
      try {
        await addDoc(collection(db, 'audit_trail'), {
          action: 'farmhouse_updated',
          entity_type: 'farmhouse',
          entity_id: selectedFarmhouse.farmhouse_id,
          performed_by: currentUser?.email || 'admin',
          details: {
            farmhouse_name: getName(selectedFarmhouse),
            changes: editData
          },
          timestamp: serverTimestamp()
        });
        await addDoc(collection(db, 'admin_notifications'), {
          type: 'farmhouse_updated',
          farmhouse_id: selectedFarmhouse.farmhouse_id,
          farmhouse_name: getName(selectedFarmhouse),
          message: `Farmhouse details updated by admin`,
          updated_by: currentUser?.email || 'admin',
          read: false,
          created_at: serverTimestamp()
        });
      } catch (auditError) {
        console.warn('Audit/notification write failed:', auditError);
      }
    } catch (error: any) {
      console.error('Error updating farmhouse:', error);
      showError('Failed to update farmhouse. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const fetchFarmhouseReviews = async (farmhouseId: string) => {
    try {
      setReviewsLoading(true);
      const q = query(collection(db, 'reviews'), where('farmhouseId', '==', farmhouseId));
      const snapshot = await getDocs(q);
      const reviewsData = await Promise.all(
        snapshot.docs.map(async (reviewDoc) => {
          const data = reviewDoc.data();
          let userName = 'Unknown User';
          if (data.userId) {
            try {
              const userDoc = await getDoc(doc(db, 'users', data.userId));
              if (userDoc.exists()) {
                const ud = userDoc.data();
                userName = ud.name || ud.displayName || 'Unknown User';
              }
            } catch {}
          }
          return { id: reviewDoc.id, ...data, userName };
        })
      );
      setFarmhouseReviews(reviewsData);
    } catch (err) {
      console.error('Error fetching reviews:', err);
      setFarmhouseReviews([]);
    } finally {
      setReviewsLoading(false);
    }
  };

  const handleApprove = async (farmhouseId: string | undefined) => {
    if (!farmhouseId) return;

    try {
      await updateDoc(doc(db, 'farmhouses', farmhouseId), {
        status: 'approved',
        approved_at: serverTimestamp(),
        approved_by: currentUser?.email || 'admin'
      });

      try {
        await addDoc(collection(db, 'audit_trail'), {
          action: 'farmhouse_approved',
          entity_type: 'farmhouse',
          entity_id: farmhouseId,
          performed_by: currentUser?.email || 'admin',
          timestamp: serverTimestamp()
        });
      } catch (auditError) {
        console.warn('Audit trail write failed (permission issue):', auditError);
      }

      fetchFarmhouses();
      showSuccess('Farmhouse approved');
    } catch (error) {
      console.error('Error approving farmhouse:', error);
      showError('Failed to approve farmhouse');
    }
  };

  const handleReject = async (farmhouseId: string | undefined) => {
    if (!farmhouseId) return;

    try {
      await updateDoc(doc(db, 'farmhouses', farmhouseId), {
        status: 'rejected',
        updated_at: serverTimestamp()
      });

      try {
        await addDoc(collection(db, 'audit_trail'), {
          action: 'farmhouse_rejected',
          entity_type: 'farmhouse',
          entity_id: farmhouseId,
          performed_by: currentUser?.email || 'admin',
          timestamp: serverTimestamp()
        });
      } catch (auditError) {
        console.warn('Audit trail write failed (permission issue):', auditError);
      }

      fetchFarmhouses();
      showSuccess('Farmhouse rejected');
    } catch (error) {
      console.error('Error rejecting farmhouse:', error);
      showError('Failed to reject farmhouse');
    }
  };

  const getName = (farmhouse: FarmhouseData) => {
    return farmhouse.basicDetails?.name || farmhouse.name || 'N/A';
  };

  const getLocation = (farmhouse: FarmhouseData) => {
    return farmhouse.basicDetails?.locationText || farmhouse.locationText || farmhouse.location || 'N/A';
  };

  const getAverageRate = (farmhouse: FarmhouseData) => {
    const p = farmhouse.pricing;
    if (p) {
      const prices = [
        Number(p.weeklyDay) || 0,
        Number(p.weeklyNight) || 0,
        Number(p.weekendDay) || 0,
        Number(p.weekendNight) || 0,
      ].filter(v => v > 0);
      if (prices.length > 0) {
        return Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
      }
    }
    return farmhouse.base_rate || farmhouse.baseRate || 0;
  };

  const getCommission = (farmhouse: FarmhouseData) => {
    return farmhouse.commission_percentage || farmhouse.commissionPercentage || 0;
  };

  const getMaxGuests = (farmhouse: FarmhouseData) => {
    return Number(farmhouse.basicDetails?.capacity) || farmhouse.max_guests || farmhouse.maxGuests || 0;
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
              label={`${farmhouses.length} total`}
              size='small'
              sx={{ backgroundColor: '#F3F4F6', color: '#6B7280', fontWeight: 600, fontSize: '0.75rem' }}
            />
            {filtered.length !== farmhouses.length && (
              <Chip
                label={`${filtered.length} shown`}
                size='small'
                sx={{ backgroundColor: '#EFF6FF', color: '#3B82F6', fontWeight: 600, fontSize: '0.75rem' }}
              />
            )}
          </Box>
          <Button
            variant='contained'
            startIcon={<Add />}
            onClick={handleOpenCreateDialog}
            sx={{
              textTransform: 'none', fontWeight: 600, borderRadius: 2, px: 3,
              background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
              boxShadow: 'none',
              '&:hover': { background: 'linear-gradient(135deg, #059669 0%, #047857 100%)', boxShadow: '0 4px 12px rgba(16,185,129,0.3)' },
            }}
          >
            Add Farmhouse
          </Button>
        </Box>

        <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'rgba(0,0,0,0.06)', borderRadius: 3, overflow: 'hidden', mb: 3 }}>
          <Box sx={{ p: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <TextField
              placeholder='Search farmhouses...'
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              size='small'
              sx={{
                flex: 1, minWidth: 200,
                '& .MuiOutlinedInput-root': { borderRadius: 2, backgroundColor: '#F9FAFB', '& fieldset': { borderColor: 'transparent' }, '&:hover fieldset': { borderColor: '#E5E7EB' }, '&.Mui-focused fieldset': { borderColor: '#10B981' } },
              }}
            />
            <FormControl size='small' sx={{ minWidth: 160 }}>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                displayEmpty
                sx={{ borderRadius: 2, backgroundColor: '#F9FAFB', '& fieldset': { borderColor: 'transparent' }, '&:hover fieldset': { borderColor: '#E5E7EB' }, '&.Mui-focused fieldset': { borderColor: '#10B981' } }}
              >
                <MenuItem value='all'>All Status</MenuItem>
                <MenuItem value='approved'>Approved ({farmhouses.filter(f => f.status === 'approved').length})</MenuItem>
                <MenuItem value='pending'>Pending ({farmhouses.filter(f => f.status === 'pending').length})</MenuItem>
                <MenuItem value='rejected'>Rejected ({farmhouses.filter(f => f.status === 'rejected').length})</MenuItem>
              </Select>
            </FormControl>
            <FormControl size='small' sx={{ minWidth: 140 }}>
              <Select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                displayEmpty
                sx={{ borderRadius: 2, backgroundColor: '#F9FAFB', '& fieldset': { borderColor: 'transparent' }, '&:hover fieldset': { borderColor: '#E5E7EB' }, '&.Mui-focused fieldset': { borderColor: '#10B981' } }}
              >
                <MenuItem value='all'>All Types</MenuItem>
                <MenuItem value='farmhouse'>Farmhouse ({farmhouses.filter(f => (f.propertyType || 'farmhouse') === 'farmhouse').length})</MenuItem>
                <MenuItem value='resort'>Resort ({farmhouses.filter(f => f.propertyType === 'resort').length})</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </Paper>

        {filtered.length === 0 ? (
          <EmptyState
            title={searchTerm || statusFilter !== 'all' || typeFilter !== 'all' ? 'No farmhouses match your filters' : 'No farmhouses yet'}
            description={farmhouses.length === 0 ? 'Farmhouses will appear here once owners list their properties' : 'Try adjusting your search or filters'}
            icon='search'
            actionLabel={farmhouses.length === 0 ? 'Create First Farmhouse' : undefined}
            onAction={farmhouses.length === 0 ? handleOpenCreateDialog : undefined}
          />
        ) : (
          <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'rgba(0,0,0,0.06)', borderRadius: 3 }}>
            <Table>
              <TableHead>
                <TableRow sx={{ '& th': { backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB', color: '#6B7280', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', py: 1.5 } }}>
                  <TableCell>Property</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Avg Rate</TableCell>
                  <TableCell>Commission</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Capacity</TableCell>
                  <TableCell align='center'>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.map((farmhouse) => (
                  <TableRow key={farmhouse.farmhouse_id} hover sx={{ '&:hover': { backgroundColor: '#FAFAFA' }, '& td': { borderBottom: '1px solid #F3F4F6', py: 1.5 } }}>
                    <TableCell>
                      <Box>
                        <Typography sx={{ fontWeight: 600, fontSize: '0.85rem', color: '#111827' }}>{getName(farmhouse)}</Typography>
                        <Typography sx={{ fontSize: '0.75rem', color: '#9CA3AF' }}>{getLocation(farmhouse)}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={farmhouse.propertyType === 'resort' ? 'Resort' : 'Farmhouse'}
                        size='small'
                        sx={{
                          backgroundColor: farmhouse.propertyType === 'resort' ? '#F3E8FF' : '#ECFDF5',
                          color: farmhouse.propertyType === 'resort' ? '#7C3AED' : '#059669',
                          fontWeight: 600, fontSize: '0.7rem', textTransform: 'capitalize',
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ fontSize: '0.9rem', fontWeight: 700, color: '#111827' }}>₹{getAverageRate(farmhouse).toLocaleString()}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ fontSize: '0.85rem', fontWeight: 500, color: '#6B7280' }}>{getCommission(farmhouse)}%</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={farmhouse.status || 'pending'}
                        size='small'
                        sx={{
                          backgroundColor: farmhouse.status === 'approved' ? '#ECFDF5' : farmhouse.status === 'rejected' ? '#FEF2F2' : '#FFFBEB',
                          color: farmhouse.status === 'approved' ? '#059669' : farmhouse.status === 'rejected' ? '#DC2626' : '#D97706',
                          fontWeight: 600, fontSize: '0.7rem', textTransform: 'capitalize',
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ fontSize: '0.85rem', color: '#6B7280' }}>{getMaxGuests(farmhouse)} guests</Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.25, justifyContent: 'center' }}>
                        <Tooltip title='View'>
                          <IconButton size='small' onClick={() => handleViewDetails(farmhouse)} sx={{ color: '#9CA3AF', '&:hover': { color: '#6B7280', backgroundColor: '#F3F4F6' } }}>
                            <Visibility sx={{ fontSize: 18 }} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title='Edit'>
                          <IconButton size='small' onClick={() => handleEdit(farmhouse)} sx={{ color: '#9CA3AF', '&:hover': { color: '#3B82F6', backgroundColor: '#EFF6FF' } }}>
                            <Edit sx={{ fontSize: 18 }} />
                          </IconButton>
                        </Tooltip>
                        {farmhouse.status === 'pending' && (
                          <>
                            <Tooltip title='Approve'>
                              <IconButton size='small' onClick={() => handleApprove(farmhouse.farmhouse_id)} sx={{ color: '#9CA3AF', '&:hover': { color: '#10B981', backgroundColor: '#ECFDF5' } }}>
                                <CheckCircle sx={{ fontSize: 18 }} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title='Reject'>
                              <IconButton size='small' onClick={() => handleReject(farmhouse.farmhouse_id)} sx={{ color: '#9CA3AF', '&:hover': { color: '#F59E0B', backgroundColor: '#FFFBEB' } }}>
                                <Cancel sx={{ fontSize: 18 }} />
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

      {/* Create Modal */}
      <Dialog open={createModalOpen} onClose={() => setCreateModalOpen(false)} maxWidth='md' fullWidth>
        <DialogTitle>
          <Typography variant='h6' fontWeight='bold'>
            Create New Farmhouse
          </Typography>
        </DialogTitle>
        <DialogContent dividers>
          <Alert severity='info' sx={{ mb: 3 }}>
            Create a new farmhouse listing. Owners can also submit farmhouses through the mobile app.
          </Alert>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label='Farmhouse Name *'
                value={createData.name}
                onChange={(e) => setCreateData({ ...createData, name: e.target.value })}
                placeholder='Enter farmhouse name'
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label='City *'
                value={createData.city}
                onChange={(e) => setCreateData({ ...createData, city: e.target.value })}
                placeholder='e.g., Hyderabad'
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label='Area *'
                value={createData.area}
                onChange={(e) => setCreateData({ ...createData, area: e.target.value })}
                placeholder='e.g., Shamshabad'
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label='Full Location *'
                value={createData.location}
                onChange={(e) => setCreateData({ ...createData, location: e.target.value })}
                placeholder='Complete address'
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label='Description'
                value={createData.description}
                onChange={(e) => setCreateData({ ...createData, description: e.target.value })}
                placeholder='Describe the farmhouse...'
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                type='number'
                label='Base Rate (₹) *'
                value={createData.base_rate}
                onChange={(e) => setCreateData({ ...createData, base_rate: Number(e.target.value) })}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                type='number'
                label='Commission (%) *'
                value={createData.commission_percentage}
                onChange={(e) => setCreateData({ ...createData, commission_percentage: Number(e.target.value) })}
                inputProps={{ min: 0, max: 100 }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                type='number'
                label='Max Guests *'
                value={createData.max_guests}
                onChange={(e) => setCreateData({ ...createData, max_guests: Number(e.target.value) })}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                type='number'
                label='Bedrooms *'
                value={createData.bedrooms}
                onChange={(e) => setCreateData({ ...createData, bedrooms: Number(e.target.value) })}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={createData.status}
                  onChange={(e) => setCreateData({ ...createData, status: e.target.value })}
                >
                  <MenuItem value='approved'>Approved</MenuItem>
                  <MenuItem value='pending'>Pending</MenuItem>
                  <MenuItem value='rejected'>Rejected</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateModalOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button
            onClick={handleCreateFarmhouse}
            variant='contained'
            disabled={saving}
          >
            {saving ? 'Creating...' : 'Create Farmhouse'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Details Modal - Enhanced */}
      <Dialog
        open={detailsModalOpen}
        onClose={() => setDetailsModalOpen(false)}
        maxWidth='lg'
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant='h6' fontWeight='bold'>
            Farmhouse Details
          </Typography>
          <IconButton onClick={() => setDetailsModalOpen(false)} size='small'>
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {selectedFarmhouse && (
            <Box>
              <Tabs value={detailsTab} onChange={(_, v) => setDetailsTab(v)} sx={{ mb: 3 }}>
                <Tab label='Property Info' />
                <Tab label='Images' />
                <Tab label='Pricing' />
                <Tab label='Amenities & Rules' />
                <Tab label='KYC & Bank' />
                <Tab label={`Reviews (${farmhouseReviews.length})`} />
              </Tabs>

              {detailsTab === 0 && (
                <Box>
                  {/* Name and Location with Google Maps */}
                  <Paper sx={{ p: 3, mb: 2, bgcolor: 'grey.50' }}>
                    <Typography variant='h5' fontWeight='bold' gutterBottom>
                      {getName(selectedFarmhouse)}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2, mb: 2 }}>
                      <Typography variant='body1' color='text.secondary'>
                        {getLocation(selectedFarmhouse)}
                      </Typography>
                      {(selectedFarmhouse.basicDetails?.mapLink || getLocation(selectedFarmhouse) !== 'N/A') && (
                        <Button
                          variant='contained'
                          color='primary'
                          startIcon={<Map />}
                          href={selectedFarmhouse.basicDetails?.mapLink || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(getLocation(selectedFarmhouse))}`}
                          target='_blank'
                          size='small'
                        >
                          View on Google Maps
                        </Button>
                      )}
                    </Box>
                    <Chip
                      label={selectedFarmhouse.status || 'pending'}
                      color={
                        selectedFarmhouse.status === 'approved' ? 'success' :
                        selectedFarmhouse.status === 'rejected' ? 'error' :
                        'warning'
                      }
                      size='small'
                    />
                  </Paper>

                  {/* Description */}
                  <Paper sx={{ p: 3, mb: 2 }}>
                    <Typography variant='subtitle1' fontWeight='bold' gutterBottom>Description</Typography>
                    <Typography variant='body1'>
                      {selectedFarmhouse.basicDetails?.description || selectedFarmhouse.description || 'No description provided'}
                    </Typography>
                  </Paper>

                  {/* Property Details Grid */}
                  <Grid container spacing={2} sx={{ mb: 2 }}>
                    <Grid size={{ xs: 6, sm: 3 }}>
                      <Paper sx={{ p: 2, textAlign: 'center', height: '100%' }}>
                        <Group color='primary' sx={{ fontSize: 32, mb: 1 }} />
                        <Typography variant='h6' fontWeight='bold'>
                          {selectedFarmhouse.basicDetails?.capacity || getMaxGuests(selectedFarmhouse) || 'N/A'}
                        </Typography>
                        <Typography variant='caption' color='text.secondary'>Max Guests</Typography>
                      </Paper>
                    </Grid>
                    <Grid size={{ xs: 6, sm: 3 }}>
                      <Paper sx={{ p: 2, textAlign: 'center', height: '100%' }}>
                        <KingBed color='primary' sx={{ fontSize: 32, mb: 1 }} />
                        <Typography variant='h6' fontWeight='bold'>
                          {selectedFarmhouse.basicDetails?.bedrooms || 'N/A'}
                        </Typography>
                        <Typography variant='caption' color='text.secondary'>Bedrooms</Typography>
                      </Paper>
                    </Grid>
                    <Grid size={{ xs: 6, sm: 3 }}>
                      <Paper sx={{ p: 2, textAlign: 'center', height: '100%' }}>
                        <AttachMoney color='success' sx={{ fontSize: 32, mb: 1 }} />
                        <Typography variant='h6' fontWeight='bold'>
                          {getCommission(selectedFarmhouse)}%
                        </Typography>
                        <Typography variant='caption' color='text.secondary'>Commission</Typography>
                      </Paper>
                    </Grid>
                  </Grid>

                  {/* Contact Information */}
                  {(selectedFarmhouse.basicDetails?.contactPhone1 || selectedFarmhouse.basicDetails?.contactPhone2) && (
                    <Paper sx={{ p: 3, mb: 2 }}>
                      <Typography variant='subtitle1' fontWeight='bold' gutterBottom>
                        <Phone sx={{ verticalAlign: 'middle', mr: 1 }} />
                        Contact Numbers
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                        {selectedFarmhouse.basicDetails?.contactPhone1 && (
                          <Typography variant='body1'>
                            Primary: <strong>{selectedFarmhouse.basicDetails.contactPhone1}</strong>
                          </Typography>
                        )}
                        {selectedFarmhouse.basicDetails?.contactPhone2 && (
                          <Typography variant='body1'>
                            Secondary: <strong>{selectedFarmhouse.basicDetails.contactPhone2}</strong>
                          </Typography>
                        )}
                      </Box>
                    </Paper>
                  )}

                  {/* Meta Info */}
                  <Paper sx={{ p: 3 }}>
                    <Typography variant='subtitle1' fontWeight='bold' gutterBottom>Additional Info</Typography>
                    <Grid container spacing={2}>
                      <Grid size={{ xs: 6 }}>
                        <Typography variant='body2' color='text.secondary'>City</Typography>
                        <Typography variant='body1' fontWeight='500'>
                          {selectedFarmhouse.basicDetails?.city || 'N/A'}
                        </Typography>
                      </Grid>
                      <Grid size={{ xs: 6 }}>
                        <Typography variant='body2' color='text.secondary'>Area</Typography>
                        <Typography variant='body1' fontWeight='500'>
                          {selectedFarmhouse.basicDetails?.area || 'N/A'}
                        </Typography>
                      </Grid>
                      <Grid size={{ xs: 6 }}>
                        <Typography variant='body2' color='text.secondary'>Registered On</Typography>
                        <Typography variant='body1' fontWeight='500'>
                          {(() => {
                            const ts = selectedFarmhouse.created_at || selectedFarmhouse.createdAt;
                            if (!ts) return 'N/A';
                            try {
                              const d = ts.toDate ? ts.toDate() : new Date(ts);
                              return d.toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
                            } catch { return 'N/A'; }
                          })()}
                        </Typography>
                      </Grid>
                      <Grid size={{ xs: 6 }}>
                        <Typography variant='body2' color='text.secondary'>
                          {selectedFarmhouse.status === 'approved' ? 'Approved On' : selectedFarmhouse.status === 'rejected' ? 'Rejected On' : 'Approval Status'}
                        </Typography>
                        <Typography variant='body1' fontWeight='500'>
                          {(() => {
                            const ts = (selectedFarmhouse as any).approved_at || (selectedFarmhouse as any).rejected_at;
                            if (!ts) return selectedFarmhouse.status || 'N/A';
                            try {
                              const d = ts.toDate ? ts.toDate() : new Date(ts);
                              return d.toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
                            } catch { return 'N/A'; }
                          })()}
                        </Typography>
                      </Grid>
                      <Grid size={{ xs: 12 }}>
                        <Typography variant='body2' color='text.secondary'>Farmhouse ID</Typography>
                        <Typography variant='body1' fontFamily='monospace' fontSize='0.875rem'>
                          {selectedFarmhouse.farmhouse_id}
                        </Typography>
                      </Grid>
                    </Grid>
                  </Paper>
                </Box>
              )}

              {detailsTab === 1 && (
                <Box>
                  {(() => {
                    const images = selectedFarmhouse.photoUrls || selectedFarmhouse.images || [];
                    return images.length > 0 ? (
                      <Grid container spacing={2}>
                        {images.map((img, idx) => (
                          <Grid size={{ xs: 6, md: 4 }} key={idx}>
                            <Paper sx={{ p: 1, overflow: 'hidden', cursor: 'pointer', '&:hover': { boxShadow: 4 }, transition: 'box-shadow 0.2s' }}>
                              <img
                                src={img}
                                alt={`Farmhouse ${idx + 1}`}
                                style={{ width: '100%', height: 'auto', maxHeight: 400, objectFit: 'contain', borderRadius: 4, display: 'block' }}
                                onClick={() => window.open(img, '_blank')}
                              />
                            </Paper>
                            <Typography variant='caption' color='text.secondary' sx={{ display: 'block', textAlign: 'center', mt: 0.5 }}>
                              Image {idx + 1}
                            </Typography>
                          </Grid>
                        ))}
                      </Grid>
                    ) : (
                      <Box sx={{ textAlign: 'center', py: 6 }}>
                        <ImageIcon sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
                        <Typography color='text.secondary' variant='h6'>No images uploaded</Typography>
                        <Typography color='text.secondary' variant='body2'>
                          Images will appear here once the owner uploads them
                        </Typography>
                      </Box>
                    );
                  })()}
                </Box>
              )}

              {detailsTab === 2 && (
                <Box>
                  {selectedFarmhouse.pricing ? (
                    <>
                      <Grid container spacing={2}>
                        <Grid size={{ xs: 12, md: 4 }}>
                          <Paper sx={{ p: 3, bgcolor: 'primary.50', border: '1px solid', borderColor: 'primary.light' }}>
                            <Typography variant='subtitle1' fontWeight='bold' color='primary.dark' gutterBottom>
                              Weekend Pricing
                            </Typography>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                              <Typography variant='body2'>Day:</Typography>
                              <Typography variant='body1' fontWeight='bold'>₹{selectedFarmhouse.pricing.weekendDay || 'N/A'}</Typography>
                            </Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                              <Typography variant='body2'>Night:</Typography>
                              <Typography variant='body1' fontWeight='bold'>₹{selectedFarmhouse.pricing.weekendNight || 'N/A'}</Typography>
                            </Box>
                          </Paper>
                        </Grid>
                        <Grid size={{ xs: 12, md: 4 }}>
                          <Paper sx={{ p: 3, bgcolor: 'success.50', border: '1px solid', borderColor: 'success.light' }}>
                            <Typography variant='subtitle1' fontWeight='bold' color='success.dark' gutterBottom>
                              Weekday Pricing
                            </Typography>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                              <Typography variant='body2'>Day:</Typography>
                              <Typography variant='body1' fontWeight='bold'>₹{selectedFarmhouse.pricing.weeklyDay || 'N/A'}</Typography>
                            </Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                              <Typography variant='body2'>Night:</Typography>
                              <Typography variant='body1' fontWeight='bold'>₹{selectedFarmhouse.pricing.weeklyNight || 'N/A'}</Typography>
                            </Box>
                          </Paper>
                        </Grid>
                        </Grid>

                      {/* Custom/Special Day Pricing List */}
                      {selectedFarmhouse.pricing.customPricing && selectedFarmhouse.pricing.customPricing.length > 0 && (
                        <Paper sx={{ p: 3, mt: 2, border: '1px solid', borderColor: 'divider' }}>
                          <Typography variant='subtitle1' fontWeight='bold' gutterBottom>
                            Special Day Pricing
                          </Typography>
                          <TableContainer>
                            <Table size='small'>
                              <TableHead>
                                <TableRow sx={{ '& th': { fontWeight: 600, color: '#6B7280', fontSize: '0.75rem', textTransform: 'uppercase' } }}>
                                  <TableCell>Occasion</TableCell>
                                  <TableCell>Date</TableCell>
                                  <TableCell align='right'>Price</TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {selectedFarmhouse.pricing.customPricing.map((cp, idx) => (
                                  <TableRow key={idx}>
                                    <TableCell>
                                      <Typography variant='body2' fontWeight={500}>{cp.name || 'Special Day'}</Typography>
                                    </TableCell>
                                    <TableCell>
                                      <Typography variant='body2' color='text.secondary'>
                                        {cp.date || (cp.startDate && cp.endDate ? `${cp.startDate} — ${cp.endDate}` : 'N/A')}
                                      </Typography>
                                    </TableCell>
                                    <TableCell align='right'>
                                      <Typography variant='body2' fontWeight='bold'>₹{cp.dayPrice || cp.nightPrice || 'N/A'}</Typography>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </TableContainer>
                        </Paper>
                      )}
                    </>
                  ) : (
                    <Box sx={{ textAlign: 'center', py: 6 }}>
                      <AttachMoney sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
                      <Typography color='text.secondary' variant='h6'>No pricing details available</Typography>
                      <Typography color='text.secondary' variant='body2'>
                        Avg rate: ₹{getAverageRate(selectedFarmhouse).toLocaleString()}/night
                      </Typography>
                    </Box>
                  )}
                </Box>
              )}

              {detailsTab === 3 && (
                <Box>
                  <Grid container spacing={3}>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <Paper sx={{ p: 3, height: '100%' }}>
                        <Typography variant='subtitle1' fontWeight='bold' gutterBottom>Amenities</Typography>
                        {(() => {
                          const amenities = selectedFarmhouse.amenities;
                          if (!amenities) {
                            return <Typography color='text.secondary'>No amenities listed</Typography>;
                          }
                          // Handle both array and object format
                          if (Array.isArray(amenities)) {
                            return amenities.length > 0 ? (
                              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                {amenities.map((amenity, idx) => (
                                  <Chip key={idx} label={amenity} color='primary' variant='outlined' />
                                ))}
                              </Box>
                            ) : (
                              <Typography color='text.secondary'>No amenities listed</Typography>
                            );
                          } else {
                            // Object format from mobile app
                            const activeAmenities = Object.entries(amenities).filter(([_, v]) => v === true);
                            return activeAmenities.length > 0 ? (
                              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                {activeAmenities.map(([key], idx) => (
                                  <Chip key={idx} label={key.replace(/([A-Z])/g, ' $1').trim()} color='primary' variant='outlined' />
                                ))}
                              </Box>
                            ) : (
                              <Typography color='text.secondary'>No amenities listed</Typography>
                            );
                          }
                        })()}
                      </Paper>
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <Paper sx={{ p: 3, height: '100%' }}>
                        <Typography variant='subtitle1' fontWeight='bold' gutterBottom>House Rules</Typography>
                        {selectedFarmhouse.rules && selectedFarmhouse.rules.length > 0 ? (
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                            {selectedFarmhouse.rules.map((rule, idx) => (
                              <Chip key={idx} label={rule} variant='outlined' />
                            ))}
                          </Box>
                        ) : (
                          <Typography color='text.secondary'>No rules specified</Typography>
                        )}
                      </Paper>
                    </Grid>
                  </Grid>
                </Box>
              )}

              {detailsTab === 4 && (
                <Box>
                  {selectedFarmhouse.kyc ? (
                    <Grid container spacing={3}>
                      {/* Person 1 Details */}
                      <Grid size={{ xs: 12, md: 6 }}>
                        <Paper sx={{ p: 3, height: '100%' }}>
                          <Typography variant='subtitle1' fontWeight='bold' gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Badge color='primary' /> Person 1
                          </Typography>
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                            <Box>
                              <Typography variant='caption' color='text.secondary'>Name</Typography>
                              <Typography variant='body1' fontWeight={500}>{selectedFarmhouse.kyc.person1?.name || 'N/A'}</Typography>
                            </Box>
                            <Box>
                              <Typography variant='caption' color='text.secondary'>Phone</Typography>
                              <Typography variant='body1' fontWeight={500}>{selectedFarmhouse.kyc.person1?.phone || 'N/A'}</Typography>
                            </Box>
                          </Box>
                        </Paper>
                      </Grid>

                      {/* Person 2 Details */}
                      <Grid size={{ xs: 12, md: 6 }}>
                        <Paper sx={{ p: 3, height: '100%' }}>
                          <Typography variant='subtitle1' fontWeight='bold' gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Badge color='primary' /> Person 2
                          </Typography>
                          {selectedFarmhouse.kyc.person2?.name ? (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                              <Box>
                                <Typography variant='caption' color='text.secondary'>Name</Typography>
                                <Typography variant='body1' fontWeight={500}>{selectedFarmhouse.kyc.person2.name}</Typography>
                              </Box>
                              <Box>
                                <Typography variant='caption' color='text.secondary'>Phone</Typography>
                                <Typography variant='body1' fontWeight={500}>{selectedFarmhouse.kyc.person2.phone || 'N/A'}</Typography>
                              </Box>
                            </Box>
                          ) : (
                            <Typography color='text.secondary'>No second person details provided</Typography>
                          )}
                        </Paper>
                      </Grid>

                      {/* PAN & Documents */}
                      <Grid size={{ xs: 12, md: 6 }}>
                        <Paper sx={{ p: 3, height: '100%' }}>
                          <Typography variant='subtitle1' fontWeight='bold' gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Badge color='secondary' /> PAN & Documents
                          </Typography>
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                            <Box>
                              <Typography variant='caption' color='text.secondary'>PAN Number</Typography>
                              <Typography variant='body1' fontWeight={500}>{selectedFarmhouse.kyc.panNumber || 'N/A'}</Typography>
                            </Box>
                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                              {selectedFarmhouse.kyc.companyPANUrl && (
                                <Button variant='outlined' size='small' href={selectedFarmhouse.kyc.companyPANUrl} target='_blank' startIcon={<Visibility />}>
                                  View PAN Card
                                </Button>
                              )}
                              {selectedFarmhouse.kyc.labourDocUrl && (
                                <Button variant='outlined' size='small' href={selectedFarmhouse.kyc.labourDocUrl} target='_blank' startIcon={<Visibility />}>
                                  Labour Licence
                                </Button>
                              )}
                            </Box>
                          </Box>
                        </Paper>
                      </Grid>

                      {/* Bank Details */}
                      <Grid size={{ xs: 12, md: 6 }}>
                        <Paper sx={{ p: 3, height: '100%' }}>
                          <Typography variant='subtitle1' fontWeight='bold' gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <AccountBalance color='primary' /> Bank Details
                          </Typography>
                          {selectedFarmhouse.kyc.bankDetails ? (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                              <Box>
                                <Typography variant='caption' color='text.secondary'>Account Holder</Typography>
                                <Typography variant='body1' fontWeight={500}>{selectedFarmhouse.kyc.bankDetails.accountHolderName || 'N/A'}</Typography>
                              </Box>
                              <Box>
                                <Typography variant='caption' color='text.secondary'>Account Number</Typography>
                                <Typography variant='body1' fontWeight={500}>
                                  {tryDecrypt(selectedFarmhouse.kyc.bankDetails.accountNumber, selectedFarmhouse.owner_id || selectedFarmhouse.ownerId || '')}
                                </Typography>
                              </Box>
                              <Box>
                                <Typography variant='caption' color='text.secondary'>IFSC Code</Typography>
                                <Typography variant='body1' fontWeight={500}>
                                  {tryDecrypt(selectedFarmhouse.kyc.bankDetails.ifscCode, selectedFarmhouse.owner_id || selectedFarmhouse.ownerId || '')}
                                </Typography>
                              </Box>
                              <Box>
                                <Typography variant='caption' color='text.secondary'>Branch</Typography>
                                <Typography variant='body1' fontWeight={500}>{selectedFarmhouse.kyc.bankDetails.branchName || 'N/A'}</Typography>
                              </Box>
                            </Box>
                          ) : (
                            <Typography color='text.secondary'>No bank details available</Typography>
                          )}
                        </Paper>
                      </Grid>
                    </Grid>
                  ) : (
                    <Box sx={{ textAlign: 'center', py: 6 }}>
                      <Badge sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
                      <Typography color='text.secondary' variant='h6'>No KYC details available</Typography>
                      <Typography color='text.secondary' variant='body2'>
                        KYC information will appear here once the owner submits it
                      </Typography>
                    </Box>
                  )}
                </Box>
              )}

              {detailsTab === 5 && (
                <Box>
                  {reviewsLoading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                      <CircularProgress size={36} sx={{ color: '#10B981' }} />
                    </Box>
                  ) : farmhouseReviews.length === 0 ? (
                    <Box sx={{ textAlign: 'center', py: 6 }}>
                      <PersonOutline sx={{ fontSize: 64, color: '#E5E7EB', mb: 2 }} />
                      <Typography color='text.secondary' variant='h6'>No reviews yet</Typography>
                      <Typography color='text.secondary' variant='body2'>Reviews will appear once users rate this farmhouse</Typography>
                    </Box>
                  ) : (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {farmhouseReviews.map((review) => (
                        <Paper key={review.id} sx={{ p: 2.5, border: '1px solid #F3F4F6' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                            <Box sx={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0 }}>
                              <PersonOutline sx={{ fontSize: 18 }} />
                            </Box>
                            <Box sx={{ flex: 1 }}>
                              <Typography sx={{ fontWeight: 600, fontSize: '0.85rem' }}>{review.userName || 'Anonymous'}</Typography>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <Rating value={review.rating} readOnly size='small' sx={{ '& .MuiRating-iconFilled': { color: '#F59E0B' } }} />
                                <Typography sx={{ fontSize: '0.75rem', color: '#9CA3AF', ml: 0.5 }}>{review.rating}/5</Typography>
                              </Box>
                            </Box>
                            <Typography sx={{ fontSize: '0.75rem', color: '#9CA3AF' }}>
                              {(() => {
                                const ts = review.createdAt || review.created_at;
                                if (!ts) return '';
                                try { const d = ts.toDate ? ts.toDate() : new Date(ts); return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); } catch { return ''; }
                              })()}
                            </Typography>
                          </Box>
                          {review.comment && (
                            <Typography sx={{ fontSize: '0.875rem', color: '#374151' }}>{review.comment}</Typography>
                          )}
                        </Paper>
                      ))}
                    </Box>
                  )}
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsModalOpen(false)} variant='outlined'>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={editModalOpen} onClose={() => setEditModalOpen(false)} maxWidth='sm' fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant='h6' fontWeight='bold'>
            Edit Farmhouse
          </Typography>
          <IconButton onClick={() => setEditModalOpen(false)} size='small'>
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              fullWidth
              type='number'
              label='Commission Percentage (%)'
              value={editData.commission_percentage}
              onChange={(e) => setEditData({ ...editData, commission_percentage: Number(e.target.value) })}
              inputProps={{ min: 0, max: 100 }}
            />
            <FormControl fullWidth>
              <InputLabel id='edit-status-label'>Status</InputLabel>
              <Select
                labelId='edit-status-label'
                label='Status'
                value={editData.status}
                onChange={(e) => setEditData({ ...editData, status: e.target.value })}
              >
                <MenuItem value='approved'>Approved</MenuItem>
                <MenuItem value='pending'>Pending</MenuItem>
                <MenuItem value='rejected'>Rejected</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditModalOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSaveEdit} variant='contained' disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>

    </MainLayout>
  );
};

export default AllFarmhouses;
