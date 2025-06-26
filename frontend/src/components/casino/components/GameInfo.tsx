import React, { useMemo } from 'react';
import { Box, Typography } from '@mui/material';
import type { AgeMap, RouletteNumber } from '../types/rouletteTypes';

interface GameInfoProps {
  history: RouletteNumber[];
  ageMap: AgeMap;
}

export const GameInfo: React.FC<GameInfoProps> = ({ history, ageMap }) => {
  // Мемоизируем самые старые числа - тяжелый расчет
  const oldestNumbers = useMemo(() => {
    // Создаем массив всех чисел только один раз
    const allNumbers = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, '00'] as RouletteNumber[];

    // Быстро создаем массив с возрастами и сортируем
    const ages = allNumbers.map((n) => ({ n, age: ageMap[String(n)] ?? 0 }));
    ages.sort((a, b) => b.age - a.age);
    return ages.slice(0, 3);
  }, [ageMap]);

  // Простая проверка повтора - не нужно мемоизировать
  const hasRecentRepeat = history.length >= 2 && history[history.length - 1] === history[history.length - 2];

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
      {hasRecentRepeat && (
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


    </Box>
  );
}; 