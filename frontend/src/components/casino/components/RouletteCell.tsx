import React, { useMemo } from 'react';
import { Box } from '@mui/material';
import { getNumberColor, getProgressColor } from '../utils/rouletteUtils';
import type { RouletteNumber } from '../types/rouletteTypes';

interface RouletteCellProps {
  num: RouletteNumber;
  count: number | string;
  isActive: boolean;
  isHighlighted: boolean;
  onCellClick: (num: RouletteNumber) => void;
  history: RouletteNumber[];
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

export const RouletteCell: React.FC<RouletteCellProps> = ({
                                                            num,
                                                            count,
                                                            isActive,
                                                            isHighlighted,
                                                            onCellClick,
                                                            history,
                                                            onMouseEnter,
                                                            onMouseLeave,
                                                          }: RouletteCellProps) => {
  const isRecent = count === 0;
  const numberColor = getNumberColor(num);
  const isZeroCell = num === 0 || num === '00';

  // Мемоизируем все вычисления для предотвращения пересчетов
  const cellStyles = useMemo(() => {
    const hasProgress = typeof count === 'number' && count > 0;

    // Определяем фоновый цвет ячейки
    const cellBgColor = isActive ? '#2222dd' : (isHighlighted ? '#ffecb3' : numberColor);

    // Определяем цвет текста
    const textColor = isActive ? '#ffffff' : (isHighlighted ? '#000000' : '#ffffff');

    // Создаем фон с прогрессом если нужно
    let background = cellBgColor;
    let border = 'none';
    let backgroundOrigin = 'padding-box';
    let backgroundClip = 'padding-box';

    if (hasProgress) {
      const progressColor = getProgressColor(count);
      const normalizedProgress = Math.min(count / 50, 1);
      const progressAngle = normalizedProgress * 360;

      background = `linear-gradient(${cellBgColor}, ${cellBgColor}) padding-box, conic-gradient(from 0deg, ${progressColor} 0deg, ${progressColor} ${progressAngle}deg, transparent ${progressAngle}deg, transparent 360deg) border-box`;
      border = '3px solid transparent';
      backgroundOrigin = 'border-box';
      backgroundClip = 'padding-box, border-box';
    }

    return {
      backgroundColor: cellBgColor,
      color: textColor,
      background,
      border,
      backgroundOrigin,
      backgroundClip,
    };
  }, [count, isActive, isHighlighted, numberColor]);

  return (
    <Box
      onClick={() => onCellClick(num)}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      sx={{
        ...cellStyles,
        borderRadius: '4px',
        width: 'var(--cell-size, 44px)',
        height: isZeroCell ? 'var(--zeros-height, 66px)' : 'var(--cell-size, 44px)',
        minWidth: 'var(--cell-size, 44px)',
        minHeight: isZeroCell ? 'var(--zeros-height, 66px)' : 'var(--cell-size, 44px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '2px',
        transition: 'transform 0.2s ease, filter 0.2s ease, box-shadow 0.2s ease',
        cursor: 'pointer',
        userSelect: 'none',
        fontWeight: isRecent ? 'bold' : 'normal',
        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
        '&:hover': {
          transform: 'scale(1.05)',
          zIndex: 10,
          filter: 'brightness(1.1)',
          boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
        },
      }}
    >
      {/* Номер */}
      <Box
        sx={{
          fontWeight: 700,
          fontSize: 'calc(var(--cell-size, 44px) * 0.4)',
          lineHeight: 0.9,
          minFontSize: '12px',
          textShadow: '1px 1px 2px rgba(0,0,0,0.7)',
        }}
      >
        {num}
      </Box>

      {/* Счетчик */}
      <Box
        sx={{
          fontSize: 'calc(var(--cell-size, 44px) * 0.24)',
          lineHeight: 0.9,
          minFontSize: '7px',
          opacity: 0.9,
          textShadow: '1px 1px 2px rgba(0,0,0,0.7)',
        }}
      >
        {typeof count === 'number' && count === history.length ? '-' : count}
      </Box>
    </Box>
  );
}; 