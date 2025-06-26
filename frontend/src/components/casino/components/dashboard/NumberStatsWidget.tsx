'use client';

import React from 'react';
import { Box, Typography } from '@mui/material';
import { RouletteNumber } from '@/components/casino/types/rouletteTypes';
import { getContrastText, getNumberColor } from '@/components/casino/utils/rouletteUtils';

interface NumberStatsWidgetProps {
  history: RouletteNumber[];
  compact?: boolean;
}

export const NumberStatsWidget: React.FC<NumberStatsWidgetProps> = ({
                                                                      history,
                                                                      compact = false
                                                                    }) => {
  const numbers = [0, ...Array.from({ length: 36 }, (_, i) => i + 1)];

  const getNumberStats = (num: number) => {
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

    const sinceLast = lastIndex === -1 ? '' : `${lastIndex}`;

    return {
      occurrences,
      percentage,
      avgInterval,
      maxStreak,
      sinceLast
    };
  };

  if (compact) {
    // Компактная версия - только топ/худшие числа
    const numbersWithStats = numbers.map(num => ({
      number: num,
      ...getNumberStats(num)
    }));

    const sortedByOccurrences = [...numbersWithStats].sort((a, b) => b.occurrences - a.occurrences);
    const topNumbers = sortedByOccurrences.slice(0, 5);
    const bottomNumbers = sortedByOccurrences.slice(-5).reverse();

    return (
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ display: 'flex', gap: 2, height: '100%' }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle2" color="#4CAF50" sx={{ mb: 1 }}>
              Топ 5
            </Typography>
            {topNumbers.map(({ number, occurrences, percentage }) => (
              <Box key={number} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <Box sx={{
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  background: getNumberColor(number),
                  color: getContrastText(getNumberColor(number)),
                  fontSize: 10,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold'
                }}>
                  {number}
                </Box>
                <Box sx={{ fontSize: 12, color: '#eee' }}>
                  {occurrences} ({percentage.toFixed(1)}%)
                </Box>
              </Box>
            ))}
          </Box>

          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle2" color="#ff4444" sx={{ mb: 1 }}>
              Редкие
            </Typography>
            {bottomNumbers.map(({ number, occurrences, percentage }) => (
              <Box key={number} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <Box sx={{
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  background: getNumberColor(number),
                  color: getContrastText(getNumberColor(number)),
                  fontSize: 10,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold'
                }}>
                  {number}
                </Box>
                <Box sx={{ fontSize: 12, color: '#eee' }}>
                  {occurrences} ({percentage.toFixed(1)}%)
                </Box>
              </Box>
            ))}
          </Box>
        </Box>
      </Box>
    );
  }

  // Полная версия - таблица всех чисел
  return (
    <Box sx={{ height: '100%', overflow: 'auto' }}>
      <Box sx={{
        display: 'flex',
        fontSize: 12,
        color: '#aaa',
        fontWeight: 500,
        mb: 0.5,
        position: 'sticky',
        top: 0,
        bgcolor: '#181818',
        py: 1
      }}>
        <Box sx={{ width: 28 }}>№</Box>
        <Box sx={{ width: 18 }}></Box>
        <Box sx={{ width: 32, textAlign: 'right' }}>Кол-во</Box>
        <Box sx={{ width: 36, textAlign: 'right' }}>%</Box>
        <Box sx={{ width: 36, textAlign: 'right' }}>Интервал</Box>
        <Box sx={{ width: 36, textAlign: 'right' }}>Макс.серия</Box>
        <Box sx={{ flex: 1, textAlign: 'right' }}>С послед.</Box>
      </Box>

      {numbers.map(num => {
        const stats = getNumberStats(num);
        const color = getNumberColor(num);

        return (
          <Box key={num} sx={{ display: 'flex', alignItems: 'center', fontSize: 12, color: '#eee', py: 0.2 }}>
            <Box sx={{ width: 28 }}>{num}</Box>
            <Box sx={{ width: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Box sx={{ width: 10, height: 10, borderRadius: '50%', background: color, border: '1px solid #333' }} />
            </Box>
            <Box sx={{ width: 32, textAlign: 'right' }}>{stats.occurrences}</Box>
            <Box sx={{ width: 36, textAlign: 'right' }}>{stats.percentage.toFixed(1)}</Box>
            <Box sx={{ width: 36, textAlign: 'right' }}>{stats.avgInterval}</Box>
            <Box sx={{ width: 36, textAlign: 'right' }}>{stats.maxStreak}</Box>
            <Box sx={{ flex: 1, textAlign: 'right', color: '#888' }}>{stats.sinceLast}</Box>
          </Box>
        );
      })}
    </Box>
  );
}; 