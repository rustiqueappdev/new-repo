import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
  Button,
  CircularProgress,
  alpha
} from '@mui/material';
import { LocationOn, People, CurrencyRupee, ArrowForward, InboxOutlined } from '@mui/icons-material';
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
          <CircularProgress size={48} sx={{ color: '#10B981' }} />
        </Box>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Box>
        {farmhouses.length > 0 && (
          <Chip
            label={`${farmhouses.length} pending`}
            size='small'
            sx={{
              mb: 3,
              backgroundColor: alpha('#F59E0B', 0.1),
              color: '#D97706',
              fontWeight: 600,
              fontSize: '0.75rem',
            }}
          />
        )}

        {farmhouses.length === 0 ? (
          <Box sx={{
            textAlign: 'center',
            py: 10,
            px: 3,
          }}>
            <Box sx={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              backgroundColor: alpha('#10B981', 0.08),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mx: 'auto',
              mb: 3,
            }}>
              <InboxOutlined sx={{ fontSize: 36, color: '#10B981' }} />
            </Box>
            <Typography sx={{ fontWeight: 700, fontSize: '1.25rem', color: '#111827', mb: 1 }}>
              All caught up!
            </Typography>
            <Typography sx={{ color: '#9CA3AF', maxWidth: 400, mx: 'auto' }}>
              No pending farmhouse approvals at the moment. New submissions from the mobile app will appear here.
            </Typography>
          </Box>
        ) : (
          <Grid container spacing={2.5}>
            {farmhouses.map((farmhouse) => {
              const name = getFarmhouseName(farmhouse);
              const location = getFarmhouseLocation(farmhouse);
              const description = getFarmhouseDescription(farmhouse);
              const images = getFarmhouseImages(farmhouse);
              const baseRate = getFarmhouseBaseRate(farmhouse);
              const capacity = getFarmhouseCapacity(farmhouse);
              
              return (
                <Grid size={{ xs: 12, sm: 6, lg: 4 }} key={farmhouse.farmhouse_id}>
                  <Card sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    border: '1px solid',
                    borderColor: alpha('#000', 0.06),
                    boxShadow: 'none',
                    overflow: 'hidden',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      borderColor: alpha('#F59E0B', 0.3),
                      boxShadow: `0 8px 24px ${alpha('#F59E0B', 0.1)}`,
                      transform: 'translateY(-2px)',
                    },
                  }}>
                    {/* Image with overlay */}
                    <Box sx={{ position: 'relative', height: 180, overflow: 'hidden' }}>
                      <Box
                        component='img'
                        src={images[0] || 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400&h=200&fit=crop'}
                        alt={name}
                        sx={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                        }}
                      />
                      <Box sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'linear-gradient(180deg, transparent 40%, rgba(0,0,0,0.6) 100%)',
                      }} />
                      <Chip
                        label='Pending Review'
                        size='small'
                        sx={{
                          position: 'absolute',
                          top: 12,
                          left: 12,
                          backgroundColor: alpha('#F59E0B', 0.9),
                          color: '#fff',
                          fontWeight: 600,
                          fontSize: '0.7rem',
                          backdropFilter: 'blur(4px)',
                        }}
                      />
                      <Typography sx={{
                        position: 'absolute',
                        bottom: 12,
                        left: 12,
                        right: 12,
                        color: '#fff',
                        fontWeight: 700,
                        fontSize: '1.1rem',
                        textShadow: '0 1px 3px rgba(0,0,0,0.3)',
                      }}>
                        {name}
                      </Typography>
                    </Box>

                    <CardContent sx={{ flexGrow: 1, p: 2.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1.5 }}>
                        <LocationOn sx={{ fontSize: 16, color: '#9CA3AF' }} />
                        <Typography sx={{ fontSize: '0.8rem', color: '#6B7280' }}>
                          {location}
                        </Typography>
                      </Box>

                      <Typography sx={{
                        fontSize: '0.85rem',
                        color: '#6B7280',
                        mb: 2,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        lineHeight: 1.5,
                      }}>
                        {description}
                      </Typography>
                      
                      <Box sx={{ display: 'flex', gap: 1.5, mb: 2.5 }}>
                        {baseRate > 0 && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <CurrencyRupee sx={{ fontSize: 14, color: '#10B981' }} />
                            <Typography sx={{ fontSize: '0.8rem', fontWeight: 600, color: '#111827' }}>
                              {baseRate.toLocaleString()}/night
                            </Typography>
                          </Box>
                        )}
                        {capacity > 0 && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <People sx={{ fontSize: 14, color: '#3B82F6' }} />
                            <Typography sx={{ fontSize: '0.8rem', fontWeight: 600, color: '#111827' }}>
                              {capacity} guests
                            </Typography>
                          </Box>
                        )}
                      </Box>

                      <Button
                        fullWidth
                        variant='contained'
                        endIcon={<ArrowForward sx={{ fontSize: 16 }} />}
                        onClick={() => handleViewDetails(farmhouse)}
                        sx={{
                          py: 1.25,
                          borderRadius: 2,
                          textTransform: 'none',
                          fontWeight: 600,
                          fontSize: '0.85rem',
                          background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                          boxShadow: 'none',
                          '&:hover': {
                            background: 'linear-gradient(135deg, #D97706 0%, #B45309 100%)',
                            boxShadow: `0 4px 12px ${alpha('#F59E0B', 0.3)}`,
                          },
                        }}
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