import React, { useState as useStateHeader, useEffect as useEffectHeader } from 'react';
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
  Divider,
  Badge,
  Popover,
  List,
  ListItem,
  CircularProgress,
  Chip
} from '@mui/material';
import {
  Logout,
  Menu as MenuIcon,
  NotificationsNoneOutlined,
  SearchOutlined,
  Home,
  HourglassEmpty,
  DeleteOutline
} from '@mui/icons-material';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db } from '../../config/firebase';

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
  '/coupons': { title: 'Coupons', subtitle: 'Manage discount codes' },
  '/payments': { title: 'Payments', subtitle: 'Track revenue & payouts' },
  '/revenue': { title: 'Revenue', subtitle: 'Financial analytics' },
  '/analytics': { title: 'Analytics', subtitle: 'Platform insights' },
  '/reviews': { title: 'Reviews', subtitle: 'Monitor user feedback' },
  '/communications': { title: 'Communications', subtitle: 'Send notifications' },
};

interface AdminNotification {
  id: string;
  type: 'pending_approval' | 'farmhouse_updated' | 'other';
  farmhouse_name?: string;
  farmhouse_id?: string;
  message: string;
  read: boolean;
  created_at?: any;
}

const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [notifAnchorEl, setNotifAnchorEl] = useStateHeader<null | HTMLElement>(null);
  const [notifications, setNotifications] = useStateHeader<AdminNotification[]>([]);
  const [notifLoading, setNotifLoading] = useStateHeader(false);
  const [unreadCount, setUnreadCount] = useStateHeader(0);

  const functions = getFunctions();
  const getAdminNotificationsCall = httpsCallable(functions, 'getAdminNotifications');
  const manageAdminNotificationsCall = httpsCallable(functions, 'manageAdminNotifications');

  const fetchNotifications = async () => {
    try {
      setNotifLoading(true);
      const items: AdminNotification[] = [];

      // Pending farmhouses → "sent for approval" notifications
      const pendingQ = query(collection(db, 'farmhouses'), where('status', '==', 'pending'));
      const pendingSnap = await getDocs(pendingQ);
      pendingSnap.docs.forEach(d => {
        const data = d.data();
        const name = data.basicDetails?.name || data.name || 'Unnamed';
        items.push({
          id: `pending_${d.id}`,
          type: 'pending_approval',
          farmhouse_id: d.id,
          farmhouse_name: name,
          message: `${name} submitted for approval`,
          read: false,
          created_at: data.created_at || data.createdAt
        });
      });

      // Fetch admin_notifications via Cloud Function (bypasses Firestore rules)
      try {
        const result = await getAdminNotificationsCall();
        const data = result.data as { notifications: any[] };
        data.notifications.forEach((n: any) => {
          items.push({
            id: n.id,
            type: n.type || 'farmhouse_updated',
            farmhouse_id: n.farmhouse_id,
            farmhouse_name: n.farmhouse_name,
            message: n.message || 'Farmhouse details updated',
            read: n.read || false,
            created_at: n.created_at ? new Date(n.created_at) : null
          });
        });
      } catch (notifErr) {
        console.error('Error fetching admin_notifications:', notifErr);
      }

      // Sort: unread first, then by created_at desc
      items.sort((a, b) => {
        if (a.read !== b.read) return a.read ? 1 : -1;
        return 0;
      });

      setNotifications(items);
      setUnreadCount(items.filter(n => !n.read).length);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setNotifLoading(false);
    }
  };

  useEffectHeader(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleNotifOpen = (e: React.MouseEvent<HTMLElement>) => {
    setNotifAnchorEl(e.currentTarget);
    fetchNotifications();
  };

  const handleNotifClose = () => setNotifAnchorEl(null);

  const markAllRead = async () => {
    try {
      await manageAdminNotificationsCall({ action: 'mark_all_read' });
      setNotifications(prev => prev.map(n =>
        n.type === 'pending_approval' ? n : { ...n, read: true }
      ));
      const pendingCount = notifications.filter(n => n.type === 'pending_approval').length;
      setUnreadCount(pendingCount);
    } catch (err) {
      console.error('Error marking all read:', err);
    }
  };

  const clearAll = async () => {
    try {
      await manageAdminNotificationsCall({ action: 'clear_all' });
      setNotifications(prev => prev.filter(n => n.type === 'pending_approval'));
      const pendingCount = notifications.filter(n => n.type === 'pending_approval').length;
      setUnreadCount(pendingCount);
    } catch (err) {
      console.error('Error clearing notifications:', err);
    }
  };

  const formatNotifTime = (ts: any) => {
    if (!ts) return '';
    try {
      const d = ts.toDate ? ts.toDate() : new Date(ts);
      return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    } catch { return ''; }
  };

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
            onClick={handleNotifOpen}
            sx={{
              color: '#6B7280',
              backgroundColor: alpha('#000', 0.04),
              '&:hover': { backgroundColor: alpha('#000', 0.08) },
              width: 36,
              height: 36,
            }}
          >
            <Badge badgeContent={unreadCount || null} color='error' max={99}>
              <NotificationsNoneOutlined sx={{ fontSize: 20 }} />
            </Badge>
          </IconButton>

          <Popover
            open={Boolean(notifAnchorEl)}
            anchorEl={notifAnchorEl}
            onClose={handleNotifClose}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            PaperProps={{
              sx: {
                mt: 1, width: 360, maxHeight: 480, overflow: 'hidden',
                borderRadius: 2.5, boxShadow: '0 10px 40px rgba(0,0,0,0.14)',
                border: '1px solid', borderColor: alpha('#000', 0.06),
              }
            }}
          >
            <Box sx={{ px: 2, py: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #F3F4F6' }}>
              <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', color: '#111827' }}>Notifications</Typography>
              <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                {unreadCount > 0 && (
                  <Typography
                    onClick={markAllRead}
                    sx={{ fontSize: '0.75rem', color: '#10B981', fontWeight: 600, cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
                  >
                    Mark all read
                  </Typography>
                )}
                {notifications.some(n => n.type !== 'pending_approval') && (
                  <Typography
                    onClick={clearAll}
                    sx={{ fontSize: '0.75rem', color: '#EF4444', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 0.3, '&:hover': { textDecoration: 'underline' } }}
                  >
                    <DeleteOutline sx={{ fontSize: 14 }} />
                    Clear all
                  </Typography>
                )}
              </Box>
            </Box>
            {notifLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                <CircularProgress size={28} sx={{ color: '#10B981' }} />
              </Box>
            ) : notifications.length === 0 ? (
              <Box sx={{ py: 4, textAlign: 'center' }}>
                <NotificationsNoneOutlined sx={{ fontSize: 40, color: '#E5E7EB', mb: 1 }} />
                <Typography sx={{ color: '#9CA3AF', fontSize: '0.875rem' }}>No notifications</Typography>
              </Box>
            ) : (
              <List dense sx={{ maxHeight: 400, overflowY: 'auto', p: 0 }}>
                {notifications.map((notif) => (
                  <ListItem
                    key={notif.id}
                    sx={{
                      py: 1.5, px: 2,
                      backgroundColor: notif.read ? 'transparent' : alpha('#10B981', 0.04),
                      borderBottom: '1px solid #F9FAFB',
                      cursor: 'pointer',
                      '&:hover': { backgroundColor: '#F9FAFB' },
                      alignItems: 'flex-start', gap: 1.5
                    }}
                    onClick={() => {
                      if (notif.type === 'pending_approval') {
                        navigate('/farmhouse-approvals');
                      } else {
                        navigate('/farmhouses');
                      }
                      handleNotifClose();
                    }}
                  >
                    <Box sx={{
                      width: 32, height: 32, borderRadius: '50%', flexShrink: 0, mt: 0.25,
                      backgroundColor: notif.type === 'pending_approval' ? '#FFFBEB' : '#EFF6FF',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: notif.type === 'pending_approval' ? '#D97706' : '#2563EB'
                    }}>
                      {notif.type === 'pending_approval' ? <HourglassEmpty sx={{ fontSize: 16 }} /> : <Home sx={{ fontSize: 16 }} />}
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography sx={{ fontSize: '0.82rem', color: '#111827', fontWeight: notif.read ? 400 : 600, lineHeight: 1.4 }}>
                        {notif.message}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, mt: 0.5, alignItems: 'center' }}>
                        <Chip
                          label={notif.type === 'pending_approval' ? 'Pending Approval' : 'Details Updated'}
                          size='small'
                          sx={{
                            height: 18, fontSize: '0.62rem', fontWeight: 600,
                            backgroundColor: notif.type === 'pending_approval' ? '#FFFBEB' : '#EFF6FF',
                            color: notif.type === 'pending_approval' ? '#D97706' : '#2563EB',
                          }}
                        />
                        {notif.created_at && (
                          <Typography sx={{ fontSize: '0.7rem', color: '#9CA3AF' }}>
                            {formatNotifTime(notif.created_at)}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                    {!notif.read && (
                      <Box sx={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: '#10B981', flexShrink: 0, mt: 0.75 }} />
                    )}
                  </ListItem>
                ))}
              </List>
            )}
          </Popover>

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