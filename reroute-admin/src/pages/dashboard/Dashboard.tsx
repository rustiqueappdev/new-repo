import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Paper,
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
  CalendarToday,
  DateRange,
  EventNote
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
      icon: <HomeWork />,
      gradient: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
      lightBg: '#EFF6FF',
      iconColor: '#3B82F6',
      path: '/farmhouses'
    },
    {
      title: 'Pending Approvals',
      value: stats.pendingFarmhouses,
      icon: <CheckCircle />,
      gradient: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
      lightBg: '#FFFBEB',
      iconColor: '#F59E0B',
      path: '/farmhouse-approvals',
      highlight: stats.pendingFarmhouses > 0
    },
    {
      title: 'Total Users',
      value: stats.totalUsers,
      icon: <People />,
      gradient: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
      lightBg: '#ECFDF5',
      iconColor: '#10B981',
      path: '/users'
    },
    {
      title: 'Total Bookings',
      value: stats.totalBookings,
      icon: <BookOnline />,
      gradient: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)',
      lightBg: '#F5F3FF',
      iconColor: '#8B5CF6',
      path: '/bookings'
    },
    {
      title: 'Active Coupons',
      value: stats.activeCoupons,
      icon: <LocalOffer />,
      gradient: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
      lightBg: '#FEF2F2',
      iconColor: '#EF4444',
      path: '/coupons'
    }
  ];

  const bookingStats = [
    { label: 'Today', value: stats.todayBookings, icon: <CalendarToday sx={{ fontSize: 18 }} /> },
    { label: 'This Week', value: stats.weekBookings, icon: <DateRange sx={{ fontSize: 18 }} /> },
    { label: 'This Month', value: stats.monthBookings, icon: <EventNote sx={{ fontSize: 18 }} /> }
  ];

  const quickActions = [
    ...(stats.pendingFarmhouses > 0 ? [{
      label: `${stats.pendingFarmhouses} farmhouse${stats.pendingFarmhouses > 1 ? 's' : ''} awaiting approval`,
      path: '/farmhouse-approvals',
      color: '#F59E0B',
      bg: alpha('#F59E0B', 0.08),
    }] : []),
    {
      label: 'Create New Coupon',
      path: '/coupons',
      color: '#8B5CF6',
      bg: alpha('#8B5CF6', 0.08),
    },
    {
      label: 'View All Bookings',
      path: '/bookings',
      color: '#10B981',
      bg: alpha('#10B981', 0.08),
    },
    {
      label: 'Revenue Dashboard',
      path: '/revenue',
      color: '#3B82F6',
      bg: alpha('#3B82F6', 0.08),
    },
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
        <Grid container spacing={2.5}>
          {statCards.map((card, index) => (
            <Grid size={{ xs: 12, sm: 6, md: 4, lg: index < 3 ? 4 : 6 }} key={index}>
              <Card
                sx={{
                  height: '100%',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  border: '1px solid',
                  borderColor: alpha('#000', 0.06),
                  boxShadow: 'none',
                  position: 'relative',
                  overflow: 'hidden',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: `0 8px 24px ${alpha(card.iconColor, 0.15)}`,
                    borderColor: alpha(card.iconColor, 0.2),
                  },
                }}
                onClick={() => navigate(card.path)}
              >
                {card.highlight && (
                  <Box sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 3,
                    background: card.gradient,
                  }} />
                )}
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box>
                      <Typography sx={{
                        fontSize: '0.8rem',
                        fontWeight: 500,
                        color: '#6B7280',
                        mb: 1,
                        textTransform: 'uppercase',
                        letterSpacing: '0.03em',
                      }}>
                        {card.title}
                      </Typography>
                      <Typography sx={{
                        fontSize: '2rem',
                        fontWeight: 700,
                        color: '#111827',
                        lineHeight: 1,
                      }}>
                        {card.value}
                      </Typography>
                    </Box>
                    <Box sx={{
                      width: 48,
                      height: 48,
                      borderRadius: 2.5,
                      background: card.lightBg,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: card.iconColor,
                      '& .MuiSvgIcon-root': { fontSize: 24 },
                    }}>
                      {card.icon}
                    </Box>
                  </Box>
                  <Box sx={{
                    display: 'flex',
                    alignItems: 'center',
                    mt: 2,
                    color: card.iconColor,
                  }}>
                    <Typography sx={{ fontSize: '0.8rem', fontWeight: 600 }}>
                      View Details
                    </Typography>
                    <ArrowForward sx={{ fontSize: 14, ml: 0.5 }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        <Grid container spacing={2.5} sx={{ mt: 1 }}>
          <Grid size={{ xs: 12, md: 7 }}>
            <Paper
              elevation={0}
              sx={{
                p: 3,
                border: '1px solid',
                borderColor: alpha('#000', 0.06),
                borderRadius: 3,
                height: '100%',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <Box sx={{
                  width: 40,
                  height: 40,
                  borderRadius: 2,
                  background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mr: 1.5,
                }}>
                  <TrendingUp sx={{ color: 'white', fontSize: 20 }} />
                </Box>
                <Box>
                  <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: '#111827' }}>
                    Booking Statistics
                  </Typography>
                  <Typography sx={{ fontSize: '0.75rem', color: '#9CA3AF' }}>
                    Recent booking activity
                  </Typography>
                </Box>
              </Box>
              {bookingStats.map((stat, index) => (
                <Box
                  key={index}
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    py: 2,
                    px: 2,
                    borderRadius: 2,
                    mb: index < bookingStats.length - 1 ? 1 : 0,
                    backgroundColor: alpha('#10B981', 0.04),
                    transition: 'all 0.2s',
                    '&:hover': {
                      backgroundColor: alpha('#10B981', 0.08),
                    }
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box sx={{
                      width: 32,
                      height: 32,
                      borderRadius: 1.5,
                      backgroundColor: alpha('#10B981', 0.1),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#10B981',
                    }}>
                      {stat.icon}
                    </Box>
                    <Typography sx={{ fontSize: '0.9rem', fontWeight: 500, color: '#374151' }}>
                      {stat.label}
                    </Typography>
                  </Box>
                  <Typography sx={{
                    fontSize: '1.5rem',
                    fontWeight: 700,
                    color: '#10B981',
                  }}>
                    {stat.value}
                  </Typography>
                </Box>
              ))}
            </Paper>
          </Grid>

          <Grid size={{ xs: 12, md: 5 }}>
            <Paper
              elevation={0}
              sx={{
                p: 3,
                border: '1px solid',
                borderColor: alpha('#000', 0.06),
                borderRadius: 3,
                height: '100%',
              }}
            >
              <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: '#111827', mb: 0.5 }}>
                Quick Actions
              </Typography>
              <Typography sx={{ fontSize: '0.75rem', color: '#9CA3AF', mb: 2.5 }}>
                Common tasks and shortcuts
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {quickActions.map((action, index) => (
                  <Box
                    key={index}
                    onClick={() => navigate(action.path)}
                    sx={{
                      p: 2,
                      backgroundColor: action.bg,
                      borderRadius: 2,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      '&:hover': {
                        transform: 'translateX(4px)',
                        backgroundColor: alpha(action.color, 0.12),
                      }
                    }}
                  >
                    <Typography sx={{
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      color: action.color,
                    }}>
                      {action.label}
                    </Typography>
                    <ArrowForward sx={{ fontSize: 16, color: action.color, opacity: 0.6 }} />
                  </Box>
                ))}
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </MainLayout>
  );
};

export default Dashboard;
