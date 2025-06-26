import React from 'react';
import { Box } from '@mui/material';
import { getNumberColor, getContrastText, getRepeatIndexes } from '../utils/rouletteUtils';
import type { RouletteNumber } from '../types/rouletteTypes';

interface HistoryPanelProps {
  history: RouletteNumber[];
  setHistory: React.Dispatch<React.SetStateAction<RouletteNumber[]>>;
  showFullHistory: boolean;
  historyRows: number;
  isWide?: boolean;
  setHoveredNumber?: (num: RouletteNumber | null) => void;
}

export const HistoryPanel: React.FC<HistoryPanelProps> = ({
  history,
  setHistory,
  showFullHistory,
  historyRows,
  isWide = false,
  setHoveredNumber,
}) => {
  const repeatIndexes = getRepeatIndexes(history);

  const renderHistoryItem = (num: RouletteNumber, idx: number, originalIdx: number) => (
    <Box 
      key={originalIdx} 
      sx={{
        width: 36,
        height: 36,
        minWidth: 36,
        borderRadius: 1,
        background: getNumberColor(num), 
        color: getContrastText(getNumberColor(num)), 
        fontWeight: 'bold', 
        fontSize: 16,
        border: repeatIndexes.has(originalIdx) ? '2px solid #0000ff' : '2px solid #e2e8f0',
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        flexShrink: 0,
        cursor: setHoveredNumber ? 'pointer' : 'default',
      }}
      onMouseEnter={setHoveredNumber ? () => setHoveredNumber(num) : undefined}
      onMouseLeave={setHoveredNumber ? () => setHoveredNumber(null) : undefined}
    >
      {num}
    </Box>
  );

  const containerHeight = historyRows * (36 + 8) - 8; // высота = количество рядов * (размер ячейки + gap) - последний gap

  return (
    <Box mb={2} display="flex" justifyContent="center">
      <Box 
        sx={{
          width: isWide ? 'var(--roulette-table-width, 100%)' : '100%',
          maxWidth: '1200px',
          height: showFullHistory ? 'auto' : `${containerHeight}px`,
          overflow: showFullHistory ? 'visible' : 'hidden',
          display: 'flex',
          flexWrap: 'wrap',
          gap: 1,
          justifyContent: 'flex-start',
          alignItems: 'flex-start',
          alignContent: 'flex-start',
        }}
      >
        {history.map((num, idx) => renderHistoryItem(num, idx, idx))}
      </Box>
    </Box>
  );
}; 