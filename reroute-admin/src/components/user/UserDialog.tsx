import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Box,
  Typography,
  Switch,
  FormControlLabel,
  Alert
} from '@mui/material';
import { User } from '../../types';

interface UserDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (user: Partial<User>) => Promise<void>;
  user?: User | null;
  mode: 'create' | 'edit' | 'view';
}

const UserDialog: React.FC<UserDialogProps> = ({
  open,
  onClose,
  onSave,
  user,
  mode
}) => {
  const [formData, setFormData] = useState<Partial<User>>({
    name: '',
    email: '',
    phone: '',
    role: 'user',
    is_active: true,
    kyc_status: undefined
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user && (mode === 'edit' || mode === 'view')) {
      setFormData({
        user_id: user.user_id,
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        role: user.role || 'user',
        is_active: user.is_active !== undefined ? user.is_active : true,
        kyc_status: user.kyc_status
      });
    } else if (mode === 'create') {
      setFormData({
        name: '',
        email: '',
        phone: '',
        role: 'user',
        is_active: true,
        kyc_status: undefined
      });
    }
    setError('');
  }, [user, mode, open]);

  const handleChange = (field: keyof User, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    // Validation
    if (!formData.name?.trim()) {
      setError('Name is required');
      return;
    }
    if (!formData.email?.trim()) {
      setError('Email is required');
      return;
    }
    if (!formData.email.includes('@')) {
      setError('Invalid email format');
      return;
    }

    try {
      setSaving(true);
      setError('');
      await onSave(formData);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save user');
    } finally {
      setSaving(false);
    }
  };

  const isViewMode = mode === 'view';
  const title = mode === 'create' ? 'Create New User' : mode === 'edit' ? 'Edit User' : 'User Details';

  return (
    <Dialog open={open} onClose={onClose} maxWidth='md' fullWidth>
      <DialogTitle>
        <Typography variant='h6' fontWeight='bold'>
          {title}
        </Typography>
      </DialogTitle>

      <DialogContent dividers>
        {error && (
          <Alert severity='error' sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {mode === 'create' && (
          <Alert severity='info' sx={{ mb: 3 }}>
            Creating a user here will add them to the database. They will need to complete authentication through the mobile app.
          </Alert>
        )}

        <Grid container spacing={3}>
          <Grid size={{ xs: 12 }}>
            <TextField
              fullWidth
              label='Full Name *'
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              disabled={isViewMode}
              placeholder='Enter full name'
            />
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              fullWidth
              label='Email Address *'
              type='email'
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              disabled={isViewMode || mode === 'edit'}
              placeholder='user@example.com'
              helperText={mode === 'edit' ? 'Email cannot be changed' : ''}
            />
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              fullWidth
              label='Phone Number'
              value={formData.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              disabled={isViewMode}
              placeholder='+91 9876543210'
            />
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <FormControl fullWidth disabled={isViewMode}>
              <InputLabel>Role</InputLabel>
              <Select
                value={formData.role}
                onChange={(e) => handleChange('role', e.target.value)}
              >
                <MenuItem value='user'>User</MenuItem>
                <MenuItem value='owner'>Owner</MenuItem>
                <MenuItem value='admin'>Admin</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          {formData.role === 'owner' && (
            <Grid size={{ xs: 12, md: 6 }}>
              <FormControl fullWidth disabled={isViewMode}>
                <InputLabel>KYC Status</InputLabel>
                <Select
                  value={formData.kyc_status || ''}
                  onChange={(e) => handleChange('kyc_status', e.target.value || undefined)}
                >
                  <MenuItem value=''>Not Submitted</MenuItem>
                  <MenuItem value='pending'>Pending</MenuItem>
                  <MenuItem value='approved'>Approved</MenuItem>
                  <MenuItem value='rejected'>Rejected</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          )}

          <Grid size={{ xs: 12 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.is_active}
                  onChange={(e) => handleChange('is_active', e.target.checked)}
                  disabled={isViewMode}
                />
              }
              label={
                <Box>
                  <Typography variant='body1' fontWeight={500}>
                    Account Active
                  </Typography>
                  <Typography variant='caption' color='text.secondary'>
                    {formData.is_active
                      ? 'User can access the platform'
                      : 'User account is suspended'}
                  </Typography>
                </Box>
              }
            />
          </Grid>

          {user && mode !== 'create' && (
            <Grid size={{ xs: 12 }}>
              <Box sx={{ p: 2, backgroundColor: '#f5f5f5', borderRadius: 2 }}>
                <Typography variant='caption' color='text.secondary' display='block'>
                  User ID: {user.user_id}
                </Typography>
                {user.created_at && (
                  <Typography variant='caption' color='text.secondary' display='block'>
                    Joined: {new Date(user.created_at.toDate?.() || user.created_at).toLocaleDateString()}
                  </Typography>
                )}
              </Box>
            </Grid>
          )}
        </Grid>
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} disabled={saving}>
          {isViewMode ? 'Close' : 'Cancel'}
        </Button>
        {!isViewMode && (
          <Button
            variant='contained'
            onClick={handleSubmit}
            disabled={saving}
          >
            {saving ? 'Saving...' : mode === 'create' ? 'Create User' : 'Save Changes'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default UserDialog;
