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
  DialogContentText
} from '@mui/material';
import {
  Visibility,
  Edit,
  Delete,
  CheckCircle,
  Cancel,
  Image as ImageIcon,
  Add,
  Map,
  Phone,
  KingBed,
  Group,
  AttachMoney
} from '@mui/icons-material';
import { collection, getDocs, doc, updateDoc, deleteDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useSnackbar } from '../../context/SnackbarContext';
import { useAuth } from '../../context/AuthContext';
import MainLayout from '../../components/layout/MainLayout';
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
  max_guests?: number;
  maxGuests?: number;
  images?: string[];
  owner_id?: string;
  ownerId?: string;
  created_at?: any;
  createdAt?: any;
}

const AllFarmhouses: React.FC = () => {
  const { showSuccess, showError } = useSnackbar();
  const { currentUser } = useAuth();
  const [farmhouses, setFarmhouses] = useState<FarmhouseData[]>([]);
  const [filtered, setFiltered] = useState<FarmhouseData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedFarmhouse, setSelectedFarmhouse] = useState<FarmhouseData | null>(null);
  const [detailsTab, setDetailsTab] = useState(0);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [farmhouseToDelete, setFarmhouseToDelete] = useState<FarmhouseData | null>(null);
  const [editData, setEditData] = useState({
    base_rate: 0,
    commission_percentage: 0,
    max_guests: 0,
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

    setFiltered(result);
  }, [farmhouses, searchTerm, statusFilter]);

  useEffect(() => {
    filterFarmhouses();
  }, [filterFarmhouses]);

  const handleViewDetails = (farmhouse: FarmhouseData) => {
    setSelectedFarmhouse(farmhouse);
    setDetailsModalOpen(true);
    setDetailsTab(0);
  };

  const handleEdit = (farmhouse: FarmhouseData) => {
    setSelectedFarmhouse(farmhouse);
    setEditData({
      base_rate: farmhouse.base_rate || farmhouse.baseRate || 0,
      commission_percentage: farmhouse.commission_percentage || farmhouse.commissionPercentage || 0,
      max_guests: farmhouse.max_guests || farmhouse.maxGuests || 0,
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
        base_rate: editData.base_rate,
        baseRate: editData.base_rate,
        commission_percentage: editData.commission_percentage,
        commissionPercentage: editData.commission_percentage,
        max_guests: editData.max_guests,
        maxGuests: editData.max_guests,
        status: editData.status,
        updated_at: serverTimestamp()
      });

      // Add audit trail
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

      setEditModalOpen(false);
      fetchFarmhouses();
      showSuccess('Farmhouse updated successfully');
    } catch (error) {
      console.error('Error updating farmhouse:', error);
      showError('Failed to update farmhouse');
    } finally {
      setSaving(false);
    }
  };

  const handleOpenDeleteDialog = (farmhouse: FarmhouseData) => {
    setFarmhouseToDelete(farmhouse);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!farmhouseToDelete?.farmhouse_id) return;

    try {
      await deleteDoc(doc(db, 'farmhouses', farmhouseToDelete.farmhouse_id));

      // Add audit trail
      await addDoc(collection(db, 'audit_trail'), {
        action: 'farmhouse_deleted',
        entity_type: 'farmhouse',
        entity_id: farmhouseToDelete.farmhouse_id,
        performed_by: currentUser?.email || 'admin',
        details: {
          farmhouse_name: getName(farmhouseToDelete),
          location: getLocation(farmhouseToDelete)
        },
        timestamp: serverTimestamp()
      });

      fetchFarmhouses();
      setDeleteDialogOpen(false);
      setFarmhouseToDelete(null);
      showSuccess('Farmhouse deleted successfully');
    } catch (error) {
      console.error('Error deleting farmhouse:', error);
      showError('Failed to delete farmhouse');
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

      // Add audit trail
      await addDoc(collection(db, 'audit_trail'), {
        action: 'farmhouse_approved',
        entity_type: 'farmhouse',
        entity_id: farmhouseId,
        performed_by: currentUser?.email || 'admin',
        timestamp: serverTimestamp()
      });

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

      // Add audit trail
      await addDoc(collection(db, 'audit_trail'), {
        action: 'farmhouse_rejected',
        entity_type: 'farmhouse',
        entity_id: farmhouseId,
        performed_by: currentUser?.email || 'admin',
        timestamp: serverTimestamp()
      });

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

  const getBaseRate = (farmhouse: FarmhouseData) => {
    return farmhouse.base_rate || farmhouse.baseRate || 0;
  };

  const getCommission = (farmhouse: FarmhouseData) => {
    return farmhouse.commission_percentage || farmhouse.commissionPercentage || 0;
  };

  const getMaxGuests = (farmhouse: FarmhouseData) => {
    return farmhouse.max_guests || farmhouse.maxGuests || 0;
  };

  if (loading) {
    return (
      <MainLayout>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '70vh' }}>
          <Box sx={{ textAlign: 'center' }}>
            <CircularProgress size={60} />
            <Typography sx={{ mt: 2 }}>Loading farmhouses...</Typography>
          </Box>
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
              All Farmhouses
            </Typography>
            <Typography variant='body2' color='text.secondary'>
              Total: {farmhouses.length} | Showing: {filtered.length}
            </Typography>
          </Box>
          <Button
            variant='contained'
            startIcon={<Add />}
            onClick={handleOpenCreateDialog}
            size='large'
          >
            Add Farmhouse
          </Button>
        </Box>

        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              fullWidth
              placeholder='Search by name or location...'
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 3 }}>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <MenuItem value='all'>All ({farmhouses.length})</MenuItem>
                <MenuItem value='approved'>Approved ({farmhouses.filter(f => f.status === 'approved').length})</MenuItem>
                <MenuItem value='pending'>Pending ({farmhouses.filter(f => f.status === 'pending').length})</MenuItem>
                <MenuItem value='rejected'>Rejected ({farmhouses.filter(f => f.status === 'rejected').length})</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>

        {filtered.length === 0 ? (
          <EmptyState
            title={searchTerm || statusFilter !== 'all' ? 'No farmhouses match your filters' : 'No farmhouses yet'}
            description={farmhouses.length === 0 ? 'Farmhouses will appear here once owners list their properties' : 'Try adjusting your search or filters'}
            icon='search'
            actionLabel={farmhouses.length === 0 ? 'Create First Farmhouse' : undefined}
            onAction={farmhouses.length === 0 ? handleOpenCreateDialog : undefined}
          />
        ) : (
          <TableContainer component={Paper} elevation={2}>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                  <TableCell><strong>Name</strong></TableCell>
                  <TableCell><strong>Location</strong></TableCell>
                  <TableCell><strong>Base Rate</strong></TableCell>
                  <TableCell><strong>Commission %</strong></TableCell>
                  <TableCell><strong>Status</strong></TableCell>
                  <TableCell><strong>Max Guests</strong></TableCell>
                  <TableCell align='center'><strong>Actions</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.map((farmhouse) => (
                  <TableRow key={farmhouse.farmhouse_id} hover>
                    <TableCell>
                      <Typography fontWeight='bold'>{getName(farmhouse)}</Typography>
                    </TableCell>
                    <TableCell>{getLocation(farmhouse)}</TableCell>
                    <TableCell>₹{getBaseRate(farmhouse).toLocaleString()}</TableCell>
                    <TableCell>{getCommission(farmhouse)}%</TableCell>
                    <TableCell>
                      <Chip
                        label={farmhouse.status || 'pending'}
                        color={
                          farmhouse.status === 'approved' ? 'success' :
                          farmhouse.status === 'rejected' ? 'error' :
                          'warning'
                        }
                        size='small'
                      />
                    </TableCell>
                    <TableCell>{getMaxGuests(farmhouse)}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                        <Tooltip title='View Details'>
                          <IconButton
                            size='small'
                            onClick={() => handleViewDetails(farmhouse)}
                          >
                            <Visibility fontSize='small' />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title='Edit'>
                          <IconButton
                            size='small'
                            color='primary'
                            onClick={() => handleEdit(farmhouse)}
                          >
                            <Edit fontSize='small' />
                          </IconButton>
                        </Tooltip>
                        {farmhouse.status === 'pending' && (
                          <>
                            <Tooltip title='Approve'>
                              <IconButton
                                size='small'
                                color='success'
                                onClick={() => handleApprove(farmhouse.farmhouse_id)}
                              >
                                <CheckCircle fontSize='small' />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title='Reject'>
                              <IconButton
                                size='small'
                                color='warning'
                                onClick={() => handleReject(farmhouse.farmhouse_id)}
                              >
                                <Cancel fontSize='small' />
                              </IconButton>
                            </Tooltip>
                          </>
                        )}
                        <Tooltip title='Delete'>
                          <IconButton
                            size='small'
                            color='error'
                            onClick={() => handleOpenDeleteDialog(farmhouse)}
                          >
                            <Delete fontSize='small' />
                          </IconButton>
                        </Tooltip>
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
        <DialogTitle>
          <Typography variant='h6' fontWeight='bold'>
            Farmhouse Details
          </Typography>
        </DialogTitle>
        <DialogContent>
          {selectedFarmhouse && (
            <Box>
              <Tabs value={detailsTab} onChange={(_, v) => setDetailsTab(v)} sx={{ mb: 3 }}>
                <Tab label='Property Info' />
                <Tab label='Images' />
                <Tab label='Pricing' />
                <Tab label='Amenities & Rules' />
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
                    <Grid size={{ xs: 6, sm: 3 }}>
                      <Paper sx={{ p: 2, textAlign: 'center', height: '100%' }}>
                        <AttachMoney color='primary' sx={{ fontSize: 32, mb: 1 }} />
                        <Typography variant='h6' fontWeight='bold'>
                          ₹{getBaseRate(selectedFarmhouse).toLocaleString()}
                        </Typography>
                        <Typography variant='caption' color='text.secondary'>Base Rate/Night</Typography>
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
                            <Paper sx={{ p: 1, height: 220, overflow: 'hidden', cursor: 'pointer' }}>
                              <img
                                src={img}
                                alt={`Farmhouse ${idx + 1}`}
                                style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 4 }}
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
                      <Grid size={{ xs: 12, md: 4 }}>
                        <Paper sx={{ p: 3, bgcolor: 'warning.50', border: '1px solid', borderColor: 'warning.light' }}>
                          <Typography variant='subtitle1' fontWeight='bold' color='warning.dark' gutterBottom>
                            Occasional/Holiday
                          </Typography>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                            <Typography variant='body2'>Day:</Typography>
                            <Typography variant='body1' fontWeight='bold'>₹{selectedFarmhouse.pricing.occasionalDay || 'N/A'}</Typography>
                          </Box>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant='body2'>Night:</Typography>
                            <Typography variant='body1' fontWeight='bold'>₹{selectedFarmhouse.pricing.occasionalNight || 'N/A'}</Typography>
                          </Box>
                        </Paper>
                      </Grid>
                    </Grid>
                  ) : (
                    <Box sx={{ textAlign: 'center', py: 6 }}>
                      <AttachMoney sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
                      <Typography color='text.secondary' variant='h6'>No pricing details available</Typography>
                      <Typography color='text.secondary' variant='body2'>
                        Base rate: ₹{getBaseRate(selectedFarmhouse).toLocaleString()}/night
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
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsModalOpen(false)} variant='outlined'>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={editModalOpen} onClose={() => setEditModalOpen(false)} maxWidth='sm' fullWidth>
        <DialogTitle>
          <Typography variant='h6' fontWeight='bold'>
            Edit Farmhouse
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              fullWidth
              type='number'
              label='Base Rate (₹)'
              value={editData.base_rate}
              onChange={(e) => setEditData({ ...editData, base_rate: Number(e.target.value) })}
            />
            <TextField
              fullWidth
              type='number'
              label='Commission Percentage (%)'
              value={editData.commission_percentage}
              onChange={(e) => setEditData({ ...editData, commission_percentage: Number(e.target.value) })}
              inputProps={{ min: 0, max: 100 }}
            />
            <TextField
              fullWidth
              type='number'
              label='Max Guests'
              value={editData.max_guests}
              onChange={(e) => setEditData({ ...editData, max_guests: Number(e.target.value) })}
            />
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
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

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Farmhouse</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete <strong>{farmhouseToDelete && getName(farmhouseToDelete)}</strong>?
            This action cannot be undone.
            <br /><br />
            <Alert severity='warning'>
              Deleting a farmhouse will remove all associated data including bookings history.
            </Alert>
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDelete} color='error' variant='contained'>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </MainLayout>
  );
};

export default AllFarmhouses;
