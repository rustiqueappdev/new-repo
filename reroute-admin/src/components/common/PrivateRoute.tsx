import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { CircularProgress, Box, Typography } from '@mui/material';

interface PrivateRouteProps {
  children: React.ReactNode;
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ children }) => {
  const { currentUser, userRole, loading } = useAuth();

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column' }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }} color='text.secondary'>
          Verifying access...
        </Typography>
      </Box>
    );
  }

  // Check if user is authenticated AND has admin role
  if (!currentUser || userRole !== 'admin') {
    return <Navigate to='/login' replace />;
  }

  return <>{children}</>;
};

export default PrivateRoute;