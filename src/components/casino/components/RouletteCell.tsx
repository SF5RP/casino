import React from 'react';
import { Box, Tooltip } from '@mui/material';
import { getContrastText, getNumberColor, getProgressColor } from '../utils/rouletteUtils';
import type { RouletteNumber } from '../types/rouletteTypes';

interface RouletteCellProps {
  num: RouletteNumber;
  count: number | string;
  isActive: boolean;
  isHighlighted: boolean;
  onCellClick: (num: RouletteNumber) => void;
}

export const RouletteCell: React.FC<RouletteCellProps> = ({
  num,
  count,
  isActive,
  isHighlighted,
  onCellClick,
}: RouletteCellProps) => {
  const isRecent = count === 0;
  const ballColor = getNumberColor(num);
  const isZeroCell = num === 0 || num === '00';

  // Вычисляем прогресс для заполнения бордера (0-100%)
  const progressPercent = typeof count === 'number' ? Math.min(count / 100 * 100, 100) : 0;

  // Создаем градиентный бордер для прогресса
  const getBorderStyle = () => {
    if (typeof count !== 'number' || count === 0) {
      return '2px solid #333';
    }
    
    const progressColor = getProgressColor(count);
    
    if (progressPercent >= 100) {
      return `2px solid ${progressColor}`;
    }
    
    return `2px solid transparent`;
  };

  const getBorderBackground = () => {
    if (typeof count !== 'number' || count === 0) {
      return 'none';
    }
    
    const progressColor = getProgressColor(count);
    const angle = (progressPercent / 100) * 360;
    const cellBgColor = isActive ? '#2222dd' : (isHighlighted ? '#ffecb3' : '#14532d');
    
    if (progressPercent >= 100) {
      return `linear-gradient(${cellBgColor}, ${cellBgColor}), linear-gradient(0deg, ${progressColor}, ${progressColor})`;
    }
    
    return `linear-gradient(${cellBgColor}, ${cellBgColor}), conic-gradient(from 0deg, ${progressColor} 0deg, ${progressColor} ${angle}deg, ${cellBgColor} ${angle}deg, ${cellBgColor} 360deg)`;
  };

  return (
    <Tooltip title={`Ставок назад: ${count}`} arrow>
      <Box
        onClick={() => onCellClick(num)}
        sx={{
          backgroundColor: isActive ? '#2222dd' : (isHighlighted ? '#ffecb3' : '#14532d'),
          color: getContrastText(getNumberColor(num)),
          borderRadius: '4px',
          border: getBorderStyle(),
          background: getBorderBackground(),
          backgroundOrigin: 'border-box',
          backgroundClip: 'padding-box, border-box',
          // Используем CSS Grid auto sizing и CSS переменные
          width: 'var(--cell-size, 44px)',
          height: isZeroCell ? 'var(--zeros-height, 66px)' : 'var(--cell-size, 44px)',
          minWidth: 'var(--cell-size, 44px)',
          minHeight: isZeroCell ? 'var(--zeros-height, 66px)' : 'var(--cell-size, 44px)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1px',
          transition: 'all 0.2s ease',
          cursor: 'pointer',
          userSelect: 'none',
          fontWeight: isRecent ? 'bold' : 'normal',
          '&:hover': {
            transform: 'scale(1.05)',
            zIndex: 10,
          },
        }}
      >
        {/* Шарик */}
        <Box 
          sx={{ 
            width: 'calc(var(--cell-size, 44px) * 0.35)', 
            height: 'calc(var(--cell-size, 44px) * 0.35)', 
            borderRadius: '50%', 
            background: ballColor, 
            border: '1px solid #fff',
            minWidth: '10px',
            minHeight: '10px',
            flexShrink: 0,
          }} 
        />
        
        {/* Номер */}
        <Box 
          sx={{ 
            fontWeight: 700, 
            fontSize: 'calc(var(--cell-size, 44px) * 0.35)',
            lineHeight: 0.9,
            minFontSize: '9px',
          }}
        >
          {num}
        </Box>
        
        {/* Счетчик */}
        <Box 
          sx={{ 
            fontSize: 'calc(var(--cell-size, 44px) * 0.25)',
            lineHeight: 0.9,
            minFontSize: '7px',
            opacity: 0.9,
          }}
        >
          {count}
        </Box>
      </Box>
    </Tooltip>
  );
}; 