import React, { useState, useEffect } from 'react';
import { Box, Button } from '@mui/material';

interface FloatingButtonsProps {
  showStats: boolean;
  setShowStats: (show: boolean) => void;
  showSettings: boolean;
  setShowSettings: (show: boolean) => void;
  onDeleteLast?: () => void;
  hasHistory?: boolean;
  onCreateRoom?: () => void;
}

export const FloatingButtons: React.FC<FloatingButtonsProps> = ({
  showStats,
  setShowStats,
  showSettings,
  setShowSettings,
  onDeleteLast,
  hasHistory = false,
  onCreateRoom,
}) => {
  const [isDeleteConfirming, setIsDeleteConfirming] = useState(false);

  // Сброс состояния подтверждения через 3 секунды
  useEffect(() => {
    if (isDeleteConfirming) {
      const timeout = setTimeout(() => {
        setIsDeleteConfirming(false);
      }, 3000);
      
      return () => clearTimeout(timeout);
    }
  }, [isDeleteConfirming]);

  const handleDeleteClick = () => {
    if (isDeleteConfirming) {
      // Второй клик - выполняем удаление
      onDeleteLast?.();
      setIsDeleteConfirming(false);
    } else {
      // Первый клик - показываем подтверждение
      setIsDeleteConfirming(true);
    }
  };
  return (
    <Box sx={{ 
      position: 'fixed', 
      bottom: 20, 
      right: 20, 
      display: 'flex', 
      flexDirection: 'column', 
      gap: 1, 
      zIndex: 1002 
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
          alignSelf: 'flex-end',
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
          alignSelf: 'flex-end',
          '&:hover': {
            backgroundColor: '#1565c0',
          },
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        }}
      >
        ⚙️
      </Button>
      
      {onCreateRoom && (
        <Button
          onClick={onCreateRoom}
          sx={{
            minWidth: 'auto',
            width: 56,
            height: 56,
            borderRadius: '50%',
            backgroundColor: '#4caf50',
            color: 'white',
            fontSize: '24px',
            alignSelf: 'flex-end',
            '&:hover': {
              backgroundColor: '#45a049',
            },
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          }}
        >
          ➕
        </Button>
      )}
      
      {/* Отладка: hasHistory={hasHistory ? 'true' : 'false'}, onDeleteLast={onDeleteLast ? 'exists' : 'missing'} */}
      {hasHistory && onDeleteLast && (
        <Button
          onClick={handleDeleteClick}
          sx={{
            minWidth: 'auto',
            width: isDeleteConfirming ? 80 : 56,
            height: 56,
            borderRadius: isDeleteConfirming ? '28px' : '50%',
            backgroundColor: isDeleteConfirming ? '#ff5722' : '#d32f2f',
            color: 'white',
            fontSize: isDeleteConfirming ? '12px' : '20px',
            fontWeight: isDeleteConfirming ? 'bold' : 'normal',
            transition: 'all 0.3s ease',
            alignSelf: 'flex-end',
            '&:hover': {
              backgroundColor: isDeleteConfirming ? '#f4511e' : '#c62828',
            },
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          }}
        >
          {isDeleteConfirming ? 'Точно?' : '🗑️'}
        </Button>
      )}
    </Box>
  );
}; 