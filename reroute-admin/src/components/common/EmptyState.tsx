import React from 'react';
import { Box, Typography, Button, Paper } from '@mui/material';
import {
  Inbox,
  AddCircleOutline,
  SearchOff,
  ErrorOutline,
  WarningAmber
} from '@mui/icons-material';

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: 'inbox' | 'search' | 'error' | 'warning' | 'add';
  actionLabel?: string;
  onAction?: () => void;
  compact?: boolean;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon = 'inbox',
  actionLabel,
  onAction,
  compact = false
}) => {
  const getIcon = () => {
    const iconProps = {
      sx: {
        fontSize: compact ? 64 : 80,
        color: 'text.disabled',
        mb: 2
      }
    };

    switch (icon) {
      case 'search':
        return <SearchOff {...iconProps} />;
      case 'error':
        return <ErrorOutline {...iconProps} />;
      case 'warning':
        return <WarningAmber {...iconProps} />;
      case 'add':
        return <AddCircleOutline {...iconProps} />;
      default:
        return <Inbox {...iconProps} />;
    }
  };

  const content = (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        py: compact ? 4 : 8,
        px: 3
      }}
    >
      {getIcon()}

      <Typography
        variant={compact ? 'h6' : 'h5'}
        fontWeight='bold'
        color='text.secondary'
        gutterBottom
      >
        {title}
      </Typography>

      {description && (
        <Typography
          variant='body2'
          color='text.secondary'
          sx={{ maxWidth: 400, mb: 3 }}
        >
          {description}
        </Typography>
      )}

      {actionLabel && onAction && (
        <Button
          variant='contained'
          startIcon={<AddCircleOutline />}
          onClick={onAction}
          size={compact ? 'medium' : 'large'}
        >
          {actionLabel}
        </Button>
      )}
    </Box>
  );

  if (compact) {
    return content;
  }

  return (
    <Paper
      elevation={0}
      sx={{
        border: '2px dashed',
        borderColor: 'divider',
        borderRadius: 3
      }}
    >
      {content}
    </Paper>
  );
};

export default EmptyState;
