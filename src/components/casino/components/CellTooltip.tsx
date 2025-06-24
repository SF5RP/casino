import React, { useMemo } from 'react';
import { Box, Typography, Divider } from '@mui/material';
import { getNumberColor } from '../utils/rouletteUtils';
import type { RouletteNumber } from '../types/rouletteTypes';

interface CellTooltipProps {
  num: RouletteNumber;
  count: number | string;
  history: RouletteNumber[];
}

export const CellTooltip: React.FC<CellTooltipProps> = ({ num, count, history }) => {
  const stats = useMemo(() => {
    const numStr = String(num);
    const totalBets = history.length;
    
    // Подсчитываем сколько раз выпадало это число
    const occurrences = history.filter(h => String(h) === numStr).length;
    
    // Вычисляем процент
    const percentage = totalBets > 0 ? (occurrences / totalBets * 100).toFixed(1) : '0.0';
    

    
    // Найдем последние 3 позиции этого числа
    const lastPositions = [];
    for (let i = history.length - 1; i >= 0 && lastPositions.length < 3; i--) {
      if (String(history[i]) === numStr) {
        lastPositions.push(history.length - i);
      }
    }
    
    return {
      occurrences,
      percentage,
      lastPositions,
      totalBets
    };
  }, [num, history]);

  const numberColor = getNumberColor(num);

  return (
    <Box sx={{ 
      p: 2, 
      minWidth: 250, 
      backgroundColor: '#1a1a1a', 
      color: 'white',
      borderRadius: 2,
      border: '1px solid #333'
    }}>
      {/* Заголовок с номером */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <Box sx={{
          width: 32,
          height: 32,
          backgroundColor: numberColor,
          color: 'white',
          borderRadius: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 'bold',
          fontSize: 16
        }}>
          {num}
        </Box>
        <Typography variant="h6" fontWeight="bold">
          Статистика числа {num}
        </Typography>
      </Box>

      <Divider sx={{ borderColor: '#333', mb: 2 }} />

      {/* Основная статистика */}
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, mb: 2 }}>
        <Typography variant="body2">
          <strong>Не выпадало:</strong> {count} ставок
        </Typography>
        <Typography variant="body2">
          <strong>Выпало раз:</strong> {stats.occurrences}
        </Typography>
        <Typography variant="body2">
          <strong>Процент:</strong> {stats.percentage}%
        </Typography>
        <Typography variant="body2">
          <strong>Всего ставок:</strong> {stats.totalBets}
        </Typography>
      </Box>



      {/* Последние позиции */}
      {stats.lastPositions.length > 0 && (
        <>
          <Divider sx={{ borderColor: '#333', mb: 2 }} />
          <Typography variant="body2" sx={{ mb: 1 }}>
            <strong>Последние выпадения:</strong>
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {stats.lastPositions.map((pos, idx) => (
              <Box key={idx} sx={{
                px: 1,
                py: 0.5,
                backgroundColor: '#333',
                borderRadius: 1,
                fontSize: '0.75rem'
              }}>
                {pos} назад
              </Box>
            ))}
          </Box>
        </>
      )}
    </Box>
  );
}; 