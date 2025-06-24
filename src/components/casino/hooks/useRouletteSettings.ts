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
    const itemBorder = 4; // 2px border с каждой стороны
    const itemGap = 8; // gap между элементами
    const itemTotalWidth = itemBaseWidth + itemBorder + itemGap; // 32 + 4 + 8 = 44px
    const containerPadding = 64; // отступы контейнера (32px с каждой стороны)
    const safetyBuffer = 23; // буфер для безопасности
    const availableWidth = windowWidth - containerPadding - safetyBuffer;
    const calculatedItemsPerRow = Math.max(1, Math.floor(availableWidth / itemTotalWidth)); // минимум 1 элемент
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