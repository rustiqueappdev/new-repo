import React from 'react';
import { Box, Card, CardContent, Skeleton, Paper, Grid } from '@mui/material';

export const StatCardSkeleton: React.FC = () => {
  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box sx={{ flex: 1 }}>
            <Skeleton variant="text" width="60%" height={20} />
            <Skeleton variant="text" width="40%" height={48} sx={{ mt: 1 }} />
          </Box>
          <Skeleton variant="rectangular" width={56} height={56} sx={{ borderRadius: 2 }} />
        </Box>
        <Skeleton variant="text" width="30%" height={16} sx={{ mt: 2 }} />
      </CardContent>
    </Card>
  );
};

export const TableSkeleton: React.FC<{ rows?: number }> = ({ rows = 5 }) => {
  return (
    <Box>
      {Array.from({ length: rows }).map((_, index) => (
        <Box
          key={index}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            py: 2,
            borderBottom: '1px solid',
            borderColor: 'divider'
          }}
        >
          <Skeleton variant="circular" width={40} height={40} />
          <Box sx={{ flex: 1 }}>
            <Skeleton variant="text" width="60%" />
            <Skeleton variant="text" width="40%" />
          </Box>
          <Skeleton variant="rectangular" width={80} height={32} sx={{ borderRadius: 1 }} />
        </Box>
      ))}
    </Box>
  );
};

export const ChartSkeleton: React.FC = () => {
  return (
    <Paper sx={{ p: 3 }}>
      <Skeleton variant="text" width="40%" height={32} sx={{ mb: 3 }} />
      <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 300 }}>
        {Array.from({ length: 7 }).map((_, index) => (
          <Skeleton
            key={index}
            variant="rectangular"
            sx={{
              flex: 1,
              height: `${Math.random() * 60 + 40}%`,
              borderRadius: '4px 4px 0 0'
            }}
          />
        ))}
      </Box>
    </Paper>
  );
};

export const DashboardSkeleton: React.FC = () => {
  return (
    <Box>
      <Skeleton variant="text" width="30%" height={48} sx={{ mb: 1 }} />
      <Skeleton variant="text" width="50%" height={24} sx={{ mb: 4 }} />

      <Grid container spacing={3}>
        {Array.from({ length: 5 }).map((_, index) => (
          <Grid size={{ xs: 12, sm: 6, md: 4 }} key={index}>
            <StatCardSkeleton />
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3} sx={{ mt: 2 }}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 3 }}>
            <Skeleton variant="text" width="40%" height={32} sx={{ mb: 3 }} />
            {Array.from({ length: 3 }).map((_, index) => (
              <Box
                key={index}
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  py: 2,
                  borderBottom: index < 2 ? '1px solid' : 'none',
                  borderColor: 'divider'
                }}
              >
                <Skeleton variant="text" width="30%" />
                <Skeleton variant="text" width="20%" />
              </Box>
            ))}
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 3 }}>
            <Skeleton variant="text" width="40%" height={32} sx={{ mb: 3 }} />
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton
                key={index}
                variant="rectangular"
                height={60}
                sx={{ mb: 2, borderRadius: 2 }}
              />
            ))}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export const ListSkeleton: React.FC<{ items?: number }> = ({ items = 3 }) => {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {Array.from({ length: items }).map((_, index) => (
        <Paper key={index} sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Skeleton variant="circular" width={48} height={48} />
            <Box sx={{ flex: 1 }}>
              <Skeleton variant="text" width="70%" height={24} />
              <Skeleton variant="text" width="40%" height={20} />
            </Box>
            <Skeleton variant="rectangular" width={100} height={36} sx={{ borderRadius: 1 }} />
          </Box>
        </Paper>
      ))}
    </Box>
  );
};

export const FormSkeleton: React.FC = () => {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {Array.from({ length: 4 }).map((_, index) => (
        <Box key={index}>
          <Skeleton variant="text" width="30%" height={20} sx={{ mb: 1 }} />
          <Skeleton variant="rectangular" height={56} sx={{ borderRadius: 2 }} />
        </Box>
      ))}
      <Skeleton variant="rectangular" height={48} sx={{ borderRadius: 2, mt: 2 }} />
    </Box>
  );
};
