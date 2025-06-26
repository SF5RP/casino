'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Box, Typography } from '@mui/material';
import { RouletteNumber } from '@/components/casino/types/rouletteTypes';
import { getContrastText, getNumberColor } from '@/components/casino/utils/rouletteUtils';

interface DashboardHistoryPanelProps {
  history: RouletteNumber[];
  setHistory: React.Dispatch<React.SetStateAction<RouletteNumber[]>>;
  showFullHistory: boolean;
  isWide: boolean;
  setHoveredNumber: (num: RouletteNumber | null) => void;
}

export const DashboardHistoryPanel: React.FC<DashboardHistoryPanelProps> = ({
                                                                              history,
                                                                              setHistory,
                                                                              showFullHistory,
                                                                              isWide,
                                                                              setHoveredNumber,
                                                                            }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [calculatedRows, setCalculatedRows] = useState(3);

  // Отслеживание изменения размера контейнера
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setContainerSize({ width, height });
      }
    });

    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // Вычисление количества строк на основе высоты контейнера
  useEffect(() => {
    if (containerSize.height > 0) {
      // Точные размеры компонентов
      const headerHeight = 15; // Высота заголовка
      const rowHeight = 32; // Высота одной строки чисел
      const rowGap = 4; // Отступ между строками
      const paddingTop = 8; // Верхний отступ
      const paddingBottom = 0; // Нижний отступ
      const footerHeight = 0; // Высота информации внизу
      const marginBetweenHeaderAndGrid = 8; // Отступ между заголовком и сеткой
      const marginBetweenGridAndFooter = 8; // Отступ между сеткой и футером

      const totalFixedHeight = headerHeight + paddingTop + paddingBottom +
        footerHeight + marginBetweenHeaderAndGrid +
        marginBetweenGridAndFooter;

      const availableHeight = containerSize.height - totalFixedHeight;

      // Расчет количества строк с учетом отступов между ними
      let maxRows = 1; // Минимум одна строка
      let currentHeight = rowHeight; // Первая строка

      while (currentHeight + rowGap + rowHeight <= availableHeight && maxRows < 20) {
        maxRows++;
        currentHeight += rowGap + rowHeight;
      }

      setCalculatedRows(maxRows);
    }
  }, [containerSize.height]);

  // Вычисление количества чисел на строку
  const numbersPerRow = useCallback(() => {
    if (containerSize.width === 0) return 20;

    const numberWidth = isWide ? 48 : 32; // Ширина одного числа
    const gap = 4; // Отступ между числами
    const padding = 16; // Боковые отступы

    const availableWidth = containerSize.width - padding;
    const numbersCount = Math.floor(availableWidth / (numberWidth + gap));

    return Math.max(10, numbersCount); // Минимум 10 чисел
  }, [containerSize.width, isWide]);

  const handleDeleteNumber = useCallback((index: number) => {
    setHistory(prev => prev.filter((_, i) => i !== index));
  }, [setHistory]);

  const displayHistory = showFullHistory ? history : history.slice(-calculatedRows * numbersPerRow());
  const rows: RouletteNumber[][] = [];

  for (let i = 0; i < displayHistory.length; i += numbersPerRow()) {
    rows.push(displayHistory.slice(i, i + numbersPerRow()));
  }

  // Дополняем последнюю строку пустыми ячейками если нужно
  if (rows.length > 0 && rows[rows.length - 1].length < numbersPerRow()) {
    const lastRow = rows[rows.length - 1];
    const emptySlots = numbersPerRow() - lastRow.length;
    for (let i = 0; i < emptySlots; i++) {
      lastRow.push(0 as RouletteNumber);
    }
  }

  // Если нужно показать фиксированное количество строк, добавляем пустые
  if (!showFullHistory) {
    while (rows.length < calculatedRows) {
      const emptyRow: RouletteNumber[] = new Array(numbersPerRow()).fill(0 as RouletteNumber);
      rows.push(emptyRow);
    }
  }

  return (
    <Box
      ref={containerRef}
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        p: 0.5, // Добавляем отступы
      }}
    >
      {/* Заголовок */}
      <Box sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        mb: 1,
        flexShrink: 0,
        height: 20, // Фиксированная высота заголовка
      }}>
        <Typography variant="subtitle2" color="white">
          История ({history.length})
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, fontSize: '12px', color: '#aaa' }}>
          {`Показано последние ${Math.min(calculatedRows * numbersPerRow(), history.length)} из ${history.length}`}
          <span>•</span>
          <span>Строк: {calculatedRows}</span>
          <span>•</span>
          <span>На строку: {numbersPerRow()}</span>
        </Box>
      </Box>

      {/* Сетка истории */}
      <Box sx={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: 0.5,
        overflow: 'hidden',
      }}>
        {rows.map((row, rowIndex) => (
          <Box
            key={rowIndex}
            sx={{
              display: 'grid',
              gridTemplateColumns: `repeat(${numbersPerRow()}, 1fr)`,
              gap: 0.5,
              height: 32,
            }}
          >
            {row.map((num, colIndex) => {
              if (num === 0) {
                return (
                  <Box
                    key={colIndex}
                    sx={{
                      border: '1px dashed #333',
                      borderRadius: 0.5,
                      backgroundColor: 'transparent',
                    }}
                  />
                );
              }

              const actualIndex = showFullHistory
                ? rowIndex * numbersPerRow() + colIndex
                : history.length - displayHistory.length + rowIndex * numbersPerRow() + colIndex;

              return (
                <Box
                  key={colIndex}
                  onMouseEnter={() => setHoveredNumber(num as RouletteNumber | null)}
                  onMouseLeave={() => setHoveredNumber(null)}
                  onClick={() => handleDeleteNumber(actualIndex)}
                  sx={{
                    backgroundColor: getNumberColor(num as RouletteNumber),
                    color: getContrastText(getNumberColor(num as RouletteNumber)),
                    border: '1px solid #333',
                    borderRadius: 0.5,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: isWide ? 14 : 12,
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      transform: 'scale(1.1)',
                      zIndex: 10,
                      boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
                    }
                  }}
                  title={`Число ${num} (позиция ${actualIndex + 1}). Клик для удаления`}
                >
                  {num}
                </Box>
              );
            })}
          </Box>
        ))}
      </Box>
    </Box>
  );
}; 