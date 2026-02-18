import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  InputAdornment,
  IconButton,
  alpha
} from '@mui/material';
import { Visibility, VisibilityOff, LockOutlined, EmailOutlined, Landscape } from '@mui/icons-material';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    try {
      setError('');
      setLoading(true);
      await login(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{
      minHeight: '100vh',
      display: 'flex',
      position: 'relative',
      overflow: 'hidden',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
    }}>
      {/* Decorative background elements */}
      <Box sx={{
        position: 'absolute',
        top: -120,
        right: -120,
        width: 400,
        height: 400,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(16,185,129,0.15) 0%, transparent 70%)',
        filter: 'blur(40px)',
      }} />
      <Box sx={{
        position: 'absolute',
        bottom: -80,
        left: -80,
        width: 300,
        height: 300,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(59,130,246,0.12) 0%, transparent 70%)',
        filter: 'blur(40px)',
      }} />

      {/* Left branding panel - hidden on mobile */}
      <Box sx={{
        display: { xs: 'none', md: 'flex' },
        flex: 1,
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        px: 6,
        position: 'relative',
      }}>
        <Box sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          mb: 4,
        }}>
          <Box sx={{
            width: 52,
            height: 52,
            borderRadius: 3,
            background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 32px rgba(16,185,129,0.3)',
          }}>
            <Landscape sx={{ color: 'white', fontSize: 28 }} />
          </Box>
          <Typography variant='h3' sx={{
            fontWeight: 800,
            background: 'linear-gradient(135deg, #10B981 0%, #34D399 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '-0.02em',
          }}>
            ReRoute
          </Typography>
        </Box>
        <Typography variant='h5' sx={{
          color: alpha('#fff', 0.7),
          fontWeight: 400,
          textAlign: 'center',
          maxWidth: 400,
          lineHeight: 1.6,
          mb: 6,
        }}>
          Manage your farmhouse rental platform with ease
        </Typography>
        <Box sx={{ display: 'flex', gap: 4 }}>
          {[
            { value: '500+', label: 'Properties' },
            { value: '10K+', label: 'Users' },
            { value: '₹2Cr+', label: 'Revenue' },
          ].map((stat) => (
            <Box key={stat.label} sx={{ textAlign: 'center' }}>
              <Typography variant='h4' sx={{
                fontWeight: 700,
                color: '#10B981',
              }}>
                {stat.value}
              </Typography>
              <Typography variant='body2' sx={{ color: alpha('#fff', 0.5), mt: 0.5 }}>
                {stat.label}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>

      {/* Right login panel */}
      <Box sx={{
        width: { xs: '100%', md: 480 },
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        px: { xs: 3, sm: 6 },
        py: 4,
      }}>
        <Box sx={{
          width: '100%',
          maxWidth: 400,
        }}>
          {/* Mobile logo */}
          <Box sx={{
            display: { xs: 'flex', md: 'none' },
            alignItems: 'center',
            gap: 1.5,
            mb: 5,
            justifyContent: 'center',
          }}>
            <Box sx={{
              width: 44,
              height: 44,
              borderRadius: 2.5,
              background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 32px rgba(16,185,129,0.3)',
            }}>
              <Landscape sx={{ color: 'white', fontSize: 24 }} />
            </Box>
            <Typography variant='h4' sx={{
              fontWeight: 800,
              background: 'linear-gradient(135deg, #10B981 0%, #34D399 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              ReRoute
            </Typography>
          </Box>

          <Typography variant='h4' sx={{
            fontWeight: 700,
            color: '#fff',
            mb: 1,
          }}>
            Welcome back
          </Typography>
          <Typography variant='body1' sx={{
            color: alpha('#fff', 0.5),
            mb: 4,
          }}>
            Sign in to your admin dashboard
          </Typography>

          {error && (
            <Alert
              severity='error'
              sx={{
                mb: 3,
                borderRadius: 2,
                backgroundColor: alpha('#EF4444', 0.1),
                color: '#FCA5A5',
                border: '1px solid',
                borderColor: alpha('#EF4444', 0.2),
                '& .MuiAlert-icon': { color: '#EF4444' },
              }}
            >
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              placeholder='Email address'
              type='email'
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete='email'
              autoFocus
              InputProps={{
                startAdornment: (
                  <InputAdornment position='start'>
                    <EmailOutlined sx={{ color: alpha('#fff', 0.3) }} />
                  </InputAdornment>
                ),
              }}
              sx={{
                mb: 2.5,
                '& .MuiOutlinedInput-root': {
                  backgroundColor: alpha('#fff', 0.05),
                  borderRadius: 2,
                  color: '#fff',
                  '& fieldset': {
                    borderColor: alpha('#fff', 0.1),
                  },
                  '&:hover fieldset': {
                    borderColor: alpha('#fff', 0.2),
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#10B981',
                    borderWidth: 2,
                  },
                },
                '& .MuiInputBase-input::placeholder': {
                  color: alpha('#fff', 0.4),
                  opacity: 1,
                },
              }}
            />
            
            <TextField
              fullWidth
              placeholder='Password'
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete='current-password'
              InputProps={{
                startAdornment: (
                  <InputAdornment position='start'>
                    <LockOutlined sx={{ color: alpha('#fff', 0.3) }} />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position='end'>
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge='end'
                      sx={{ color: alpha('#fff', 0.3) }}
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={{
                mb: 4,
                '& .MuiOutlinedInput-root': {
                  backgroundColor: alpha('#fff', 0.05),
                  borderRadius: 2,
                  color: '#fff',
                  '& fieldset': {
                    borderColor: alpha('#fff', 0.1),
                  },
                  '&:hover fieldset': {
                    borderColor: alpha('#fff', 0.2),
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#10B981',
                    borderWidth: 2,
                  },
                },
                '& .MuiInputBase-input::placeholder': {
                  color: alpha('#fff', 0.4),
                  opacity: 1,
                },
              }}
            />

            <Button
              type='submit'
              fullWidth
              variant='contained'
              size='large'
              disabled={loading}
              sx={{
                py: 1.75,
                borderRadius: 2,
                fontSize: '1rem',
                fontWeight: 600,
                textTransform: 'none',
                background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                boxShadow: '0 8px 32px rgba(16,185,129,0.3)',
                transition: 'all 0.3s ease',
                '&:hover': {
                  background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                  boxShadow: '0 12px 40px rgba(16,185,129,0.4)',
                  transform: 'translateY(-1px)',
                },
                '&:active': {
                  transform: 'translateY(0)',
                },
                '&.Mui-disabled': {
                  background: alpha('#10B981', 0.3),
                  color: alpha('#fff', 0.5),
                },
              }}
            >
              {loading ? <CircularProgress size={24} sx={{ color: 'white' }} /> : 'Sign In'}
            </Button>
          </form>

          <Typography variant='caption' sx={{
            display: 'block',
            textAlign: 'center',
            mt: 4,
            color: alpha('#fff', 0.3),
          }}>
            Admin access only • Contact support if you need assistance
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default Login;