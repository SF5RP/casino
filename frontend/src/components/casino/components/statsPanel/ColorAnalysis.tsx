import React from 'react';
import { Box, Typography } from '@mui/material';
import { BLACK_NUMBERS, RED_NUMBERS } from '../../constants/rouletteConstants';
import type { RouletteNumber } from '../../types/rouletteTypes';

interface ColorAnalysisProps {
  history: RouletteNumber[];
}

export const ColorAnalysis: React.FC<ColorAnalysisProps> = ({ history }) => {
  const redCount = history.filter(h => typeof h === 'number' && h !== 0 && RED_NUMBERS.has(h)).length;
  const blackCount = history.filter(h => typeof h === 'number' && h !== 0 && BLACK_NUMBERS.has(h)).length;
  const greenCount = history.filter(h => h === 0 || h === '00').length;
  const total = redCount + blackCount + greenCount;

  return (
    <Box mb={3}>
      <Typography variant="subtitle2" color="white" mb={2}>
        Анализ по цветам:
      </Typography>
      <Box display="flex" justifyContent="space-between" mb={1}>
        <Box display="flex" alignItems="center" gap={1}>
          <Box sx={{ width: 12, height: 12, borderRadius: '50%', background: '#e74c3c' }} />
          <Typography variant="body2" color="white">Красные</Typography>
        </Box>
        <Typography variant="body2" color="white">
          {redCount} ({total > 0 ? ((redCount / total) * 100).toFixed(1) : '0.0'}%)
        </Typography>
      </Box>
      <Box display="flex" justifyContent="space-between" mb={1}>
        <Box display="flex" alignItems="center" gap={1}>
          <Box sx={{ width: 12, height: 12, borderRadius: '50%', background: '#2c3e50' }} />
          <Typography variant="body2" color="white">Черные</Typography>
        </Box>
        <Typography variant="body2" color="white">
          {blackCount} ({total > 0 ? ((blackCount / total) * 100).toFixed(1) : '0.0'}%)
        </Typography>
      </Box>
      <Box display="flex" justifyContent="space-between" mb={1}>
        <Box display="flex" alignItems="center" gap={1}>
          <Box sx={{ width: 12, height: 12, borderRadius: '50%', background: '#2ecc71' }} />
          <Typography variant="body2" color="white">Зеленые</Typography>
        </Box>
        <Typography variant="body2" color="white">
          {greenCount} ({total > 0 ? ((greenCount / total) * 100).toFixed(1) : '0.0'}%)
        </Typography>
      </Box>
    </Box>
  );
}; 