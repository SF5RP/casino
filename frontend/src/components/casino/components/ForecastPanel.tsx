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
    <Box sx={{ p: 1, backgroundColor: '#1a1a1a', borderRadius: 2, border: '1px solid #333', fontSize: 12, maxHeight: '100%', overflow: 'hidden' }}>
      <Typography variant="h6" color="white" mb={1} fontSize={14}>
        🔮 Прогноз
      </Typography>
      <Typography variant="caption" color="#999" mb={1} display="block" fontSize={11}>
        На основе {history.length} ставок
      </Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, maxHeight: '100%', overflow: 'hidden' }}>
        {forecast.map((entry, index) => {
          const numberColor = getNumberColor(entry.type as RouletteNumber);
          const probabilityPercent = (entry.probability * 100).toFixed(1);
          const normalizedProbability = entry.probability / maxProbability;
          return (
            <Box key={entry.type} sx={{ display: 'flex', alignItems: 'center', gap: 1, minHeight: 24 }}>
              <Typography 
                variant="caption" 
                color="#ffd700" 
                fontWeight="bold"
                sx={{ minWidth: '18px', fontSize: 12 }}
              >
                {index + 1}
              </Typography>
              <Box
                sx={{
                  width: 22,
                  height: 22,
                  backgroundColor: numberColor,
                  color: 'white',
                  borderRadius: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold',
                  fontSize: '12px',
                  minWidth: '22px',
                }}
              >
                {entry.type}
              </Box>
              <Box sx={{ flex: 1, height: 6, background: '#222', borderRadius: 2, overflow: 'hidden', mx: 0.5 }}>
                <Box sx={{ width: `${normalizedProbability * 100}%`, height: 1, background: '#ffd700', borderRadius: 2 }} />
              </Box>
              <Typography variant="caption" color="#ffd700" sx={{ minWidth: 32, textAlign: 'right', fontSize: 12 }}>
                {probabilityPercent}%
              </Typography>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}; 