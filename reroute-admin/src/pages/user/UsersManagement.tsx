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
  FormControl,
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
  CheckCircle,
  SearchOutlined
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
          email: userData.email || userData.emailAddress || userData.email_id || userData.userEmail || '',
          phone: userData.phone || userData.phoneNumber || userData.mobile || '',
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

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return { bg: '#FEF2F2', color: '#DC2626' };
      case 'owner': return { bg: '#EFF6FF', color: '#2563EB' };
      default: return { bg: '#F3F4F6', color: '#6B7280' };
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getAvatarColor = (name: string) => {
    const colors = ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444', '#EC4899'];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
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
              label={`${users.length} total`}
              size='small'
              sx={{ backgroundColor: '#F3F4F6', color: '#6B7280', fontWeight: 600, fontSize: '0.75rem' }}
            />
            {filtered.length !== users.length && (
              <Chip
                label={`${filtered.length} shown`}
                size='small'
                sx={{ backgroundColor: '#EFF6FF', color: '#3B82F6', fontWeight: 600, fontSize: '0.75rem' }}
              />
            )}
          </Box>
        </Box>

        {error && users.length === 0 && (
          <Alert severity='info' sx={{ mb: 3, borderRadius: 2 }}>
            {error}
          </Alert>
        )}

        <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'rgba(0,0,0,0.06)', borderRadius: 3, overflow: 'hidden', mb: 3 }}>
          <Box sx={{ p: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <TextField
              placeholder='Search users...'
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              size='small'
              InputProps={{
                startAdornment: <SearchOutlined sx={{ color: '#9CA3AF', mr: 1, fontSize: 20 }} />,
              }}
              sx={{
                flex: 1,
                minWidth: 200,
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                  backgroundColor: '#F9FAFB',
                  '& fieldset': { borderColor: 'transparent' },
                  '&:hover fieldset': { borderColor: '#E5E7EB' },
                  '&.Mui-focused fieldset': { borderColor: '#10B981' },
                },
              }}
            />
            <FormControl size='small' sx={{ minWidth: 160 }}>
              <Select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                displayEmpty
                sx={{
                  borderRadius: 2,
                  backgroundColor: '#F9FAFB',
                  '& fieldset': { borderColor: 'transparent' },
                  '&:hover fieldset': { borderColor: '#E5E7EB' },
                  '&.Mui-focused fieldset': { borderColor: '#10B981' },
                }}
              >
                <MenuItem value='all'>All Roles</MenuItem>
                <MenuItem value='user'>Users ({users.filter(u => u.role === 'user').length})</MenuItem>
                <MenuItem value='owner'>Owners ({users.filter(u => u.role === 'owner').length})</MenuItem>
                <MenuItem value='admin'>Admins ({users.filter(u => u.role === 'admin').length})</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </Paper>

        {filtered.length === 0 ? (
          <EmptyState
            title={searchTerm || roleFilter !== 'all' ? 'No users match your filters' : 'No users found'}
            description={users.length === 0 ? 'Users will appear here once they register through the mobile app' : 'Try adjusting your search or filters'}
            icon='search'
          />
        ) : (
          <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'rgba(0,0,0,0.06)', borderRadius: 3 }}>
            <Table>
              <TableHead>
                <TableRow sx={{ '& th': { backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB', color: '#6B7280', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', py: 1.5 } }}>
                  <TableCell>User</TableCell>
                  <TableCell>Phone</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>KYC</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Joined</TableCell>
                  <TableCell align='center'>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.map((user) => {
                  const roleStyle = getRoleColor(user.role);
                  return (
                    <TableRow key={user.user_id} hover sx={{ '&:hover': { backgroundColor: '#FAFAFA' }, '& td': { borderBottom: '1px solid #F3F4F6', py: 1.5 } }}>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Box sx={{
                            width: 36, height: 36, borderRadius: '50%',
                            background: `linear-gradient(135deg, ${getAvatarColor(user.name)} 0%, ${getAvatarColor(user.name)}CC 100%)`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: '#fff', fontSize: '0.75rem', fontWeight: 700, flexShrink: 0,
                          }}>
                            {getInitials(user.name)}
                          </Box>
                          <Box>
                            <Typography sx={{ fontWeight: 600, fontSize: '0.85rem', color: '#111827' }}>{user.name}</Typography>
                            <Typography sx={{ fontSize: '0.75rem', color: '#9CA3AF' }}>{user.email || '—'}</Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ fontSize: '0.85rem', color: '#6B7280' }}>{user.phone || '-'}</Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={user.role}
                          size='small'
                          sx={{ backgroundColor: roleStyle.bg, color: roleStyle.color, fontWeight: 600, fontSize: '0.7rem', textTransform: 'capitalize' }}
                        />
                      </TableCell>
                      <TableCell>
                        {user.kyc_status ? (
                          <Chip
                            label={user.kyc_status}
                            size='small'
                            sx={{
                              backgroundColor: user.kyc_status === 'approved' ? '#ECFDF5' : user.kyc_status === 'rejected' ? '#FEF2F2' : '#FFFBEB',
                              color: user.kyc_status === 'approved' ? '#059669' : user.kyc_status === 'rejected' ? '#DC2626' : '#D97706',
                              fontWeight: 600, fontSize: '0.7rem', textTransform: 'capitalize',
                            }}
                          />
                        ) : (
                          <Typography sx={{ fontSize: '0.8rem', color: '#D1D5DB' }}>—</Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                          <Box sx={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: user.is_active ? '#10B981' : '#D1D5DB' }} />
                          <Typography sx={{ fontSize: '0.8rem', color: user.is_active ? '#059669' : '#9CA3AF', fontWeight: 500 }}>
                            {user.is_active ? 'Active' : 'Inactive'}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ fontSize: '0.8rem', color: '#9CA3AF' }}>{formatDate(user.created_at)}</Typography>
                      </TableCell>
                      <TableCell align='center'>
                        <Box sx={{ display: 'flex', gap: 0.25, justifyContent: 'center' }}>
                          <Tooltip title='View'>
                            <IconButton size='small' onClick={() => openViewDialog(user)} sx={{ color: '#9CA3AF', '&:hover': { color: '#6B7280', backgroundColor: '#F3F4F6' } }}>
                              <Visibility sx={{ fontSize: 18 }} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title='Edit'>
                            <IconButton size='small' onClick={() => openEditDialog(user)} sx={{ color: '#9CA3AF', '&:hover': { color: '#3B82F6', backgroundColor: '#EFF6FF' } }}>
                              <Edit sx={{ fontSize: 18 }} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title={user.is_active ? 'Deactivate' : 'Activate'}>
                            <IconButton size='small' onClick={() => handleToggleStatus(user)} sx={{ color: '#9CA3AF', '&:hover': { color: user.is_active ? '#F59E0B' : '#10B981', backgroundColor: user.is_active ? '#FFFBEB' : '#ECFDF5' } }}>
                              {user.is_active ? <Block sx={{ fontSize: 18 }} /> : <CheckCircle sx={{ fontSize: 18 }} />}
                            </IconButton>
                          </Tooltip>
                          <Tooltip title='Delete'>
                            <IconButton size='small' onClick={() => openDeleteDialog(user)} sx={{ color: '#9CA3AF', '&:hover': { color: '#EF4444', backgroundColor: '#FEF2F2' } }}>
                              <Delete sx={{ fontSize: 18 }} />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })}
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
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} PaperProps={{ sx: { borderRadius: 3, maxWidth: 420 } }}>
        <DialogTitle sx={{ fontWeight: 700, fontSize: '1.1rem' }}>Delete User</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ fontSize: '0.9rem' }}>
            Are you sure you want to delete <strong>{userToDelete?.name}</strong>? This action cannot be undone.
          </DialogContentText>
          <Alert severity='warning' sx={{ mt: 2, borderRadius: 2 }}>
            Consider deactivating the user instead of deleting to preserve historical data.
          </Alert>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setDeleteDialogOpen(false)} sx={{ textTransform: 'none', fontWeight: 600, color: '#6B7280' }}>Cancel</Button>
          <Button onClick={handleDeleteUser} variant='contained' sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2, backgroundColor: '#EF4444', '&:hover': { backgroundColor: '#DC2626' } }}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </MainLayout>
  );
};

export default UsersManagement;
