import React, { useState, useEffect } from 'react';
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
  Divider,
  Avatar
} from '@mui/material';
import { 
  Visibility, 
  Edit, 
  Delete,
  CheckCircle,
  Cancel,
  Image as ImageIcon
} from '@mui/icons-material';
import { collection, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import MainLayout from '../../components/layout/MainLayout';

interface FarmhouseData {
  farmhouse_id?: string;
  basicDetails?: {
    name?: string;
    locationText?: string;
    description?: string;
  };
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
  amenities?: string[];
  owner_id?: string;
  ownerId?: string;
  created_at?: any;
  createdAt?: any;
}

const AllFarmhouses: React.FC = () => {
  const [farmhouses, setFarmhouses] = useState<FarmhouseData[]>([]);
  const [filtered, setFiltered] = useState<FarmhouseData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedFarmhouse, setSelectedFarmhouse] = useState<FarmhouseData | null>(null);
  const [detailsTab, setDetailsTab] = useState(0);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editData, setEditData] = useState({
    base_rate: 0,
    commission_percentage: 0,
    max_guests: 0,
    status: 'approved'
  });

  useEffect(() => {
    fetchFarmhouses();
  }, []);

  useEffect(() => {
    filterFarmhouses();
  }, [searchTerm, statusFilter, farmhouses]);

  const fetchFarmhouses = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'farmhouses'));
      const data = snapshot.docs.map(doc => ({
        farmhouse_id: doc.id,
        ...doc.data()
      })) as FarmhouseData[];
      setFarmhouses(data);
    } catch (error) {
      console.error('Error fetching farmhouses:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterFarmhouses = () => {
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
  };

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

  const handleSaveEdit = async () => {
    if (!selectedFarmhouse?.farmhouse_id) return;

    try {
      await updateDoc(doc(db, 'farmhouses', selectedFarmhouse.farmhouse_id), {
        base_rate: editData.base_rate,
        baseRate: editData.base_rate,
        commission_percentage: editData.commission_percentage,
        commissionPercentage: editData.commission_percentage,
        max_guests: editData.max_guests,
        maxGuests: editData.max_guests,
        status: editData.status
      });
      setEditModalOpen(false);
      fetchFarmhouses();
      alert('Farmhouse updated successfully!');
    } catch (error) {
      console.error('Error updating farmhouse:', error);
      alert('Failed to update farmhouse');
    }
  };

  const handleDelete = async (farmhouseId: string | undefined) => {
    if (!farmhouseId) return;
    if (!window.confirm('Are you sure you want to delete this farmhouse? This action cannot be undone.')) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'farmhouses', farmhouseId));
      fetchFarmhouses();
      alert('Farmhouse deleted successfully');
    } catch (error) {
      console.error('Error deleting farmhouse:', error);
      alert('Failed to delete farmhouse');
    }
  };

  const handleApprove = async (farmhouseId: string | undefined) => {
    if (!farmhouseId) return;

    try {
      await updateDoc(doc(db, 'farmhouses', farmhouseId), {
        status: 'approved'
      });
      fetchFarmhouses();
      alert('Farmhouse approved!');
    } catch (error) {
      console.error('Error approving farmhouse:', error);
      alert('Failed to approve farmhouse');
    }
  };

  const handleReject = async (farmhouseId: string | undefined) => {
    if (!farmhouseId) return;

    try {
      await updateDoc(doc(db, 'farmhouses', farmhouseId), {
        status: 'rejected'
      });
      fetchFarmhouses();
      alert('Farmhouse rejected');
    } catch (error) {
      console.error('Error rejecting farmhouse:', error);
      alert('Failed to reject farmhouse');
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
              All Farmhouses
            </Typography>
            <Typography variant='body2' color='text.secondary'>
              Total: {farmhouses.length} | Showing: {filtered.length}
            </Typography>
          </Box>
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
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align='center' sx={{ py: 4 }}>
                    <Typography color='text.secondary'>
                      {farmhouses.length === 0 
                        ? 'No farmhouses found.'
                        : 'No farmhouses match the selected filters.'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((farmhouse) => (
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
                      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                        <Tooltip title='View Details'>
                          <IconButton 
                            size='small' 
                            color='primary'
                            onClick={() => handleViewDetails(farmhouse)}
                          >
                            <Visibility />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title='Edit'>
                          <IconButton 
                            size='small' 
                            color='info'
                            onClick={() => handleEdit(farmhouse)}
                          >
                            <Edit />
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
                                <CheckCircle />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title='Reject'>
                              <IconButton 
                                size='small' 
                                color='error'
                                onClick={() => handleReject(farmhouse.farmhouse_id)}
                              >
                                <Cancel />
                              </IconButton>
                            </Tooltip>
                          </>
                        )}
                        <Tooltip title='Delete'>
                          <IconButton 
                            size='small' 
                            color='error'
                            onClick={() => handleDelete(farmhouse.farmhouse_id)}
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

        {/* Details Modal */}
        <Dialog 
          open={detailsModalOpen} 
          onClose={() => setDetailsModalOpen(false)} 
          maxWidth='md' 
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
                  <Tab label='Basic Info' />
                  <Tab label='Images' />
                  <Tab label='Amenities' />
                </Tabs>

                {detailsTab === 0 && (
                  <Box>
                    <Paper sx={{ p: 3, mb: 2, bgcolor: '#f9f9f9' }}>
                      <Typography variant='h6' gutterBottom>{getName(selectedFarmhouse)}</Typography>
                      <Typography variant='body2' color='text.secondary' gutterBottom>
                        {getLocation(selectedFarmhouse)}
                      </Typography>
                      <Divider sx={{ my: 2 }} />
                      <Typography variant='body2' paragraph>
                        {selectedFarmhouse.basicDetails?.description || selectedFarmhouse.description || 'No description'}
                      </Typography>
                    </Paper>

                    <Paper sx={{ p: 3 }}>
                      <Box sx={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: 2 }}>
                        <Typography color='text.secondary'>Base Rate:</Typography>
                        <Typography fontWeight='bold'>₹{getBaseRate(selectedFarmhouse).toLocaleString()}/night</Typography>

                        <Typography color='text.secondary'>Commission:</Typography>
                        <Typography fontWeight='bold'>{getCommission(selectedFarmhouse)}%</Typography>

                        <Typography color='text.secondary'>Max Guests:</Typography>
                        <Typography fontWeight='bold'>{getMaxGuests(selectedFarmhouse)}</Typography>

                        <Typography color='text.secondary'>Status:</Typography>
                        <Box>
                          <Chip 
                            label={selectedFarmhouse.status || 'pending'} 
                            color={
                              selectedFarmhouse.status === 'approved' ? 'success' : 
                              selectedFarmhouse.status === 'rejected' ? 'error' : 
                              'warning'
                            }
                            size='small'
                          />
                        </Box>

                        <Typography color='text.secondary'>Farmhouse ID:</Typography>
                        <Typography fontFamily='monospace' fontSize='0.875rem'>
                          {selectedFarmhouse.farmhouse_id}
                        </Typography>
                      </Box>
                    </Paper>
                  </Box>
                )}

                {detailsTab === 1 && (
                  <Box>
                    {selectedFarmhouse.images && selectedFarmhouse.images.length > 0 ? (
                      <Grid container spacing={2}>
                        {selectedFarmhouse.images.map((img, idx) => (
                          <Grid size={{ xs: 6, md: 4 }} key={idx}>
                            <Paper sx={{ p: 1, height: 200, overflow: 'hidden' }}>
                              <img 
                                src={img} 
                                alt={`Farmhouse ${idx + 1}`} 
                                style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 4 }}
                              />
                            </Paper>
                          </Grid>
                        ))}
                      </Grid>
                    ) : (
                      <Box sx={{ textAlign: 'center', py: 4 }}>
                        <ImageIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
                        <Typography color='text.secondary'>No images uploaded</Typography>
                      </Box>
                    )}
                  </Box>
                )}

                {detailsTab === 2 && (
                  <Box>
                    {selectedFarmhouse.amenities && selectedFarmhouse.amenities.length > 0 ? (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {selectedFarmhouse.amenities.map((amenity, idx) => (
                          <Chip key={idx} label={amenity} />
                        ))}
                      </Box>
                    ) : (
                      <Typography color='text.secondary' textAlign='center' py={4}>
                        No amenities listed
                      </Typography>
                    )}
                  </Box>
                )}
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
            <Button onClick={() => setEditModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveEdit} variant='contained'>Save Changes</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </MainLayout>
  );
};

export default AllFarmhouses;