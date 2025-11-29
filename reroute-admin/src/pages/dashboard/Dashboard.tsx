import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Paper,
  Chip,
  alpha
} from '@mui/material';
import {
  HomeWork,
  People,
  BookOnline,
  LocalOffer,
  CheckCircle,
  TrendingUp,
  ArrowForward,
  NotificationsActive
} from '@mui/icons-material';
import MainLayout from '../../components/layout/MainLayout';
import { useDashboardStats } from '../../hooks/useDashboardStats';
import { DashboardSkeleton } from '../../components/common/LoadingSkeleton';

const Dashboard: React.FC = () => {
  const { stats, loading } = useDashboardStats();
  const navigate = useNavigate();

  const statCards = [
    {
      title: 'Total Farmhouses',
      value: stats.totalFarmhouses,
      icon: <HomeWork sx={{ fontSize: 40 }} />,
      color: '#2196F3',
      path: '/farmhouses'
    },
    {
      title: 'Pending Approvals',
      value: stats.pendingFarmhouses,
      icon: <CheckCircle sx={{ fontSize: 40 }} />,
      color: '#FF9800',
      path: '/farmhouse-approvals',
      highlight: stats.pendingFarmhouses > 0
    },
    {
      title: 'Total Users',
      value: stats.totalUsers,
      icon: <People sx={{ fontSize: 40 }} />,
      color: '#4CAF50',
      path: '/users'
    },
    {
      title: 'Total Bookings',
      value: stats.totalBookings,
      icon: <BookOnline sx={{ fontSize: 40 }} />,
      color: '#9C27B0',
      path: '/bookings'
    },
    {
      title: 'Active Coupons',
      value: stats.activeCoupons,
      icon: <LocalOffer sx={{ fontSize: 40 }} />,
      color: '#F44336',
      path: '/coupons'
    }
  ];

  const bookingStats = [
    { label: 'Today', value: stats.todayBookings },
    { label: 'This Week', value: stats.weekBookings },
    { label: 'This Month', value: stats.monthBookings }
  ];

  if (loading) {
    return (
      <MainLayout>
        <DashboardSkeleton />
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Box>
        <Box sx={{ mb: 4 }}>
          <Typography variant='h4' fontWeight='bold' gutterBottom>
            Dashboard Overview
          </Typography>
          <Typography variant='body1' color='text.secondary'>
            Monitor and manage your farmhouse rental platform
          </Typography>
        </Box>

        <Grid container spacing={3}>
          {statCards.map((card, index) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={index}>
              <Card
                sx={{
                  height: '100%',
                  cursor: 'pointer',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  position: 'relative',
                  overflow: 'visible',
                  background: card.highlight
                    ? `linear-gradient(135deg, ${alpha(card.color, 0.1)} 0%, ${alpha(card.color, 0.05)} 100%)`
                    : 'background.paper',
                  border: card.highlight ? `2px solid ${card.color}` : 'none',
                  '&:hover': {
                    transform: 'translateY(-8px)',
                    boxShadow: `0 12px 24px ${alpha(card.color, 0.2)}`
                  },
                  '&::before': card.highlight ? {
                    content: '""',
                    position: 'absolute',
                    top: -1,
                    left: -1,
                    right: -1,
                    bottom: -1,
                    background: `linear-gradient(135deg, ${card.color}, ${alpha(card.color, 0.6)})`,
                    borderRadius: 'inherit',
                    zIndex: -1,
                    opacity: 0.1
                  } : {}
                }}
                onClick={() => navigate(card.path)}
              >
                <CardContent sx={{ position: 'relative' }}>
                  {card.highlight && (
                    <Chip
                      icon={<NotificationsActive sx={{ fontSize: 16 }} />}
                      label='Needs Attention'
                      size='small'
                      sx={{
                        position: 'absolute',
                        top: 12,
                        right: 12,
                        backgroundColor: card.color,
                        color: 'white',
                        fontWeight: 600,
                        fontSize: '0.7rem',
                        animation: 'pulse 2s ease-in-out infinite',
                        '@keyframes pulse': {
                          '0%, 100%': { opacity: 1 },
                          '50%': { opacity: 0.7 }
                        }
                      }}
                    />
                  )}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mt: card.highlight ? 2 : 0 }}>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant='body2' color='text.secondary' gutterBottom fontWeight={500}>
                        {card.title}
                      </Typography>
                      <Typography variant='h3' fontWeight='bold' sx={{
                        background: card.highlight
                          ? `linear-gradient(135deg, ${card.color} 0%, ${alpha(card.color, 0.7)} 100%)`
                          : 'inherit',
                        WebkitBackgroundClip: card.highlight ? 'text' : 'unset',
                        WebkitTextFillColor: card.highlight ? 'transparent' : 'inherit',
                        mb: 0.5
                      }}>
                        {card.value}
                      </Typography>
                    </Box>
                    <Box
                      sx={{
                        background: `linear-gradient(135deg, ${card.color} 0%, ${alpha(card.color, 0.8)} 100%)`,
                        borderRadius: 3,
                        p: 1.5,
                        color: 'white',
                        boxShadow: `0 4px 12px ${alpha(card.color, 0.3)}`
                      }}
                    >
                      {card.icon}
                    </Box>
                  </Box>
                  <Box sx={{
                    display: 'flex',
                    alignItems: 'center',
                    mt: 2.5,
                    color: card.color,
                    opacity: 0.8,
                    transition: 'opacity 0.2s',
                    '&:hover': { opacity: 1 }
                  }}>
                    <Typography variant='body2' fontWeight={600}>
                      View Details
                    </Typography>
                    <ArrowForward sx={{ fontSize: 18, ml: 0.5 }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        <Grid container spacing={3} sx={{ mt: 2 }}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper
              elevation={2}
              sx={{
                p: 3,
                background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
                border: '1px solid',
                borderColor: 'divider'
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <Box
                  sx={{
                    background: 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)',
                    borderRadius: 2,
                    p: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mr: 1.5,
                    boxShadow: `0 4px 12px ${alpha('#4CAF50', 0.3)}`
                  }}
                >
                  <TrendingUp sx={{ color: 'white', fontSize: 24 }} />
                </Box>
                <Typography variant='h6' fontWeight='bold'>
                  Booking Statistics
                </Typography>
              </Box>
              {bookingStats.map((stat, index) => (
                <Box
                  key={index}
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    py: 2.5,
                    px: 2,
                    borderRadius: 2,
                    backgroundColor: index % 2 === 0 ? alpha('#4CAF50', 0.05) : 'transparent',
                    transition: 'all 0.2s',
                    '&:hover': {
                      backgroundColor: alpha('#4CAF50', 0.1),
                      transform: 'translateX(4px)'
                    }
                  }}
                >
                  <Typography variant='body1' color='text.secondary' fontWeight={500}>
                    {stat.label}
                  </Typography>
                  <Typography
                    variant='h5'
                    fontWeight='bold'
                    sx={{
                      background: 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent'
                    }}
                  >
                    {stat.value}
                  </Typography>
                </Box>
              ))}
            </Paper>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <Paper
              elevation={2}
              sx={{
                p: 3,
                background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
                border: '1px solid',
                borderColor: 'divider'
              }}
            >
              <Typography variant='h6' fontWeight='bold' gutterBottom>
                Quick Actions
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 3 }}>
                {stats.pendingFarmhouses > 0 && (
                  <Box
                    onClick={() => navigate('/farmhouse-approvals')}
                    sx={{
                      p: 2.5,
                      background: 'linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%)',
                      borderRadius: 2,
                      cursor: 'pointer',
                      border: '2px solid #ffb74d',
                      transition: 'all 0.3s',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: `0 8px 16px ${alpha('#FF9800', 0.2)}`
                      }
                    }}
                  >
                    <Typography variant='body1' fontWeight='600' color='#f57c00'>
                      {stats.pendingFarmhouses} farmhouse{stats.pendingFarmhouses > 1 ? 's' : ''} waiting for approval
                    </Typography>
                  </Box>
                )}
                <Box
                  onClick={() => navigate('/coupons')}
                  sx={{
                    p: 2.5,
                    background: 'linear-gradient(135deg, #f3e5f5 0%, #e1bee7 100%)',
                    borderRadius: 2,
                    cursor: 'pointer',
                    border: '2px solid #ce93d8',
                    transition: 'all 0.3s',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: `0 8px 16px ${alpha('#9C27B0', 0.2)}`
                    }
                  }}
                >
                  <Typography variant='body1' fontWeight='600' color='#8e24aa'>
                    Create New Coupon
                  </Typography>
                </Box>
                <Box
                  onClick={() => navigate('/bookings')}
                  sx={{
                    p: 2.5,
                    background: 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)',
                    borderRadius: 2,
                    cursor: 'pointer',
                    border: '2px solid #81c784',
                    transition: 'all 0.3s',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: `0 8px 16px ${alpha('#4CAF50', 0.2)}`
                    }
                  }}
                >
                  <Typography variant='body1' fontWeight='600' color='#388e3c'>
                    View All Bookings
                  </Typography>
                </Box>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </MainLayout>
  );
};

export default Dashboard;
