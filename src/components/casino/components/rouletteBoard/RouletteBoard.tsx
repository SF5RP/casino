import React, { useRef, useEffect } from 'react';
import { Box } from '@mui/material';
import { RouletteCell } from '../RouletteCell';
import { BetButton } from '../betGroups/BetButton';
import { GROUPS } from '../../constants/rouletteConstants';
import type { RouletteNumber, AgeMap } from '../../types/rouletteTypes';

interface RouletteBoardProps {
  ageMap: AgeMap;
  activeLabel: string;
  activeGroup: number[];
  history: RouletteNumber[];
  setHistory: React.Dispatch<React.SetStateAction<RouletteNumber[]>>;
  setActiveLabel: (label: string) => void;
  setActiveGroup: (group: number[]) => void;
}

export const RouletteBoard: React.FC<RouletteBoardProps> = ({
  ageMap,
  activeLabel,
  activeGroup,
  history,
  setHistory,
  setActiveLabel,
  setActiveGroup,
}) => {
  const boardRef = useRef<HTMLDivElement>(null);

  // Функция для обновления только ширины стола (для блоков ставок)
  const updateTableWidth = () => {
    if (boardRef.current) {
      const width = boardRef.current.offsetWidth;
      document.documentElement.style.setProperty('--roulette-table-width', `${width}px`);
    }
  };

  // Устанавливаем ширину стола при монтировании и изменении размеров
  useEffect(() => {
    updateTableWidth();

    // Используем ResizeObserver для отслеживания изменений размера
    const resizeObserver = new ResizeObserver(updateTableWidth);
    if (boardRef.current) {
      resizeObserver.observe(boardRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  const handleCellClick = (num: RouletteNumber) => {
    setHistory([...history, num]);
    setActiveLabel(String(num));
  };

  const renderCell = (num: RouletteNumber) => {
    const count = ageMap[String(num)] ?? '-';
    const isActive = activeLabel === String(num);
    const isHighlighted = activeGroup.length > 0 && activeGroup.includes(num as number);

    return (
      <RouletteCell
        key={String(num)}
        num={num}
        count={count}
        isActive={isActive}
        isHighlighted={isHighlighted}
        onCellClick={handleCellClick}
      />
    );
  };

  // Создаем массив чисел в правильном порядке для Grid
  const createNumberGrid = () => {
    const grid = [];
    for (let row = 0; row < 3; row++) {
      const rowNumbers = [];
      for (let col = 1; col <= 12; col++) {
        const number = 3 * col - row;
        rowNumbers.push(number);
      }
      grid.push(rowNumbers);
    }
    return grid;
  };

  const numberGrid = createNumberGrid();

  // Группы ставок
  const mainGroups = [
    { label: '1-18', group: GROUPS['1-18'] },
    { label: 'EVEN', group: GROUPS['EVEN'] },
    { label: 'RED', group: GROUPS['RED'] },
    { label: 'BLACK', group: GROUPS['BLACK'] },
    { label: 'ODD', group: GROUPS['ODD'] },
    { label: '19-36', group: GROUPS['19-36'] },
  ];

  const sectorGroups = [
    { label: '1st 12', group: GROUPS['1st 12'] },
    { label: '2nd 12', group: GROUPS['2nd 12'] },
    { label: '3rd 12', group: GROUPS['3rd 12'] },
  ];

  return (
    <Box 
      ref={boardRef} 
      sx={{
        display: 'grid',
        gridTemplateColumns: 'auto 1fr auto',
        gridTemplateRows: 'repeat(3, auto) 6px auto 6px auto',
        gap: '1px',
        width: 'fit-content',
        maxWidth: '90vw', // Ограничиваем максимальную ширину
        margin: '0 auto',
        padding: '6px',
        backgroundColor: '#1a1a1a',
        borderRadius: '6px',
        border: '1px solid #333',
        // Определяем базовые размеры для grid элементов
        '--cell-size': 'clamp(32px, 3.5vw, 56px)', // Увеличенный адаптивный размер ячейки
        '--zeros-height': 'calc(var(--cell-size) * 1.5)', // Высота ячеек 0/00
      }}
    >
      {/* Колонка с 0 и 00 */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateRows: '1fr 1fr',
          gap: '1px',
          gridRow: '1 / 4',
        }}
      >
        {renderCell('00')}
        {renderCell(0)}
      </Box>
      
      {/* Основная сетка чисел */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(12, 1fr)',
          gridTemplateRows: 'repeat(3, 1fr)',
          gap: '1px',
          gridRow: '1 / 4',
        }}
      >
        {numberGrid.map((row, rowIndex) =>
          row.map((number) => (
            <Box
              key={number}
              sx={{
                gridColumn: Math.ceil(number / 3),
                gridRow: rowIndex + 1,
              }}
            >
              {renderCell(number)}
            </Box>
          ))
        )}
      </Box>

      {/* Кнопки 2 to 1 */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateRows: 'repeat(3, 1fr)',
          gap: '1px',
          gridRow: '1 / 4',
        }}
      >
        {[0, 1, 2].map((rowIdx) => {
          const rowNums = Array.from({ length: 12 }, (_, i) => 3 * (i + 1) - rowIdx);
          let groupAge = history.length;
          for (let i = history.length - 1; i >= 0; i--) {
            if (rowNums.includes(history[i] as number)) {
              groupAge = history.length - 1 - i;
              break;
            }
          }
          const lightness = Math.max(30, 90 - groupAge * 3);
          const bg = `hsl(40, 100%, ${lightness}%)`;
          const buttonKey = `2to1-${rowIdx}`;
          
          return (
            <Box
              key={rowIdx}
              onClick={() => {
                if (activeLabel === buttonKey) {
                  setActiveLabel('');
                  setActiveGroup([]);
                } else {
                  setActiveLabel(buttonKey);
                  setActiveGroup(rowNums);
                }
              }}
              sx={{
                background: bg,
                border: activeLabel === buttonKey ? '2px solid #f1c40f' : '1px solid #333',
                borderRadius: '4px',
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                cursor: 'pointer',
                transition: 'all 0.3s',
                fontWeight: 'bold',
                fontSize: 'calc(var(--cell-size, 44px) * 0.35)',
                minWidth: 'calc(var(--cell-size, 44px) * 0.8)',
                color: '#000',
                userSelect: 'none',
                padding: '4px',
                '&:hover': {
                  opacity: 0.8,
                },
              }}
            >
              <Box sx={{
                writingMode: 'vertical-rl',
                textOrientation: 'mixed',
                fontSize: 'inherit',
                lineHeight: 1,
              }}>
                2 to 1
              </Box>
              <Box sx={{
                fontSize: 'calc(var(--cell-size, 44px) * 0.32)',
                lineHeight: 1,
                opacity: 0.9,
                minFontSize: '10px',
                fontWeight: 'bold',
              }}>
                {groupAge}
              </Box>
            </Box>
          );
        })}
      </Box>

      {/* Первый ряд блоков ставок - секторы (1st 12, 2nd 12, 3rd 12) */}
      <Box
        sx={{
          gridColumn: '2 / 3', // Только по ширине основной сетки чисел (без колонки 0/00)
          gridRow: '5',
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '6px',
          padding: '3px',
        }}
      >
        {sectorGroups.map(({ label, group }) => (
          <BetButton
            key={label}
            label={label}
            group={group}
            history={history}
            activeLabel={activeLabel}
            setActiveLabel={setActiveLabel}
            setActiveGroup={setActiveGroup}
            buttonType="sector"
          />
          ))}
        </Box>
        
      {/* Второй ряд блоков ставок - основные (1-18, EVEN, RED, BLACK, ODD, 19-36) */}
      <Box
        sx={{
          gridColumn: '2 / 3', // Только по ширине основной сетки чисел (без колонки 0/00)
          gridRow: '7',
          display: 'grid',
          gridTemplateColumns: 'repeat(6, 1fr)',
          gap: '6px',
          padding: '3px',
        }}
      >
        {mainGroups.map(({ label, group }) => (
          <BetButton
            key={label}
            label={label}
            group={group}
          history={history}
          activeLabel={activeLabel}
          setActiveLabel={setActiveLabel}
          setActiveGroup={setActiveGroup}
            buttonType="main"
        />
        ))}
      </Box>
    </Box>
  );
}; 