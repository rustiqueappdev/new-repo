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
  CircularProgress,
  TextField,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  Alert,
  Card,
  CardContent,
  Divider
} from '@mui/material';
import {
  Visibility,
  CheckCircle,
  Cancel,
  Description,
  Person,
  Business
} from '@mui/icons-material';
import { collection, getDocs, doc, updateDoc, serverTimestamp, addDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { User, OwnerKYC } from '../../types';
import { useSnackbar } from '../../context/SnackbarContext';
import { useAuth } from '../../context/AuthContext';
import MainLayout from '../../components/layout/MainLayout';
import EmptyState from '../../components/common/EmptyState';

interface OwnerWithKYC extends User {
  owner_kyc?: OwnerKYC;
}

const KYCManagement: React.FC = () => {
  const { showSuccess, showError } = useSnackbar();
  const { currentUser } = useAuth();
  const [owners, setOwners] = useState<OwnerWithKYC[]>([]);
  const [filtered, setFiltered] = useState<OwnerWithKYC[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Dialog states
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedOwner, setSelectedOwner] = useState<OwnerWithKYC | null>(null);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'reject'>('approve');
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchOwners();
  }, []);

  const fetchOwners = async () => {
    try {
      setLoading(true);
      const usersSnap = await getDocs(collection(db, 'users'));

      const ownersData = usersSnap.docs
        .map(doc => ({
          user_id: doc.id,
          ...doc.data()
        } as OwnerWithKYC))
        .filter(user => user.role === 'owner');

      setOwners(ownersData);
    } catch (err: any) {
      console.error('Error fetching owners:', err);
      showError('Failed to load KYC data');
    } finally {
      setLoading(false);
    }
  };

  const filterOwners = useCallback(() => {
    let result = owners;

    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      result = result.filter(o =>
        o.name?.toLowerCase().includes(search) ||
        o.email?.toLowerCase().includes(search) ||
        o.phone?.includes(searchTerm)
      );
    }

    if (statusFilter !== 'all') {
      result = result.filter(o => o.kyc_status === statusFilter);
    }

    setFiltered(result);
  }, [owners, searchTerm, statusFilter]);

  useEffect(() => {
    filterOwners();
  }, [filterOwners]);

  const handleViewKYC = (owner: OwnerWithKYC) => {
    setSelectedOwner(owner);
    setViewDialogOpen(true);
  };

  const handleOpenActionDialog = (owner: OwnerWithKYC, action: 'approve' | 'reject') => {
    setSelectedOwner(owner);
    setActionType(action);
    setRejectionReason('');
    setActionDialogOpen(true);
  };

  const handleKYCAction = async () => {
    if (!selectedOwner) return;

    if (actionType === 'reject' && !rejectionReason.trim()) {
      showError('Please provide a rejection reason');
      return;
    }

    try {
      setProcessing(true);

      const userRef = doc(db, 'users', selectedOwner.user_id);
      const updateData: any = {
        kyc_status: actionType === 'approve' ? 'approved' : 'rejected',
        updated_at: serverTimestamp()
      };

      if (actionType === 'reject') {
        updateData.kyc_rejection_reason = rejectionReason;
      } else {
        updateData.kyc_approved_by = currentUser?.email || 'admin';
        updateData.kyc_approved_at = serverTimestamp();
      }

      await updateDoc(userRef, updateData);

      // Add audit trail
      await addDoc(collection(db, 'audit_trail'), {
        action: actionType === 'approve' ? 'kyc_approved' : 'kyc_rejected',
        entity_type: 'owner_kyc',
        entity_id: selectedOwner.user_id,
        performed_by: currentUser?.email || 'admin',
        details: {
          owner_name: selectedOwner.name,
          owner_email: selectedOwner.email,
          rejection_reason: actionType === 'reject' ? rejectionReason : null
        },
        timestamp: serverTimestamp()
      });

      showSuccess(`KYC ${actionType === 'approve' ? 'approved' : 'rejected'} successfully`);
      fetchOwners();
      setActionDialogOpen(false);
      setViewDialogOpen(false);
      setSelectedOwner(null);
    } catch (err: any) {
      console.error('Error updating KYC status:', err);
      showError('Failed to update KYC status');
    } finally {
      setProcessing(false);
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'approved':
        return 'success';
      case 'rejected':
        return 'error';
      case 'pending':
        return 'warning';
      default:
        return 'default';
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    try {
      if (timestamp.toDate && typeof timestamp.toDate === 'function') {
        return new Date(timestamp.toDate()).toLocaleDateString();
      }
      return new Date(timestamp).toLocaleDateString();
    } catch (error) {
      return 'N/A';
    }
  };

  const pendingCount = owners.filter(o => o.kyc_status === 'pending').length;
  const approvedCount = owners.filter(o => o.kyc_status === 'approved').length;
  const rejectedCount = owners.filter(o => o.kyc_status === 'rejected').length;

  if (loading) {
    return (
      <MainLayout>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '70vh' }}>
          <Box sx={{ textAlign: 'center' }}>
            <CircularProgress size={60} />
            <Typography sx={{ mt: 2 }}>Loading KYC data...</Typography>
          </Box>
        </Box>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Box>
        <Box sx={{ mb: 3 }}>
          <Typography variant='h4' fontWeight='bold' gutterBottom>
            Owner KYC Management
          </Typography>
          <Typography variant='body2' color='text.secondary'>
            Review and approve owner KYC submissions for farmhouse listings
          </Typography>
        </Box>

        {/* Statistics Cards */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid size={{ xs: 12, sm: 4 }}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant='body2' color='text.secondary'>
                      Pending Review
                    </Typography>
                    <Typography variant='h4' fontWeight='bold' color='warning.main'>
                      {pendingCount}
                    </Typography>
                  </Box>
                  <Description sx={{ fontSize: 48, color: 'warning.main', opacity: 0.3 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant='body2' color='text.secondary'>
                      Approved
                    </Typography>
                    <Typography variant='h4' fontWeight='bold' color='success.main'>
                      {approvedCount}
                    </Typography>
                  </Box>
                  <CheckCircle sx={{ fontSize: 48, color: 'success.main', opacity: 0.3 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant='body2' color='text.secondary'>
                      Rejected
                    </Typography>
                    <Typography variant='h4' fontWeight='bold' color='error.main'>
                      {rejectedCount}
                    </Typography>
                  </Box>
                  <Cancel sx={{ fontSize: 48, color: 'error.main', opacity: 0.3 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Filters */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              fullWidth
              placeholder='Search by name, email or phone...'
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 3 }}>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <MenuItem value='all'>All Status ({owners.length})</MenuItem>
                <MenuItem value='pending'>Pending ({pendingCount})</MenuItem>
                <MenuItem value='approved'>Approved ({approvedCount})</MenuItem>
                <MenuItem value='rejected'>Rejected ({rejectedCount})</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>

        {/* Table */}
        {filtered.length === 0 ? (
          <EmptyState
            title={searchTerm || statusFilter !== 'all' ? 'No KYC submissions match your filters' : 'No owner KYC submissions yet'}
            description={owners.length === 0 ? 'KYC submissions will appear here once owners submit their documents' : 'Try adjusting your search or filters'}
            icon='search'
          />
        ) : (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                  <TableCell><strong>Owner Name</strong></TableCell>
                  <TableCell><strong>Email</strong></TableCell>
                  <TableCell><strong>Phone</strong></TableCell>
                  <TableCell><strong>KYC Status</strong></TableCell>
                  <TableCell><strong>Submitted Date</strong></TableCell>
                  <TableCell align='center'><strong>Actions</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.map((owner) => (
                  <TableRow key={owner.user_id} hover>
                    <TableCell>
                      <Typography fontWeight='bold'>{owner.name}</Typography>
                    </TableCell>
                    <TableCell>{owner.email}</TableCell>
                    <TableCell>{owner.phone || '-'}</TableCell>
                    <TableCell>
                      <Chip
                        label={owner.kyc_status || 'Not Submitted'}
                        size='small'
                        color={getStatusColor(owner.kyc_status)}
                      />
                    </TableCell>
                    <TableCell>{formatDate(owner.created_at)}</TableCell>
                    <TableCell align='center'>
                      <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                        <Tooltip title='View KYC Details'>
                          <IconButton size='small' onClick={() => handleViewKYC(owner)}>
                            <Visibility fontSize='small' />
                          </IconButton>
                        </Tooltip>
                        {owner.kyc_status === 'pending' && (
                          <>
                            <Tooltip title='Approve KYC'>
                              <IconButton
                                size='small'
                                color='success'
                                onClick={() => handleOpenActionDialog(owner, 'approve')}
                              >
                                <CheckCircle fontSize='small' />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title='Reject KYC'>
                              <IconButton
                                size='small'
                                color='error'
                                onClick={() => handleOpenActionDialog(owner, 'reject')}
                              >
                                <Cancel fontSize='small' />
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

      {/* View KYC Dialog */}
      <Dialog open={viewDialogOpen} onClose={() => setViewDialogOpen(false)} maxWidth='md' fullWidth>
        <DialogTitle>
          <Typography variant='h6' fontWeight='bold'>
            KYC Details - {selectedOwner?.name}
          </Typography>
        </DialogTitle>
        <DialogContent dividers>
          {selectedOwner?.owner_kyc ? (
            <Box>
              <Box sx={{ mb: 3 }}>
                <Typography variant='subtitle1' fontWeight='bold' gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Person /> Person 1 Details
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Typography variant='caption' color='text.secondary'>Name</Typography>
                    <Typography variant='body1' fontWeight='medium'>{selectedOwner.owner_kyc.person1_name}</Typography>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Typography variant='caption' color='text.secondary'>Phone</Typography>
                    <Typography variant='body1' fontWeight='medium'>{selectedOwner.owner_kyc.person1_phone}</Typography>
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <Typography variant='caption' color='text.secondary'>Aadhaar Document</Typography>
                    {selectedOwner.owner_kyc.person1_aadhaar_url ? (
                      <Box sx={{ mt: 1 }}>
                        <Button
                          variant='outlined'
                          size='small'
                          href={selectedOwner.owner_kyc.person1_aadhaar_url}
                          target='_blank'
                          startIcon={<Visibility />}
                        >
                          View Aadhaar
                        </Button>
                      </Box>
                    ) : (
                      <Typography variant='body2' color='text.secondary'>Not uploaded</Typography>
                    )}
                  </Grid>
                </Grid>
              </Box>

              <Box sx={{ mb: 3 }}>
                <Typography variant='subtitle1' fontWeight='bold' gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Person /> Person 2 Details
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Typography variant='caption' color='text.secondary'>Name</Typography>
                    <Typography variant='body1' fontWeight='medium'>{selectedOwner.owner_kyc.person2_name || 'Not provided'}</Typography>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Typography variant='caption' color='text.secondary'>Phone</Typography>
                    <Typography variant='body1' fontWeight='medium'>{selectedOwner.owner_kyc.person2_phone || 'Not provided'}</Typography>
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <Typography variant='caption' color='text.secondary'>Aadhaar Document</Typography>
                    {selectedOwner.owner_kyc.person2_aadhaar_url ? (
                      <Box sx={{ mt: 1 }}>
                        <Button
                          variant='outlined'
                          size='small'
                          href={selectedOwner.owner_kyc.person2_aadhaar_url}
                          target='_blank'
                          startIcon={<Visibility />}
                        >
                          View Aadhaar
                        </Button>
                      </Box>
                    ) : (
                      <Typography variant='body2' color='text.secondary'>Not uploaded</Typography>
                    )}
                  </Grid>
                </Grid>
              </Box>

              <Box sx={{ mb: 3 }}>
                <Typography variant='subtitle1' fontWeight='bold' gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Business /> Company Documents
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Typography variant='caption' color='text.secondary'>Company PAN</Typography>
                    {selectedOwner.owner_kyc.company_pan_url ? (
                      <Box sx={{ mt: 1 }}>
                        <Button
                          variant='outlined'
                          size='small'
                          href={selectedOwner.owner_kyc.company_pan_url}
                          target='_blank'
                          startIcon={<Visibility />}
                        >
                          View PAN
                        </Button>
                      </Box>
                    ) : (
                      <Typography variant='body2' color='text.secondary'>Not uploaded</Typography>
                    )}
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Typography variant='caption' color='text.secondary'>Labour Licence</Typography>
                    {selectedOwner.owner_kyc.labour_licence_url ? (
                      <Box sx={{ mt: 1 }}>
                        <Button
                          variant='outlined'
                          size='small'
                          href={selectedOwner.owner_kyc.labour_licence_url}
                          target='_blank'
                          startIcon={<Visibility />}
                        >
                          View Licence
                        </Button>
                      </Box>
                    ) : (
                      <Typography variant='body2' color='text.secondary'>Not uploaded</Typography>
                    )}
                  </Grid>
                </Grid>
              </Box>

              <Box sx={{ p: 2, backgroundColor: '#f5f5f5', borderRadius: 2 }}>
                <Typography variant='caption' color='text.secondary' display='block'>
                  KYC Status: <Chip label={selectedOwner.kyc_status || 'Not Submitted'} size='small' color={getStatusColor(selectedOwner.kyc_status)} />
                </Typography>
              </Box>
            </Box>
          ) : (
            <Alert severity='info'>
              No KYC documents have been submitted yet
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialogOpen(false)}>Close</Button>
          {selectedOwner?.kyc_status === 'pending' && (
            <>
              <Button
                variant='contained'
                color='error'
                onClick={() => {
                  setViewDialogOpen(false);
                  handleOpenActionDialog(selectedOwner, 'reject');
                }}
              >
                Reject
              </Button>
              <Button
                variant='contained'
                color='success'
                onClick={() => {
                  setViewDialogOpen(false);
                  handleOpenActionDialog(selectedOwner, 'approve');
                }}
              >
                Approve
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>

      {/* Action Confirmation Dialog */}
      <Dialog open={actionDialogOpen} onClose={() => setActionDialogOpen(false)} maxWidth='sm' fullWidth>
        <DialogTitle>
          {actionType === 'approve' ? 'Approve KYC' : 'Reject KYC'}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to {actionType} the KYC submission for <strong>{selectedOwner?.name}</strong>?
          </DialogContentText>
          {actionType === 'reject' && (
            <TextField
              fullWidth
              multiline
              rows={3}
              label='Rejection Reason *'
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              sx={{ mt: 2 }}
              placeholder='Please provide a reason for rejection...'
            />
          )}
          <Alert severity={actionType === 'approve' ? 'success' : 'warning'} sx={{ mt: 2 }}>
            {actionType === 'approve'
              ? 'The owner will be notified that their KYC has been approved and can start listing farmhouses.'
              : 'The owner will be notified about the rejection and the reason provided.'}
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setActionDialogOpen(false)} disabled={processing}>
            Cancel
          </Button>
          <Button
            variant='contained'
            color={actionType === 'approve' ? 'success' : 'error'}
            onClick={handleKYCAction}
            disabled={processing}
          >
            {processing ? 'Processing...' : actionType === 'approve' ? 'Approve' : 'Reject'}
          </Button>
        </DialogActions>
      </Dialog>
    </MainLayout>
  );
};

export default KYCManagement;
