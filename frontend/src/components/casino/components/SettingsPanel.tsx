import React from 'react';
import {
  Box,
  Typography,
  FormControl,
  FormLabel,
  Slider,
  FormGroup,
  FormControlLabel,
  Switch,
  Button,
  Divider,
} from '@mui/material';

interface SettingsPanelProps {
  showSettings: boolean;
  setShowSettings: (show: boolean) => void;
  setShowStats: (show: boolean) => void;
  historyRows: number;
  updateHistoryRows: (rows: number) => void;
  historyLength: number;
  showFullHistory: boolean;
  setShowFullHistory: (show: boolean) => void;
  onShare: () => void;
  onReset: () => void;
  onDeleteLast: () => void;
  chartHistoryLength: number;
  setChartHistoryLength: (length: number) => void;
  isHistoryWide: boolean;
  setIsHistoryWide: (wide: boolean) => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  showSettings,
  setShowSettings,
  setShowStats,
  historyRows,
  updateHistoryRows,
  historyLength,
  showFullHistory,
  setShowFullHistory,
  onShare,
  onReset,
  onDeleteLast,
  chartHistoryLength,
  setChartHistoryLength,
  isHistoryWide,
  setIsHistoryWide,
}) => {
  if (!showSettings) return null;

  return (
    <>
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 1999,
        }}
        onClick={() => setShowSettings(false)}
      />
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          right: 0,
          width: 340,
          height: '100vh',
          backgroundColor: '#1a1a1a',
          borderLeft: '1px solid #333',
          zIndex: 2000,
          boxShadow: 4,
          overflowY: 'auto',
          p: 3,
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6" color="white">
            Настройки
          </Typography>
          <Box
            onClick={() => setShowSettings(false)}
            sx={{
              cursor: 'pointer',
              color: 'white',
              fontSize: '24px',
              '&:hover': { color: '#ccc' },
              width: 32,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ×
          </Box>
        </Box>

        <Box sx={{ mb: 3 }}>
          <FormControl fullWidth>
            <FormLabel sx={{ color: 'white', mb: 1 }}>
              История: {historyRows} строк из {historyLength} чисел
            </FormLabel>
            <Slider
              value={historyRows}
              onChange={(_, value) => updateHistoryRows(value as number)}
              min={1}
              max={10}
              step={1}
              marks
              valueLabelDisplay="auto"
              sx={{
                color: '#2196f3',
                '& .MuiSlider-thumb': {
                  backgroundColor: '#2196f3',
                },
                '& .MuiSlider-track': {
                  backgroundColor: '#2196f3',
                },
                '& .MuiSlider-rail': {
                  backgroundColor: '#666',
                },
              }}
            />
          </FormControl>
        </Box>

        <Box sx={{ mb: 3 }}>
          <FormControl fullWidth>
            <FormLabel sx={{ color: 'white', mb: 1 }}>
              График: последние {chartHistoryLength} чисел
            </FormLabel>
            <Slider
              value={chartHistoryLength}
              onChange={(_, value) => setChartHistoryLength(value as number)}
              min={10}
              max={100}
              step={5}
              marks={[
                { value: 10, label: '10' },
                { value: 30, label: '30' },
                { value: 50, label: '50' },
                { value: 100, label: '100' },
              ]}
              valueLabelDisplay="auto"
              sx={{
                color: '#4caf50',
                '& .MuiSlider-thumb': {
                  backgroundColor: '#4caf50',
                },
                '& .MuiSlider-track': {
                  backgroundColor: '#4caf50',
                },
                '& .MuiSlider-rail': {
                  backgroundColor: '#666',
                },
              }}
            />
          </FormControl>
        </Box>

        <FormGroup sx={{ mb: 3 }}>
          <FormControlLabel
            control={
              <Switch
                checked={showFullHistory}
                onChange={(e) => setShowFullHistory(e.target.checked)}
                sx={{
                  '& .MuiSwitch-switchBase.Mui-checked': {
                    color: '#2196f3',
                  },
                  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                    backgroundColor: '#2196f3',
                  },
                }}
              />
            }
            label={<Typography color="white">Полная история</Typography>}
          />
          <FormControlLabel
            control={
              <Switch
                checked={isHistoryWide}
                onChange={(e) => setIsHistoryWide(e.target.checked)}
                sx={{
                  '& .MuiSwitch-switchBase.Mui-checked': {
                    color: '#ff9800',
                  },
                  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                    backgroundColor: '#ff9800',
                  },
                }}
              />
            }
            label={<Typography color="white">Широкая история</Typography>}
          />
        </FormGroup>

        <Divider sx={{ backgroundColor: '#333', mb: 3 }} />

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Button
            variant="outlined"
            onClick={onShare}
            sx={{
              color: '#2196f3',
              borderColor: '#2196f3',
              '&:hover': {
                borderColor: '#1976d2',
                backgroundColor: 'rgba(33, 150, 243, 0.1)',
              },
            }}
          >
            Поделиться комнатой
          </Button>

          <Button
            variant="outlined"
            onClick={() => setShowStats(true)}
            sx={{
              color: '#4caf50',
              borderColor: '#4caf50',
              '&:hover': {
                borderColor: '#388e3c',
                backgroundColor: 'rgba(76, 175, 80, 0.1)',
              },
            }}
          >
            Показать статистику
          </Button>

          <Button
            variant="outlined"
            onClick={onDeleteLast}
            sx={{
              color: '#ff9800',
              borderColor: '#ff9800',
              '&:hover': {
                borderColor: '#f57c00',
                backgroundColor: 'rgba(255, 152, 0, 0.1)',
              },
            }}
          >
            Удалить последнее
          </Button>

          <Button
            variant="outlined"
            onClick={onReset}
            sx={{
              color: '#f44336',
              borderColor: '#f44336',
              '&:hover': {
                borderColor: '#d32f2f',
                backgroundColor: 'rgba(244, 67, 54, 0.1)',
              },
            }}
          >
            Сбросить всё
          </Button>
        </Box>
      </Box>
    </>
  );
}; 