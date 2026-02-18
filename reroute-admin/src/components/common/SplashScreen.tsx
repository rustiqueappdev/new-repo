import React from 'react';
import { Box, Typography, keyframes } from '@mui/material';
import { Landscape } from '@mui/icons-material';

const pulse = keyframes`
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.06); }
`;

const float = keyframes`
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
`;

const fadeInUp = keyframes`
  0% { opacity: 0; transform: translateY(20px); }
  100% { opacity: 1; transform: translateY(0); }
`;

const dotBounce = keyframes`
  0%, 80%, 100% { transform: scale(0.6); opacity: 0.3; }
  40% { transform: scale(1.2); opacity: 1; }
`;

const circleFloat1 = keyframes`
  0%, 100% { transform: translate(0, 0); }
  33% { transform: translate(8px, -12px); }
  66% { transform: translate(-6px, 8px); }
`;

const circleFloat2 = keyframes`
  0%, 100% { transform: translate(0, 0); }
  33% { transform: translate(-10px, 6px); }
  66% { transform: translate(12px, -8px); }
`;

const circleFloat3 = keyframes`
  0%, 100% { transform: translate(0, 0); }
  33% { transform: translate(6px, 10px); }
  66% { transform: translate(-8px, -6px); }
`;

interface CircleProps {
  size: number;
  top?: string;
  left?: string;
  right?: string;
  bottom?: string;
  opacity: number;
  animation: string;
  delay?: string;
}

const circles: CircleProps[] = [
  { size: 90, top: '-30px', right: '15%', opacity: 0.5, animation: `${circleFloat1} 8s ease-in-out infinite` },
  { size: 120, top: '5%', right: '-40px', opacity: 0.35, animation: `${circleFloat2} 10s ease-in-out infinite`, delay: '1s' },
  { size: 45, top: '8%', left: '10%', opacity: 0.6, animation: `${circleFloat3} 7s ease-in-out infinite`, delay: '0.5s' },
  { size: 70, top: '25%', right: '8%', opacity: 0.4, animation: `${circleFloat1} 9s ease-in-out infinite`, delay: '2s' },
  { size: 55, top: '40%', left: '-20px', opacity: 0.5, animation: `${circleFloat2} 8s ease-in-out infinite`, delay: '1.5s' },
  { size: 110, bottom: '15%', left: '8%', opacity: 0.3, animation: `${circleFloat3} 11s ease-in-out infinite`, delay: '0.8s' },
  { size: 65, bottom: '5%', right: '20%', opacity: 0.45, animation: `${circleFloat1} 9s ease-in-out infinite`, delay: '3s' },
  { size: 40, bottom: '-15px', left: '35%', opacity: 0.55, animation: `${circleFloat2} 7s ease-in-out infinite`, delay: '2.5s' },
  { size: 85, top: '60%', right: '-30px', opacity: 0.3, animation: `${circleFloat3} 10s ease-in-out infinite`, delay: '1.2s' },
  { size: 50, top: '15%', left: '40%', opacity: 0.25, animation: `${circleFloat1} 8s ease-in-out infinite`, delay: '4s' },
  { size: 75, bottom: '30%', left: '-25px', opacity: 0.35, animation: `${circleFloat2} 9s ease-in-out infinite`, delay: '0.3s' },
  { size: 35, bottom: '45%', right: '12%', opacity: 0.5, animation: `${circleFloat3} 7s ease-in-out infinite`, delay: '2.2s' },
];

const SplashScreen: React.FC = () => {
  return (
    <Box
      sx={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: 'rgb(249, 248, 239)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      {/* Decorative floating circles — matching mobile app */}
      {circles.map((circle, i) => (
        <Box
          key={i}
          sx={{
            position: 'absolute',
            width: circle.size,
            height: circle.size,
            borderRadius: '50%',
            backgroundColor: `rgba(244, 173, 50, ${circle.opacity * 0.5})`,
            border: '1.5px solid',
            borderColor: `rgba(244, 173, 50, ${circle.opacity * 0.9})`,
            top: circle.top,
            left: circle.left,
            right: circle.right,
            bottom: circle.bottom,
            animation: circle.animation,
            animationDelay: circle.delay || '0s',
          }}
        />
      ))}

      {/* Main content */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          zIndex: 1,
          animation: `${fadeInUp} 0.8s ease-out`,
        }}
      >
        {/* Logo icon */}
        <Box
          sx={{
            width: 100,
            height: 100,
            borderRadius: 4,
            background: 'linear-gradient(135deg, rgb(244, 173, 50) 0%, rgb(234, 150, 20) 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 12px 40px rgba(244, 173, 50, 0.3)',
            animation: `${pulse} 2.5s ease-in-out infinite, ${float} 3s ease-in-out infinite`,
            mb: 3,
          }}
        >
          <Landscape sx={{ color: 'white', fontSize: 52 }} />
        </Box>

        {/* App name */}
        <Typography
          sx={{
            fontWeight: 800,
            fontSize: '2.2rem',
            color: 'rgb(60, 50, 30)',
            letterSpacing: '-0.02em',
            animation: `${fadeInUp} 0.8s ease-out 0.2s both`,
          }}
        >
          ReRoute
        </Typography>

        {/* Subtitle */}
        <Typography
          sx={{
            fontSize: '0.85rem',
            color: 'rgba(60, 50, 30, 0.5)',
            fontWeight: 500,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            mt: 0.5,
            animation: `${fadeInUp} 0.8s ease-out 0.4s both`,
          }}
        >
          Admin Panel
        </Typography>

        {/* Loading dots */}
        <Box
          sx={{
            display: 'flex',
            gap: 1.5,
            mt: 5,
            animation: `${fadeInUp} 0.8s ease-out 0.6s both`,
          }}
        >
          {[0, 1, 2].map((i) => (
            <Box
              key={i}
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: 'rgb(244, 173, 50)',
                animation: `${dotBounce} 1.4s ease-in-out infinite`,
                animationDelay: `${i * 0.16}s`,
              }}
            />
          ))}
        </Box>
      </Box>
    </Box>
  );
};

export default SplashScreen;
