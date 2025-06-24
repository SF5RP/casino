import React from 'react';
import { Box, Tooltip } from '@mui/material';
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
        maxWidth: 52,
        borderRadius: 1,
        background: getNumberColor(num), 
        color: getContrastText(getNumberColor(num)), 
        fontWeight: 'bold', 
        fontSize: 15,
        border: repeatIndexes.has(originalIdx) ? '2px solid #0000ff' : '2px solid #e2e8f0',
        position: 'relative',
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        cursor: 'pointer',
        transition: 'width 0.22s cubic-bezier(.4,2,.6,1)',
        flexShrink: 0,
        '&:hover': {
          width: 52,
        },
        '&:hover .delete-icon': { display: 'flex' },
      }}
    >
      {num}
      <Tooltip title="Удалить из истории" arrow>
        <Box
          component="span"
          className="delete-icon"
          sx={{
            cursor: 'pointer',
            color: '#ff5858',
            fontSize: 16,
            fontWeight: 700,
            userSelect: 'none',
            display: 'none',
            alignItems: 'center',
            transition: 'display 0.2s',
          }}
          onClick={(e: React.MouseEvent) => {
            e.stopPropagation();
            setHistory(history.filter((_, i) => i !== originalIdx));
          }}
        >
          ❌
        </Box>
      </Tooltip>
    </Box>
  );

  return (
    <Box mb={2}>
      <Box 
        display="flex" 
        flexWrap="wrap" 
        gap={1}
        justifyContent="center"
        alignItems="center"
      >
        {visibleHistory.map((num, idx) => {
          const originalIdx = showFullHistory ? idx : (history.length - maxVisibleItems + idx);
          return renderHistoryItem(num, idx, originalIdx);
        })}
      </Box>
    </Box>
  );
}; 