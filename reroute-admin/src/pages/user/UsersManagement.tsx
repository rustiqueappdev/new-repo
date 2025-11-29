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
  Alert,
  Button,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText
} from '@mui/material';
import {
  Add,
  Edit,
  Visibility,
  Delete,
  Block,
  CheckCircle
} from '@mui/icons-material';
import { collection, getDocs, doc, updateDoc, addDoc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { User } from '../../types';
import { useSnackbar } from '../../context/SnackbarContext';
import MainLayout from '../../components/layout/MainLayout';
import UserDialog from '../../components/user/UserDialog';
import EmptyState from '../../components/common/EmptyState';

const UsersManagement: React.FC = () => {
  const { showSuccess, showError } = useSnackbar();
  const [users, setUsers] = useState<User[]>([]);
  const [filtered, setFiltered] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit' | 'view'>('create');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Delete dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError('');

      const snapshot = await getDocs(collection(db, 'users'));

      const data = snapshot.docs.map(doc => {
        const userData = doc.data();

        return {
          user_id: doc.id,
          name: userData.name || userData.displayName || 'Unknown',
          email: userData.email || 'No email',
          phone: userData.phone || userData.phoneNumber || '',
          role: userData.role || 'user',
          kyc_status: userData.kyc_status || userData.kycStatus || undefined,
          is_active: userData.is_active !== undefined ? userData.is_active : true,
          created_at: userData.created_at || userData.createdAt || null,
          owner_kyc: userData.owner_kyc || userData.ownerKyc || undefined
        } as User;
      });

      setUsers(data);

      if (data.length === 0) {
        setError('No users found in database. Users will appear here once they sign up through the mobile app.');
      }

    } catch (err: any) {
      console.error('❌ Error fetching users:', err);
      setError(`Failed to load users: ${err.message}`);
      showError('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = useCallback(() => {
    let result = users;

    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      result = result.filter(u =>
        u.name?.toLowerCase().includes(search) ||
        u.email?.toLowerCase().includes(search) ||
        u.phone?.includes(searchTerm)
      );
    }

    if (roleFilter !== 'all') {
      result = result.filter(u => u.role === roleFilter);
    }

    setFiltered(result);
  }, [users, searchTerm, roleFilter]);

  useEffect(() => {
    filterUsers();
  }, [filterUsers]);

  const handleCreateUser = async (userData: Partial<User>) => {
    try {
      const newUser = {
        name: userData.name,
        email: userData.email,
        phone: userData.phone || '',
        role: userData.role || 'user',
        is_active: userData.is_active !== undefined ? userData.is_active : true,
        kyc_status: userData.kyc_status,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp()
      };

      await addDoc(collection(db, 'users'), newUser);
      showSuccess('User created successfully');
      fetchUsers();
      setDialogOpen(false);
    } catch (err: any) {
      console.error('Error creating user:', err);
      showError('Failed to create user');
      throw err;
    }
  };

  const handleEditUser = async (userData: Partial<User>) => {
    if (!userData.user_id) return;

    try {
      const userRef = doc(db, 'users', userData.user_id);
      await updateDoc(userRef, {
        name: userData.name,
        phone: userData.phone,
        role: userData.role,
        is_active: userData.is_active,
        kyc_status: userData.kyc_status || null,
        updated_at: serverTimestamp()
      });

      showSuccess('User updated successfully');
      fetchUsers();
      setDialogOpen(false);
    } catch (err: any) {
      console.error('Error updating user:', err);
      showError('Failed to update user');
      throw err;
    }
  };

  const handleToggleStatus = async (user: User) => {
    try {
      const userRef = doc(db, 'users', user.user_id);
      await updateDoc(userRef, {
        is_active: !user.is_active,
        updated_at: serverTimestamp()
      });

      showSuccess(`User ${!user.is_active ? 'activated' : 'deactivated'} successfully`);
      fetchUsers();
    } catch (err: any) {
      console.error('Error toggling user status:', err);
      showError('Failed to update user status');
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    try {
      const userRef = doc(db, 'users', userToDelete.user_id);
      await deleteDoc(userRef);

      showSuccess('User deleted successfully');
      fetchUsers();
      setDeleteDialogOpen(false);
      setUserToDelete(null);
    } catch (err: any) {
      console.error('Error deleting user:', err);
      showError('Failed to delete user');
    }
  };

  const openCreateDialog = () => {
    setSelectedUser(null);
    setDialogMode('create');
    setDialogOpen(true);
  };

  const openEditDialog = (user: User) => {
    setSelectedUser(user);
    setDialogMode('edit');
    setDialogOpen(true);
  };

  const openViewDialog = (user: User) => {
    setSelectedUser(user);
    setDialogMode('view');
    setDialogOpen(true);
  };

  const openDeleteDialog = (user: User) => {
    setUserToDelete(user);
    setDeleteDialogOpen(true);
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

  if (loading) {
    return (
      <MainLayout>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '70vh' }}>
          <Box sx={{ textAlign: 'center' }}>
            <CircularProgress size={60} />
            <Typography sx={{ mt: 2 }}>Loading users...</Typography>
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
              Users Management
            </Typography>
            <Typography variant='body2' color='text.secondary'>
              Total Users: {users.length} | Showing: {filtered.length}
            </Typography>
          </Box>
          <Button
            variant='contained'
            startIcon={<Add />}
            onClick={openCreateDialog}
            size='large'
          >
            Add User
          </Button>
        </Box>

        {error && users.length === 0 && (
          <Alert severity='info' sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

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
              <InputLabel>Role</InputLabel>
              <Select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
                <MenuItem value='all'>All Roles ({users.length})</MenuItem>
                <MenuItem value='user'>Users ({users.filter(u => u.role === 'user').length})</MenuItem>
                <MenuItem value='owner'>Owners ({users.filter(u => u.role === 'owner').length})</MenuItem>
                <MenuItem value='admin'>Admins ({users.filter(u => u.role === 'admin').length})</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>

        {filtered.length === 0 ? (
          <EmptyState
            title={searchTerm || roleFilter !== 'all' ? 'No users match your filters' : 'No users found'}
            description={users.length === 0 ? 'Users will appear here once they register through the mobile app' : 'Try adjusting your search or filters'}
            icon='search'
            actionLabel={users.length === 0 ? 'Create First User' : undefined}
            onAction={users.length === 0 ? openCreateDialog : undefined}
          />
        ) : (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                  <TableCell><strong>Name</strong></TableCell>
                  <TableCell><strong>Email</strong></TableCell>
                  <TableCell><strong>Phone</strong></TableCell>
                  <TableCell><strong>Role</strong></TableCell>
                  <TableCell><strong>KYC Status</strong></TableCell>
                  <TableCell><strong>Status</strong></TableCell>
                  <TableCell><strong>Joined</strong></TableCell>
                  <TableCell align='center'><strong>Actions</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.map((user) => (
                  <TableRow key={user.user_id} hover>
                    <TableCell>
                      <Typography fontWeight='bold'>{user.name}</Typography>
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.phone || '-'}</TableCell>
                    <TableCell>
                      <Chip
                        label={user.role}
                        size='small'
                        color={
                          user.role === 'admin' ? 'error' :
                          user.role === 'owner' ? 'primary' :
                          'default'
                        }
                      />
                    </TableCell>
                    <TableCell>
                      {user.kyc_status ? (
                        <Chip
                          label={user.kyc_status}
                          size='small'
                          color={
                            user.kyc_status === 'approved' ? 'success' :
                            user.kyc_status === 'rejected' ? 'error' :
                            'warning'
                          }
                        />
                      ) : (
                        <Chip label='N/A' size='small' variant='outlined' />
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={user.is_active ? 'Active' : 'Inactive'}
                        size='small'
                        color={user.is_active ? 'success' : 'default'}
                      />
                    </TableCell>
                    <TableCell>
                      {formatDate(user.created_at)}
                    </TableCell>
                    <TableCell align='center'>
                      <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                        <Tooltip title='View Details'>
                          <IconButton size='small' onClick={() => openViewDialog(user)}>
                            <Visibility fontSize='small' />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title='Edit User'>
                          <IconButton size='small' color='primary' onClick={() => openEditDialog(user)}>
                            <Edit fontSize='small' />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={user.is_active ? 'Deactivate' : 'Activate'}>
                          <IconButton
                            size='small'
                            color={user.is_active ? 'warning' : 'success'}
                            onClick={() => handleToggleStatus(user)}
                          >
                            {user.is_active ? <Block fontSize='small' /> : <CheckCircle fontSize='small' />}
                          </IconButton>
                        </Tooltip>
                        <Tooltip title='Delete User'>
                          <IconButton size='small' color='error' onClick={() => openDeleteDialog(user)}>
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

      {/* User Create/Edit/View Dialog */}
      <UserDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSave={dialogMode === 'create' ? handleCreateUser : handleEditUser}
        user={selectedUser}
        mode={dialogMode}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete User</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete <strong>{userToDelete?.name}</strong>? This action cannot be undone.
            <br /><br />
            <Alert severity='warning'>
              Consider deactivating the user instead of deleting to preserve historical data.
            </Alert>
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteUser} color='error' variant='contained'>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </MainLayout>
  );
};

export default UsersManagement;
