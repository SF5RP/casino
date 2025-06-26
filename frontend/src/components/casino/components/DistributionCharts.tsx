'use client';

import React, { useMemo, useState } from 'react';
import { Box, IconButton, Paper, Typography } from '@mui/material';
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { RouletteNumber } from '@/components/casino/types/rouletteTypes';

interface DistributionChartsProps {
  history: RouletteNumber[];
}

export const DistributionCharts: React.FC<DistributionChartsProps> = ({ history }) => {
  const [chartMode, setChartMode] = useState<'bars' | 'charts'>('bars');

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
    const evenOdd = { even: 0, zero: 0, odd: 0 };
    const half = { '1-18': 0, zero: 0, '19-36': 0 };

    history.forEach(num => {
      const numValue = typeof num === 'string' ? parseInt(num) : num;
      colors[getNumberColor(numValue)]++;
      sectors[getSector(numValue)]++;
      lines[getLine(numValue)]++;
      if (numValue === 0) {
        evenOdd.zero++;
        half.zero++;
      } else {
        if (numValue % 2 === 0) evenOdd.even++;
        else evenOdd.odd++;
        if (numValue >= 1 && numValue <= 18) half['1-18']++;
        else if (numValue >= 19 && numValue <= 36) half['19-36']++;
      }
    });

    return { colors, sectors, lines, evenOdd, half };
  }, [history]);

  const maxCount = Math.max(
    ...Object.values(stats.colors),
    ...Object.values(stats.sectors),
    ...Object.values(stats.lines)
  );

  // Данные для Recharts
  const colorChartData = [
    { name: 'Красные', value: stats.colors.red, fill: '#f44336' },
    { name: 'Чёрные', value: stats.colors.black, fill: '#424242' },
    { name: 'Зелёные', value: stats.colors.green, fill: '#4CAF50' },
  ];

  const sectorChartData = [
    { name: '1-12', value: stats.sectors['1-12'], fill: '#2196F3' },
    { name: '13-24', value: stats.sectors['13-24'], fill: '#FF9800' },
    { name: '25-36', value: stats.sectors['25-36'], fill: '#9C27B0' },
    { name: 'zero', value: stats.sectors.zero, fill: '#4CAF50' },
  ];

  const lineChartData = [
    { name: '1st', value: stats.lines['1st'], fill: '#E91E63' },
    { name: '2nd', value: stats.lines['2nd'], fill: '#00BCD4' },
    { name: '3rd', value: stats.lines['3rd'], fill: '#FFC107' },
    { name: 'zero', value: stats.lines.zero, fill: '#4CAF50' },
  ];

  const evenOddChartData = [
    { name: 'Чётные', value: stats.evenOdd.even, fill: '#1976D2' },
    { name: 'zero', value: stats.evenOdd.zero, fill: '#4CAF50' },
    { name: 'Нечётные', value: stats.evenOdd.odd, fill: '#D32F2F' },
  ];

  const halfChartData = [
    { name: '1-18', value: stats.half['1-18'], fill: '#388E3C' },
    { name: 'zero', value: stats.half.zero, fill: '#4CAF50' },
    { name: '19-36', value: stats.half['19-36'], fill: '#FBC02D' },
  ];

  // Новый компонент для горизонтального отображения полос
  const HorizontalBarSection = ({ title, data, colorMap, order }: {
    title: string;
    data: Record<string, number>;
    colorMap: Record<string, string>;
    order: string[];
  }) => (
    <Box sx={{ mb: 2 }}>
      <Typography variant="subtitle2" color="white" sx={{ mb: 1, fontWeight: 'bold', fontSize: 14 }}>
        {title}
      </Typography>
      <Box sx={{ display: 'flex', flexDirection: 'row', gap: 1, alignItems: 'center', justifyContent: 'center' }}>
        {order.map((key) => (
          <Box key={key} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 60 }}>
            <Box sx={{ fontSize: 11, color: '#ccc', mb: 0.5 }}>{key}</Box>
            <Box sx={{
              width: 36,
              height: 60,
              bgcolor: '#333',
              borderRadius: 1,
              position: 'relative',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'flex-end'
            }}>
              <Box sx={{
                width: '100%',
                height: maxCount > 0 ? `${(data[key] / maxCount) * 100}%` : '0%',
                bgcolor: colorMap[key] || '#666',
                transition: 'height 0.3s ease',
                borderRadius: 1
              }} />
              <Box sx={{
                position: 'absolute',
                bottom: 2,
                left: 0,
                right: 0,
                textAlign: 'center',
                fontSize: 10,
                fontWeight: 'bold',
                color: 'white',
                textShadow: '1px 1px 2px rgba(0,0,0,0.8)'
              }}>{data[key]}</Box>
            </Box>
            <Box sx={{
              fontSize: 10,
              color: '#888',
              mt: 0.5
            }}>{history.length > 0 ? Math.round((data[key] / history.length) * 100) : 0}%</Box>
          </Box>
        ))}
      </Box>
    </Box>
  );

  // Новый компонент: прогресс-бар перетягивания (канат)
  const TugOfWarBar = ({
                         evenCount,
                         oddCount,
                         zeroCount,
                         total,
                         leftLabel,
                         rightLabel,
                         centerLabel,
                         leftColor,
                         rightColor,
                         centerColor
                       }: {
    evenCount: number;
    oddCount: number;
    zeroCount: number;
    total: number;
    leftLabel: string;
    rightLabel: string;
    centerLabel: string;
    leftColor: string;
    rightColor: string;
    centerColor: string;
  }) => {
    const leftPercent = total > 0 ? (evenCount / total) * 100 : 0;
    const rightPercent = total > 0 ? (oddCount / total) * 100 : 0;
    const centerPercent = total > 0 ? (zeroCount / total) * 100 : 0;
    return (
      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5, fontSize: 12, color: '#ccc' }}>
          <Box>{leftLabel}</Box>
          <Box>{centerLabel}</Box>
          <Box>{rightLabel}</Box>
        </Box>
        <Box sx={{
          display: 'flex',
          height: 28,
          borderRadius: 2,
          overflow: 'hidden',
          bgcolor: '#222',
          boxShadow: '0 1px 2px #0008'
        }}>
          <Box sx={{
            width: `${leftPercent}%`,
            bgcolor: leftColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            px: 1,
            fontWeight: 'bold',
            color: 'white',
            fontSize: 13,
            transition: 'width 0.3s'
          }}>
            {evenCount > 0 && `${evenCount} (${Math.round(leftPercent)}%)`}
          </Box>
          <Box sx={{
            width: `${centerPercent}%`,
            bgcolor: centerColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            px: 1,
            fontWeight: 'bold',
            color: 'white',
            fontSize: 13,
            borderLeft: '2px solid #181818',
            borderRight: '2px solid #181818',
            transition: 'width 0.3s'
          }}>
            {zeroCount > 0 && `${zeroCount} (${Math.round(centerPercent)}%)`}
          </Box>
          <Box sx={{
            width: `${rightPercent}%`,
            bgcolor: rightColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-start',
            px: 1,
            fontWeight: 'bold',
            color: 'white',
            fontSize: 13,
            transition: 'width 0.3s'
          }}>
            {oddCount > 0 && `${oddCount} (${Math.round(rightPercent)}%)`}
          </Box>
        </Box>
      </Box>
    );
  };

  // Компонент для отображения Recharts графиков
  const RechartsSection = () => (
    <Box>
      {/* График по цветам - круговая диаграмма */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle2" color="white" sx={{ mb: 1, fontWeight: 'bold', fontSize: 14 }}>
          По цветам
        </Typography>
        <ResponsiveContainer width="100%" height={180}>
          <PieChart>
            <Pie
              data={colorChartData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={60}
              label={({ value, percent }) => `${value} (${((percent || 0) * 100).toFixed(0)}%)`}
            >
              {colorChartData.map((entry, index) => (
                <Cell key={`cell-color-${index}`} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </Box>

      {/* График по секторам - столбчатая диаграмма */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle2" color="white" sx={{ mb: 1, fontWeight: 'bold', fontSize: 14 }}>
          По секторам
        </Typography>
        <ResponsiveContainer width="100%" height={150}>
          <BarChart data={sectorChartData}>
            <XAxis dataKey="name" tick={{ fill: '#ccc', fontSize: 12 }} />
            <YAxis allowDecimals={false} tick={{ fill: '#ccc', fontSize: 12 }} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#333',
                border: '1px solid #555',
                borderRadius: '4px',
                color: 'white'
              }}
            />
            <Bar dataKey="value" fill="#8884d8">
              {sectorChartData.map((entry, index) => (
                <Cell key={`cell-sector-${index}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Box>

      {/* График по линиям - столбчатая диаграмма */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle2" color="white" sx={{ mb: 1, fontWeight: 'bold', fontSize: 14 }}>
          По линиям
        </Typography>
        <ResponsiveContainer width="100%" height={150}>
          <BarChart data={lineChartData}>
            <XAxis dataKey="name" tick={{ fill: '#ccc', fontSize: 12 }} />
            <YAxis allowDecimals={false} tick={{ fill: '#ccc', fontSize: 12 }} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#333',
                border: '1px solid #555',
                borderRadius: '4px',
                color: 'white'
              }}
            />
            <Bar dataKey="value" fill="#82ca9d">
              {lineChartData.map((entry, index) => (
                <Cell key={`cell-line-${index}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Box>

      {/* Теперь BarChart для Четные/Нечетные/Ноль */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle2" color="white" sx={{ mb: 1, fontWeight: 'bold', fontSize: 14 }}>
          Чётные / Нечётные / 0
        </Typography>
        <ResponsiveContainer width="100%" height={120}>
          <BarChart data={evenOddChartData} layout="vertical">
            <XAxis type="number" hide />
            <YAxis type="category" dataKey="name" tick={{ fill: '#ccc', fontSize: 12 }} width={70} />
            <Tooltip contentStyle={{
              backgroundColor: '#333',
              border: '1px solid #555',
              borderRadius: '4px',
              color: 'white'
            }} />
            <Bar dataKey="value">
              {evenOddChartData.map((entry, index) => (
                <Cell key={`cell-evenodd-${index}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Box>

      {/* BarChart для 1-18 / 19-36 / 0 */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle2" color="white" sx={{ mb: 1, fontWeight: 'bold', fontSize: 14 }}>
          1-18 / 19-36 / 0
        </Typography>
        <ResponsiveContainer width="100%" height={120}>
          <BarChart data={halfChartData} layout="vertical">
            <XAxis type="number" hide />
            <YAxis type="category" dataKey="name" tick={{ fill: '#ccc', fontSize: 12 }} width={70} />
            <Tooltip contentStyle={{
              backgroundColor: '#333',
              border: '1px solid #555',
              borderRadius: '4px',
              color: 'white'
            }} />
            <Bar dataKey="value">
              {halfChartData.map((entry, index) => (
                <Cell key={`cell-half-${index}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Box>
    </Box>
  );

  if (history.length === 0) {
    return (
      <Paper sx={{
        p: 2,
        bgcolor: '#181818',
        borderRadius: 2,
        border: '1px solid #333',
        minHeight: 200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <Typography color="#888" fontSize={14} textAlign="center">
          Добавьте числа в историю для просмотра графиков распределения
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper sx={{
      p: 2,
      bgcolor: '#181818',
      borderRadius: 2,
      border: '1px solid #333'
    }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" color="white" sx={{ fontSize: 16 }}>
          📊 Графики распределения
        </Typography>
        <IconButton
          onClick={() => setChartMode(chartMode === 'bars' ? 'charts' : 'bars')}
          sx={{
            color: 'white',
            bgcolor: 'rgba(255,255,255,0.1)',
            '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' },
            width: 32,
            height: 32
          }}
          title={chartMode === 'bars' ? 'Переключить на графики' : 'Переключить на полосы'}
        >
          {chartMode === 'bars' ? '📊' : '📈'}
        </IconButton>
      </Box>

      {/* Условный рендеринг в зависимости от режима */}
      {chartMode === 'bars' ? (
        <>
          {/* График по цветам */}
          <HorizontalBarSection
            title="По цветам"
            data={stats.colors}
            colorMap={{
              green: '#4CAF50',
              red: '#f44336',
              black: '#424242'
            }}
            order={['green', 'red', 'black']}
          />

          {/* График по секторам */}
          <HorizontalBarSection
            title="По секторам"
            data={stats.sectors}
            colorMap={{
              '1-12': '#2196F3',
              '13-24': '#FF9800',
              '25-36': '#9C27B0',
              'zero': '#4CAF50'
            }}
            order={['1-12', '13-24', '25-36', 'zero']}
          />

          {/* График по линиям */}
          <HorizontalBarSection
            title="По линиям"
            data={stats.lines}
            colorMap={{
              '1st': '#E91E63',
              '2nd': '#00BCD4',
              '3rd': '#FFC107',
              'zero': '#4CAF50'
            }}
            order={['1st', '2nd', '3rd', 'zero']}
          />

          {/* Теперь прогресс-бары для четные/нечетные/ноль и 1-18/19-36/ноль */}
          <TugOfWarBar
            evenCount={stats.evenOdd.even}
            oddCount={stats.evenOdd.odd}
            zeroCount={stats.evenOdd.zero}
            total={history.length}
            leftLabel="Чётные"
            rightLabel="Нечётные"
            centerLabel="0"
            leftColor="#1976D2"
            rightColor="#D32F2F"
            centerColor="#4CAF50"
          />

          <TugOfWarBar
            evenCount={stats.half['1-18']}
            oddCount={stats.half['19-36']}
            zeroCount={stats.half.zero}
            total={history.length}
            leftLabel="1-18"
            rightLabel="19-36"
            centerLabel="0"
            leftColor="#388E3C"
            rightColor="#FBC02D"
            centerColor="#4CAF50"
          />
        </>
      ) : (
        <RechartsSection />
      )}

      {/* Общая статистика */}
      <Box sx={{
        mt: 2,
        pt: 1,
        borderTop: '1px solid #333',
        fontSize: 11,
        color: '#888',
        textAlign: 'center'
      }}>
        Всего спинов: {history.length}
      </Box>
    </Paper>
  );
}; 