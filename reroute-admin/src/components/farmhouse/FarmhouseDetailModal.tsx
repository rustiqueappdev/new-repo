import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Typography,
  Grid,
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
  addDoc
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import { useSnackbar } from '../../context/SnackbarContext';
import { useAuditLog } from '../../hooks/useAuditLog';
import { AuditActions } from '../../utils/auditLog';
import {
  Farmhouse,
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
  Warning,
  Map,
  AttachMoney
} from '@mui/icons-material';
import ApprovalDialog from './ApprovalDialog';

interface FarmhouseDetailModalProps {
  open: boolean;
  farmhouse: Farmhouse;
  onClose: () => void;
  onApprovalComplete: () => void;
}

interface VerificationChecklist {
  documentsVerified: boolean;
  photosQuality: boolean;
  pricingReasonable: boolean;
  locationVerified: boolean;
}

// Helper function to get Google Maps URL
const getGoogleMapsUrl = (farmhouse: Farmhouse): string | null => {
  // Check for direct map link from mobile app
  if (farmhouse.basicDetails?.mapLink) {
    return farmhouse.basicDetails.mapLink;
  }

  // Fallback to address search using location text
  const location = getFarmhouseLocation(farmhouse);
  if (location) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
  }

  return null;
};

const FarmhouseDetailModal: React.FC<FarmhouseDetailModalProps> = ({
  open,
  farmhouse,
  onClose,
  onApprovalComplete
}) => {
  const { currentUser } = useAuth();
  const { showSuccess, showError, showWarning } = useSnackbar();
  const { log: auditLog } = useAuditLog();
  const [loading, setLoading] = useState(false);
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [approvalType, setApprovalType] = useState<'approve' | 'reject'>('approve');
  const [activeTab, setActiveTab] = useState(0);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [commission, setCommission] = useState<number>(10);
  const [checklist, setChecklist] = useState<VerificationChecklist>({
    documentsVerified: false,
    photosQuality: false,
    pricingReasonable: false,
    locationVerified: false
  });

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setActiveTab(0);
      setCommission(10);
      setChecklist({
        documentsVerified: false,
        photosQuality: false,
        pricingReasonable: false,
        locationVerified: false
      });
    }
  }, [open]);

  const handleChecklistChange = (key: keyof VerificationChecklist) => {
    setChecklist(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleApprove = () => {
    const allChecked = Object.values(checklist).every(v => v);
    if (!allChecked) {
      showWarning('Please complete all verification checklist items before approving');
      return;
    }
    if (commission < 0 || commission > 100) {
      showWarning('Please set a valid commission percentage (0-100)');
      return;
    }
    setApprovalType('approve');
    setApprovalDialogOpen(true);
  };

  const handleReject = () => {
    setApprovalType('reject');
    setApprovalDialogOpen(true);
  };

  const handleConfirmApproval = async (commissionOverride?: number, reason?: string) => {
    try {
      if (!farmhouse.farmhouse_id) {
        throw new Error('Invalid farmhouse ID');
      }

      setLoading(true);
      const farmhouseRef = doc(db, 'farmhouses', farmhouse.farmhouse_id);
      const finalCommission = commissionOverride ?? commission;

      if (approvalType === 'approve') {
        const ownerId = getFarmhouseOwnerId(farmhouse);
        
        // Update farmhouse - use "approved" status for mobile app
        await updateDoc(farmhouseRef, {
          status: 'approved',  // ✅ Mobile app uses "approved"
          commission_percentage: finalCommission,
          approved_by: currentUser?.uid || 'admin',
          approved_at: serverTimestamp()
        });

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
            commission_percentage: finalCommission,
            approved_by: currentUser?.uid || 'admin',
            timestamp: serverTimestamp()
          });
        } catch (historyError) {
          console.warn('⚠️ Could not add approval history:', historyError);
          // Don't fail the entire approval if history fails
        }

        // Log audit trail
        await auditLog(
          AuditActions.APPROVE_FARMHOUSE,
          'farmhouse',
          farmhouse.farmhouse_id,
          {
            farmhouse_name: getFarmhouseName(farmhouse),
            commission_percentage: finalCommission,
            owner_id: ownerId
          }
        );

        showSuccess('Farmhouse approved successfully!');

      } else if (approvalType === 'reject' && reason) {
        // Update farmhouse to rejected
        await updateDoc(farmhouseRef, {
          status: 'rejected',
          rejection_reason: reason,
          rejected_by: currentUser?.uid || 'admin',
          rejected_at: serverTimestamp()
        });

        // Add to approval history
        try {
          await addDoc(collection(db, 'approval_history'), {
            farmhouse_id: farmhouse.farmhouse_id,
            action: 'rejected',
            rejection_reason: reason,
            rejected_by: currentUser?.uid || 'admin',
            timestamp: serverTimestamp()
          });
        } catch (historyError) {
          console.warn('⚠️ Could not add rejection history:', historyError);
        }

        // Log audit trail
        await auditLog(
          AuditActions.REJECT_FARMHOUSE,
          'farmhouse',
          farmhouse.farmhouse_id,
          {
            farmhouse_name: getFarmhouseName(farmhouse),
            rejection_reason: reason,
            owner_id: getFarmhouseOwnerId(farmhouse)
          }
        );

        showSuccess('Farmhouse rejected');
      }

      // Close dialog and refresh
      setApprovalDialogOpen(false);
      onApprovalComplete();

    } catch (error) {
      console.error('❌ Error during approval process:', error);

      // Show detailed error to user
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      showError('Failed to process approval: ' + errorMessage + '. Check console for details.');
    } finally {
      setLoading(false);
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
                <Tab label='Verification & Approval' />
              </Tabs>

              {activeTab === 0 && (
                <Box>
                  <Typography variant='h6' fontWeight='bold' gutterBottom>
                    {getFarmhouseName(farmhouse)}
                  </Typography>

                  {/* Location with Google Maps Link */}
                  <Paper sx={{ p: 2, mb: 3, bgcolor: 'grey.50' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <LocationOn color='primary' />
                        <Typography variant='body1'>
                          {getFarmhouseLocation(farmhouse)}
                        </Typography>
                      </Box>
                      {getGoogleMapsUrl(farmhouse) && (
                        <Button
                          variant='contained'
                          color='primary'
                          startIcon={<Map />}
                          href={getGoogleMapsUrl(farmhouse) || ''}
                          target='_blank'
                          rel='noopener noreferrer'
                          size='small'
                        >
                          View on Google Maps
                        </Button>
                      )}
                    </Box>
                    {farmhouse.basicDetails?.mapLink && (
                      <Typography variant='caption' color='text.secondary' sx={{ mt: 1, display: 'block' }}>
                        Map link provided by owner
                      </Typography>
                    )}
                  </Paper>

                  {/* Description */}
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

              {activeTab === 2 && (
                <Box>
                  <Alert severity='info' sx={{ mb: 3 }}>
                    Complete verification checklist and set commission before approving
                  </Alert>

                  {/* Commission Setting */}
                  <Paper sx={{ p: 3, mb: 3, bgcolor: 'success.50', border: '2px solid', borderColor: 'success.main' }}>
                    <Typography variant='h6' fontWeight='bold' gutterBottom color='success.dark'>
                      <AttachMoney sx={{ verticalAlign: 'middle', mr: 1 }} />
                      Set Commission Percentage
                    </Typography>
                    <Typography variant='body2' color='text.secondary' sx={{ mb: 2 }}>
                      This commission will be applied to all bookings for this farmhouse
                    </Typography>
                    <TextField
                      type='number'
                      label='Commission (%)'
                      value={commission}
                      onChange={(e) => setCommission(Number(e.target.value))}
                      InputProps={{
                        inputProps: { min: 0, max: 100, step: 0.5 }
                      }}
                      sx={{ width: 200 }}
                      helperText='Enter 0-100%'
                    />
                  </Paper>

                  {/* Verification Checklist */}
                  <Paper sx={{ p: 3, mb: 3 }}>
                    <Typography variant='h6' fontWeight='bold' gutterBottom>
                      Verification Checklist
                    </Typography>
                    <FormGroup>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={checklist.documentsVerified}
                            onChange={() => handleChecklistChange('documentsVerified')}
                          />
                        }
                        label='All KYC documents verified (Aadhaar, PAN, Licence)'
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