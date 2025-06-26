import React, { useMemo } from 'react';
import { Box, Typography } from '@mui/material';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface RouletteTrendsChartProps {
  history: number[];
}

// Маппинг номеров к цветам
const getColor = (num: number) => {
  if (num === 0) return 'green';
  return [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36].includes(num) ? 'red' : 'black';
};

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
const colorMap = { red: 1, black: 2, green: 3 };
const sectorMap = { '1-12': 1, '13-24': 2, '25-36': 3, zero: 0 };
const lineMap = { '1st': 1, '2nd': 2, '3rd': 3, zero: 0 };
const colorLabels = { 1: 'Красный', 2: 'Чёрный', 3: 'Зелёный' };
const sectorLabels = { 1: '1-12', 2: '13-24', 3: '25-36', 0: 'Zero' };
const lineLabels = { 1: '1-я', 2: '2-я', 3: '3-я', 0: 'Zero' };

export const RouletteTrendsChart: React.FC<RouletteTrendsChartProps & { chartHistoryLength?: number }> = ({ history, chartHistoryLength }) => {
  const colorData = useMemo(() => history.map((num, idx) => ({
    spin: idx + 1,
    value: colorMap[getColor(num)],
  })), [history]);
  const sectorData = useMemo(() => history.map((num, idx) => ({
    spin: history.length - idx,
    value: sectorMap[getSector(num)],
  })), [history]);
  const lineData = useMemo(() => history.map((num, idx) => ({
    spin: idx + 1,
    value: lineMap[getLine(num)],
  })), [history]);

  const colorTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;
    const entry = payload[0].payload;
    return (
      <Box p={1} bgcolor="#222" borderRadius={2} color="#fff">
        <div>Бросок: {label}</div>
        <div>Цвет: {colorLabels[entry.value]}</div>
      </Box>
    );
  };
  const sectorTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;
    const entry = payload[0].payload;
    return (
      <Box p={1} bgcolor="#222" borderRadius={2} color="#fff">
        <div>Бросок: {entry.spin}</div>
        <div>Сектор: {sectorLabels[entry.value]}</div>
      </Box>
    );
  };
  const lineTooltip = ({ active, payload, label }: any) => {
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
    <Box mt={2}>
      <Typography variant="subtitle1" color="white" mb={1}>
        Динамика по цвету, сектору и линии (по времени)
      </Typography>
      <Box display="flex" gap={2}>
        {/* Цвет */}
        <Box flex={1} minWidth={260}>
          <Typography variant="caption" color="#ccc" mb={0.5} display="block" align="center">Цвет</Typography>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={colorData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }} key={chartHistoryLength}>
              <XAxis dataKey="spin" tick={{ fill: '#ccc', fontSize: 10 }} hide={false} />
              <YAxis ticks={[1,2,3]} domain={[1,3]} tickFormatter={v => colorLabels[v] || v} tick={{ fill: '#ccc', fontSize: 10 }} />
              <Tooltip content={colorTooltip} />
              <Line type="monotone" dataKey="value" stroke="#e53935" dot={false} name="Цвет" isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </Box>
        {/* Сектор (вертикальный LineChart) */}
        <Box flex={1} minWidth={260}>
          <Typography variant="caption" color="#ccc" mb={0.5} display="block" align="center">Сектор</Typography>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={sectorData} layout="vertical" margin={{ top: 10, right: 10, left: 10, bottom: 0 }} key={chartHistoryLength}>
              <XAxis type="number" domain={[1,3]} ticks={[1,2,3]} tickFormatter={v => sectorLabels[v] || v} tick={{ fill: '#ccc', fontSize: 10 }} />
              <YAxis type="category" dataKey="spin" tick={{ fill: '#ccc', fontSize: 10 }} width={30} reversed />
              <Tooltip content={sectorTooltip} />
              <Line type="monotone" dataKey="value" stroke="#1976d2" dot={false} name="Сектор" isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </Box>
        {/* Линия */}
        <Box flex={1} minWidth={260}>
          <Typography variant="caption" color="#ccc" mb={0.5} display="block" align="center">Линия</Typography>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={lineData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }} key={chartHistoryLength}>
              <XAxis dataKey="spin" tick={{ fill: '#ccc', fontSize: 10 }} hide={false} />
              <YAxis ticks={[1,2,3]} domain={[1,3]} tickFormatter={v => lineLabels[v] || v} tick={{ fill: '#ccc', fontSize: 10 }} />
              <Tooltip content={lineTooltip} />
              <Line type="monotone" dataKey="value" stroke="#43a047" dot={false} name="Линия" isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </Box>
      </Box>
    </Box>
  );
}; 