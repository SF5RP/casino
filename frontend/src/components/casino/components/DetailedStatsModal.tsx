import React from 'react';
import { Box, Button, Dialog, DialogTitle, DialogContent, DialogActions, Typography } from '@mui/material';
import { getNumberColor, getContrastText } from '../utils/rouletteUtils';
import type { RouletteNumber, SortBy, StatsData } from '../types/rouletteTypes';

interface DetailedStatsModalProps {
  open: boolean;
  onClose: () => void;
  history: RouletteNumber[];
  sortBy: SortBy;
  setSortBy: (sortBy: SortBy) => void;
}

export const DetailedStatsModal: React.FC<DetailedStatsModalProps> = ({
  open,
  onClose,
  history,
  sortBy,
  setSortBy,
}) => {
  const allNumbers: RouletteNumber[] = [0, ...Array.from({ length: 36 }, (_, i) => i + 1), '00'];
  
  // Подготавливаем данные для сортировки
  const statsData: StatsData[] = allNumbers.map(num => {
    const numStr = String(num);
    const occurrences = history.filter(h => String(h) === numStr).length;
    const lastIndex = [...history].reverse().findIndex(h => String(h) === numStr);
    const lastOccurrence = lastIndex === -1 ? 'Никогда' : `${lastIndex} назад`;
    const percentage = history.length > 0 ? ((occurrences / history.length) * 100) : 0;
    const expectedPercentage = 2.7;
    const deviation = percentage - expectedPercentage;
    const color = getNumberColor(num);
    
    return {
      number: num,
      occurrences,
      lastIndex: lastIndex === -1 ? 999999 : lastIndex,
      lastOccurrence,
      percentage,
      deviation,
      color
    };
  });

  // Сортируем данные
  const sortedData = [...statsData].sort((a, b) => {
    switch (sortBy) {
      case 'frequency':
        return b.occurrences - a.occurrences;
      case 'recent':
        return a.lastIndex - b.lastIndex;
      case 'number':
      default:
        // Сортировка по номеру: 0, 1, 2, ..., 36, 00
        if (a.number === 0) return -1;
        if (b.number === 0) return 1;
        if (a.number === '00') return 1;
        if (b.number === '00') return -1;
        return (a.number as number) - (b.number as number);
    }
  });
  
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          backgroundColor: '#1a1a1a',
          color: 'white',
          maxHeight: '80vh',
        }
      }}
    >
      <DialogTitle sx={{ color: 'white', borderBottom: '1px solid #333', pb: 2 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">📋 Детальная статистика по числам</Typography>
          <Box display="flex" gap={1}>
            <Button
              size="small"
              variant={sortBy === 'number' ? 'contained' : 'outlined'}
              onClick={() => setSortBy('number')}
              sx={{ 
                color: 'white', 
                borderColor: '#555',
                '&:hover': { borderColor: '#777' },
                minWidth: 'auto',
                px: 1
              }}
            >
              №
            </Button>
            <Button
              size="small"
              variant={sortBy === 'frequency' ? 'contained' : 'outlined'}
              onClick={() => setSortBy('frequency')}
              sx={{ 
                color: 'white', 
                borderColor: '#555',
                '&:hover': { borderColor: '#777' },
                minWidth: 'auto',
                px: 1
              }}
            >
              📊
            </Button>
            <Button
              size="small"
              variant={sortBy === 'recent' ? 'contained' : 'outlined'}
              onClick={() => setSortBy('recent')}
              sx={{ 
                color: 'white', 
                borderColor: '#555',
                '&:hover': { borderColor: '#777' },
                minWidth: 'auto',
                px: 1
              }}
            >
              🕒
            </Button>
          </Box>
        </Box>
        <Typography variant="caption" color="#999" mt={1} display="block">
          Сортировка: {sortBy === 'number' ? 'По номеру' : sortBy === 'frequency' ? 'По частоте' : 'По времени'}
        </Typography>
      </DialogTitle>
      
      <DialogContent sx={{ p: 0 }}>
        <Box sx={{ maxHeight: '60vh', overflowY: 'auto', p: 2 }}>
          {sortedData.map(({ number, occurrences, lastOccurrence, percentage, deviation, color }) => (
            <Box 
              key={String(number)}
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                p: 2,
                mb: 1,
                backgroundColor: '#2a2a2a',
                borderRadius: 1,
                border: `1px solid ${color}`,
                '&:hover': {
                  backgroundColor: '#333',
                }
              }}
            >
              <Box display="flex" alignItems="center" gap={2}>
                <Box 
                  sx={{ 
                    width: 28, 
                    height: 28, 
                    borderRadius: '50%', 
                    background: color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: getContrastText(color),
                    fontWeight: 'bold',
                    fontSize: '14px'
                  }}
                >
                  {number}
                </Box>
                <Box>
                  <Typography variant="body1" color="white" fontWeight="bold">
                    {occurrences} раз ({percentage.toFixed(1)}%)
                  </Typography>
                  <Typography variant="body2" color="#999">
                    Последний раз: {lastOccurrence}
                  </Typography>
                </Box>
              </Box>
              
              <Box textAlign="right">
                <Typography 
                  variant="body2" 
                  color={deviation > 0 ? '#4ade80' : deviation < 0 ? '#ef4444' : '#999'}
                  fontWeight="bold"
                >
                  {deviation > 0 ? '+' : ''}{deviation.toFixed(1)}%
                </Typography>
                <Typography variant="caption" color="#666">
                  от нормы (2.7%)
                </Typography>
              </Box>
            </Box>
          ))}
        </Box>
      </DialogContent>
      
      <DialogActions sx={{ borderTop: '1px solid #333', p: 2 }}>
        <Typography variant="body2" color="#ccc" sx={{ flexGrow: 1 }}>
          Всего ставок: {history.length}
        </Typography>
        <Button 
          onClick={onClose}
          sx={{ color: 'white' }}
        >
          Закрыть
        </Button>
      </DialogActions>
    </Dialog>
  );
}; 