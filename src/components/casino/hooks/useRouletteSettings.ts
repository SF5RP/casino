import { useState, useMemo } from 'react';

export function useRouletteSettings(windowWidth: number) {
  const [historyRows, setHistoryRows] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('roulette-history-rows');
      return saved ? parseInt(saved, 10) : 3;
    }
    return 3;
  });

  // Вычисляем параметры отображения истории
  const { itemsPerRow, maxVisibleItems } = useMemo(() => {
    const itemBaseWidth = 32; // базовая ширина ячейки
    const itemBorder = 0; // 2px border с каждой стороны (2px * 2 = 4px)
    const itemGap = 8; // gap между элементами (gap={1} в MUI = 8px)
    const containerPadding = 64; // отступы контейнера (p={4} = 32px с каждой стороны = 64px)
    const safetyBuffer = 15; // буфер для безопасности и возможных scrollbar
    const availableWidth = windowWidth - containerPadding - safetyBuffer;
    
    // Для расчета учитываем что последний элемент не имеет gap справа
    // Формула: n * (itemWidth + border) + (n-1) * gap <= availableWidth
    // Где n - количество элементов в строке
    const itemWithBorder = itemBaseWidth + itemBorder; // 32 + 4 = 36px
    const calculatedItemsPerRow = Math.max(1, Math.floor((availableWidth + itemGap) / (itemWithBorder + itemGap)));
    const calculatedMaxVisibleItems = Math.max(calculatedItemsPerRow * historyRows, 15); // используем настраиваемое количество строк
    
    return {
      itemsPerRow: calculatedItemsPerRow,
      maxVisibleItems: calculatedMaxVisibleItems
    };
  }, [windowWidth, historyRows]);

  // Функция для обновления количества строк истории
  const updateHistoryRows = (newRows: number) => {
    setHistoryRows(newRows);
    localStorage.setItem('roulette-history-rows', newRows.toString());
  };

  return {
    historyRows,
    itemsPerRow,
    maxVisibleItems,
    updateHistoryRows,
  };
} 