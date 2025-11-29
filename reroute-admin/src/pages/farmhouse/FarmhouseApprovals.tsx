import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardMedia,
  Grid,
  Chip,
  Button,
  CircularProgress,
  Alert
} from '@mui/material';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { 
  Farmhouse,
  getFarmhouseName,
  getFarmhouseLocation,
  getFarmhouseDescription,
  getFarmhouseImages,
  getFarmhouseBaseRate,
  getFarmhouseCapacity
} from '../../types';
import MainLayout from '../../components/layout/MainLayout';
import FarmhouseDetailModal from '../../components/farmhouse/FarmhouseDetailModal';

const FarmhouseApprovals: React.FC = () => {
  const [farmhouses, setFarmhouses] = useState<Farmhouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFarmhouse, setSelectedFarmhouse] = useState<Farmhouse | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    fetchPendingFarmhouses();
  }, []);

  const fetchPendingFarmhouses = async () => {
    try {
      setLoading(true);

      // Mobile app uses "pending" status
      const q = query(
        collection(db, 'farmhouses'),
        where('status', '==', 'pending')
      );
      const snapshot = await getDocs(q);

      const data = snapshot.docs.map(doc => {
        const docData = doc.data();
        return {
          farmhouse_id: doc.id,
          ...docData
        };
      }) as Farmhouse[];
      
      setFarmhouses(data);
    } catch (error) {
      console.error('❌ Error fetching farmhouses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (farmhouse: Farmhouse) => {
    setSelectedFarmhouse(farmhouse);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedFarmhouse(null);
  };

  const handleApprovalComplete = () => {
    fetchPendingFarmhouses();
    handleCloseModal();
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
        <Typography variant='h4' fontWeight='bold' gutterBottom>
          Farmhouse Approvals
        </Typography>
        <Typography variant='body1' color='text.secondary' sx={{ mb: 4 }}>
          Review and approve pending farmhouse registrations
        </Typography>

        {farmhouses.length === 0 ? (
          <Alert severity='info'>
            No pending farmhouse approvals at the moment.
            <br /><br />
            <strong>Note:</strong> This page shows farmhouses with status "pending" from the mobile app.
          </Alert>
        ) : (
          <Grid container spacing={3}>
            {farmhouses.map((farmhouse) => {
              const name = getFarmhouseName(farmhouse);
              const location = getFarmhouseLocation(farmhouse);
              const description = getFarmhouseDescription(farmhouse);
              const images = getFarmhouseImages(farmhouse);
              const baseRate = getFarmhouseBaseRate(farmhouse);
              const capacity = getFarmhouseCapacity(farmhouse);
              
              return (
                <Grid size={{ xs: 12, md: 6, lg: 4 }} key={farmhouse.farmhouse_id}>
                  <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <CardMedia
                      component='img'
                      height='200'
                      image={images[0] || 'https://via.placeholder.com/400x200?text=No+Image'}
                      alt={name}
                      sx={{ objectFit: 'cover' }}
                    />
                    <CardContent sx={{ flexGrow: 1 }}>
                      <Typography variant='h6' fontWeight='bold' gutterBottom>
                        {name}
                      </Typography>
                      <Typography variant='body2' color='text.secondary' gutterBottom>
                        {location}
                      </Typography>
                      <Typography variant='body2' sx={{ mb: 2 }}>
                        {description.substring(0, 100)}{description.length > 100 ? '...' : ''}
                      </Typography>
                      
                      <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                        {baseRate > 0 && (
                          <Chip label={`₹${baseRate}/night`} size='small' color='primary' />
                        )}
                        {capacity > 0 && (
                          <Chip label={`Max: ${capacity} guests`} size='small' />
                        )}
                        <Chip label='Pending' size='small' color='warning' />
                      </Box>

                      <Button
                        fullWidth
                        variant='contained'
                        onClick={() => handleViewDetails(farmhouse)}
                      >
                        Review & Approve
                      </Button>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        )}

        {selectedFarmhouse && (
          <FarmhouseDetailModal
            open={modalOpen}
            farmhouse={selectedFarmhouse}
            onClose={handleCloseModal}
            onApprovalComplete={handleApprovalComplete}
          />
        )}
      </Box>
    </MainLayout>
  );
};

export default FarmhouseApprovals;