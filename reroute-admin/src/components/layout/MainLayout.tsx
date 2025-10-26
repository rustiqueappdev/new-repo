import React, { useState } from 'react';
import { Box, useMediaQuery, useTheme } from '@mui/material';
import Sidebar from './Sidebar';
import Header from './Header';

const drawerWidth = 260;

interface MainLayoutProps {
  children: React.ReactNode;
  pendingCount?: number;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children, pendingCount }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar
        pendingCount={pendingCount}
        mobileOpen={mobileOpen}
        onDrawerToggle={handleDrawerToggle}
      />
      <Box
        component='main'
        sx={{
          flexGrow: 1,
          width: { xs: '100%', md: `calc(100% - ${drawerWidth}px)` },
          minHeight: '100vh',
          backgroundColor: 'background.default'
        }}
      >
        <Header onMenuClick={handleDrawerToggle} />
        <Box sx={{
          mt: { xs: 7, sm: 8 },
          p: { xs: 2, sm: 3 },
          maxWidth: '100%',
          overflow: 'hidden'
        }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
};

export default MainLayout;