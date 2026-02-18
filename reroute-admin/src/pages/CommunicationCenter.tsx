import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
  Card,
  CardActionArea,
  InputAdornment
} from '@mui/material';
import { Send, Search, Group, Store, Person } from '@mui/icons-material';
import { collection, getDocs, addDoc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import { useSnackbar } from '../context/SnackbarContext';
import MainLayout from '../components/layout/MainLayout';

interface Communication {
  id: string;
  recipientType: string;
  title: string;
  message: string;
  sent_at: any;
  sentBy: string;
  recipientCount?: number;
  notificationSent?: boolean;
  notificationSentAt?: any;
  deliveryStatus?: {
    success: number;
    failure: number;
  };
  notificationError?: string;
}

const templates = [
  {
    title: 'Welcome Message',
    subject: 'Welcome to ReRoute!',
    message: 'Thank you for joining our platform. We\'re excited to have you on board! Explore amazing farmhouses and enjoy your stay.'
  },
  {
    title: 'Booking Confirmation',
    subject: 'Your Booking is Confirmed!',
    message: 'Great news! Your farmhouse booking has been confirmed. We hope you have a wonderful experience. Check your booking details in the app.'
  },
  {
    title: 'Special Discount',
    subject: 'Exclusive Discount Just for You!',
    message: 'We have a special discount offer for you! Use code SPECIAL50 to get 50% off on your next booking. Hurry, limited time offer!'
  },
  {
    title: 'Owner Welcome',
    subject: 'Welcome Farmhouse Owner!',
    message: 'Thank you for listing your property with ReRoute. Our team will review your submission and get back to you within 24-48 hours.'
  },
  {
    title: 'Property Approved',
    subject: 'Your Property is Now Live!',
    message: 'Congratulations! Your farmhouse has been approved and is now live on ReRoute. Start receiving bookings today!'
  }
];

const CommunicationCenter: React.FC = () => {
  const { currentUser } = useAuth();
  const { showSuccess, showError, showWarning } = useSnackbar();
  const [communications, setCommunications] = useState<Communication[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [recipientType, setRecipientType] = useState('all_users');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchCommunications();
  }, []);

  const fetchCommunications = async () => {
    try {
      setLoading(true);
      const q = query(collection(db, 'communications'), orderBy('sent_at', 'desc'));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Communication[];
      setCommunications(data);
    } catch (error) {
      console.error('Error fetching communications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!subject.trim() || !message.trim()) {
      showWarning('Please fill in subject and message');
      return;
    }

    try {
      setSending(true);

      // Get recipient count
      let recipientCount = 0;
      if (recipientType === 'all_users' || recipientType === 'active_users') {
        const usersSnap = await getDocs(collection(db, 'users'));
        if (recipientType === 'active_users') {
          recipientCount = usersSnap.docs.filter(doc => doc.data().is_active).length;
        } else {
          recipientCount = usersSnap.size;
        }
      } else if (recipientType === 'all_owners') {
        const usersSnap = await getDocs(collection(db, 'users'));
        recipientCount = usersSnap.docs.filter(doc => doc.data().role === 'owner').length;
      } else if (recipientType === 'farmhouse_owners') {
        const farmhousesSnap = await getDocs(collection(db, 'farmhouses'));
        const ownerIds = new Set(farmhousesSnap.docs.map(doc => doc.data().ownerId || doc.data().owner_id));
        recipientCount = ownerIds.size;
      }

      await addDoc(collection(db, 'communications'), {
        recipientType: recipientType,
        title: subject,
        message,
        sent_at: serverTimestamp(),
        sentBy: currentUser?.email || 'admin',
        recipientCount: recipientCount,
        type: 'admin_message',
        notificationSent: false
      });

      setSubject('');
      setMessage('');
      fetchCommunications();
      showSuccess(`Message sent successfully! Push notifications will be delivered to ${recipientCount} recipients shortly.`);
    } catch (error) {
      console.error('Error sending message:', error);
      showError('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const applyTemplate = (template: typeof templates[0]) => {
    setSubject(template.subject);
    setMessage(template.message);
  };

  const filteredComms = communications.filter(comm =>
    comm.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    comm.message?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    comm.recipientType?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRecipientIcon = (type: string) => {
    switch (type) {
      case 'all_users':
      case 'active_users':
        return <Group />;
      case 'all_owners':
      case 'farmhouse_owners':
        return <Store />;
      case 'specific_user':
        return <Person />;
      default:
        return <Group />;
    }
  };

  const getRecipientLabel = (type: string) => {
    switch (type) {
      case 'all_users':
        return 'All Users';
      case 'all_owners':
        return 'All Owners';
      case 'active_users':
        return 'Active Users Only';
      case 'farmhouse_owners':
        return 'Farmhouse Owners';
      case 'specific_user':
        return 'Specific User';
      default:
        return type;
    }
  };

  return (
    <MainLayout>
      <Box>
        <Grid container spacing={2.5}>
          {/* Send Message Section */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'rgba(0,0,0,0.06)', borderRadius: 3 }}>
              <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: '#111827', mb: 0.5 }}>
                Send Push Notification
              </Typography>
              <Typography sx={{ fontSize: '0.75rem', color: '#9CA3AF', mb: 2.5 }}>
                Messages are delivered as push notifications to mobile devices
              </Typography>
              
              <FormControl fullWidth size='small' sx={{ mb: 2 }}>
                <InputLabel>Recipients</InputLabel>
                <Select
                  value={recipientType}
                  onChange={(e) => setRecipientType(e.target.value)}
                  startAdornment={
                    <InputAdornment position='start'>
                      {getRecipientIcon(recipientType)}
                    </InputAdornment>
                  }
                  sx={{ borderRadius: 2 }}
                >
                  <MenuItem value='all_users'>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Group fontSize='small' />
                      All Users
                    </Box>
                  </MenuItem>
                  <MenuItem value='all_owners'>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Store fontSize='small' />
                      All Owners
                    </Box>
                  </MenuItem>
                  <MenuItem value='farmhouse_owners'>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Store fontSize='small' />
                      Farmhouse Owners Only
                    </Box>
                  </MenuItem>
                  <MenuItem value='active_users'>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Group fontSize='small' />
                      Active Users Only
                    </Box>
                  </MenuItem>
                  <MenuItem value='specific_user'>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Person fontSize='small' />
                      Specific User
                    </Box>
                  </MenuItem>
                </Select>
              </FormControl>

              <TextField
                fullWidth
                label='Subject *'
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                size='small'
                sx={{ mb: 2, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                placeholder='Enter message subject'
              />

              <TextField
                fullWidth
                multiline
                rows={6}
                label='Message *'
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                sx={{ mb: 2.5, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                placeholder='Enter your message here...'
              />

              <Button
                fullWidth
                variant='contained'
                startIcon={<Send sx={{ fontSize: 18 }} />}
                onClick={handleSendMessage}
                disabled={sending || !subject.trim() || !message.trim()}
                sx={{
                  py: 1.25, textTransform: 'none', fontWeight: 600, borderRadius: 2, fontSize: '0.9rem',
                  background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                  boxShadow: 'none',
                  '&:hover': { background: 'linear-gradient(135deg, #059669 0%, #047857 100%)', boxShadow: '0 4px 12px rgba(16,185,129,0.3)' },
                  '&.Mui-disabled': { background: '#E5E7EB', color: '#9CA3AF' },
                }}
              >
                {sending ? 'Sending...' : 'Send Message'}
              </Button>
            </Paper>
          </Grid>

          {/* Templates Section */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'rgba(0,0,0,0.06)', borderRadius: 3 }}>
              <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: '#111827', mb: 0.5 }}>
                Message Templates
              </Typography>
              <Typography sx={{ fontSize: '0.75rem', color: '#9CA3AF', mb: 2.5 }}>
                Click on a template to use it
              </Typography>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {templates.map((template, index) => (
                  <Card key={index} elevation={0} sx={{ border: '1px solid', borderColor: 'rgba(0,0,0,0.06)', borderRadius: 2, transition: 'all 0.2s', '&:hover': { borderColor: 'rgba(16,185,129,0.3)', backgroundColor: 'rgba(16,185,129,0.02)' } }}>
                    <CardActionArea onClick={() => applyTemplate(template)} sx={{ p: 2 }}>
                      <Typography sx={{ fontWeight: 600, fontSize: '0.9rem', color: '#111827', mb: 0.25 }}>
                        {template.title}
                      </Typography>
                      <Typography sx={{ fontSize: '0.8rem', color: '#9CA3AF' }} noWrap>
                        {template.subject}
                      </Typography>
                    </CardActionArea>
                  </Card>
                ))}
              </Box>
            </Paper>
          </Grid>

          {/* Communication History */}
          <Grid size={{ xs: 12 }}>
            <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'rgba(0,0,0,0.06)', borderRadius: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5 }}>
                <Box>
                  <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: '#111827' }}>Communication History</Typography>
                  <Typography sx={{ fontSize: '0.75rem', color: '#9CA3AF' }}>{communications.length} messages sent</Typography>
                </Box>
                <TextField
                  size='small'
                  placeholder='Search messages...'
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  InputProps={{
                    startAdornment: <InputAdornment position='start'><Search sx={{ fontSize: 20, color: '#9CA3AF' }} /></InputAdornment>,
                  }}
                  sx={{
                    width: 260,
                    '& .MuiOutlinedInput-root': { borderRadius: 2, backgroundColor: '#F9FAFB', '& fieldset': { borderColor: 'transparent' }, '&:hover fieldset': { borderColor: '#E5E7EB' }, '&.Mui-focused fieldset': { borderColor: '#10B981' } },
                  }}
                />
              </Box>

              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress size={48} sx={{ color: '#10B981' }} />
                </Box>
              ) : (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow sx={{ '& th': { backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB', color: '#6B7280', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', py: 1.5 } }}>
                        <TableCell>Date</TableCell>
                        <TableCell>Recipients</TableCell>
                        <TableCell>Subject</TableCell>
                        <TableCell>Message</TableCell>
                        <TableCell>Count</TableCell>
                        <TableCell>Delivery</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredComms.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} align='center' sx={{ py: 4 }}>
                            <Typography sx={{ color: '#9CA3AF' }}>
                              {communications.length === 0 
                                ? 'No messages sent yet. Send your first message above.'
                                : 'No messages match your search.'}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredComms.map((comm) => (
                          <TableRow key={comm.id} hover sx={{ '&:hover': { backgroundColor: '#FAFAFA' }, '& td': { borderBottom: '1px solid #F3F4F6', py: 1.5 } }}>
                            <TableCell>
                              <Typography sx={{ fontSize: '0.8rem', color: '#6B7280' }}>
                                {comm.sent_at?.toDate ? 
                                  new Date(comm.sent_at.toDate()).toLocaleDateString('en-IN', {
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric'
                                  }) : 
                                  'N/A'}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={getRecipientLabel(comm.recipientType)}
                                size='small'
                                sx={{ backgroundColor: '#EFF6FF', color: '#2563EB', fontWeight: 600, fontSize: '0.7rem' }}
                              />
                            </TableCell>
                            <TableCell>
                              <Typography sx={{ fontSize: '0.85rem', fontWeight: 600, color: '#111827' }}>
                                {comm.title}
                              </Typography>
                            </TableCell>
                            <TableCell sx={{ maxWidth: 300 }}>
                              <Typography sx={{ fontSize: '0.8rem', color: '#6B7280' }} noWrap>
                                {comm.message}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={`${comm.recipientCount || 0}`}
                                size='small'
                                sx={{ backgroundColor: '#F3F4F6', color: '#6B7280', fontWeight: 600, fontSize: '0.7rem', minWidth: 32 }}
                              />
                            </TableCell>
                            <TableCell>
                              {comm.notificationSent ? (
                                <Box sx={{ display: 'flex', gap: 0.5 }}>
                                  <Chip label={`${comm.deliveryStatus?.success || 0} sent`} size='small' sx={{ backgroundColor: '#ECFDF5', color: '#059669', fontWeight: 600, fontSize: '0.65rem' }} />
                                  {comm.deliveryStatus && comm.deliveryStatus.failure > 0 && (
                                    <Chip label={`${comm.deliveryStatus.failure} failed`} size='small' sx={{ backgroundColor: '#FEF2F2', color: '#DC2626', fontWeight: 600, fontSize: '0.65rem' }} />
                                  )}
                                </Box>
                              ) : comm.notificationError ? (
                                <Chip label='Failed' size='small' sx={{ backgroundColor: '#FEF2F2', color: '#DC2626', fontWeight: 600, fontSize: '0.7rem' }} />
                              ) : (
                                <Chip label='Pending' size='small' sx={{ backgroundColor: '#FFFBEB', color: '#D97706', fontWeight: 600, fontSize: '0.7rem' }} />
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </MainLayout>
  );
};

export default CommunicationCenter;