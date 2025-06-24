import React from 'react';
import { Button, Tooltip, Box } from '@mui/material';
import { calculateGroupAge, getContrastText } from '../../utils/rouletteUtils';
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

export const BetButton: React.FC<BetButtonProps> = ({
  label,
  group,
  history,
  activeLabel,
  setActiveLabel,
  setActiveGroup,
  buttonType,
}) => {
  const groupAge = calculateGroupAge(history, group);
  const lightness = Math.max(30, 90 - groupAge * 3);
  const bg = `hsl(40, 100%, ${lightness}%)`;
  const isActive = activeLabel === label;

  return (
    <Tooltip title={`${label} — не выпадало: ${groupAge} ставок`} arrow>
      <Button
        variant={isActive ? 'contained' : 'outlined'}
        onClick={() => {
          if (isActive) {
            setActiveLabel('');
            setActiveGroup([]);
          } else {
            setActiveLabel(label);
            setActiveGroup(group);
          }
        }}
        sx={{
          background: bg,
          color: getContrastText(bg),
          border: isActive ? '2px solid #f1c40f' : '1px solid #666',
          borderRadius: '6px',
          transition: 'all 0.2s ease',
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
            background: `hsl(40, 100%, ${Math.max(20, lightness - 10)}%)`,
          },
          '&:active': {
            transform: 'translateY(0)',
          },
        }}
      >
        <Box sx={{ 
          fontSize: 'inherit',
          lineHeight: 1,
          fontWeight: 'inherit',
        }}>
          {label}
        </Box>
        <Box sx={{ 
          fontSize: 'calc(var(--cell-size, 44px) * 0.22)',
          lineHeight: 1,
          opacity: 0.9,
          minFontSize: '8px',
        }}>
          {groupAge}
        </Box>
      </Button>
    </Tooltip>
  );
}; 