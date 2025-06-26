import { useState } from 'react';

export function useRouletteSettings() {
  const [historyRows, setHistoryRows] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('roulette-history-rows');
      return saved ? parseInt(saved, 10) : 3;
    }
    return 3;
  });

  // Функция для обновления количества строк истории
  const updateHistoryRows = (newRows: number) => {
    setHistoryRows(newRows);
    localStorage.setItem('roulette-history-rows', newRows.toString());
  };

  return {
    historyRows,
    updateHistoryRows,
  };
} 