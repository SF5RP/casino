import React, { useRef, useEffect, useCallback, useMemo, startTransition } from 'react';
import { Box } from '@mui/material';
import { RouletteCell } from '../RouletteCell';
import { BetButton } from '../betGroups/BetButton';
import { GROUPS } from '../../constants/rouletteConstants';
import { getProgressColor, calculateGroupAge } from '../../utils/rouletteUtils';
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

// Счетчик рендеров для отладки
let renderCount = 0;
const DEBUG_LOGS = process.env.NODE_ENV === 'development';

const RouletteBoard: React.FC<RouletteBoardProps> = ({
  ageMap,
  activeLabel,
  activeGroup,
  history,
  setHistory,
  setActiveLabel,
  setActiveGroup,
}) => {
  renderCount++;
  if (DEBUG_LOGS) {
    console.time(`RouletteBoard-render-${renderCount}`);
    console.log(`🎲 RouletteBoard рендер #${renderCount}, история: ${history.length}, активная группа: ${activeGroup.length}`);
  }
  
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

  const handleCellClick = useCallback((num: RouletteNumber) => {
    console.time(`handleCellClick-${num}`);
    console.log(`🎯 Клик по ячейке ${num}, текущая история:`, history.length);
    
    const startTime = performance.now();
    
    // Используем startTransition для батчинга обновлений
    startTransition(() => {
      setHistory([...history, num]);
      setActiveLabel(String(num));
    });
    
    const endTime = performance.now();
    console.log(`📊 Объединенное обновление состояния: ${(endTime - startTime).toFixed(2)}ms`);
    
    console.timeEnd(`handleCellClick-${num}`);
  }, [history, setHistory, setActiveLabel]);

  const renderCell = useCallback((num: RouletteNumber) => {
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
        history={history}
      />
    );
  }, [ageMap, activeLabel, activeGroup, handleCellClick, history]);

  // Мемоизируем создание сетки чисел
  const numberGrid = useMemo(() => {
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
  }, []);

  // Мемоизируем группы ставок
  const mainGroups = useMemo(() => [
    { label: '1-18', group: GROUPS['1-18'] },
    { label: 'EVEN', group: GROUPS['EVEN'] },
    { label: 'RED', group: GROUPS['RED'] },
    { label: 'BLACK', group: GROUPS['BLACK'] },
    { label: 'ODD', group: GROUPS['ODD'] },
    { label: '19-36', group: GROUPS['19-36'] },
  ], []);

  const sectorGroups = useMemo(() => [
    { label: '1st 12', group: GROUPS['1st 12'] },
    { label: '2nd 12', group: GROUPS['2nd 12'] },
    { label: '3rd 12', group: GROUPS['3rd 12'] },
  ], []);

  // Статические группы для "2 to 1" (не нужно пересчитывать)
  const twoToOneGroups = useMemo(() => [
    { rowIdx: 0, rowNums: [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36] },
    { rowIdx: 1, rowNums: [2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35] },
    { rowIdx: 2, rowNums: [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34] },
  ], []);

  // Мемоизируем расчет возрастов для кнопок "2 to 1" - используем готовую функцию
  const twoToOneAges = useMemo(() => {
    if (DEBUG_LOGS) {
      console.log(`🔢 Пересчет возрастов 2to1, история: ${history.length} элементов`);
    }
    
    const result = twoToOneGroups.map(({ rowIdx, rowNums }) => ({
      rowIdx,
      rowNums,
      groupAge: calculateGroupAge(history, rowNums)
    }));
    
    if (DEBUG_LOGS) {
      console.log(`✅ 2to1 возрасты: [${result.map(r => r.groupAge).join(', ')}]`);
    }
    return result;
  }, [history, twoToOneGroups]);

  // Мемоизируем стили кнопок "2 to 1"
  const twoToOneButtonStyles = useMemo(() => {
    return twoToOneAges.map(({ groupAge }) => {
      const bg = '#52b788';
      const hasProgress = groupAge > 0;
      
      if (!hasProgress) {
        return {
          background: bg,
          border: 'none',
        };
      }
      
      const progressColor = getProgressColor(groupAge);
      const normalizedProgress = Math.min(groupAge / 30, 1);
      const progressAngle = normalizedProgress * 360;
      
      return {
        background: `linear-gradient(${bg}, ${bg}) padding-box, conic-gradient(from 0deg, ${progressColor} 0deg, ${progressColor} ${progressAngle}deg, transparent ${progressAngle}deg, transparent 360deg) border-box`,
        border: '3px solid transparent',
        backgroundOrigin: 'border-box',
        backgroundClip: 'padding-box, border-box',
      };
    });
  }, [twoToOneAges]);

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
        '--cell-size': 'clamp(36px, 4vw, 60px)', // Увеличенный адаптивный размер ячейки
        '--zeros-height': 'calc(var(--cell-size) * 1.5)', // Высота ячеек 0/00
      }}
    >
      {/* Колонка с 0 и 00 */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateRows: '1fr 1fr',
          gap: '0px',
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
          gap: '0px',
          gridRow: '1 / 4',
        }}
      >
        {twoToOneAges.map(({ rowIdx, rowNums, groupAge }, index) => {
          const buttonKey = `2to1-${rowIdx}`;
          const isActiveButton = activeLabel === buttonKey;
          
          // Используем предрасчитанные стили
          const baseButtonStyles = twoToOneButtonStyles[index];
          const buttonStyles = {
            ...baseButtonStyles,
            border: isActiveButton ? '2px solid #f1c40f' : baseButtonStyles.border,
          };
          
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
                ...buttonStyles,
                borderRadius: '4px',
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                cursor: 'pointer',
                transition: 'transform 0.2s ease, filter 0.2s ease',
                fontWeight: 'bold',
                fontSize: 'calc(var(--cell-size, 44px) * 0.25)',
                minWidth: 'calc(var(--cell-size, 44px) * 0.7)',
                color: '#ffffff',
                userSelect: 'none',
                padding: '4px',
                '&:hover': {
                  filter: 'brightness(1.1)',
                },
              }}
            >
              <Box sx={{
                writingMode: 'vertical-rl',
                textOrientation: 'mixed',
                fontSize: 'calc(var(--cell-size, 44px) * 0.22)',
                lineHeight: 1,
              }}>
                2 to 1
              </Box>
              <Box sx={{
                fontSize: 'calc(var(--cell-size, 44px) * 0.24)',
                lineHeight: 1,
                opacity: 0.9,
                minFontSize: '8px',
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
          gap: '2px',
          padding: '1px',
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
          gap: '2px',
          padding: '1px',
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
  
  if (DEBUG_LOGS) {
    console.timeEnd(`RouletteBoard-render-${renderCount}`);
    console.log(`✅ RouletteBoard рендер #${renderCount} завершен`);
  }
};

// Мемоизируем компонент с кастомной функцией сравнения
export const MemoizedRouletteBoard = React.memo(RouletteBoard, (prevProps, nextProps) => {
  // Сравниваем только ключевые пропсы
  return (
    prevProps.activeLabel === nextProps.activeLabel &&
    prevProps.activeGroup.length === nextProps.activeGroup.length &&
    prevProps.history.length === nextProps.history.length &&
    JSON.stringify(prevProps.ageMap) === JSON.stringify(nextProps.ageMap)
  );
});

export { MemoizedRouletteBoard as RouletteBoard }; 