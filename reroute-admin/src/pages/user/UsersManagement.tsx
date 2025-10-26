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
  CircularProgress,
  TextField,
  Grid as Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert
} from '@mui/material';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { User } from '../../types';
import MainLayout from '../../components/layout/MainLayout';

const UsersManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [filtered, setFiltered] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [searchTerm, roleFilter, users]);

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
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
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
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    
    try {
      // Handle Firestore timestamp
      if (timestamp.toDate && typeof timestamp.toDate === 'function') {
        return new Date(timestamp.toDate()).toLocaleDateString();
      }
      // Handle regular date string or timestamp
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
        <Typography variant='h4' fontWeight='bold' gutterBottom>
          Users Management
        </Typography>
        
        <Typography variant='body2' color='text.secondary' sx={{ mb: 3 }}>
          Total Users: {users.length} | Showing: {filtered.length}
        </Typography>

        {error && (
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
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant='h6' color='text.secondary'>
              {searchTerm || roleFilter !== 'all' ? 'No users match your filters' : 'No users found'}
            </Typography>
            {users.length === 0 && (
              <Typography variant='body2' color='text.secondary' sx={{ mt: 2 }}>
                Users will appear here once they register through the mobile app
              </Typography>
            )}
          </Paper>
        ) : (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Phone</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>KYC Status</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Joined</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.map((user) => (
                  <TableRow key={user.user_id}>
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
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>
    </MainLayout>
  );
};

export default UsersManagement;