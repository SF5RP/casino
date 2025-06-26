import React from 'react';
import { Box, Typography } from '@mui/material';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';

interface RouletteStatsChartsProps {
  history: number[];
}

// Цвета для графиков
const COLORS = ['#dc2626', '#1f2937', '#16a34a']; // Красный, чёрный, зелёный

// Маппинг номеров к цветам
const getColor = (num: number) => {
  if (num === 0) return 'green';
  // Пример: чётные - чёрные, нечётные - красные (замени на свою логику)
  return [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36].includes(num) ? 'red' : 'black';
};

// Маппинг номеров к секторам (пример)
const getSector = (num: number) => {
  if (num === 0) return 'zero';
  if (num <= 12) return '1-12';
  if (num <= 24) return '13-24';
  return '25-36';
};

// Маппинг номеров к линиям (пример)
const getLine = (num: number) => {
  if (num === 0) return 'zero';
  if (num % 3 === 1) return '1st';
  if (num % 3 === 2) return '2nd';
  return '3rd';
};

function getColorStats(history: number[]) {
  const stats = { red: 0, black: 0, green: 0 };
  history.forEach(num => {
    const color = getColor(num);
    if (color === 'red') stats.red++;
    else if (color === 'black') stats.black++;
    else stats.green++;
  });
  return [
    { name: 'Красные', value: stats.red },
    { name: 'Чёрные', value: stats.black },
    { name: 'Зелёные', value: stats.green },
  ];
}

function getSectorStats(history: number[]) {
  const stats = { '1-12': 0, '13-24': 0, '25-36': 0, zero: 0 };
  history.forEach(num => {
    const sector = getSector(num);
    stats[sector]++;
  });
  return Object.entries(stats).map(([name, value]) => ({ name, value }));
}

function getLineStats(history: number[]) {
  const stats = { '1st': 0, '2nd': 0, '3rd': 0, zero: 0 };
  history.forEach(num => {
    const line = getLine(num);
    stats[line]++;
  });
  return Object.entries(stats).map(([name, value]) => ({ name, value }));
}

export const RouletteStatsCharts: React.FC<RouletteStatsChartsProps> = ({ history }) => {
  const colorData = getColorStats(history);
  const sectorData = getSectorStats(history);
  const lineData = getLineStats(history);

  return (
    <Box mt={4}>
      <Typography variant="h6" mb={2}>График по цветам</Typography>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie data={colorData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60} label>
            {colorData.map((entry, idx) => (
              <Cell key={`cell-color-${idx}`} fill={COLORS[idx]} />
            ))}
          </Pie>
          <Legend />
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>

      <Typography variant="h6" mt={4} mb={2}>График по секторам</Typography>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={sectorData}>
          <XAxis dataKey="name" />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Bar dataKey="value" fill="#8884d8" />
        </BarChart>
      </ResponsiveContainer>

      <Typography variant="h6" mt={4} mb={2}>График по линиям</Typography>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={lineData}>
          <XAxis dataKey="name" />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Bar dataKey="value" fill="#82ca9d" />
        </BarChart>
      </ResponsiveContainer>
    </Box>
  );
}; 