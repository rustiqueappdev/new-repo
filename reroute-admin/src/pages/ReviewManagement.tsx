import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Rating,
  Chip,
  CircularProgress,
  Button,
  Tooltip,
  TextField,
  Grid,
  FormControl,
  Select,
  MenuItem,
  Card,
  CardContent,
  DialogContentText
} from '@mui/material';
import {
  Delete,
  Visibility,
  PersonOutline,
  HomeOutlined,
  Download,
  RateReview,
  Star
} from '@mui/icons-material';
import {
  collection,
  getDocs,
  doc,
  deleteDoc,
  getDoc,
  addDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { useSnackbar } from '../context/SnackbarContext';
import { useAuth } from '../context/AuthContext';
import MainLayout from '../components/layout/MainLayout';

interface Review {
  review_id: string;
  userId: string;
  farmhouseId: string;
  rating: number;
  comment: string;
  userName?: string;
  userEmail?: string;
  farmhouseName?: string;
  createdAt: any;
}

interface ReviewDetail {
  review: Review;
  userDetails: any;
  farmhouseDetails: any;
}

const ReviewManagement: React.FC = () => {
  const { showSuccess, showError } = useSnackbar();
  const { currentUser } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [filtered, setFiltered] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedReviewDetails, setSelectedReviewDetails] = useState<ReviewDetail | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [reviewToDelete, setReviewToDelete] = useState<Review | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [ratingFilter, setRatingFilter] = useState('all');

  useEffect(() => {
    fetchReviews();
  }, []);

  const filterReviews = useCallback(() => {
    let result = reviews;

    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      result = result.filter(r =>
        r.userName?.toLowerCase().includes(search) ||
        r.userEmail?.toLowerCase().includes(search) ||
        r.farmhouseName?.toLowerCase().includes(search) ||
        r.comment?.toLowerCase().includes(search)
      );
    }

    if (ratingFilter !== 'all') {
      const targetRating = parseInt(ratingFilter);
      result = result.filter(r => r.rating === targetRating);
    }

    setFiltered(result);
  }, [reviews, searchTerm, ratingFilter]);

  useEffect(() => {
    filterReviews();
  }, [filterReviews]);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const snapshot = await getDocs(collection(db, 'reviews'));
      const reviewsData = await Promise.all(
        snapshot.docs.map(async (reviewDoc) => {
          const data = reviewDoc.data();
          
          // Fetch user name
          let userName = 'Unknown User';
          let userEmail = '';
          if (data.userId) {
            try {
              const userDoc = await getDoc(doc(db, 'users', data.userId));
              if (userDoc.exists()) {
                const userData = userDoc.data();
                userName = userData.name || userData.displayName || 'Unknown User';
                userEmail = userData.email || '';
              }
            } catch (err) {
              console.log('Could not fetch user:', err);
            }
          }

          // Fetch farmhouse name
          let farmhouseName = 'Unknown Farmhouse';
          if (data.farmhouseId) {
            try {
              const farmhouseDoc = await getDoc(doc(db, 'farmhouses', data.farmhouseId));
              if (farmhouseDoc.exists()) {
                const farmhouseData = farmhouseDoc.data();
                farmhouseName = farmhouseData.basicDetails?.name || 
                               farmhouseData.name || 
                               'Unknown Farmhouse';
              }
            } catch (err) {
              console.log('Could not fetch farmhouse:', err);
            }
          }

          return {
            review_id: reviewDoc.id,
            userId: data.userId || '',
            farmhouseId: data.farmhouseId || '',
            rating: data.rating || 0,
            comment: data.comment || '',
            userName,
            userEmail,
            farmhouseName,
            createdAt: data.createdAt || data.created_at
          } as Review;
        })
      );

      setReviews(reviewsData);
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (review: Review) => {
    setLoadingDetails(true);
    setDetailsModalOpen(true);

    try {
      // Fetch complete user details
      const userDoc = await getDoc(doc(db, 'users', review.userId));
      const userDetails = userDoc.exists() ? userDoc.data() : null;

      // Fetch complete farmhouse details
      const farmhouseDoc = await getDoc(doc(db, 'farmhouses', review.farmhouseId));
      const farmhouseDetails = farmhouseDoc.exists() ? farmhouseDoc.data() : null;

      setSelectedReviewDetails({
        review,
        userDetails,
        farmhouseDetails
      });
    } catch (error) {
      console.error('Error fetching details:', error);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleOpenDeleteDialog = (review: Review) => {
    setReviewToDelete(review);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!reviewToDelete) return;

    try {
      setDeleting(true);
      await deleteDoc(doc(db, 'reviews', reviewToDelete.review_id));

      // Add audit trail
      await addDoc(collection(db, 'audit_trail'), {
        action: 'review_deleted',
        entity_type: 'review',
        entity_id: reviewToDelete.review_id,
        performed_by: currentUser?.email || 'admin',
        details: {
          review_rating: reviewToDelete.rating,
          user_name: reviewToDelete.userName,
          farmhouse_name: reviewToDelete.farmhouseName
        },
        timestamp: serverTimestamp()
      });

      showSuccess('Review deleted successfully');
      fetchReviews();
      setDeleteDialogOpen(false);
      setReviewToDelete(null);
    } catch (error) {
      console.error('Error deleting review:', error);
      showError('Failed to delete review');
    } finally {
      setDeleting(false);
    }
  };

  const handleExportCSV = () => {
    if (filtered.length === 0) {
      showError('No reviews to export');
      return;
    }

    const headers = [
      'Review ID', 'User Name', 'User Email', 'Farmhouse', 'Rating',
      'Comment', 'Date'
    ];

    const csvData = filtered.map(review => [
      review.review_id,
      review.userName || '',
      review.userEmail || '',
      review.farmhouseName || '',
      review.rating,
      (review.comment || '').replace(/"/g, '""'),
      formatDate(review.createdAt)
    ]);

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `reviews_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showSuccess(`Exported ${filtered.length} reviews to CSV`);
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    try {
      if (timestamp.toDate) {
        return new Date(timestamp.toDate()).toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        });
      }
      return new Date(timestamp).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return 'N/A';
    }
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

  const avgRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0;
  const ratingCounts = {
    5: reviews.filter(r => r.rating === 5).length,
    4: reviews.filter(r => r.rating === 4).length,
    3: reviews.filter(r => r.rating === 3).length,
    2: reviews.filter(r => r.rating === 2).length,
    1: reviews.filter(r => r.rating === 1).length,
  };

  return (
    <MainLayout>
      <Box>
        {/* Statistics Cards */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[
            { label: 'Total Reviews', value: reviews.length, color: '#3B82F6', bg: '#EFF6FF', icon: <RateReview sx={{ fontSize: 24 }} /> },
            { label: 'Average Rating', value: avgRating.toFixed(1), color: '#F59E0B', bg: '#FFFBEB', icon: <Star sx={{ fontSize: 24 }} /> },
            { label: '5-Star Reviews', value: ratingCounts[5], color: '#10B981', bg: '#ECFDF5', icon: <Star sx={{ fontSize: 24 }} /> },
            { label: 'Low Ratings (1-2)', value: ratingCounts[1] + ratingCounts[2], color: '#EF4444', bg: '#FEF2F2', icon: <Star sx={{ fontSize: 24 }} /> },
          ].map((stat) => (
            <Grid size={{ xs: 12, sm: 6, md: 3 }} key={stat.label}>
              <Card elevation={0} sx={{ border: '1px solid', borderColor: 'rgba(0,0,0,0.06)', borderRadius: 3 }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box>
                      <Typography sx={{ fontSize: '0.75rem', fontWeight: 500, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                        {stat.label}
                      </Typography>
                      <Typography sx={{ fontSize: '2rem', fontWeight: 700, color: '#111827', lineHeight: 1, mt: 0.5 }}>
                        {stat.value}
                      </Typography>
                    </Box>
                    <Box sx={{ width: 48, height: 48, borderRadius: 2.5, backgroundColor: stat.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: stat.color }}>
                      {stat.icon}
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Filters and Export */}
        <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'rgba(0,0,0,0.06)', borderRadius: 3, overflow: 'hidden', mb: 3 }}>
          <Box sx={{ p: 2, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            <TextField
              placeholder='Search reviews...'
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              size='small'
              sx={{
                flex: 1, minWidth: 200,
                '& .MuiOutlinedInput-root': { borderRadius: 2, backgroundColor: '#F9FAFB', '& fieldset': { borderColor: 'transparent' }, '&:hover fieldset': { borderColor: '#E5E7EB' }, '&.Mui-focused fieldset': { borderColor: '#10B981' } },
              }}
            />
            <FormControl size='small' sx={{ minWidth: 150 }}>
              <Select
                value={ratingFilter}
                onChange={(e) => setRatingFilter(e.target.value)}
                displayEmpty
                sx={{ borderRadius: 2, backgroundColor: '#F9FAFB', '& fieldset': { borderColor: 'transparent' }, '&:hover fieldset': { borderColor: '#E5E7EB' }, '&.Mui-focused fieldset': { borderColor: '#10B981' } }}
              >
                <MenuItem value='all'>All Ratings</MenuItem>
                <MenuItem value='5'>5 Stars ({ratingCounts[5]})</MenuItem>
                <MenuItem value='4'>4 Stars ({ratingCounts[4]})</MenuItem>
                <MenuItem value='3'>3 Stars ({ratingCounts[3]})</MenuItem>
                <MenuItem value='2'>2 Stars ({ratingCounts[2]})</MenuItem>
                <MenuItem value='1'>1 Star ({ratingCounts[1]})</MenuItem>
              </Select>
            </FormControl>
            <Button
              variant='outlined'
              startIcon={<Download sx={{ fontSize: 18 }} />}
              onClick={handleExportCSV}
              disabled={filtered.length === 0}
              size='small'
              sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2, borderColor: '#E5E7EB', color: '#6B7280', '&:hover': { borderColor: '#10B981', color: '#10B981' } }}
            >
              Export CSV
            </Button>
          </Box>
        </Paper>

        {/* Table */}
        {reviews.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 10 }}>
            <Typography sx={{ fontWeight: 700, fontSize: '1.25rem', color: '#111827', mb: 1 }}>No reviews yet</Typography>
            <Typography sx={{ color: '#9CA3AF' }}>Reviews will appear here once users rate farmhouses through the mobile app</Typography>
          </Box>
        ) : filtered.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 10 }}>
            <Typography sx={{ fontWeight: 700, fontSize: '1.25rem', color: '#111827', mb: 1 }}>No reviews match your filters</Typography>
            <Typography sx={{ color: '#9CA3AF' }}>Try adjusting your search or filters</Typography>
          </Box>
        ) : (
          <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'rgba(0,0,0,0.06)', borderRadius: 3 }}>
            <Table>
              <TableHead>
                <TableRow sx={{ '& th': { backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB', color: '#6B7280', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', py: 1.5 } }}>
                  <TableCell>User</TableCell>
                  <TableCell>Farmhouse</TableCell>
                  <TableCell>Rating</TableCell>
                  <TableCell>Comment</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell align='center'>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.map((review) => (
                  <TableRow key={review.review_id} hover sx={{ '&:hover': { backgroundColor: '#FAFAFA' }, '& td': { borderBottom: '1px solid #F3F4F6', py: 1.5 } }}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Box sx={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0 }}>
                          <PersonOutline sx={{ fontSize: 18 }} />
                        </Box>
                        <Box>
                          <Typography sx={{ fontWeight: 600, fontSize: '0.85rem', color: '#111827' }}>{review.userName}</Typography>
                          <Typography sx={{ fontSize: '0.7rem', color: '#9CA3AF' }}>{review.userEmail}</Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                        <HomeOutlined sx={{ fontSize: 16, color: '#9CA3AF' }} />
                        <Typography sx={{ fontSize: '0.85rem', fontWeight: 500, color: '#374151' }}>{review.farmhouseName}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Rating value={review.rating} readOnly size='small' sx={{ '& .MuiRating-iconFilled': { color: '#F59E0B' } }} />
                    </TableCell>
                    <TableCell sx={{ maxWidth: 300 }}>
                      <Typography sx={{ fontSize: '0.85rem', color: '#6B7280' }} noWrap>{review.comment || 'No comment'}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ fontSize: '0.8rem', color: '#9CA3AF' }}>{formatDate(review.createdAt)}</Typography>
                    </TableCell>
                    <TableCell align='center'>
                      <Box sx={{ display: 'flex', gap: 0.25, justifyContent: 'center' }}>
                        <Tooltip title='View'>
                          <IconButton size='small' onClick={() => handleViewDetails(review)} sx={{ color: '#9CA3AF', '&:hover': { color: '#6B7280', backgroundColor: '#F3F4F6' } }}>
                            <Visibility sx={{ fontSize: 18 }} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title='Delete'>
                          <IconButton size='small' onClick={() => handleOpenDeleteDialog(review)} sx={{ color: '#9CA3AF', '&:hover': { color: '#EF4444', backgroundColor: '#FEF2F2' } }}>
                            <Delete sx={{ fontSize: 18 }} />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onClose={() => !deleting && setDeleteDialogOpen(false)} maxWidth='sm' fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
          <DialogTitle sx={{ fontWeight: 700, fontSize: '1.1rem' }}>Delete Review</DialogTitle>
          <DialogContent>
            <DialogContentText sx={{ fontSize: '0.9rem' }}>
              Are you sure you want to delete this review? This action cannot be undone.
            </DialogContentText>
            {reviewToDelete && (
              <Box sx={{ mt: 2, p: 2, bgcolor: '#F9FAFB', borderRadius: 2, border: '1px solid #F3F4F6' }}>
                <Typography sx={{ fontSize: '0.85rem', color: '#6B7280', mb: 0.5 }}>
                  <strong>User:</strong> {reviewToDelete.userName}
                </Typography>
                <Typography sx={{ fontSize: '0.85rem', color: '#6B7280', mb: 0.5 }}>
                  <strong>Farmhouse:</strong> {reviewToDelete.farmhouseName}
                </Typography>
                <Typography sx={{ fontSize: '0.85rem', color: '#6B7280' }}>
                  <strong>Rating:</strong> {reviewToDelete.rating} stars
                </Typography>
              </Box>
            )}
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2.5 }}>
            <Button onClick={() => setDeleteDialogOpen(false)} disabled={deleting} sx={{ textTransform: 'none', fontWeight: 600, color: '#6B7280' }}>Cancel</Button>
            <Button variant='contained' onClick={handleConfirmDelete} disabled={deleting} sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2, backgroundColor: '#EF4444', '&:hover': { backgroundColor: '#DC2626' } }}>
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Review Details Modal */}
        <Dialog
          open={detailsModalOpen}
          onClose={() => setDetailsModalOpen(false)}
          maxWidth='md'
          fullWidth
        >
          <DialogTitle>
            <Typography variant='h6' fontWeight='bold'>
              Review Details
            </Typography>
          </DialogTitle>
          <DialogContent>
            {loadingDetails ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : selectedReviewDetails && (
              <Box sx={{ pt: 2 }}>
                {/* Review Info */}
                <Paper sx={{ p: 3, mb: 3, bgcolor: '#f9f9f9' }}>
                  <Typography variant='subtitle1' fontWeight='bold' gutterBottom>
                    Review
                  </Typography>
                  <Rating 
                    value={selectedReviewDetails.review.rating} 
                    readOnly 
                    sx={{ mb: 2 }} 
                  />
                  <Typography variant='body1' sx={{ mb: 2 }}>
                    {selectedReviewDetails.review.comment || 'No comment provided'}
                  </Typography>
                  <Typography variant='caption' color='text.secondary'>
                    Posted on {formatDate(selectedReviewDetails.review.createdAt)}
                  </Typography>
                </Paper>

                {/* User Details */}
                <Paper sx={{ p: 3, mb: 3 }}>
                  <Typography variant='subtitle1' fontWeight='bold' gutterBottom>
                    User Information
                  </Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 1 }}>
                    <Typography color='text.secondary'>Name:</Typography>
                    <Typography fontWeight='medium'>
                      {selectedReviewDetails.userDetails?.name || 
                       selectedReviewDetails.userDetails?.displayName || 
                       'N/A'}
                    </Typography>
                    
                    <Typography color='text.secondary'>Email:</Typography>
                    <Typography>{selectedReviewDetails.userDetails?.email || 'N/A'}</Typography>
                    
                    <Typography color='text.secondary'>Phone:</Typography>
                    <Typography>
                      {selectedReviewDetails.userDetails?.phone || 
                       selectedReviewDetails.userDetails?.phoneNumber || 
                       'N/A'}
                    </Typography>
                  </Box>
                </Paper>

                {/* Farmhouse Details */}
                <Paper sx={{ p: 3 }}>
                  <Typography variant='subtitle1' fontWeight='bold' gutterBottom>
                    Farmhouse Information
                  </Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 1 }}>
                    <Typography color='text.secondary'>Name:</Typography>
                    <Typography fontWeight='medium'>
                      {selectedReviewDetails.farmhouseDetails?.basicDetails?.name || 
                       selectedReviewDetails.farmhouseDetails?.name || 
                       'N/A'}
                    </Typography>
                    
                    <Typography color='text.secondary'>Location:</Typography>
                    <Typography>
                      {selectedReviewDetails.farmhouseDetails?.basicDetails?.locationText || 
                       selectedReviewDetails.farmhouseDetails?.location || 
                       'N/A'}
                    </Typography>
                    
                    <Typography color='text.secondary'>Status:</Typography>
                    <Box>
                      <Chip 
                        label={selectedReviewDetails.farmhouseDetails?.status || 'N/A'} 
                        size='small'
                        color={
                          selectedReviewDetails.farmhouseDetails?.status === 'approved' 
                            ? 'success' 
                            : 'warning'
                        }
                      />
                    </Box>
                  </Box>
                </Paper>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDetailsModalOpen(false)}>Close</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </MainLayout>
  );
};

export default ReviewManagement;