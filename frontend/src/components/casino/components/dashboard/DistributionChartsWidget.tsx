'use client';

import React, { useMemo } from 'react';
import { Box, Typography } from '@mui/material';
import { RouletteNumber } from '@/components/casino/types/rouletteTypes';

interface DistributionChartsWidgetProps {
  history: RouletteNumber[];
}

export const DistributionChartsWidget: React.FC<DistributionChartsWidgetProps> = ({ history }) => {
  // Функции для определения категорий
  const getNumberColor = (num: number): 'green' | 'red' | 'black' => {
    if (num === 0) return 'green';
    const redNumbers = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
    return redNumbers.includes(num) ? 'red' : 'black';
  };

  const getSector = (num: number): '1-12' | '13-24' | '25-36' | 'zero' => {
    if (num === 0) return 'zero';
    if (num >= 1 && num <= 12) return '1-12';
    if (num >= 13 && num <= 24) return '13-24';
    return '25-36';
  };

  const getLine = (num: number): '1st' | '2nd' | '3rd' | 'zero' => {
    if (num === 0) return 'zero';
    if ([1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34].includes(num)) return '1st';
    if ([2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35].includes(num)) return '2nd';
    return '3rd';
  };

  // Подсчет статистики
  const stats = useMemo(() => {
    const colors = { green: 0, red: 0, black: 0 };
    const sectors = { '1-12': 0, '13-24': 0, '25-36': 0, zero: 0 };
    const lines = { '1st': 0, '2nd': 0, '3rd': 0, zero: 0 };

    history.forEach(num => {
      const numValue = typeof num === 'string' ? parseInt(num) : num;
      colors[getNumberColor(numValue)]++;
      sectors[getSector(numValue)]++;
      lines[getLine(numValue)]++;
    });

    return { colors, sectors, lines };
  }, [history]);

  const maxCount = Math.max(
    ...Object.values(stats.colors),
    ...Object.values(stats.sectors),
    ...Object.values(stats.lines)
  );

  // Компонент для отображения одного графика
  const ChartSection = ({ title, data, colorMap }: {
    title: string;
    data: Record<string, number>;
    colorMap: Record<string, string>;
  }) => (
    <Box sx={{ mb: 3 }}>
      <Typography variant="subtitle2" color="white" sx={{ mb: 1, fontWeight: 'bold' }}>
        {title}
      </Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {Object.entries(data).map(([key, value]) => (
          <Box key={key} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{
              minWidth: 60,
              fontSize: 12,
              color: '#ccc',
              textAlign: 'right'
            }}>
              {key}
            </Box>
            <Box sx={{
              flex: 1,
              height: 20,
              bgcolor: '#333',
              borderRadius: 1,
              position: 'relative',
              overflow: 'hidden'
            }}>
              <Box sx={{
                height: '100%',
                width: maxCount > 0 ? `${(value / maxCount) * 100}%` : '0%',
                bgcolor: colorMap[key] || '#666',
                transition: 'width 0.3s ease',
                borderRadius: 1,
              }} />
              <Box sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 11,
                fontWeight: 'bold',
                color: 'white',
                textShadow: '1px 1px 2px rgba(0,0,0,0.8)'
              }}>
                {value}
              </Box>
            </Box>
            <Box sx={{
              minWidth: 40,
              fontSize: 11,
              color: '#888',
              textAlign: 'right'
            }}>
              {history.length > 0 ? Math.round((value / history.length) * 100) : 0}%
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );

  return (
    <Box sx={{
      height: '100%',
      p: 2,
      overflow: 'auto'
    }}>
      {/* График по цветам */}
      <ChartSection
        title="График по цветам"
        data={stats.colors}
        colorMap={{
          green: '#4CAF50',
          red: '#f44336',
          black: '#424242'
        }}
      />

      {/* График по секторам */}
      <ChartSection
        title="График по секторам"
        data={stats.sectors}
        colorMap={{
          '1-12': '#2196F3',
          '13-24': '#FF9800',
          '25-36': '#9C27B0',
          'zero': '#4CAF50'
        }}
      />

      {/* График по линиям */}
      <ChartSection
        title="График по линиям"
        data={stats.lines}
        colorMap={{
          '1st': '#E91E63',
          '2nd': '#00BCD4',
          '3rd': '#FFC107',
          'zero': '#4CAF50'
        }}
      />

      {/* Общая статистика */}
      {history.length > 0 && (
        <Box sx={{
          mt: 2,
          pt: 2,
          borderTop: '1px solid #333',
          fontSize: 11,
          color: '#888',
          textAlign: 'center'
        }}>
          Всего спинов: {history.length}
        </Box>
      )}
    </Box>
  );
}; 