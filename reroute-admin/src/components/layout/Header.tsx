import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  IconButton,
  Menu,
  MenuItem,
  useTheme,
  useMediaQuery,
  alpha,
  Divider
} from '@mui/material';
import {
  Logout,
  Menu as MenuIcon,
  NotificationsNoneOutlined,
  SearchOutlined
} from '@mui/icons-material';

const drawerWidth = 272;

interface HeaderProps {
  onMenuClick: () => void;
}

const pageTitles: Record<string, { title: string; subtitle: string }> = {
  '/dashboard': { title: 'Dashboard', subtitle: 'Overview of your platform' },
  '/farmhouse-approvals': { title: 'Farmhouse Approvals', subtitle: 'Review pending submissions' },
  '/farmhouses': { title: 'All Farmhouses', subtitle: 'Manage property listings' },
  '/bookings': { title: 'Bookings', subtitle: 'Track reservations' },
  '/users': { title: 'Users', subtitle: 'Manage platform users' },
  '/kyc': { title: 'Owner KYC', subtitle: 'Verify owner documents' },
  '/coupons': { title: 'Coupons', subtitle: 'Manage discount codes' },
  '/payments': { title: 'Payments', subtitle: 'Track revenue & payouts' },
  '/revenue': { title: 'Revenue', subtitle: 'Financial analytics' },
  '/analytics': { title: 'Analytics', subtitle: 'Platform insights' },
  '/reviews': { title: 'Reviews', subtitle: 'Monitor user feedback' },
  '/communications': { title: 'Communications', subtitle: 'Send notifications' },
};

const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const pageInfo = pageTitles[location.pathname] || { title: 'Dashboard', subtitle: '' };

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <AppBar
      position='fixed'
      elevation={0}
      sx={{
        width: { xs: '100%', md: `calc(100% - ${drawerWidth}px)` },
        ml: { xs: 0, md: `${drawerWidth}px` },
        backgroundColor: alpha('#fff', 0.8),
        backdropFilter: 'blur(20px)',
        color: 'text.primary',
        borderBottom: '1px solid',
        borderColor: alpha('#000', 0.06),
      }}
    >
      <Toolbar sx={{ minHeight: { xs: 56, sm: 64 }, px: { xs: 2, sm: 3 } }}>
        {isMobile && (
          <IconButton
            color='inherit'
            aria-label='open drawer'
            edge='start'
            onClick={onMenuClick}
            sx={{ mr: 1.5 }}
          >
            <MenuIcon />
          </IconButton>
        )}

        <Box sx={{ flexGrow: 1 }}>
          <Typography
            variant='h6'
            sx={{
              fontWeight: 700,
              fontSize: { xs: '1rem', sm: '1.1rem' },
              lineHeight: 1.3,
              color: '#111827',
            }}
          >
            {pageInfo.title}
          </Typography>
          {!isMobile && pageInfo.subtitle && (
            <Typography
              variant='body2'
              sx={{
                color: '#9CA3AF',
                fontSize: '0.8rem',
                lineHeight: 1.2,
              }}
            >
              {pageInfo.subtitle}
            </Typography>
          )}
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {!isMobile && (
            <IconButton
              size='small'
              sx={{
                color: '#6B7280',
                backgroundColor: alpha('#000', 0.04),
                '&:hover': { backgroundColor: alpha('#000', 0.08) },
                width: 36,
                height: 36,
              }}
            >
              <SearchOutlined sx={{ fontSize: 20 }} />
            </IconButton>
          )}

          <IconButton
            size='small'
            sx={{
              color: '#6B7280',
              backgroundColor: alpha('#000', 0.04),
              '&:hover': { backgroundColor: alpha('#000', 0.08) },
              width: 36,
              height: 36,
            }}
          >
            <NotificationsNoneOutlined sx={{ fontSize: 20 }} />
          </IconButton>

          <Box
            onClick={handleMenu}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              ml: 1,
              pl: 1.5,
              pr: 1,
              py: 0.5,
              borderRadius: 10,
              cursor: 'pointer',
              transition: 'all 0.2s',
              '&:hover': { backgroundColor: alpha('#000', 0.04) },
            }}
          >
            <Box sx={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: '0.8rem',
              fontWeight: 700,
            }}>
              {currentUser?.email?.charAt(0).toUpperCase() || 'A'}
            </Box>
            {!isMobile && (
              <Typography sx={{
                fontSize: '0.85rem',
                fontWeight: 500,
                color: '#374151',
                maxWidth: 140,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {currentUser?.email?.split('@')[0] || 'Admin'}
              </Typography>
            )}
          </Box>

          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleClose}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            PaperProps={{
              sx: {
                mt: 1,
                borderRadius: 2,
                boxShadow: '0 10px 40px rgba(0,0,0,0.12)',
                border: '1px solid',
                borderColor: alpha('#000', 0.06),
                minWidth: 200,
              }
            }}
          >
            <Box sx={{ px: 2, py: 1.5 }}>
              <Typography sx={{ fontSize: '0.85rem', fontWeight: 600, color: '#111827' }}>
                {currentUser?.email?.split('@')[0] || 'Admin'}
              </Typography>
              <Typography sx={{ fontSize: '0.75rem', color: '#9CA3AF' }}>
                {currentUser?.email}
              </Typography>
            </Box>
            <Divider />
            <MenuItem
              onClick={handleLogout}
              sx={{
                py: 1.25,
                px: 2,
                fontSize: '0.85rem',
                color: '#EF4444',
                '&:hover': { backgroundColor: alpha('#EF4444', 0.06) },
              }}
            >
              <Logout sx={{ fontSize: 18, mr: 1.5 }} />
              Sign out
            </MenuItem>
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Header;