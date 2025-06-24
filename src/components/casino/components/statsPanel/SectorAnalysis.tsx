import React from 'react';
import { Box, Typography } from '@mui/material';
import { GROUPS } from '../../constants/rouletteConstants';
import type { RouletteNumber } from '../../types/rouletteTypes';

interface SectorAnalysisProps {
  history: RouletteNumber[];
}

export const SectorAnalysis: React.FC<SectorAnalysisProps> = ({ history }) => {
  const sector1Count = history.filter(h => GROUPS['1st 12'].includes(h as number)).length;
  const sector2Count = history.filter(h => GROUPS['2nd 12'].includes(h as number)).length;
  const sector3Count = history.filter(h => GROUPS['3rd 12'].includes(h as number)).length;
  const zeroCount = history.filter(h => h === 0 || h === '00').length;
  const sectorTotal = sector1Count + sector2Count + sector3Count + zeroCount;

  return (
    <Box mb={3}>
      <Typography variant="subtitle2" color="white" mb={2}>
        Анализ по секторам:
      </Typography>
      <Box display="flex" justifyContent="space-between" mb={1}>
        <Typography variant="body2" color="white">1-12</Typography>
        <Typography variant="body2" color="white">
          {sector1Count} ({sectorTotal > 0 ? ((sector1Count / sectorTotal) * 100).toFixed(1) : '0.0'}%)
        </Typography>
      </Box>
      <Box display="flex" justifyContent="space-between" mb={1}>
        <Typography variant="body2" color="white">13-24</Typography>
        <Typography variant="body2" color="white">
          {sector2Count} ({sectorTotal > 0 ? ((sector2Count / sectorTotal) * 100).toFixed(1) : '0.0'}%)
        </Typography>
      </Box>
      <Box display="flex" justifyContent="space-between" mb={1}>
        <Typography variant="body2" color="white">25-36</Typography>
        <Typography variant="body2" color="white">
          {sector3Count} ({sectorTotal > 0 ? ((sector3Count / sectorTotal) * 100).toFixed(1) : '0.0'}%)
        </Typography>
      </Box>
      <Box display="flex" justifyContent="space-between" mb={1}>
        <Typography variant="body2" color="white">0/00</Typography>
        <Typography variant="body2" color="white">
          {zeroCount} ({sectorTotal > 0 ? ((zeroCount / sectorTotal) * 100).toFixed(1) : '0.0'}%)
        </Typography>
      </Box>
    </Box>
  );
}; 