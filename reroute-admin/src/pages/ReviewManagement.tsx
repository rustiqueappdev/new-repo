import React, { useState, useEffect } from 'react';
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
  Alert,
  Avatar,
  Tooltip
} from '@mui/material';
import { 
  Delete, 
  Visibility, 
  CheckCircle, 
  Cancel,
  PersonOutline,
  HomeOutlined 
} from '@mui/icons-material';
import { 
  collection, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc,
  getDoc 
} from 'firebase/firestore';
import { db } from '../config/firebase';
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
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedReviewDetails, setSelectedReviewDetails] = useState<ReviewDetail | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    fetchReviews();
  }, []);

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

  const handleDelete = async (reviewId: string) => {
    if (!window.confirm('Are you sure you want to delete this review? This action cannot be undone.')) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'reviews', reviewId));
      fetchReviews();
    } catch (error) {
      console.error('Error deleting review:', error);
      alert('Failed to delete review');
    }
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

  return (
    <MainLayout>
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box>
            <Typography variant='h4' fontWeight='bold' gutterBottom>
              Review Management
            </Typography>
            <Typography variant='body2' color='text.secondary'>
              Total Reviews: {reviews.length}
            </Typography>
          </Box>
        </Box>

        {reviews.length === 0 ? (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant='h6' color='text.secondary' gutterBottom>
              No reviews yet
            </Typography>
            <Typography variant='body2' color='text.secondary'>
              Reviews will appear here once users rate farmhouses through the mobile app
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
                {reviews.map((review) => (
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
                            onClick={() => handleDelete(review.review_id)}
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