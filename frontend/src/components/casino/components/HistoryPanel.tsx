import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Box } from '@mui/material';
import { getContrastText, getNumberColor, getRepeatIndexes } from '../utils/rouletteUtils';
import type { RouletteNumber } from '../types/rouletteTypes';

interface HistoryPanelProps {
  history: RouletteNumber[];
  showFullHistory: boolean;
  historyRows: number;
  setHoveredNumber?: (num: RouletteNumber | null) => void;
}

export const HistoryPanel: React.FC<HistoryPanelProps> = ({
                                                            history,
                                                            showFullHistory,
                                                            historyRows,
                                                            setHoveredNumber,
                                                          }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const resizeObserver = new ResizeObserver(entries => {
      if (entries[0]) setContainerWidth(entries[0].contentRect.width);
    });
    resizeObserver.observe(container);
    setContainerWidth(container.offsetWidth);
    return () => resizeObserver.disconnect();
  }, []);

  const numbersPerRow = useMemo(() => {
    if (containerWidth === 0) return 1;
    const itemWidth = 36;
    const gap = 8;
    return Math.max(1, Math.floor((containerWidth + gap) / (itemWidth + gap)));
  }, [containerWidth]);

  const displayHistory = useMemo(() => {
    if (showFullHistory) return history;
    const totalItems = numbersPerRow * historyRows;
    return history.slice(-totalItems);
  }, [history, showFullHistory, historyRows, numbersPerRow]);

  const repeatIndexes = getRepeatIndexes(history);

  const renderHistoryItem = (num: RouletteNumber, idx: number) => {
    const originalIdx = history.length - displayHistory.length + idx;
    return (
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
  };

  const containerHeight = historyRows * (36 + 8) - 8;

  return (
    <Box ref={containerRef} width="100%" mb={2}>
      <Box
        sx={{
          width: '100%',
          height: showFullHistory ? 'auto' : `${containerHeight}px`,
          overflow: 'hidden',
          display: 'grid',
          gridTemplateColumns: `repeat(${numbersPerRow}, 36px)`,
          gap: 1,
          justifyContent: 'flex-start',
          alignContent: 'flex-start',
        }}
      >
        {displayHistory.map((num, idx) => renderHistoryItem(num, idx))}
      </Box>
    </Box>
  );
}; 