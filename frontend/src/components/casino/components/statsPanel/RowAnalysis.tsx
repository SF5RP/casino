import React from 'react';
import { Box, Typography } from '@mui/material';
import type { RouletteNumber } from '../../types/rouletteTypes';

interface RowAnalysisProps {
  history: RouletteNumber[];
}

export const RowAnalysis: React.FC<RowAnalysisProps> = ({ history }) => {
  const row1Count = history.filter(h => typeof h === 'number' && h > 0 && h % 3 === 1).length; // 1,4,7,10,13,16,19,22,25,28,31,34
  const row2Count = history.filter(h => typeof h === 'number' && h > 0 && h % 3 === 2).length; // 2,5,8,11,14,17,20,23,26,29,32,35
  const row3Count = history.filter(h => typeof h === 'number' && h > 0 && h % 3 === 0).length; // 3,6,9,12,15,18,21,24,27,30,33,36
  const zeroCount = history.filter(h => h === 0 || h === '00').length;
  const rowTotal = row1Count + row2Count + row3Count + zeroCount;

  return (
    <Box mb={3}>
      <Typography variant="subtitle2" color="white" mb={2}>
        Анализ по строкам (2 to 1):
      </Typography>
      <Box display="flex" justifyContent="space-between" mb={1}>
        <Typography variant="body2" color="white">Нижняя строка</Typography>
        <Typography variant="body2" color="white">
          {row1Count} ({rowTotal > 0 ? ((row1Count / rowTotal) * 100).toFixed(1) : '0.0'}%)
        </Typography>
      </Box>
      <Box display="flex" justifyContent="space-between" mb={1}>
        <Typography variant="body2" color="white">Средняя строка</Typography>
        <Typography variant="body2" color="white">
          {row2Count} ({rowTotal > 0 ? ((row2Count / rowTotal) * 100).toFixed(1) : '0.0'}%)
        </Typography>
      </Box>
      <Box display="flex" justifyContent="space-between" mb={1}>
        <Typography variant="body2" color="white">Верхняя строка</Typography>
        <Typography variant="body2" color="white">
          {row3Count} ({rowTotal > 0 ? ((row3Count / rowTotal) * 100).toFixed(1) : '0.0'}%)
        </Typography>
      </Box>
      <Box display="flex" justifyContent="space-between" mb={1}>
        <Typography variant="body2" color="white">0/00</Typography>
        <Typography variant="body2" color="white">
          {zeroCount} ({rowTotal > 0 ? ((zeroCount / rowTotal) * 100).toFixed(1) : '0.0'}%)
        </Typography>
      </Box>
    </Box>
  );
}; 