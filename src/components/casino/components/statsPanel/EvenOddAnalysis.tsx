import React from 'react';
import { Box, Typography } from '@mui/material';
import { GROUPS } from '../../constants/rouletteConstants';
import type { RouletteNumber } from '../../types/rouletteTypes';

interface EvenOddAnalysisProps {
  history: RouletteNumber[];
}

export const EvenOddAnalysis: React.FC<EvenOddAnalysisProps> = ({ history }) => {
  const evenCount = history.filter(h => GROUPS['EVEN'].includes(h as number)).length;
  const oddCount = history.filter(h => GROUPS['ODD'].includes(h as number)).length;
  const lowCount = history.filter(h => GROUPS['1-18'].includes(h as number)).length;
  const highCount = history.filter(h => GROUPS['19-36'].includes(h as number)).length;
  const zeroCount = history.filter(h => h === 0 || h === '00').length;
  const evenOddTotal = evenCount + oddCount + zeroCount;
  const lowHighTotal = lowCount + highCount + zeroCount;

  return (
    <Box mb={3}>
      <Typography variant="subtitle2" color="white" mb={2}>
        Четные/Нечетные и диапазоны:
      </Typography>
      <Box display="flex" justifyContent="space-between" mb={1}>
        <Typography variant="body2" color="white">Четные</Typography>
        <Typography variant="body2" color="white">
          {evenCount} ({evenOddTotal > 0 ? ((evenCount / evenOddTotal) * 100).toFixed(1) : '0.0'}%)
        </Typography>
      </Box>
      <Box display="flex" justifyContent="space-between" mb={1}>
        <Typography variant="body2" color="white">Нечетные</Typography>
        <Typography variant="body2" color="white">
          {oddCount} ({evenOddTotal > 0 ? ((oddCount / evenOddTotal) * 100).toFixed(1) : '0.0'}%)
        </Typography>
      </Box>
      <Box display="flex" justifyContent="space-between" mb={1}>
        <Typography variant="body2" color="white">1-18</Typography>
        <Typography variant="body2" color="white">
          {lowCount} ({lowHighTotal > 0 ? ((lowCount / lowHighTotal) * 100).toFixed(1) : '0.0'}%)
        </Typography>
      </Box>
      <Box display="flex" justifyContent="space-between" mb={1}>
        <Typography variant="body2" color="white">19-36</Typography>
        <Typography variant="body2" color="white">
          {highCount} ({lowHighTotal > 0 ? ((highCount / lowHighTotal) * 100).toFixed(1) : '0.0'}%)
        </Typography>
      </Box>
      <Box display="flex" justifyContent="space-between" mb={1}>
        <Typography variant="body2" color="white">0/00</Typography>
        <Typography variant="body2" color="white">
          {zeroCount} ({evenOddTotal > 0 ? ((zeroCount / evenOddTotal) * 100).toFixed(1) : '0.0'}%)
        </Typography>
      </Box>
    </Box>
  );
}; 