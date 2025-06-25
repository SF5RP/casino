import React from 'react';
import { Box, Button, TextField, Typography } from '@mui/material';

interface SettingsPanelProps {
  showSettings: boolean;
  setShowSettings: (show: boolean) => void;
  setShowStats: (show: boolean) => void;
  historyRows: number;
  updateHistoryRows: (rows: number) => void;
  itemsPerRow: number;
  maxVisibleItems: number;
  historyLength: number;
  showFullHistory: boolean;
  setShowFullHistory: (show: boolean) => void;
  onShare: () => void;
  onReset: () => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  showSettings,
  setShowSettings,
  setShowStats,
  historyRows,
  updateHistoryRows,
  itemsPerRow,
  maxVisibleItems,
  historyLength,
  showFullHistory,
  setShowFullHistory,
  onShare,
  onReset,
}) => (
  <Box 
    sx={{
      position: 'fixed',
      top: 0,
      right: showSettings ? 0 : '-400px',
      width: '300px',
      height: '100vh',
      backgroundColor: '#1a1a1a',
      borderLeft: '1px solid #333',
      padding: 3,
      transition: 'right 0.3s ease',
      zIndex: 1000,
      overflowY: 'auto',
    }}
  >
    <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
      <Typography variant="h6" color="white">Настройки</Typography>
      <Button 
        onClick={() => setShowSettings(false)}
        sx={{ color: 'white', minWidth: 'auto', p: 1 }}
      >
        ✕
      </Button>
    </Box>

    <Box mb={3}>
      <Typography variant="subtitle1" color="white" mb={2}>
        История ставок
      </Typography>
      
      <Box mb={2}>
        <Typography variant="body2" color="#ccc" mb={1}>
          Количество строк: {historyRows}
        </Typography>
        <TextField
          type="number"
          value={historyRows}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            const value = Math.max(1, Math.min(10, parseInt(e.target.value) || 1));
            updateHistoryRows(value);
          }}
          inputProps={{ min: 1, max: 10 }}
          size="small"
          sx={{
            '& .MuiOutlinedInput-root': {
              color: 'white',
              '& fieldset': { borderColor: '#555' },
              '&:hover fieldset': { borderColor: '#777' },
              '&.Mui-focused fieldset': { borderColor: '#1976d2' },
            },
            '& .MuiInputLabel-root': { color: '#ccc' },
          }}
        />
      </Box>

      <Box mb={2}>
        <Button
          variant="outlined"
          size="small"
          onClick={() => setShowFullHistory(!showFullHistory)}
          sx={{ 
            color: 'white', 
            borderColor: '#555',
            '&:hover': { borderColor: '#777' },
            mb: 1,
            width: '100%'
          }}
        >
          {showFullHistory ? 'Скрыть старую историю' : 'Показать всю историю'}
        </Button>
      </Box>

      <Typography variant="caption" color="#999" mb={2} display="block">
        Элементов на строку: {itemsPerRow}<br/>
        Показывается: {Math.min(maxVisibleItems, historyLength)} из {historyLength}
      </Typography>
    </Box>

    <Box mb={3}>
      <Typography variant="subtitle1" color="white" mb={2}>
        Действия
      </Typography>
      
      <Box display="flex" flexDirection="column" gap={1}>
        <Button
          variant="outlined"
          onClick={() => {
            setShowStats(true);
            setShowSettings(false);
          }}
          sx={{ 
            color: 'white', 
            borderColor: '#673ab7',
            '&:hover': { borderColor: '#9c27b0' }
          }}
        >
          📊 Статистика
        </Button>
        
        <Button
          variant="outlined"
          onClick={onShare}
          sx={{ 
            color: 'white', 
            borderColor: '#555',
            '&:hover': { borderColor: '#777' }
          }}
        >
          Поделиться
        </Button>
        
        <Button
          variant="outlined"
          color="error"
          onClick={onReset}
          sx={{ 
            borderColor: '#d32f2f',
            '&:hover': { borderColor: '#f44336' }
          }}
        >
          Сбросить всё
        </Button>
      </Box>
    </Box>
  </Box>
); 