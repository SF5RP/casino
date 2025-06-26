'use client';

import React from 'react';
import { Box, Typography } from '@mui/material';
import { RouletteNumber } from '@/components/casino/types/rouletteTypes';
import { getContrastText, getNumberColor } from '@/components/casino/utils/rouletteUtils';

interface HoveredNumberWidgetProps {
  history: RouletteNumber[];
  hoveredNumber: RouletteNumber | null;
  lastHoveredNumber: RouletteNumber | null;
}

export const HoveredNumberWidget: React.FC<HoveredNumberWidgetProps> = ({
                                                                          history,
                                                                          hoveredNumber,
                                                                          lastHoveredNumber,
                                                                        }) => {
  if (hoveredNumber === null && lastHoveredNumber === null) {
    return (
      <Box sx={{
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2,
      }}>
        <Typography color="#888" fontSize={14} textAlign="center">
          Наведи на число в истории или на столе для просмотра детальной информации
        </Typography>
      </Box>
    );
  }

  const num = hoveredNumber ?? lastHoveredNumber;
  const numStr = String(num);
  const occurrences = history.filter(h => String(h) === numStr).length;
  const lastIndex = [...history].reverse().findIndex(h => String(h) === numStr);
  const percentage = history.length > 0 ? ((occurrences / history.length) * 100) : 0;

  let avgInterval = '';
  if (occurrences > 1) {
    const indexes = history.reduce((arr, h, idx) => (String(h) === numStr ? [...arr, idx] : arr), [] as number[]);
    const intervals = indexes.slice(1).map((v, i) => v - indexes[i]);
    avgInterval = (intervals.reduce((a, b) => a + b, 0) / intervals.length).toFixed(1);
  }

  let maxStreak = 0, curStreak = 0;
  for (let i = 0; i < history.length; i++) {
    if (String(history[i]) === numStr) {
      curStreak++;
      if (curStreak > maxStreak) maxStreak = curStreak;
    } else {
      curStreak = 0;
    }
  }

  const sinceLast = lastIndex === -1 ? 'Никогда' : `${lastIndex} спинов назад`;

  return (
    <Box sx={{
      height: '100%',
      p: 2,
      display: 'flex',
      flexDirection: 'column',
      gap: 2,
    }}>
      {/* Заголовок с числом */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Box sx={{
          width: 48,
          height: 48,
          borderRadius: 1,
          background: getNumberColor(num!),
          color: getContrastText(getNumberColor(num!)),
          fontWeight: 'bold',
          fontSize: 24,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '2px solid #333'
        }}>
          {num}
        </Box>
        <Box>
          <Typography variant="h6" color="white">
            Число {num}
          </Typography>
          <Typography variant="body2" color="#aaa">
            {hoveredNumber ? 'Наведено' : 'Последнее наведенное'}
          </Typography>
        </Box>
      </Box>

      {/* Статистика */}
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
        <Box>
          <Typography variant="body2" color="#aaa">
            Выпадений
          </Typography>
          <Typography variant="h6" color="white">
            {occurrences}
          </Typography>
        </Box>

        <Box>
          <Typography variant="body2" color="#aaa">
            Процент
          </Typography>
          <Typography variant="h6" color="white">
            {percentage.toFixed(1)}%
          </Typography>
        </Box>

        <Box>
          <Typography variant="body2" color="#aaa">
            Средний интервал
          </Typography>
          <Typography variant="h6" color="white">
            {avgInterval || '-'}
          </Typography>
        </Box>

        <Box>
          <Typography variant="body2" color="#aaa">
            Макс. серия
          </Typography>
          <Typography variant="h6" color="white">
            {maxStreak}
          </Typography>
        </Box>
      </Box>

      {/* Последнее выпадение */}
      <Box sx={{ mt: 'auto' }}>
        <Typography variant="body2" color="#aaa">
          Последнее выпадение
        </Typography>
        <Typography variant="body1" color="white">
          {sinceLast}
        </Typography>
      </Box>
    </Box>
  );
}; 