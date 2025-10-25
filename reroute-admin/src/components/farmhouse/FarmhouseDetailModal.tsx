import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Typography,
  Grid as Grid,
  Chip,
  Button,
  ImageList,
  ImageListItem,
  CircularProgress,
  Alert,
  TextField,
  Checkbox,
  FormControlLabel,
  FormGroup,
  Tabs,
  Tab,
  IconButton,
  Paper
} from '@mui/material';
import { 
  doc, 
  getDoc, 
  updateDoc, 
  serverTimestamp,
  collection,
  query,
  where,
  getDocs,
  addDoc
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import { 
  Farmhouse, 
  User,
  getFarmhouseName,
  getFarmhouseLocation,
  getFarmhouseDescription,
  getFarmhouseImages,
  getFarmhouseCapacity,
  getFarmhouseBaseRate,
  getFarmhouseWeekendRate,
  getFarmhouseAmenities,
  getFarmhouseRules,
  getFarmhouseOwnerId
} from '../../types';
import { 
  Close, 
  CheckCircle, 
  Cancel,
  LocationOn,
  Warning
} from '@mui/icons-material';
import ApprovalDialog from './ApprovalDialog';

interface FarmhouseDetailModalProps {
  open: boolean;
  farmhouse: Farmhouse;
  onClose: () => void;
  onApprovalComplete: () => void;
}

interface OwnerStats {
  totalProperties: number;
  approvedProperties: number;
  rejectedProperties: number;
  totalBookings: number;
  averageRating: number;
}

interface VerificationChecklist {
  aadhaarVerified: boolean;
  panVerified: boolean;
  licenceVerified: boolean;
  photosQuality: boolean;
  pricingReasonable: boolean;
  locationVerified: boolean;
}

const FarmhouseDetailModal: React.FC<FarmhouseDetailModalProps> = ({
  open,
  farmhouse,
  onClose,
  onApprovalComplete
}) => {
  const { currentUser } = useAuth();
  const [ownerData, setOwnerData] = useState<User | null>(null);
  const [ownerStats, setOwnerStats] = useState<OwnerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [approvalType, setApprovalType] = useState<'approve' | 'reject'>('approve');
  const [activeTab, setActiveTab] = useState(0);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [checklist, setChecklist] = useState<VerificationChecklist>({
    aadhaarVerified: false,
    panVerified: false,
    licenceVerified: false,
    photosQuality: false,
    pricingReasonable: false,
    locationVerified: false
  });

  useEffect(() => {
    if (open && farmhouse) {
      fetchAllData();
    }
  }, [open, farmhouse]);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchOwnerData(),
        fetchOwnerStats()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchOwnerData = async () => {
    if (!farmhouse?.owner_id) return;
    
    try {
      const ownerDoc = await getDoc(doc(db, 'users', farmhouse.owner_id));
      if (ownerDoc.exists()) {
        setOwnerData({ user_id: ownerDoc.id, ...ownerDoc.data() } as User);
      }
    } catch (error) {
      console.error('Error fetching owner data:', error);
    }
  };

  const fetchOwnerStats = async () => {
    if (!farmhouse?.owner_id) return;
    
    try {
      const propertiesQuery = query(
        collection(db, 'farmhouses'),
        where('owner_id', '==', farmhouse.owner_id)
      );
      const propertiesSnap = await getDocs(propertiesQuery);
      
      const approved = propertiesSnap.docs.filter(doc => doc.data().status === 'active').length;
      const rejected = propertiesSnap.docs.filter(doc => doc.data().status === 'rejected').length;

      const bookingsQuery = query(
        collection(db, 'bookings'),
        where('farmhouse_id', '==', farmhouse.farmhouse_id)
      );
      const bookingsSnap = await getDocs(bookingsQuery);

      setOwnerStats({
        totalProperties: propertiesSnap.size,
        approvedProperties: approved,
        rejectedProperties: rejected,
        totalBookings: bookingsSnap.size,
        averageRating: 0
      });
    } catch (error) {
      console.error('Error fetching owner stats:', error);
    }
  };

  const handleChecklistChange = (key: keyof VerificationChecklist) => {
    setChecklist(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const saveAdminNotes = async () => {
    try {
      await addDoc(collection(db, 'admin_notes'), {
        farmhouse_id: farmhouse.farmhouse_id,
        note: adminNotes,
        created_by: currentUser?.uid,
        created_at: serverTimestamp()
      });
      setAdminNotes('');
      alert('Note saved successfully');
    } catch (error) {
      console.error('Error saving note:', error);
      alert('Failed to save note: ' + (error as Error).message);
    }
  };

  const handleApprove = () => {
    const allChecked = Object.values(checklist).every(v => v);
    if (!allChecked) {
      alert('Please complete all verification checklist items before approving');
      return;
    }
    setApprovalType('approve');
    setApprovalDialogOpen(true);
  };

  const handleReject = () => {
    setApprovalType('reject');
    setApprovalDialogOpen(true);
  };

  const handleConfirmApproval = async (commission?: number, reason?: string) => {
    try {
      console.log('🔄 Starting approval process...');
      console.log('Farmhouse ID:', farmhouse.farmhouse_id);
      console.log('Approval Type:', approvalType);
      console.log('Commission:', commission);
      console.log('Reason:', reason);

      if (!farmhouse.farmhouse_id) {
        throw new Error('Invalid farmhouse ID');
      }

      const farmhouseRef = doc(db, 'farmhouses', farmhouse.farmhouse_id);
      
      if (approvalType === 'approve' && commission !== undefined) {
        console.log('✅ Approving farmhouse...');
        
        const ownerId = getFarmhouseOwnerId(farmhouse);
        
        // Update farmhouse - use "approved" status for mobile app
        await updateDoc(farmhouseRef, {
          status: 'approved',  // ✅ Mobile app uses "approved"
          commission_percentage: commission,
          approved_by: currentUser?.uid || 'admin',
          approved_at: serverTimestamp()
        });

        console.log('✅ Farmhouse updated successfully');

        // Update owner KYC if exists (try both old and new structure)
        if (ownerId) {
          try {
            const ownerRef = doc(db, 'users', ownerId);
            const ownerDoc = await getDoc(ownerRef);
            
            if (ownerDoc.exists() && ownerDoc.data().owner_kyc) {
              await updateDoc(ownerRef, {
                'owner_kyc.status': 'approved',
                kyc_status: 'approved'
              });
              console.log('✅ Owner KYC updated');
            }
          } catch (kycError) {
            console.warn('⚠️ Could not update owner KYC:', kycError);
            // Don't fail the entire approval if KYC update fails
          }
        }

        // Add to approval history
        try {
          await addDoc(collection(db, 'approval_history'), {
            farmhouse_id: farmhouse.farmhouse_id,
            action: 'approved',
            commission_percentage: commission,
            approved_by: currentUser?.uid || 'admin',
            timestamp: serverTimestamp()
          });
          console.log('✅ Approval history added');
        } catch (historyError) {
          console.warn('⚠️ Could not add approval history:', historyError);
          // Don't fail the entire approval if history fails
        }

        alert('✅ Farmhouse approved successfully!');
        
      } else if (approvalType === 'reject' && reason) {
        console.log('❌ Rejecting farmhouse...');
        
        // Update farmhouse to rejected
        await updateDoc(farmhouseRef, {
          status: 'rejected',
          rejection_reason: reason,
          rejected_by: currentUser?.uid || 'admin',
          rejected_at: serverTimestamp()
        });

        console.log('✅ Farmhouse rejected successfully');

        // Add to approval history
        try {
          await addDoc(collection(db, 'approval_history'), {
            farmhouse_id: farmhouse.farmhouse_id,
            action: 'rejected',
            rejection_reason: reason,
            rejected_by: currentUser?.uid || 'admin',
            timestamp: serverTimestamp()
          });
          console.log('✅ Rejection history added');
        } catch (historyError) {
          console.warn('⚠️ Could not add rejection history:', historyError);
        }

        alert('❌ Farmhouse rejected');
      }

      // Close dialog and refresh
      setApprovalDialogOpen(false);
      onApprovalComplete();
      
    } catch (error) {
      console.error('❌ Error during approval process:', error);
      
      // Show detailed error to user
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert('Failed to process approval: ' + errorMessage + '\n\nCheck console for details.');
    }
  };

  const isChecklistComplete = Object.values(checklist).every(v => v);

  if (!farmhouse) return null;

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth='lg' fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant='h5' fontWeight='bold'>
              Farmhouse Review
            </Typography>
            <IconButton onClick={onClose}>
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Box>
              <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ mb: 3 }}>
                <Tab label='Property Details' />
                <Tab label='Owner KYC' />
                <Tab label='Owner Stats' />
                <Tab label='Verification' />
              </Tabs>

              {activeTab === 0 && (
                <Box>
                  <Typography variant='h6' fontWeight='bold' gutterBottom>
                    {getFarmhouseName(farmhouse)}
                  </Typography>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <LocationOn color='action' />
                    <Typography variant='body1' color='text.secondary'>
                      {getFarmhouseLocation(farmhouse)}
                    </Typography>
                  </Box>

                  <Typography variant='body1' sx={{ mb: 3 }}>
                    {getFarmhouseDescription(farmhouse)}
                  </Typography>

                  <Grid container spacing={2} sx={{ mb: 3 }}>
                    <Grid size={{ xs: 6, md: 3 }}>
                      <Paper sx={{ p: 2, textAlign: 'center' }}>
                        <Typography variant='body2' color='text.secondary'>Base Rate</Typography>
                        <Typography variant='h6'>₹{getFarmhouseBaseRate(farmhouse)}</Typography>
                      </Paper>
                    </Grid>
                    <Grid size={{ xs: 6, md: 3 }}>
                      <Paper sx={{ p: 2, textAlign: 'center' }}>
                        <Typography variant='body2' color='text.secondary'>Weekend Rate</Typography>
                        <Typography variant='h6'>₹{getFarmhouseWeekendRate(farmhouse)}</Typography>
                      </Paper>
                    </Grid>
                    <Grid size={{ xs: 6, md: 3 }}>
                      <Paper sx={{ p: 2, textAlign: 'center' }}>
                        <Typography variant='body2' color='text.secondary'>Max Guests</Typography>
                        <Typography variant='h6'>{getFarmhouseCapacity(farmhouse)}</Typography>
                      </Paper>
                    </Grid>
                    <Grid size={{ xs: 6, md: 3 }}>
                      <Paper sx={{ p: 2, textAlign: 'center' }}>
                        <Typography variant='body2' color='text.secondary'>Status</Typography>
                        <Chip label={farmhouse.status} color='warning' size='small' />
                      </Paper>
                    </Grid>
                  </Grid>

                  {(() => {
                    const images = getFarmhouseImages(farmhouse);
                    return images.length > 0 && (
                      <>
                        <Typography variant='subtitle1' fontWeight='bold' gutterBottom>
                          Property Images ({images.length})
                        </Typography>
                        <ImageList cols={3} gap={8} sx={{ mb: 3 }}>
                          {images.map((img, index) => (
                            <ImageListItem key={index}>
                              <img
                                src={img}
                                alt={`Property ${index + 1}`}
                                loading='lazy'
                                style={{ cursor: 'pointer', height: 200, objectFit: 'cover' }}
                                onClick={() => setSelectedImage(img)}
                              />
                            </ImageListItem>
                          ))}
                        </ImageList>
                      </>
                    );
                  })()}

                  {(() => {
                    const amenities = getFarmhouseAmenities(farmhouse);
                    return amenities.length > 0 && (
                      <>
                        <Typography variant='subtitle1' fontWeight='bold' gutterBottom>
                          Amenities
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 3 }}>
                          {amenities.map((amenity, index) => (
                            <Chip key={index} label={amenity} size='small' />
                          ))}
                        </Box>
                      </>
                    );
                  })()}

                  {(() => {
                    const rules = getFarmhouseRules(farmhouse);
                    return rules.length > 0 && (
                      <>
                        <Typography variant='subtitle1' fontWeight='bold' gutterBottom>
                          House Rules
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 3 }}>
                          {rules.map((rule, index) => (
                            <Chip key={index} label={rule} size='small' variant='outlined' />
                          ))}
                        </Box>
                      </>
                    );
                  })()}
                </Box>
              )}

              {activeTab === 1 && (
                <Box>
                  <Typography variant='h6' fontWeight='bold' gutterBottom>
                    Owner KYC Documents
                  </Typography>
                  
                  {farmhouse.kyc ? (
                    <Grid container spacing={2}>
                      <Grid size={{ xs: 12, md: 6 }}>
                        <Paper sx={{ p: 2 }}>
                          <Typography variant='subtitle1' fontWeight='bold' gutterBottom>
                            Person 1 Details
                          </Typography>
                          <Typography variant='body2'>Name: {farmhouse.kyc.person1.name}</Typography>
                          <Typography variant='body2'>Phone: {farmhouse.kyc.person1.phone}</Typography>
                          <Typography variant='body2'>Aadhaar: {farmhouse.kyc.person1.aadhaarNumber}</Typography>
                          {farmhouse.kyc.person1.aadhaarFrontUrl && (
                            <Button
                              variant='contained'
                              size='small'
                              href={farmhouse.kyc.person1.aadhaarFrontUrl}
                              target='_blank'
                              sx={{ mt: 2 }}
                              fullWidth
                            >
                              View Aadhaar Front
                            </Button>
                          )}
                          {farmhouse.kyc.person1.aadhaarBackUrl && (
                            <Button
                              variant='outlined'
                              size='small'
                              href={farmhouse.kyc.person1.aadhaarBackUrl}
                              target='_blank'
                              sx={{ mt: 1 }}
                              fullWidth
                            >
                              View Aadhaar Back
                            </Button>
                          )}
                        </Paper>
                      </Grid>

                      {farmhouse.kyc.person2.name && (
                        <Grid size={{ xs: 12, md: 6 }}>
                          <Paper sx={{ p: 2 }}>
                            <Typography variant='subtitle1' fontWeight='bold' gutterBottom>
                              Person 2 Details
                            </Typography>
                            <Typography variant='body2'>Name: {farmhouse.kyc.person2.name}</Typography>
                            <Typography variant='body2'>Phone: {farmhouse.kyc.person2.phone}</Typography>
                            {farmhouse.kyc.person2.aadhaarNumber && (
                              <Typography variant='body2'>Aadhaar: {farmhouse.kyc.person2.aadhaarNumber}</Typography>
                            )}
                            {farmhouse.kyc.person2.aadhaarFrontUrl && (
                              <Button
                                variant='contained'
                                size='small'
                                href={farmhouse.kyc.person2.aadhaarFrontUrl}
                                target='_blank'
                                sx={{ mt: 2 }}
                                fullWidth
                              >
                                View Aadhaar Front
                              </Button>
                            )}
                          </Paper>
                        </Grid>
                      )}

                      <Grid size={{ xs: 12, md: 6 }}>
                        <Paper sx={{ p: 2 }}>
                          <Typography variant='subtitle1' fontWeight='bold' gutterBottom>
                            Company PAN
                          </Typography>
                          <Typography variant='body2' sx={{ mb: 2 }}>
                            PAN Number: {farmhouse.kyc.panNumber}
                          </Typography>
                          {farmhouse.kyc.companyPANUrl ? (
                            <Button
                              variant='contained'
                              size='small'
                              href={farmhouse.kyc.companyPANUrl}
                              target='_blank'
                              fullWidth
                            >
                              View PAN Card
                            </Button>
                          ) : (
                            <Alert severity='warning'>PAN document not uploaded</Alert>
                          )}
                        </Paper>
                      </Grid>

                      <Grid size={{ xs: 12, md: 6 }}>
                        <Paper sx={{ p: 2 }}>
                          <Typography variant='subtitle1' fontWeight='bold' gutterBottom>
                            Labour Licence
                          </Typography>
                          {farmhouse.kyc.labourDocUrl ? (
                            <Button
                              variant='contained'
                              size='small'
                              href={farmhouse.kyc.labourDocUrl}
                              target='_blank'
                              fullWidth
                            >
                              View Licence Document
                            </Button>
                          ) : (
                            <Alert severity='warning'>Labour licence not uploaded</Alert>
                          )}
                        </Paper>
                      </Grid>

                      <Grid size={{ xs: 12 }}>
                        <Paper sx={{ p: 2 }}>
                          <Typography variant='subtitle1' fontWeight='bold' gutterBottom>
                            Bank Details
                          </Typography>
                          <Typography variant='body2'>Account Holder: {farmhouse.kyc.bankDetails.accountHolderName}</Typography>
                          <Typography variant='body2'>Account Number: {farmhouse.kyc.bankDetails.accountNumber}</Typography>
                          <Typography variant='body2'>IFSC Code: {farmhouse.kyc.bankDetails.ifscCode}</Typography>
                          <Typography variant='body2'>Branch: {farmhouse.kyc.bankDetails.branchName}</Typography>
                        </Paper>
                      </Grid>
                    </Grid>
                  ) : (
                    <Alert severity='warning'>No KYC documents uploaded</Alert>
                  )}
                </Box>
              )}

              {activeTab === 2 && ownerStats && (
                <Box>
                  <Typography variant='h6' fontWeight='bold' gutterBottom>
                    Owner Statistics
                  </Typography>
                  
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 6, md: 3 }}>
                      <Paper sx={{ p: 2, textAlign: 'center' }}>
                        <Typography variant='h4' color='primary'>{ownerStats.totalProperties}</Typography>
                        <Typography variant='body2'>Total Properties</Typography>
                      </Paper>
                    </Grid>
                    <Grid size={{ xs: 6, md: 3 }}>
                      <Paper sx={{ p: 2, textAlign: 'center' }}>
                        <Typography variant='h4' color='success.main'>{ownerStats.approvedProperties}</Typography>
                        <Typography variant='body2'>Approved</Typography>
                      </Paper>
                    </Grid>
                    <Grid size={{ xs: 6, md: 3 }}>
                      <Paper sx={{ p: 2, textAlign: 'center' }}>
                        <Typography variant='h4' color='error.main'>{ownerStats.rejectedProperties}</Typography>
                        <Typography variant='body2'>Rejected</Typography>
                      </Paper>
                    </Grid>
                    <Grid size={{ xs: 6, md: 3 }}>
                      <Paper sx={{ p: 2, textAlign: 'center' }}>
                        <Typography variant='h4'>{ownerStats.totalBookings}</Typography>
                        <Typography variant='body2'>Total Bookings</Typography>
                      </Paper>
                    </Grid>
                  </Grid>
                </Box>
              )}

              {activeTab === 3 && (
                <Box>
                  <Alert severity='info' sx={{ mb: 3 }}>
                    Complete all verification steps before approving the farmhouse
                  </Alert>

                  <Paper sx={{ p: 3, mb: 3 }}>
                    <Typography variant='h6' fontWeight='bold' gutterBottom>
                      Verification Checklist
                    </Typography>
                    <FormGroup>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={checklist.aadhaarVerified}
                            onChange={() => handleChecklistChange('aadhaarVerified')}
                          />
                        }
                        label='Aadhaar documents verified and valid'
                      />
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={checklist.panVerified}
                            onChange={() => handleChecklistChange('panVerified')}
                          />
                        }
                        label='PAN card verified and matches company details'
                      />
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={checklist.licenceVerified}
                            onChange={() => handleChecklistChange('licenceVerified')}
                          />
                        }
                        label='Labour licence verified and active'
                      />
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={checklist.photosQuality}
                            onChange={() => handleChecklistChange('photosQuality')}
                          />
                        }
                        label='Photos are of good quality and represent the property accurately'
                      />
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={checklist.pricingReasonable}
                            onChange={() => handleChecklistChange('pricingReasonable')}
                          />
                        }
                        label='Pricing is reasonable and competitive'
                      />
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={checklist.locationVerified}
                            onChange={() => handleChecklistChange('locationVerified')}
                          />
                        }
                        label='Location verified on Google Maps'
                      />
                    </FormGroup>

                    {!isChecklistComplete && (
                      <Alert severity='warning' sx={{ mt: 2 }}>
                        <Warning sx={{ mr: 1 }} />
                        Please complete all checklist items to enable approval
                      </Alert>
                    )}
                  </Paper>

                  <Paper sx={{ p: 3 }}>
                    <Typography variant='h6' fontWeight='bold' gutterBottom>
                      Internal Admin Notes
                    </Typography>
                    <TextField
                      fullWidth
                      multiline
                      rows={4}
                      placeholder='Add any internal notes...'
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      sx={{ mb: 2 }}
                    />
                    <Button 
                      variant='outlined' 
                      onClick={saveAdminNotes}
                      disabled={!adminNotes.trim()}
                    >
                      Save Note
                    </Button>
                  </Paper>
                </Box>
              )}

              <Box sx={{ display: 'flex', gap: 2, mt: 4 }}>
                <Button
                  variant='contained'
                  color='success'
                  startIcon={<CheckCircle />}
                  fullWidth
                  onClick={handleApprove}
                  disabled={!isChecklistComplete}
                >
                  Approve Farmhouse
                </Button>
                <Button
                  variant='contained'
                  color='error'
                  startIcon={<Cancel />}
                  fullWidth
                  onClick={handleReject}
                >
                  Reject Farmhouse
                </Button>
              </Box>
            </Box>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedImage} onClose={() => setSelectedImage(null)} maxWidth='md'>
        <DialogContent>
          {selectedImage && (
            <img 
              src={selectedImage} 
              alt='Zoomed' 
              style={{ width: '100%', height: 'auto' }} 
            />
          )}
        </DialogContent>
      </Dialog>

      <ApprovalDialog
        open={approvalDialogOpen}
        type={approvalType}
        farmhouseName={farmhouse.name || 'Unnamed Property'}
        onClose={() => setApprovalDialogOpen(false)}
        onConfirm={handleConfirmApproval}
      />
    </>
  );
};

export default FarmhouseDetailModal;