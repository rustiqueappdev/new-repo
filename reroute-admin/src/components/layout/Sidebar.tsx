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
  Badge,
  useTheme,
  useMediaQuery,
  alpha
} from '@mui/material';
import {
  Dashboard,
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
  Landscape
} from '@mui/icons-material';
import { usePendingCount } from '../../context/PendingCountContext';

const drawerWidth = 272;

interface SidebarProps {
  mobileOpen: boolean;
  onDrawerToggle: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ mobileOpen, onDrawerToggle }) => {
  const { pendingFarmhouses } = usePendingCount();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const menuSections = [
    {
      label: 'Overview',
      items: [
        { text: 'Dashboard', icon: <Dashboard />, path: '/dashboard' },
      ]
    },
    {
      label: 'Properties',
      items: [
        { text: 'Approvals', icon: <CheckCircle />, path: '/farmhouse-approvals', badge: pendingFarmhouses },
        { text: 'All Farmhouses', icon: <HomeWork />, path: '/farmhouses' },
      ]
    },
    {
      label: 'Operations',
      items: [
        { text: 'Bookings', icon: <BookOnline />, path: '/bookings' },
        { text: 'Users', icon: <People />, path: '/users' },
        { text: 'Reviews', icon: <Star />, path: '/reviews' },
      ]
    },
    {
      label: 'Finance',
      items: [
        { text: 'Coupons', icon: <LocalOffer />, path: '/coupons' },
        { text: 'Payments', icon: <Payment />, path: '/payments' },
        { text: 'Revenue', icon: <TrendingUp />, path: '/revenue' },
        { text: 'Analytics', icon: <BarChart />, path: '/analytics' },
      ]
    },
    {
      label: 'Engage',
      items: [
        { text: 'Communications', icon: <Email />, path: '/communications' },
      ]
    }
  ];

  const handleNavigation = (path: string) => {
    navigate(path);
    if (isMobile) {
      onDrawerToggle();
    }
  };

  const drawerContent = (
    <Box sx={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)',
      color: '#fff',
    }}>
      {/* Logo */}
      <Box sx={{
        px: 2.5,
        py: 3,
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
      }}>
        <Box sx={{
          width: 40,
          height: 40,
          borderRadius: 2,
          background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 16px rgba(16,185,129,0.3)',
          flexShrink: 0,
        }}>
          <Landscape sx={{ color: 'white', fontSize: 22 }} />
        </Box>
        <Box>
          <Typography sx={{
            fontWeight: 700,
            fontSize: '1.15rem',
            letterSpacing: '-0.01em',
            lineHeight: 1.2,
          }}>
            ReRoute
          </Typography>
          <Typography sx={{
            fontSize: '0.7rem',
            color: alpha('#fff', 0.4),
            fontWeight: 500,
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
          }}>
            Admin Panel
          </Typography>
        </Box>
      </Box>

      {/* Navigation */}
      <Box sx={{ flex: 1, overflowY: 'auto', px: 1.5, pb: 2, mt: 1 }}>
        {menuSections.map((section) => (
          <Box key={section.label} sx={{ mb: 2 }}>
            <Typography sx={{
              fontSize: '0.65rem',
              fontWeight: 600,
              color: alpha('#fff', 0.3),
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              px: 1.5,
              mb: 0.75,
            }}>
              {section.label}
            </Typography>
            <List disablePadding>
              {section.items.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <ListItem key={item.text} disablePadding sx={{ mb: 0.25 }}>
                    <ListItemButton
                      onClick={() => handleNavigation(item.path)}
                      sx={{
                        borderRadius: 2,
                        py: 1,
                        px: 1.5,
                        minHeight: 42,
                        transition: 'all 0.2s ease',
                        ...(isActive ? {
                          background: 'linear-gradient(135deg, rgba(16,185,129,0.15) 0%, rgba(16,185,129,0.08) 100%)',
                          '&:hover': {
                            background: 'linear-gradient(135deg, rgba(16,185,129,0.2) 0%, rgba(16,185,129,0.12) 100%)',
                          },
                        } : {
                          '&:hover': {
                            backgroundColor: alpha('#fff', 0.05),
                          },
                        }),
                      }}
                    >
                      <ListItemIcon sx={{
                        minWidth: 36,
                        color: isActive ? '#10B981' : alpha('#fff', 0.4),
                        transition: 'color 0.2s ease',
                        '& .MuiSvgIcon-root': { fontSize: 20 },
                      }}>
                        {item.badge && item.badge > 0 ? (
                          <Badge
                            badgeContent={item.badge}
                            sx={{
                              '& .MuiBadge-badge': {
                                backgroundColor: '#EF4444',
                                color: '#fff',
                                fontSize: '0.65rem',
                                fontWeight: 700,
                                minWidth: 18,
                                height: 18,
                              }
                            }}
                          >
                            {item.icon}
                          </Badge>
                        ) : (
                          item.icon
                        )}
                      </ListItemIcon>
                      <ListItemText
                        primary={item.text}
                        primaryTypographyProps={{
                          fontSize: '0.85rem',
                          fontWeight: isActive ? 600 : 400,
                          color: isActive ? '#fff' : alpha('#fff', 0.6),
                        }}
                      />
                      {isActive && (
                        <Box sx={{
                          width: 4,
                          height: 20,
                          borderRadius: 2,
                          background: 'linear-gradient(180deg, #10B981 0%, #059669 100%)',
                          boxShadow: '0 0 8px rgba(16,185,129,0.4)',
                        }} />
                      )}
                    </ListItemButton>
                  </ListItem>
                );
              })}
            </List>
          </Box>
        ))}
      </Box>

      {/* Bottom section */}
      <Box sx={{
        px: 2.5,
        py: 2,
        borderTop: '1px solid',
        borderColor: alpha('#fff', 0.06),
      }}>
        <Box sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          px: 1,
        }}>
          <Box sx={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.75rem',
            fontWeight: 700,
          }}>
            A
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{
              fontSize: '0.8rem',
              fontWeight: 600,
              lineHeight: 1.2,
            }}>
              Admin
            </Typography>
            <Typography sx={{
              fontSize: '0.65rem',
              color: alpha('#fff', 0.4),
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              Super Administrator
            </Typography>
          </Box>
        </Box>
      </Box>
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
          keepMounted: true,
        }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
            border: 'none',
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
            border: 'none',
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