import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Box, Typography, Button, Paper } from '@mui/material';
import { Error as ErrorIcon, Refresh } from '@mui/icons-material';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });

    // TODO: Log error to error reporting service (e.g., Sentry)
    // logErrorToService(error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = '/dashboard';
  };

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '100vh',
            backgroundColor: '#f5f5f5',
            p: 3,
          }}
        >
          <Paper
            sx={{
              p: 4,
              maxWidth: 600,
              width: '100%',
              textAlign: 'center',
            }}
            elevation={3}
          >
            <ErrorIcon
              sx={{
                fontSize: 80,
                color: 'error.main',
                mb: 2,
              }}
            />

            <Typography variant='h4' gutterBottom fontWeight='bold'>
              Oops! Something went wrong
            </Typography>

            <Typography variant='body1' color='text.secondary' sx={{ mb: 3 }}>
              We're sorry for the inconvenience. An unexpected error has occurred.
            </Typography>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <Box
                sx={{
                  mt: 3,
                  mb: 3,
                  p: 2,
                  backgroundColor: '#f5f5f5',
                  borderRadius: 1,
                  textAlign: 'left',
                  overflow: 'auto',
                }}
              >
                <Typography variant='subtitle2' fontWeight='bold' color='error'>
                  Error Details (Development Mode):
                </Typography>
                <Typography
                  variant='caption'
                  component='pre'
                  sx={{ mt: 1, fontSize: '0.75rem', wordBreak: 'break-word' }}
                >
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </Typography>
              </Box>
            )}

            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mt: 4 }}>
              <Button
                variant='contained'
                startIcon={<Refresh />}
                onClick={this.handleReload}
                size='large'
              >
                Reload Page
              </Button>
              <Button
                variant='outlined'
                onClick={this.handleReset}
                size='large'
              >
                Go to Dashboard
              </Button>
            </Box>

            <Typography variant='caption' color='text.secondary' sx={{ mt: 3, display: 'block' }}>
              If this problem persists, please contact support.
            </Typography>
          </Paper>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
