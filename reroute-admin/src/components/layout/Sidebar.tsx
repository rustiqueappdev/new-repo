import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Box,
  Typography,
  Divider,
  Badge,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  Dashboard,
  Home,
  HomeWork,
  BookOnline,
  People,
  LocalOffer,
  Payment,
  CheckCircle,
  TrendingUp,
  BarChart,
  Star,
  Email,
  VerifiedUser
} from '@mui/icons-material';
import { usePendingCount } from '../../context/PendingCountContext';

const drawerWidth = 260;

interface SidebarProps {
  mobileOpen: boolean;
  onDrawerToggle: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ mobileOpen, onDrawerToggle }) => {
  const { pendingFarmhouses, pendingKYC } = usePendingCount();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const menuItems = [
    { text: 'Dashboard', icon: <Dashboard />, path: '/dashboard' },
    { text: 'Farmhouse Approvals', icon: <CheckCircle />, path: '/farmhouse-approvals', badge: pendingFarmhouses },
    { text: 'All Farmhouses', icon: <HomeWork />, path: '/farmhouses' },
    { text: 'Bookings', icon: <BookOnline />, path: '/bookings' },
    { text: 'Users', icon: <People />, path: '/users' },
    { text: 'Owner KYC', icon: <VerifiedUser />, path: '/kyc', badge: pendingKYC },
    { text: 'Coupons', icon: <LocalOffer />, path: '/coupons' },
    { text: 'Payments', icon: <Payment />, path: '/payments' },
    { text: 'Revenue', icon: <TrendingUp />, path: '/revenue' },
    { text: 'Analytics', icon: <BarChart />, path: '/analytics' },
    { text: 'Reviews', icon: <Star />, path: '/reviews' },
    { text: 'Communications', icon: <Email />, path: '/communications' }
  ];

  const handleNavigation = (path: string) => {
    navigate(path);
    if (isMobile) {
      onDrawerToggle();
    }
  };

  const drawerContent = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ p: { xs: 2, sm: 3 }, textAlign: 'center' }}>
        <Home sx={{ fontSize: { xs: 32, sm: 40 }, color: 'primary.main', mb: 1 }} />
        <Typography variant='h5' fontWeight='bold' sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
          ReRoute
        </Typography>
        <Typography variant='caption' sx={{ color: 'text.secondary' }}>
          Admin Panel
        </Typography>
      </Box>

      <Divider />

      <List sx={{ mt: 1, flex: 1, overflowY: 'auto', px: 1 }}>
        {menuItems.map((item) => (
          <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
            <ListItemButton
              onClick={() => handleNavigation(item.path)}
              selected={location.pathname === item.path}
              sx={{
                borderRadius: 2,
                py: { xs: 1.5, sm: 1.25 },
                '&.Mui-selected': {
                  backgroundColor: 'primary.main',
                  color: 'white',
                  '&:hover': {
                    backgroundColor: 'primary.dark',
                  },
                  '& .MuiListItemIcon-root': {
                    color: 'white',
                  },
                },
                '&:hover': {
                  backgroundColor: 'action.hover',
                },
              }}
            >
              <ListItemIcon sx={{ color: 'text.secondary', minWidth: { xs: 36, sm: 40 } }}>
                {item.badge && item.badge > 0 ? (
                  <Badge badgeContent={item.badge} color='error'>
                    {item.icon}
                  </Badge>
                ) : (
                  item.icon
                )}
              </ListItemIcon>
              <ListItemText
                primary={item.text}
                primaryTypographyProps={{
                  fontSize: { xs: '0.875rem', sm: '1rem' }
                }}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Box>
  );

  return (
    <Box component='nav'>
      {/* Mobile drawer */}
      <Drawer
        variant='temporary'
        open={mobileOpen}
        onClose={onDrawerToggle}
        ModalProps={{
          keepMounted: true, // Better open performance on mobile
        }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
          },
        }}
      >
        {drawerContent}
      </Drawer>

      {/* Desktop drawer */}
      <Drawer
        variant='permanent'
        sx={{
          display: { xs: 'none', md: 'block' },
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
            borderRight: '1px solid',
            borderColor: 'divider',
          },
        }}
        open
      >
        {drawerContent}
      </Drawer>
    </Box>
  );
};

export default Sidebar;