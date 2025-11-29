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
  Avatar,
  Tooltip,
  TextField,
  Grid,
  FormControl,
  InputLabel,
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
          <CircularProgress size={60} />
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
        <Box sx={{ mb: 3 }}>
          <Typography variant='h4' fontWeight='bold' gutterBottom>
            Review Management
          </Typography>
          <Typography variant='body2' color='text.secondary'>
            Manage and monitor user reviews for farmhouses
          </Typography>
        </Box>

        {/* Statistics Cards */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant='body2' color='text.secondary'>
                      Total Reviews
                    </Typography>
                    <Typography variant='h4' fontWeight='bold' color='primary.main'>
                      {reviews.length}
                    </Typography>
                  </Box>
                  <RateReview sx={{ fontSize: 48, color: 'primary.main', opacity: 0.3 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant='body2' color='text.secondary'>
                      Average Rating
                    </Typography>
                    <Typography variant='h4' fontWeight='bold' color='warning.main'>
                      {avgRating.toFixed(1)}
                    </Typography>
                  </Box>
                  <Star sx={{ fontSize: 48, color: 'warning.main', opacity: 0.3 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant='body2' color='text.secondary'>
                      5-Star Reviews
                    </Typography>
                    <Typography variant='h4' fontWeight='bold' color='success.main'>
                      {ratingCounts[5]}
                    </Typography>
                  </Box>
                  <Star sx={{ fontSize: 48, color: 'success.main', opacity: 0.3 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant='body2' color='text.secondary'>
                      Low Ratings (1-2★)
                    </Typography>
                    <Typography variant='h4' fontWeight='bold' color='error.main'>
                      {ratingCounts[1] + ratingCounts[2]}
                    </Typography>
                  </Box>
                  <Star sx={{ fontSize: 48, color: 'error.main', opacity: 0.3 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Filters and Export */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid size={{ xs: 12, md: 5 }}>
            <TextField
              fullWidth
              placeholder='Search by user, farmhouse, or comment...'
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <FormControl fullWidth>
              <InputLabel>Rating</InputLabel>
              <Select value={ratingFilter} onChange={(e) => setRatingFilter(e.target.value)}>
                <MenuItem value='all'>All Ratings ({reviews.length})</MenuItem>
                <MenuItem value='5'>5 Stars ({ratingCounts[5]})</MenuItem>
                <MenuItem value='4'>4 Stars ({ratingCounts[4]})</MenuItem>
                <MenuItem value='3'>3 Stars ({ratingCounts[3]})</MenuItem>
                <MenuItem value='2'>2 Stars ({ratingCounts[2]})</MenuItem>
                <MenuItem value='1'>1 Star ({ratingCounts[1]})</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <Button
              fullWidth
              variant='outlined'
              startIcon={<Download />}
              onClick={handleExportCSV}
              disabled={filtered.length === 0}
              sx={{ height: '56px' }}
            >
              Export to CSV ({filtered.length} reviews)
            </Button>
          </Grid>
        </Grid>

        {/* Table */}
        {reviews.length === 0 ? (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant='h6' color='text.secondary' gutterBottom>
              No reviews yet
            </Typography>
            <Typography variant='body2' color='text.secondary'>
              Reviews will appear here once users rate farmhouses through the mobile app
            </Typography>
          </Paper>
        ) : filtered.length === 0 ? (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant='h6' color='text.secondary' gutterBottom>
              No reviews match your filters
            </Typography>
            <Typography variant='body2' color='text.secondary'>
              Try adjusting your search or filters
            </Typography>
          </Paper>
        ) : (
          <TableContainer component={Paper} elevation={2}>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                  <TableCell><strong>User</strong></TableCell>
                  <TableCell><strong>Farmhouse</strong></TableCell>
                  <TableCell><strong>Rating</strong></TableCell>
                  <TableCell><strong>Comment</strong></TableCell>
                  <TableCell><strong>Date</strong></TableCell>
                  <TableCell align='center'><strong>Actions</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.map((review) => (
                  <TableRow key={review.review_id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
                          <PersonOutline sx={{ fontSize: 18 }} />
                        </Avatar>
                        <Box>
                          <Typography variant='body2' fontWeight='bold'>
                            {review.userName}
                          </Typography>
                          <Typography variant='caption' color='text.secondary'>
                            {review.userEmail}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <HomeOutlined color='action' sx={{ fontSize: 18 }} />
                        <Typography variant='body2' fontWeight='medium'>
                          {review.farmhouseName}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Rating value={review.rating} readOnly size='small' />
                    </TableCell>
                    <TableCell sx={{ maxWidth: 300 }}>
                      <Typography variant='body2' noWrap>
                        {review.comment || 'No comment'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant='body2' color='text.secondary'>
                        {formatDate(review.createdAt)}
                      </Typography>
                    </TableCell>
                    <TableCell align='center'>
                      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                        <Tooltip title='View Details'>
                          <IconButton 
                            size='small' 
                            color='primary'
                            onClick={() => handleViewDetails(review)}
                          >
                            <Visibility />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title='Delete Review'>
                          <IconButton
                            size='small'
                            color='error'
                            onClick={() => handleOpenDeleteDialog(review)}
                          >
                            <Delete />
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
        <Dialog open={deleteDialogOpen} onClose={() => !deleting && setDeleteDialogOpen(false)} maxWidth='sm' fullWidth>
          <DialogTitle>Delete Review</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Are you sure you want to delete this review? This action cannot be undone.
            </DialogContentText>
            {reviewToDelete && (
              <Box sx={{ mt: 2, p: 2, bgcolor: '#f5f5f5', borderRadius: 2 }}>
                <Typography variant='body2' color='text.secondary' gutterBottom>
                  <strong>User:</strong> {reviewToDelete.userName}
                </Typography>
                <Typography variant='body2' color='text.secondary' gutterBottom>
                  <strong>Farmhouse:</strong> {reviewToDelete.farmhouseName}
                </Typography>
                <Typography variant='body2' color='text.secondary'>
                  <strong>Rating:</strong> {reviewToDelete.rating} stars
                </Typography>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialogOpen(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant='contained' color='error' onClick={handleConfirmDelete} disabled={deleting}>
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