import React from 'react';
import { Box, Button } from '@mui/material';

interface FloatingButtonsProps {
  showStats: boolean;
  setShowStats: (show: boolean) => void;
  showSettings: boolean;
  setShowSettings: (show: boolean) => void;
}

export const FloatingButtons: React.FC<FloatingButtonsProps> = ({
  showStats,
  setShowStats,
  showSettings,
  setShowSettings,
}) => {
  return (
    <Box sx={{ 
      position: 'fixed', 
      bottom: 20, 
      left: 20, 
      display: 'flex', 
      flexDirection: 'column', 
      gap: 1, 
      zIndex: 999 
    }}>
      <Button
        onClick={() => setShowStats(!showStats)}
        sx={{
          minWidth: 'auto',
          width: 56,
          height: 56,
          borderRadius: '50%',
          backgroundColor: showStats ? '#9c27b0' : '#673ab7',
          color: 'white',
          fontSize: '24px',
          '&:hover': {
            backgroundColor: '#9c27b0',
          },
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        }}
      >
        📊
      </Button>
      
      <Button
        onClick={() => setShowSettings(!showSettings)}
        sx={{
          minWidth: 'auto',
          width: 56,
          height: 56,
          borderRadius: '50%',
          backgroundColor: showSettings ? '#1565c0' : '#1976d2',
          color: 'white',
          fontSize: '24px',
          '&:hover': {
            backgroundColor: '#1565c0',
          },
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        }}
      >
        ⚙️
      </Button>
    </Box>
  );
}; 