import React, { useState } from 'react';
import {
  Box,
  Button,
  Typography,
  Paper,
  Alert,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  Chip
} from '@mui/material';
import { Build } from '@mui/icons-material';
import { collection, query, where, getDocs, doc, writeBatch } from 'firebase/firestore';
import { db } from '../../config/firebase';  // ✅ FIXED: Two levels up
import MainLayout from '../layout/MainLayout';

interface FixResult {
  farmhouseId: string;
  oldStatus: string;
  newStatus: string;
  name: string;
}

const DatabaseFixUtility: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [results, setResults] = useState<FixResult[]>([]);
  const [statusDistribution, setStatusDistribution] = useState<Record<string, number>>({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const analyzeDatabase = async () => {
    try {
      setAnalyzing(true);
      setError('');
      
      const snapshot = await getDocs(collection(db, 'farmhouses'));
      
      const distribution: Record<string, number> = {};
      
      snapshot.docs.forEach(doc => {
        const status = doc.data().status || 'undefined';
        distribution[status] = (distribution[status] || 0) + 1;
      });
      
      setStatusDistribution(distribution);
    } catch (err: any) {
      setError(`Analysis failed: ${err.message}`);
      console.error('Error analyzing database:', err);
    } finally {
      setAnalyzing(false);
    }
  };

  const fixDatabase = async () => {
    try {
      setLoading(true);
      setError('');
      setSuccess('');
      setResults([]);
      
      // ⚠️ FIXED: Only convert truly incorrect status values
      // DO NOT convert 'pending' or 'approved' - these are the correct values used by mobile app!
      // Mobile app flow: 'pending' → (admin approves) → 'approved'
      const incorrectStatuses = ['draft', 'submitted', 'awaiting_approval'];
      
      const fixedFarmhouses: FixResult[] = [];
      const batch = writeBatch(db);
      let batchCount = 0;
      
      for (const incorrectStatus of incorrectStatuses) {
        const q = query(
          collection(db, 'farmhouses'),
          where('status', '==', incorrectStatus)
        );
        
        const snapshot = await getDocs(q);

        for (const farmhouseDoc of snapshot.docs) {
          const data = farmhouseDoc.data();
          
          batch.update(doc(db, 'farmhouses', farmhouseDoc.id), {
            status: 'pending_approval'
          });
          
          fixedFarmhouses.push({
            farmhouseId: farmhouseDoc.id,
            oldStatus: incorrectStatus,
            newStatus: 'pending_approval',
            name: data.name || 'Unknown'
          });
          
          batchCount++;
          
          if (batchCount >= 500) {
            await batch.commit();
            batchCount = 0;
          }
        }
      }
      
      if (batchCount > 0) {
        await batch.commit();
      }
      
      setResults(fixedFarmhouses);
      
      if (fixedFarmhouses.length > 0) {
        setSuccess(`✅ Successfully fixed ${fixedFarmhouses.length} farmhouse(s)! They should now appear in the approval panel.`);
      } else {
        setSuccess('✅ No farmhouses needed fixing. All status values are correct!');
      }
      
      await analyzeDatabase();
      
    } catch (err: any) {
      setError(`Fix failed: ${err.message}`);
      console.error('Error fixing database:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <Box>
        <Paper sx={{ p: 3, mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Build color='warning' sx={{ fontSize: 40 }} />
            <Box>
              <Typography variant='h5' fontWeight='bold'>
                Database Status Fix Utility
              </Typography>
              <Typography variant='body2' color='text.secondary'>
                Fix farmhouse status values to make them appear in approval panel
              </Typography>
            </Box>
          </Box>

          <Alert severity='info' sx={{ mb: 2 }}>
            <Typography variant='body2' fontWeight='bold' gutterBottom>
              ℹ️ What this utility does:
            </Typography>
            <Typography variant='body2'>
              • Converts incorrect status values like "draft", "submitted", "awaiting_approval" to "pending_approval"
              <br />
              • Does NOT change "pending" or "approved" (these are correct!)
              <br />
              • Only use if you have farmhouses with incorrect status values
              <br />
              • Safe to run multiple times
            </Typography>
          </Alert>

          <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
            <Button
              variant='outlined'
              onClick={analyzeDatabase}
              disabled={analyzing || loading}
              startIcon={analyzing ? <CircularProgress size={20} /> : undefined}
            >
              {analyzing ? 'Analyzing...' : 'Analyze Database'}
            </Button>

            <Button
              variant='contained'
              color='warning'
              onClick={fixDatabase}
              disabled={loading || analyzing}
              startIcon={loading ? <CircularProgress size={20} color='inherit' /> : <Build />}
            >
              {loading ? 'Fixing...' : 'Fix Database'}
            </Button>
          </Box>

          {error && (
            <Alert severity='error' sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert severity='success' sx={{ mb: 2 }}>
              {success}
            </Alert>
          )}

          {Object.keys(statusDistribution).length > 0 && (
            <Paper variant='outlined' sx={{ p: 2, mb: 2 }}>
              <Typography variant='subtitle1' fontWeight='bold' gutterBottom>
                Current Database Status Distribution:
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
                {Object.entries(statusDistribution).map(([status, count]) => (
                  <Chip
                    key={status}
                    label={`${status}: ${count}`}
                    color={
                      status === 'pending_approval' ? 'success' :
                      status === 'active' ? 'info' :
                      status === 'rejected' ? 'error' :
                      'warning'
                    }
                  />
                ))}
              </Box>
            </Paper>
          )}

          {results.length > 0 && (
            <Paper variant='outlined' sx={{ p: 2 }}>
              <Typography variant='subtitle1' fontWeight='bold' gutterBottom>
                Fixed Farmhouses ({results.length}):
              </Typography>
              <List dense>
                {results.map((result, index) => (
                  <ListItem key={index}>
                    <ListItemText
                      primary={result.name}
                      secondary={
                        <Box component='span'>
                          <Chip label={result.oldStatus} size='small' color='error' sx={{ mr: 1 }} />
                          →
                          <Chip label={result.newStatus} size='small' color='success' sx={{ ml: 1 }} />
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </Paper>
          )}
        </Paper>

        <Alert severity='info'>
          <Typography variant='body2' fontWeight='bold' gutterBottom>
            📋 After running this fix:
          </Typography>
          <Typography variant='body2'>
            1. Go to "Farmhouse Approvals" page and refresh
            <br />
            2. Fixed farmhouses should now appear
            <br />
            3. IMPORTANT: Fix your mobile app code to use "pending_approval" status
          </Typography>
        </Alert>
      </Box>
    </MainLayout>
  );
};

export default DatabaseFixUtility;