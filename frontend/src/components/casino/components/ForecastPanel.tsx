import React, { useMemo } from 'react';
import { Box, Typography, LinearProgress } from '@mui/material';
import { buildCombinedForecast } from '../utils/forecastUtils';
import { getNumberColor } from '../utils/rouletteUtils';
import type { RouletteNumber } from '../types/rouletteTypes';

interface ForecastPanelProps {
  history: RouletteNumber[];
  maxPredictions?: number;
}

export const ForecastPanel: React.FC<ForecastPanelProps> = ({ 
  history, 
  maxPredictions = 10 
}) => {
  const forecast = useMemo(() => {
    if (history.length < 5) return []; // Минимум 5 ставок для прогноза
    return buildCombinedForecast(history).slice(0, maxPredictions);
  }, [history, maxPredictions]);

  if (history.length < 5) {
    return (
      <Box sx={{ p: 2, backgroundColor: '#1a1a1a', borderRadius: 2, border: '1px solid #333' }}>
        <Typography variant="h6" color="white" mb={2}>
          🔮 Прогноз
        </Typography>
        <Typography variant="body2" color="#999" textAlign="center">
          Нужно минимум 5 ставок для прогноза
        </Typography>
      </Box>
    );
  }

  const maxProbability = forecast[0]?.probability || 0;

  return (
    <Box sx={{ p: 2, backgroundColor: '#1a1a1a', borderRadius: 2, border: '1px solid #333' }}>
      <Typography variant="h6" color="white" mb={2}>
        🔮 Прогноз следующих чисел
      </Typography>
      
      <Typography variant="caption" color="#999" mb={2} display="block">
        Основан на анализе {history.length} ставок
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {forecast.map((entry, index) => {
          const numberColor = getNumberColor(entry.type as RouletteNumber);
          const probabilityPercent = (entry.probability * 100).toFixed(1);
          const normalizedProbability = entry.probability / maxProbability;

          return (
            <Box key={entry.type} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              {/* Позиция */}
              <Typography 
                variant="caption" 
                color="#ffd700" 
                fontWeight="bold"
                sx={{ minWidth: '20px' }}
              >
                #{index + 1}
              </Typography>

              {/* Номер */}
              <Box
                sx={{
                  width: 28,
                  height: 28,
                  backgroundColor: numberColor,
                  color: 'white',
                  borderRadius: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold',
                  fontSize: '12px',
                  minWidth: '28px',
                }}
              >
                {entry.type}
              </Box>

              {/* Прогресс бар */}
              <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                <LinearProgress
                  variant="determinate"
                  value={normalizedProbability * 100}
                  sx={{
                    flex: 1,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: '#333',
                    '& .MuiLinearProgress-bar': {
                      backgroundColor: index < 3 ? '#22c55e' : index < 6 ? '#eab308' : '#6b7280',
                      borderRadius: 3,
                    },
                  }}
                />
                <Typography 
                  variant="caption" 
                  color="white" 
                  sx={{ minWidth: '40px', textAlign: 'right' }}
                >
                  {probabilityPercent}%
                </Typography>
              </Box>
            </Box>
          );
        })}
      </Box>

      <Typography variant="caption" color="#666" mt={2} display="block">
        ⚠️ Прогноз носит развлекательный характер
      </Typography>
    </Box>
  );
}; 