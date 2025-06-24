import React from 'react';
import { Box, Typography } from '@mui/material';
import { findRepeats } from '../utils/rouletteUtils';
import type { RouletteNumber, AgeMap, RepeatSeries } from '../types/rouletteTypes';

interface GameInfoProps {
  history: RouletteNumber[];
  ageMap: AgeMap;
}

export const GameInfo: React.FC<GameInfoProps> = ({ history, ageMap }) => {
  const getOldestNumbers = () => {
    const nums: number[] = Array.from({ length: 37 }, (_, i) => i);
    const allNums: RouletteNumber[] = [...nums, '00'];
    const ages = allNums.map((n) => ({ n, age: ageMap[String(n)] ?? 0 }));
    ages.sort((a, b) => b.age - a.age);
    return ages.slice(0, 3);
  };

  const hasRecentRepeat = () => {
    return history.length >= 2 && history[history.length - 1] === history[history.length - 2];
  };

  const getRepeats = () => {
    return findRepeats(history);
  };

  const oldestNumbers = getOldestNumbers();
  const repeats = getRepeats();

  return (
    <Box>
      {/* Самые старые числа */}
      <Box mt={2} mb={2}>
        <Typography variant="subtitle1" mb={1} fontWeight={700} color="#fff">
          Самые старые числа:
        </Typography>
        <Box display="flex" gap={1} alignItems="center">
          {oldestNumbers.map(({ n, age }) => (
            <Box 
              key={String(n)} 
              sx={{
                px: 1.5, 
                py: 0.5, 
                borderRadius: 1, 
                background: '#14532d', 
                color: '#fff', 
                fontWeight: 'bold', 
                fontSize: 18, 
                border: '2px dashed #ff5858'
              }}
            >
              {n}
              <Typography variant="caption" color="#fff" ml={1}>
                ({age})
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>

      {/* Повторяющееся число */}
      {hasRecentRepeat() && (
        <Box mt={2} mb={2}>
          <Typography variant="subtitle1" fontWeight={700} color="#fff">
            Повтор подряд:
          </Typography>
          <Box sx={{ 
            px: 2, 
            py: 1, 
            borderRadius: 1, 
            background: '#14532d', 
            color: '#fff', 
            fontWeight: 'bold', 
            fontSize: 20, 
            border: '2px solid #ffe066', 
            display: 'inline-block' 
          }}>
            {history[history.length - 1]}
          </Box>
        </Box>
      )}

      {/* История повторов */}
      {repeats.length > 0 && (
        <Box mt={2} mb={2}>
          <Typography variant="subtitle1" fontWeight={700} color="#fff">
            История повторов:
          </Typography>
          <Box display="flex" flexDirection="column" gap={1}>
            {repeats.slice().reverse().map((r: RepeatSeries, idx: number) => (
              <Box 
                key={idx} 
                sx={{ 
                  px: 2, 
                  py: 1, 
                  borderRadius: 1, 
                  background: '#14532d', 
                  color: '#fff', 
                  fontWeight: 'bold', 
                  fontSize: 16, 
                  border: '2px solid #ffe066', 
                  display: 'inline-block' 
                }}
              >
                {r.value} — {r.length} раза подряд (начиная с {r.start}-й ставки)
              </Box>
            ))}
          </Box>
        </Box>
      )}
    </Box>
  );
}; 