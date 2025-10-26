import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid as Grid,
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
  CardContent,
  CardActionArea,
  Alert,
  InputAdornment,
  IconButton
} from '@mui/material';
import { Send, Search, Group, Store, Person } from '@mui/icons-material';
import { collection, getDocs, addDoc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import MainLayout from '../components/layout/MainLayout';

interface Communication {
  id: string;
  recipient_type: string;
  subject: string;
  message: string;
  sent_at: any;
  sent_by: string;
  recipient_count?: number;
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
      alert('Please fill in subject and message');
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
        recipient_type: recipientType,
        subject,
        message,
        sent_at: serverTimestamp(),
        sent_by: currentUser?.email || 'admin',
        recipient_count: recipientCount
      });

      setSubject('');
      setMessage('');
      fetchCommunications();
      alert(`Message sent successfully to ${recipientCount} recipients!`);
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const applyTemplate = (template: typeof templates[0]) => {
    setSubject(template.subject);
    setMessage(template.message);
  };

  const filteredComms = communications.filter(comm => 
    comm.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    comm.message?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    comm.recipient_type?.toLowerCase().includes(searchTerm.toLowerCase())
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
        <Box sx={{ mb: 3 }}>
          <Typography variant='h4' fontWeight='bold' gutterBottom>
            Communication Center
          </Typography>
          <Typography variant='body2' color='text.secondary'>
            Send notifications and messages to users and farmhouse owners
          </Typography>
        </Box>

        <Grid container spacing={3}>
          {/* Send Message Section */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper sx={{ p: 3 }} elevation={2}>
              <Typography variant='h6' fontWeight='bold' gutterBottom>
                Send Notification
              </Typography>
              
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Recipients</InputLabel>
                <Select
                  value={recipientType}
                  onChange={(e) => setRecipientType(e.target.value)}
                  startAdornment={
                    <InputAdornment position='start'>
                      {getRecipientIcon(recipientType)}
                    </InputAdornment>
                  }
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
                sx={{ mb: 2 }}
                placeholder='Enter message subject'
              />

              <TextField
                fullWidth
                multiline
                rows={8}
                label='Message *'
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                sx={{ mb: 2 }}
                placeholder='Enter your message here...'
              />

              <Button
                fullWidth
                variant='contained'
                size='large'
                startIcon={<Send />}
                onClick={handleSendMessage}
                disabled={sending || !subject.trim() || !message.trim()}
              >
                {sending ? 'Sending...' : 'Send Message'}
              </Button>

              {recipientType === 'farmhouse_owners' && (
                <Alert severity='info' sx={{ mt: 2 }}>
                  This message will be sent to all owners who have listed farmhouses on the platform.
                </Alert>
              )}
            </Paper>
          </Grid>

          {/* Templates Section */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper sx={{ p: 3 }} elevation={2}>
              <Typography variant='h6' fontWeight='bold' gutterBottom>
                Message Templates
              </Typography>
              <Typography variant='body2' color='text.secondary' sx={{ mb: 2 }}>
                Click on a template to use it
              </Typography>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {templates.map((template, index) => (
                  <Card key={index} variant='outlined'>
                    <CardActionArea onClick={() => applyTemplate(template)}>
                      <CardContent>
                        <Typography variant='subtitle1' fontWeight='bold' gutterBottom>
                          {template.title}
                        </Typography>
                        <Typography variant='body2' color='text.secondary' noWrap>
                          {template.subject}
                        </Typography>
                      </CardContent>
                    </CardActionArea>
                  </Card>
                ))}
              </Box>
            </Paper>
          </Grid>

          {/* Communication History */}
          <Grid size={{ xs: 12 }}>
            <Paper sx={{ p: 3 }} elevation={2}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant='h6' fontWeight='bold'>
                  Communication History
                </Typography>
                <TextField
                  size='small'
                  placeholder='Search messages...'
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position='start'>
                        <Search />
                      </InputAdornment>
                    ),
                  }}
                  sx={{ width: 300 }}
                />
              </Box>

              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress />
                </Box>
              ) : (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                        <TableCell><strong>Date</strong></TableCell>
                        <TableCell><strong>Recipients</strong></TableCell>
                        <TableCell><strong>Subject</strong></TableCell>
                        <TableCell><strong>Message</strong></TableCell>
                        <TableCell><strong>Count</strong></TableCell>
                        <TableCell><strong>Status</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredComms.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} align='center' sx={{ py: 4 }}>
                            <Typography color='text.secondary'>
                              {communications.length === 0 
                                ? 'No messages sent yet. Send your first message above.'
                                : 'No messages match your search.'}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredComms.map((comm) => (
                          <TableRow key={comm.id} hover>
                            <TableCell>
                              <Typography variant='body2'>
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
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                {getRecipientIcon(comm.recipient_type)}
                                <Chip 
                                  label={getRecipientLabel(comm.recipient_type)} 
                                  size='small' 
                                  variant='outlined'
                                />
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Typography variant='body2' fontWeight='medium'>
                                {comm.subject}
                              </Typography>
                            </TableCell>
                            <TableCell sx={{ maxWidth: 300 }}>
                              <Typography variant='body2' noWrap>
                                {comm.message}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Chip 
                                label={`${comm.recipient_count || 0} users`} 
                                size='small' 
                                color='primary'
                              />
                            </TableCell>
                            <TableCell>
                              <Chip label='Sent' color='success' size='small' />
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