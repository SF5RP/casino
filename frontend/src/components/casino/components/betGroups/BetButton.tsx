import React, { useMemo } from 'react';
import { Box, Button, Tooltip } from '@mui/material';
import { calculateGroupAge, getProgressColor } from '../../utils/rouletteUtils';
import type { RouletteNumber } from '../../types/rouletteTypes';

interface BetButtonProps {
  label: string;
  group: number[];
  history: RouletteNumber[];
  activeLabel: string;
  setActiveLabel: (label: string) => void;
  setActiveGroup: (group: number[]) => void;
  buttonType: 'sector' | 'main';
}

const BetButtonComponent: React.FC<BetButtonProps> = ({
                                                        label,
                                                        group,
                                                        history,
                                                        activeLabel,
                                                        setActiveLabel,
                                                        setActiveGroup,
                                                        buttonType,
                                                      }) => {
  // Мемоизируем расчет возраста группы
  const groupAge = useMemo(() => {
    return calculateGroupAge(history, group);
  }, [history, group]);

  const bg = '#52b788'; // Более бледный зеленый фон для всех кнопок
  const isActive = activeLabel === label;

  // Мемоизируем стили для оптимизации
  const buttonStyles = useMemo(() => {
    const hasProgress = groupAge > 0;

    let background = bg;
    const border = isActive ? '2px solid #f1c40f' : '3px solid transparent';
    let backgroundOrigin = 'padding-box';
    let backgroundClip = 'padding-box';

    if (hasProgress) {
      const progressColor = getProgressColor(groupAge);
      const normalizedProgress = Math.min(groupAge / 30, 1);
      const progressAngle = normalizedProgress * 360;

      background = `linear-gradient(${bg}, ${bg}) padding-box, conic-gradient(from 0deg, ${progressColor} 0deg, ${progressColor} ${progressAngle}deg, transparent ${progressAngle}deg, transparent 360deg) border-box`;
      backgroundOrigin = 'border-box';
      backgroundClip = 'padding-box, border-box';
    }

    return {
      background,
      border,
      backgroundOrigin,
      backgroundClip,
    };
  }, [groupAge, isActive, bg]);

  return (
    <Tooltip title={`${label} — не выпадало: ${groupAge} ставок`} arrow>
      <Button
        variant={isActive ? 'contained' : 'outlined'}
        onClick={() => {
          const startTime = performance.now();
          console.log(`🎯 Клик по сектору "${label}"`);

          if (isActive) {
            setActiveLabel('');
            setActiveGroup([]);
          } else {
            setActiveLabel(label);
            setActiveGroup(group);
          }

          const endTime = performance.now();
          console.log(`⚡ Клик по сектору "${label}": ${(endTime - startTime).toFixed(2)}ms`);
        }}
        sx={{
          ...buttonStyles,
          color: '#ffffff',
          borderRadius: '6px',
          transition: 'transform 0.2s ease, filter 0.2s ease, box-shadow 0.2s ease',
          height: buttonType === 'sector'
            ? 'calc(var(--cell-size, 44px) * 1.1)'
            : 'calc(var(--cell-size, 44px) * 1.0)',
          fontSize: buttonType === 'sector'
            ? 'calc(var(--cell-size, 44px) * 0.28)'
            : 'calc(var(--cell-size, 44px) * 0.25)',
          fontWeight: 600,
          textTransform: 'none',
          minHeight: buttonType === 'sector' ? '32px' : '28px',
          padding: '4px 8px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '2px',
          '&:hover': {
            transform: 'translateY(-1px)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
            filter: 'brightness(1.1)',
          },
          '&:active': {
            transform: 'translateY(0)',
          },
        }}
      >
        <Box sx={{ fontSize: 'inherit', fontWeight: 'inherit' }}>
          {label}
        </Box>
        <Box sx={{
          fontSize: 'calc(var(--cell-size, 44px) * 0.22)',
          opacity: 0.9,
          minFontSize: '8px',
          fontWeight: 'bold'
        }}>
          {groupAge}
        </Box>
      </Button>
    </Tooltip>
  );
};

// Мемоизируем компонент для предотвращения ненужных пересчетов
export const BetButton = React.memo(BetButtonComponent, (prevProps, nextProps) => {
  return (
    prevProps.label === nextProps.label &&
    prevProps.activeLabel === nextProps.activeLabel &&
    prevProps.history.length === nextProps.history.length &&
    JSON.stringify(prevProps.group) === JSON.stringify(nextProps.group)
  );
}); 