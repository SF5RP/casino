import React from 'react';
import { Box, Button, Typography } from '@mui/material';
import { getContrastText, getNumberColor } from '../../utils/rouletteUtils';
import { EvenOddAnalysis } from './EvenOddAnalysis';
import type { RouletteNumber } from '../../types/rouletteTypes';

interface StatsPanelProps {
  showStats: boolean;
  setShowStats: (show: boolean) => void;
  setShowDetailedStats: (show: boolean) => void;
  history: RouletteNumber[];
  isEmbedded?: boolean;
}

export const StatsPanel: React.FC<StatsPanelProps> = ({
                                                        showStats,
                                                        setShowStats,
                                                        setShowDetailedStats,
                                                        history,
                                                        isEmbedded = false,
                                                      }) => {
  // Подготавливаем данные статистики
  const allNumbers: RouletteNumber[] = [0, ...Array.from({ length: 36 }, (_, i) => i + 1), '00'];
  const statsData = allNumbers.map(num => {
    const numStr = String(num);
    const occurrences = history.filter(h => String(h) === numStr).length;
    const lastIndex = [...history].reverse().findIndex(h => String(h) === numStr);
    const lastOccurrence = lastIndex === -1 ? 'Никогда' : `${lastIndex} назад`;
    const percentage = history.length > 0 ? ((occurrences / history.length) * 100) : 0;
    const expectedPercentage = num === 0 || num === '00' ? 2.7 : 2.7;
    const deviation = percentage - expectedPercentage;

    return {
      number: num,
      occurrences,
      lastOccurrence,
      percentage,
      deviation,
      color: getNumberColor(num)
    };
  });

  // Сортируем по количеству выпадений (по убыванию)
  const sortedStats = [...statsData].sort((a, b) => b.occurrences - a.occurrences);

  return (
    <Box
      sx={isEmbedded ? {
        // Встроенный режим - без позиционирования
        width: '100%',
        backgroundColor: 'transparent',
        padding: 0,
        overflowY: 'auto',
      } : {
        // Всплывающий режим
        position: 'fixed',
        top: 0,
        left: showStats ? 0 : '-450px',
        width: '400px',
        height: 'calc(100vh - 48px)',
        backgroundColor: '#1a1a1a',
        borderRight: '1px solid #333',
        padding: 3,
        transition: 'left 0.3s ease',
        zIndex: 1000,
        overflowY: 'auto',
      }}
    >
      {!isEmbedded && (
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h6" color="white">Статистика чисел</Typography>
          <Button
            onClick={() => setShowStats(false)}
            sx={{ color: 'white', minWidth: 'auto', p: 1 }}
          >
            ✕
          </Button>
        </Box>
      )}

      <Box mb={3}>
        <Typography variant="body2" color="#ccc" mb={2}>
          Всего ставок: {history.length}
        </Typography>
      </Box>

      <Box mt={3}>
        <Typography variant="subtitle2" color="white" mb={2}>
          Топ-3 самых частых:
        </Typography>
        {sortedStats.slice(0, 3).map(({ number, occurrences, percentage, color }, index) => (
          <Box key={String(number)} display="flex" alignItems="center" gap={2} mb={1}>
            <Typography variant="body2" color="#ffd700" fontWeight="bold">
              #{index + 1}
            </Typography>
            <Box
              sx={{
                width: 20,
                height: 20,
                borderRadius: '50%',
                background: color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: getContrastText(color),
                fontWeight: 'bold',
                fontSize: '10px'
              }}
            >
              {number}
            </Box>
            <Typography variant="body2" color="white">
              {occurrences} раз ({percentage.toFixed(1)}%)
            </Typography>
          </Box>
        ))}
      </Box>

      <Box mt={3}>
        <Typography variant="subtitle2" color="white" mb={2}>
          Самые редкие:
        </Typography>
        {[...sortedStats].reverse().slice(0, 3).map(({ number, occurrences, percentage, color }, index) => (
          <Box key={String(number)} display="flex" alignItems="center" gap={2} mb={1}>
            <Typography variant="body2" color="#ef4444" fontWeight="bold">
              #{index + 1}
            </Typography>
            <Box
              sx={{
                width: 20,
                height: 20,
                borderRadius: '50%',
                background: color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: getContrastText(color),
                fontWeight: 'bold',
                fontSize: '10px'
              }}
            >
              {number}
            </Box>
            <Typography variant="body2" color="white">
              {occurrences} раз ({percentage.toFixed(1)}%)
            </Typography>
          </Box>
        ))}
      </Box>

      {history.length > 0 && (
        <>
          <Box mt={3}>
            <Typography variant="subtitle2" color="white" mb={2}>
              Последние серии:
            </Typography>
            {(() => {
              const series = [];
              let currentSeries = { number: history[history.length - 1], count: 1 };

              for (let i = history.length - 2; i >= 0 && series.length < 5; i--) {
                if (String(history[i]) === String(currentSeries.number)) {
                  currentSeries.count++;
                } else {
                  if (currentSeries.count > 1) {
                    series.push({ ...currentSeries });
                  }
                  currentSeries = { number: history[i], count: 1 };
                }
              }

              if (currentSeries.count > 1 && series.length < 5) {
                series.push(currentSeries);
              }

              return series.length > 0 ? series.map((serie, index) => (
                <Box key={index} display="flex" alignItems="center" gap={2} mb={1}>
                  <Box
                    sx={{
                      width: 20,
                      height: 20,
                      borderRadius: '50%',
                      background: getNumberColor(serie.number),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: getContrastText(getNumberColor(serie.number)),
                      fontWeight: 'bold',
                      fontSize: '10px'
                    }}
                  >
                    {serie.number}
                  </Box>
                  <Typography variant="body2" color="white">
                    {serie.count} раз подряд
                  </Typography>
                </Box>
              )) : (
                <Typography variant="body2" color="#999">
                  Серий не найдено
                </Typography>
              );
            })()}
          </Box>

          {/* Статистика в 2 столбца */}
          <Box mt={3} display="flex" gap={2}>
            <EvenOddAnalysis history={history} />
          </Box>
        </>
      )}

      {/* Кнопка для открытия детальной статистики */}
      <Box mt={4} pt={3} borderTop="1px solid #333">
        <Button
          variant="outlined"
          onClick={() => setShowDetailedStats(true)}
          sx={{
            color: 'white',
            borderColor: '#555',
            '&:hover': { borderColor: '#777' },
            width: '100%'
          }}
        >
          📋 Детальная статистика по числам
        </Button>
      </Box>
    </Box>
  );
}; 