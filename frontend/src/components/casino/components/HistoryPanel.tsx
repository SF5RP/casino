import React from 'react';
import { Box } from '@mui/material';
import { getNumberColor, getContrastText, getRepeatIndexes } from '../utils/rouletteUtils';
import type { RouletteNumber } from '../types/rouletteTypes';

interface HistoryPanelProps {
  history: RouletteNumber[];
  setHistory: React.Dispatch<React.SetStateAction<RouletteNumber[]>>;
  showFullHistory: boolean;
  maxVisibleItems: number;
}

export const HistoryPanel: React.FC<HistoryPanelProps> = ({
  history,
  setHistory,
  showFullHistory,
  maxVisibleItems,
}) => {
  const repeatIndexes = getRepeatIndexes(history);

  const visibleHistory = showFullHistory ? history : history.slice(-maxVisibleItems);



  const renderHistoryItem = (num: RouletteNumber, idx: number, originalIdx: number) => (
    <Box 
      key={originalIdx} 
      sx={{
        width: 32, 
        height: 32, 
        minWidth: 32,
        borderRadius: 1,
        background: getNumberColor(num), 
        color: getContrastText(getNumberColor(num)), 
        fontWeight: 'bold', 
        fontSize: 15,
        border: repeatIndexes.has(originalIdx) ? '2px solid #0000ff' : '2px solid #e2e8f0',
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      {num}
    </Box>
  );

  return (
    <Box mb={2} display="flex" justifyContent="center">
      <Box 
        display="flex" 
        flexWrap="wrap" 
        gap={1}
        justifyContent="flex-start"
        alignItems="center"
        maxWidth="100%"
      >
        {visibleHistory.map((num, idx) => {
          const originalIdx = showFullHistory ? idx : (history.length - maxVisibleItems + idx);
          return renderHistoryItem(num, idx, originalIdx);
        })}
      </Box>
    </Box>
  );
}; 