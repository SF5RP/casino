import React, { useMemo } from 'react';
import { Box, Typography } from '@mui/material';
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

interface RouletteTrendsChartProps {
  history: number[];
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: {
    payload: {
      spin: number;
      value: number;
    }
  }[];
  label?: string | number;
}

// Маппинг номеров к секторам
const getSector = (num: number) => {
  if (num === 0) return 'zero';
  if (num <= 12) return '1-12';
  if (num <= 24) return '13-24';
  return '25-36';
};

// Маппинг номеров к линиям
const getLine = (num: number) => {
  if (num === 0) return 'zero';
  if (num % 3 === 1) return '1st';
  if (num % 3 === 2) return '2nd';
  return '3rd';
};

// Для отображения категорий как чисел (для линий)
const sectorMap = { '1-12': 1, '13-24': 2, '25-36': 3, zero: 0 };
const lineMap = { '1st': 1, '2nd': 2, '3rd': 3, zero: 0 };
const sectorLabels: { [key: number]: string } = { 1: '1-12', 2: '13-24', 3: '25-36', 0: 'Zero' };
const lineLabels: { [key: number]: string } = { 1: '1-я', 2: '2-я', 3: '3-я', 0: 'Zero' };

export const RouletteTrendsChart: React.FC<RouletteTrendsChartProps & { chartHistoryLength?: number }> = ({
                                                                                                            history,
                                                                                                            chartHistoryLength
                                                                                                          }) => {

  const sectorData = useMemo(() => history.map((num, idx) => ({
    spin: history.length - idx,
    value: sectorMap[getSector(num)],
  })), [history]);
  const lineData = useMemo(() => history.map((num, idx) => ({
    spin: idx + 1,
    value: lineMap[getLine(num)],
  })), [history]);


  const sectorTooltip = ({ active, payload }: CustomTooltipProps) => {
    if (!active || !payload || !payload.length) return null;
    const entry = payload[0].payload;
    return (
      <Box p={1} bgcolor="#222" borderRadius={2} color="#fff">
        <div>Бросок: {entry.spin}</div>
        <div>Сектор: {sectorLabels[entry.value]}</div>
      </Box>
    );
  };
  const lineTooltip = ({ active, payload, label }: CustomTooltipProps) => {
    if (!active || !payload || !payload.length) return null;
    const entry = payload[0].payload;
    return (
      <Box p={1} bgcolor="#222" borderRadius={2} color="#fff">
        <div>Бросок: {label}</div>
        <div>Линия: {lineLabels[entry.value]}</div>
      </Box>
    );
  };

  return (
    <Box display="flex" gap={2} mt={2}>
      {/* Цвет */}
      {/* Сектор (вертикальный LineChart) */}
      <Box flex={1} minWidth={260}>
        <Typography variant="caption" color="#ccc" mb={0.5} display="block" align="center">Сектор</Typography>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={sectorData} layout="vertical" margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
                     key={chartHistoryLength}>
            <XAxis type="number" domain={[1, 3]} ticks={[1, 2, 3]} tickFormatter={v => sectorLabels[v] || v}
                   tick={{ fill: '#ccc', fontSize: 10 }} />
            <YAxis type="category" dataKey="spin" tick={{ fill: '#ccc', fontSize: 10 }} width={30} reversed />
            <Tooltip content={sectorTooltip} />
            <Line type="monotone" dataKey="value" stroke="#1976d2" dot={false} name="Сектор"
                  isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </Box>
      {/* Линия */}
      <Box flex={1} minWidth={260}>
        <Typography variant="caption" color="#ccc" mb={0.5} display="block" align="center">Линия</Typography>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={lineData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }} key={chartHistoryLength}>
            <XAxis dataKey="spin" tick={{ fill: '#ccc', fontSize: 10 }} hide={false} />
            <YAxis ticks={[1, 2, 3]} domain={[1, 3]} tickFormatter={v => lineLabels[v] || v}
                   tick={{ fill: '#ccc', fontSize: 10 }} />
            <Tooltip content={lineTooltip} />
            <Line type="monotone" dataKey="value" stroke="#43a047" dot={false} name="Линия"
                  isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </Box>
    </Box>
  );
}; 