'use client';

import { useEffect, useState, useMemo, Suspense } from 'react';
import { Box, Button, TextField, Typography, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { useRouletteWebSocket } from './useRouletteHistory';
import { useSnackbar } from 'notistack';
import { useSearchParams, useRouter } from 'next/navigation';
import CircularProgress from '@mui/material/CircularProgress';

const RED_NUMBERS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
const BLACK_NUMBERS = new Set([2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35]);





const GROUPS: Record<string, number[]> = {
  '1st 12': Array.from({ length: 12 }, (_, i) => i + 1),
  '2nd 12': Array.from({ length: 12 }, (_, i) => i + 13),
  '3rd 12': Array.from({ length: 12 }, (_, i) => i + 25),
  '1-18': Array.from({ length: 18 }, (_, i) => i + 1),
  '19-36': Array.from({ length: 18 }, (_, i) => i + 19),
  'EVEN': Array.from({ length: 18 }, (_, i) => (i + 1) * 2),
  'ODD': Array.from({ length: 18 }, (_, i) => i * 2 + 1),
  'RED': [...RED_NUMBERS],
  'BLACK': [...BLACK_NUMBERS],
};

function getContrastText(bgColor: string): string {
  // Удаляем # если есть
  if (bgColor.startsWith('#')) bgColor = bgColor.slice(1);
  // Преобразуем в rgb
  let r = 0, g = 0, b = 0;
  if (bgColor.length === 3) {
    r = parseInt(bgColor[0] + bgColor[0], 16);
    g = parseInt(bgColor[1] + bgColor[1], 16);
    b = parseInt(bgColor[2] + bgColor[2], 16);
  } else if (bgColor.length === 6) {
    r = parseInt(bgColor.slice(0, 2), 16);
    g = parseInt(bgColor.slice(2, 4), 16);
    b = parseInt(bgColor.slice(4, 6), 16);
  }
  // Яркость по формуле WCAG
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 140 ? '#222' : '#fff';
}



function RouletteTrackerPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { enqueueSnackbar } = useSnackbar();

  // Получаем ключ (может быть undefined)
  const key = searchParams.get('key') ?? undefined;

  // ВСЕГДА вызываем хук, даже если key нет!
  const { history, setHistory, isConnected } = useRouletteWebSocket(key);

  // Все хуки должны быть выше любого return
  const [activeLabel, setActiveLabel] = useState('');
  const [activeGroup, setActiveGroup] = useState<number[]>([]);
  const [showFullHistory, setShowFullHistory] = useState(false);
  const [windowWidth, setWindowWidth] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showDetailedStats, setShowDetailedStats] = useState(false);
  const [sortBy, setSortBy] = useState<'number' | 'frequency' | 'recent'>('number');
  const [historyRows, setHistoryRows] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('roulette-history-rows');
      return saved ? parseInt(saved, 10) : 3;
    }
    return 3;
  });

  // Отслеживаем ширину окна
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };
    
    // Устанавливаем начальную ширину
    handleResize();
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Используем useMemo для вычисления ageMap вместо useEffect
  const ageMap = useMemo(() => {
    const newAgeMap: Record<string, number> = {};
    for (let i = 0; i <= 36; i++) {
      const index = [...history].reverse().findIndex((v) => v === i);
      newAgeMap[String(i)] = index === -1 ? history.length : index;
    }
    newAgeMap['00'] = [...history].reverse().findIndex((v) => v === '00');
    if (newAgeMap['00'] === -1) newAgeMap['00'] = history.length;
    return newAgeMap;
  }, [history]);

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

  useEffect(() => {
    if (!key) {
      const newKey = Math.random().toString(36).substring(2, 15);
      router.replace(`/casino?key=${newKey}`);
    }
  }, [key, router]);

  // Функция для обновления количества строк истории
  const updateHistoryRows = (newRows: number) => {
    setHistoryRows(newRows);
    localStorage.setItem('roulette-history-rows', newRows.toString());
  };

  // Только после всех хуков — return null, если ключа нет
  if (!key) return null;



  const resetAll = () => {
    setHistory([]);
  };

  // Кнопка поделиться — просто копирует ссылку
  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/casino?key=${key}`;
    await navigator.clipboard.writeText(shareUrl);
    enqueueSnackbar('Ссылка скопирована! Можно делиться.', { variant: 'success' });
  };



  const getColor = (num: number | '00') => {
    if (num === 0 || num === '00') return '#2ecc71'; // зеленый для 0 и 00
    if (RED_NUMBERS.has(num as number)) return '#e74c3c';
    if (BLACK_NUMBERS.has(num as number)) return '#2c3e50';
    return '#bdc3c7';
  };

  const renderCell = (num: number | '00') => {
    const count = ageMap[String(num)] ?? '-';
    const isRecent = count === 0;
    const isHighlighted = activeGroup.length > 0 && activeGroup.includes(num as number);
    const isActive = activeLabel === num;
    const ballColor = num === 0 || num === '00' ? '#2ecc71' : RED_NUMBERS.has(num as number) ? '#e74c3c' : BLACK_NUMBERS.has(num as number) ? '#2c3e50' : '#bdc3c7';

    // Определяем, является ли это ячейкой 0 или 00
    const isZeroCell = num === 0 || num === '00';

    // Вычисляем прогресс для заполнения бордера (0-100%)
    const progressPercent = typeof count === 'number' ? Math.min(count / 100 * 100, 100) : 0;

    // Цвет прогресс-бара в зависимости от количества
    const getProgressColor = (cnt: number) => {
      if (cnt < 20) return '#4ade80'; // зеленый
      if (cnt < 50) return '#fbbf24'; // желтый
      if (cnt < 80) return '#fb923c'; // оранжевый
      return '#ef4444'; // красный
    };

    // Создаем градиентный бордер для прогресса
    const getBorderStyle = () => {
      if (typeof count !== 'number' || count === 0) {
        return '3px solid #e2e8f0';
      }
      
      const progressColor = getProgressColor(count);
      
      if (progressPercent >= 100) {
        return `3px solid ${progressColor}`;
      }
      
      return `3px solid transparent`;
    };

    const getBorderBackground = () => {
      if (typeof count !== 'number' || count === 0) {
        return 'none';
      }
      
      const progressColor = getProgressColor(count);
      const angle = (progressPercent / 100) * 360;
      const cellBgColor = isActive ? '#2222dd' : (isHighlighted ? '#ffecb3' : '#14532d');
      
      if (progressPercent >= 100) {
        return `linear-gradient(${cellBgColor}, ${cellBgColor}), linear-gradient(0deg, ${progressColor}, ${progressColor})`;
      }
      
      return `linear-gradient(${cellBgColor}, ${cellBgColor}), conic-gradient(from 0deg, ${progressColor} 0deg, ${progressColor} ${angle}deg, ${cellBgColor} ${angle}deg, ${cellBgColor} 360deg)`;
    };

    return (
      <Tooltip key={String(num)} title={`Ставок назад: ${count}`} arrow>
        <Box
          sx={{
            backgroundColor: isActive ? '#2222dd' : (isHighlighted ? '#ffecb3' : '#14532d'),
            color: getContrastText(getColor(num)),
            borderRadius: 2,
            padding: 1,
            textAlign: 'center',
            fontWeight: isRecent ? 'bold' : 'normal',
            border: getBorderStyle(),
            background: getBorderBackground(),
            backgroundOrigin: 'border-box',
            backgroundClip: 'padding-box, border-box',
            minWidth: '2.5rem',
            minHeight: isZeroCell ? '6rem' : '2.5rem',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background 0.3s',
            cursor: 'pointer',
            userSelect: 'none',
          }}
          onClick={() => {
            setHistory([...history, num]);
            setActiveLabel(String(num));
          }}
        >
          <Box sx={{ width: 18, height: 18, borderRadius: '50%', background: ballColor, mb: 0.5, border: '1.5px solid #fff', display: 'inline-block' }} />
          <div style={{ fontWeight: 700, fontSize: 16 }}>{num}</div>
          <small style={{ fontSize: 12 }}>{count}</small>
        </Box>
      </Tooltip>
    );
  };

  function renderHistoryWithRepeats() {
    // Собираем индексы повторов
    const repeatIndexes = new Set<number>();
    let i = 0;
    while (i < history.length - 1) {
      let j = i;
      while (j + 1 < history.length && history[j] === history[j + 1]) {
        j++;
      }
      if (j > i) {
        for (let k = i; k <= j; k++) repeatIndexes.add(k);
        i = j + 1;
      } else {
        i++;
      }
    }

    const visibleHistory = showFullHistory ? history : history.slice(-maxVisibleItems);

    const renderHistoryItem = (num: number | '00', idx: number, originalIdx: number) => (
      <Box key={originalIdx} sx={{
        width: 32, 
        height: 32, 
        minWidth: 32, // фиксированная минимальная ширина
        maxWidth: 52, // максимальная ширина при hover
        borderRadius: 1,
        background: getColor(num), 
        color: getContrastText(getColor(num)), 
        fontWeight: 'bold', 
        fontSize: 15,
        border: repeatIndexes.has(originalIdx) ? '2px solid #0000ff' : '2px solid #e2e8f0',
            position: 'relative',
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
            cursor: 'pointer',
            transition: 'width 0.22s cubic-bezier(.4,2,.6,1)',
        flexShrink: 0, // предотвращаем сжатие
            '&:hover': {
              width: 52,
            },
            '&:hover .delete-icon': { display: 'flex' },
          }}>
            {num}
            <Tooltip title="Удалить из истории" arrow>
              <Box
                component="span"
                className="delete-icon"
                sx={{
                  cursor: 'pointer',
                  color: '#ff5858',
                  fontSize: 16,
                  fontWeight: 700,
                  userSelect: 'none',
                  display: 'none',
                  alignItems: 'center',
                  transition: 'display 0.2s',
                }}
                onClick={(e) => {
                  e.stopPropagation();
              setHistory(history.filter((_, i) => i !== originalIdx));
                }}
              >
                ❌
              </Box>
            </Tooltip>
      </Box>
    );

    return (
      <Box mb={2}>
        <Box display="flex" flexWrap="wrap" gap={1}>
          {visibleHistory.map((num, idx) => {
            const originalIdx = showFullHistory ? idx : (history.length - maxVisibleItems + idx);
            return renderHistoryItem(num, idx, originalIdx);
          })}
        </Box>
      </Box>
    );
  }

  // Модальное окно с детальной статистикой
  const renderDetailedStatsModal = () => {
    const allNumbers: (number | '00')[] = [0, ...Array.from({ length: 36 }, (_, i) => i + 1), '00'];
    
    // Подготавливаем данные для сортировки
    const statsData = allNumbers.map(num => {
      const numStr = String(num);
      const occurrences = history.filter(h => String(h) === numStr).length;
      const lastIndex = [...history].reverse().findIndex(h => String(h) === numStr);
      const lastOccurrence = lastIndex === -1 ? 'Никогда' : `${lastIndex} назад`;
      const percentage = history.length > 0 ? ((occurrences / history.length) * 100).toFixed(1) : '0.0';
      const expectedPercentage = 2.7;
      const deviation = parseFloat(percentage) - expectedPercentage;
      const color = getColor(num);
      
      return {
        number: num,
        occurrences,
        lastIndex: lastIndex === -1 ? 999999 : lastIndex,
        lastOccurrence,
        percentage: parseFloat(percentage),
        deviation,
        color
      };
    });

    // Сортируем данные
    const sortedData = [...statsData].sort((a, b) => {
      switch (sortBy) {
        case 'frequency':
          return b.occurrences - a.occurrences;
        case 'recent':
          return a.lastIndex - b.lastIndex;
        case 'number':
        default:
          // Сортировка по номеру: 0, 1, 2, ..., 36, 00
          if (a.number === 0) return -1;
          if (b.number === 0) return 1;
          if (a.number === '00') return 1;
          if (b.number === '00') return -1;
          return (a.number as number) - (b.number as number);
      }
    });
    
    return (
      <Dialog
        open={showDetailedStats}
        onClose={() => setShowDetailedStats(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: '#1a1a1a',
            color: 'white',
            maxHeight: '80vh',
          }
        }}
      >
        <DialogTitle sx={{ color: 'white', borderBottom: '1px solid #333', pb: 2 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">📋 Детальная статистика по числам</Typography>
            <Box display="flex" gap={1}>
              <Button
                size="small"
                variant={sortBy === 'number' ? 'contained' : 'outlined'}
                onClick={() => setSortBy('number')}
                sx={{ 
                  color: 'white', 
                  borderColor: '#555',
                  '&:hover': { borderColor: '#777' },
                  minWidth: 'auto',
                  px: 1
                }}
              >
                №
              </Button>
              <Button
                size="small"
                variant={sortBy === 'frequency' ? 'contained' : 'outlined'}
                onClick={() => setSortBy('frequency')}
                sx={{ 
                  color: 'white', 
                  borderColor: '#555',
                  '&:hover': { borderColor: '#777' },
                  minWidth: 'auto',
                  px: 1
                }}
              >
                📊
              </Button>
              <Button
                size="small"
                variant={sortBy === 'recent' ? 'contained' : 'outlined'}
                onClick={() => setSortBy('recent')}
                sx={{ 
                  color: 'white', 
                  borderColor: '#555',
                  '&:hover': { borderColor: '#777' },
                  minWidth: 'auto',
                  px: 1
                }}
              >
                🕒
              </Button>
            </Box>
          </Box>
          <Typography variant="caption" color="#999" mt={1} display="block">
            Сортировка: {sortBy === 'number' ? 'По номеру' : sortBy === 'frequency' ? 'По частоте' : 'По времени'}
          </Typography>
        </DialogTitle>
        
        <DialogContent sx={{ p: 0 }}>
          <Box sx={{ maxHeight: '60vh', overflowY: 'auto', p: 2 }}>
            {sortedData.map(({ number, occurrences, lastOccurrence, percentage, deviation, color }) => (
              <Box 
                key={String(number)}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  p: 2,
                  mb: 1,
                  backgroundColor: '#2a2a2a',
                  borderRadius: 1,
                  border: `1px solid ${color}`,
                  '&:hover': {
                    backgroundColor: '#333',
                  }
                }}
              >
                <Box display="flex" alignItems="center" gap={2}>
                  <Box 
                    sx={{ 
                      width: 28, 
                      height: 28, 
                      borderRadius: '50%', 
                      background: color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: getContrastText(color),
                      fontWeight: 'bold',
                      fontSize: '14px'
                    }}
                  >
                    {number}
                  </Box>
                  <Box>
                    <Typography variant="body1" color="white" fontWeight="bold">
                      {occurrences} раз ({percentage.toFixed(1)}%)
                    </Typography>
                    <Typography variant="body2" color="#999">
                      Последний раз: {lastOccurrence}
                    </Typography>
                  </Box>
                </Box>
                
                <Box textAlign="right">
                  <Typography 
                    variant="body2" 
                    color={deviation > 0 ? '#4ade80' : deviation < 0 ? '#ef4444' : '#999'}
                    fontWeight="bold"
                  >
                    {deviation > 0 ? '+' : ''}{deviation.toFixed(1)}%
                  </Typography>
                  <Typography variant="caption" color="#666">
                    от нормы (2.7%)
                  </Typography>
                </Box>
          </Box>
        ))}
      </Box>
        </DialogContent>
        
        <DialogActions sx={{ borderTop: '1px solid #333', p: 2 }}>
          <Typography variant="body2" color="#ccc" sx={{ flexGrow: 1 }}>
            Всего ставок: {history.length}
          </Typography>
          <Button 
            onClick={() => setShowDetailedStats(false)}
            sx={{ color: 'white' }}
          >
            Закрыть
          </Button>
        </DialogActions>
      </Dialog>
    );
  };

  // Компонент панели статистики
  const renderStatsPanel = () => {
    // Подготавливаем данные статистики
    const allNumbers: (number | '00')[] = [0, ...Array.from({ length: 36 }, (_, i) => i + 1), '00'];
    const statsData = allNumbers.map(num => {
      const numStr = String(num);
      const occurrences = history.filter(h => String(h) === numStr).length;
      const lastIndex = [...history].reverse().findIndex(h => String(h) === numStr);
      const lastOccurrence = lastIndex === -1 ? 'Никогда' : `${lastIndex} назад`;
      const percentage = history.length > 0 ? ((occurrences / history.length) * 100).toFixed(1) : '0.0';
      const expectedPercentage = num === 0 || num === '00' ? 2.7 : 2.7; // В европейской рулетке каждое число должно выпадать ~2.7%
      const deviation = parseFloat(percentage) - expectedPercentage;
      
      return {
        number: num,
        occurrences,
        lastOccurrence,
        percentage: parseFloat(percentage),
        deviation,
        color: getColor(num)
      };
    });

    // Сортируем по количеству выпадений (по убыванию)
    const sortedStats = [...statsData].sort((a, b) => b.occurrences - a.occurrences);
    
    return (
      <Box 
        sx={{
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
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h6" color="white">Статистика чисел</Typography>
          <Button 
            onClick={() => setShowStats(false)}
            sx={{ color: 'white', minWidth: 'auto', p: 1 }}
          >
            ✕
          </Button>
        </Box>

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
                {occurrences} раз ({percentage}%)
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
                {occurrences} раз ({percentage}%)
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
                        background: getColor(serie.number),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: getContrastText(getColor(serie.number)),
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
               {/* Левый столбец */}
               <Box flex={1}>
                 <Box mb={3}>
                   <Typography variant="subtitle2" color="white" mb={2}>
                     Анализ по цветам:
                   </Typography>
                   {(() => {
                     const redCount = history.filter(h => typeof h === 'number' && h !== 0 && RED_NUMBERS.has(h)).length;
                     const blackCount = history.filter(h => typeof h === 'number' && h !== 0 && BLACK_NUMBERS.has(h)).length;
                     const greenCount = history.filter(h => h === 0 || h === '00').length;
                     const total = redCount + blackCount + greenCount;

  return (
                       <>
                         <Box display="flex" justifyContent="space-between" mb={1}>
                           <Box display="flex" alignItems="center" gap={1}>
                             <Box sx={{ width: 12, height: 12, borderRadius: '50%', background: '#e74c3c' }} />
                             <Typography variant="body2" color="white">Красные</Typography>
                           </Box>
                           <Typography variant="body2" color="white">
                             {redCount} ({total > 0 ? ((redCount / total) * 100).toFixed(1) : '0.0'}%)
                           </Typography>
                         </Box>
                         <Box display="flex" justifyContent="space-between" mb={1}>
                           <Box display="flex" alignItems="center" gap={1}>
                             <Box sx={{ width: 12, height: 12, borderRadius: '50%', background: '#2c3e50' }} />
                             <Typography variant="body2" color="white">Черные</Typography>
                           </Box>
                           <Typography variant="body2" color="white">
                             {blackCount} ({total > 0 ? ((blackCount / total) * 100).toFixed(1) : '0.0'}%)
                           </Typography>
                         </Box>
                         <Box display="flex" justifyContent="space-between" mb={1}>
                           <Box display="flex" alignItems="center" gap={1}>
                             <Box sx={{ width: 12, height: 12, borderRadius: '50%', background: '#2ecc71' }} />
                             <Typography variant="body2" color="white">Зеленые</Typography>
                           </Box>
                           <Typography variant="body2" color="white">
                             {greenCount} ({total > 0 ? ((greenCount / total) * 100).toFixed(1) : '0.0'}%)
                           </Typography>
                         </Box>
                       </>
                     );
                   })()}
                 </Box>

                 <Box mb={3}>
                   <Typography variant="subtitle2" color="white" mb={2}>
                     Анализ по секторам:
                   </Typography>
                   {(() => {
                     const sector1Count = history.filter(h => GROUPS['1st 12'].includes(h as number)).length;
                     const sector2Count = history.filter(h => GROUPS['2nd 12'].includes(h as number)).length;
                     const sector3Count = history.filter(h => GROUPS['3rd 12'].includes(h as number)).length;
                     const zeroCount = history.filter(h => h === 0 || h === '00').length;
                     const sectorTotal = sector1Count + sector2Count + sector3Count + zeroCount;
                     
                     return (
                       <>
                         <Box display="flex" justifyContent="space-between" mb={1}>
                           <Typography variant="body2" color="white">1-12</Typography>
                           <Typography variant="body2" color="white">
                             {sector1Count} ({sectorTotal > 0 ? ((sector1Count / sectorTotal) * 100).toFixed(1) : '0.0'}%)
                           </Typography>
                         </Box>
                         <Box display="flex" justifyContent="space-between" mb={1}>
                           <Typography variant="body2" color="white">13-24</Typography>
                           <Typography variant="body2" color="white">
                             {sector2Count} ({sectorTotal > 0 ? ((sector2Count / sectorTotal) * 100).toFixed(1) : '0.0'}%)
                           </Typography>
                         </Box>
                         <Box display="flex" justifyContent="space-between" mb={1}>
                           <Typography variant="body2" color="white">25-36</Typography>
                           <Typography variant="body2" color="white">
                             {sector3Count} ({sectorTotal > 0 ? ((sector3Count / sectorTotal) * 100).toFixed(1) : '0.0'}%)
                           </Typography>
                         </Box>
                         <Box display="flex" justifyContent="space-between" mb={1}>
                           <Typography variant="body2" color="white">0/00</Typography>
                           <Typography variant="body2" color="white">
                             {zeroCount} ({sectorTotal > 0 ? ((zeroCount / sectorTotal) * 100).toFixed(1) : '0.0'}%)
                           </Typography>
                         </Box>
                       </>
                     );
                   })()}
                 </Box>
               </Box>

               {/* Правый столбец */}
               <Box flex={1}>
                 <Box mb={3}>
                   <Typography variant="subtitle2" color="white" mb={2}>
                     Анализ по строкам (2 to 1):
                   </Typography>
                   {(() => {
                     const row1Count = history.filter(h => typeof h === 'number' && h > 0 && h % 3 === 1).length; // 1,4,7,10,13,16,19,22,25,28,31,34
                     const row2Count = history.filter(h => typeof h === 'number' && h > 0 && h % 3 === 2).length; // 2,5,8,11,14,17,20,23,26,29,32,35
                     const row3Count = history.filter(h => typeof h === 'number' && h > 0 && h % 3 === 0).length; // 3,6,9,12,15,18,21,24,27,30,33,36
                     const zeroCount = history.filter(h => h === 0 || h === '00').length;
                     const rowTotal = row1Count + row2Count + row3Count + zeroCount;
                     
                     return (
                       <>
                         <Box display="flex" justifyContent="space-between" mb={1}>
                           <Typography variant="body2" color="white">Нижняя строка</Typography>
                           <Typography variant="body2" color="white">
                             {row1Count} ({rowTotal > 0 ? ((row1Count / rowTotal) * 100).toFixed(1) : '0.0'}%)
                           </Typography>
                         </Box>
                         <Box display="flex" justifyContent="space-between" mb={1}>
                           <Typography variant="body2" color="white">Средняя строка</Typography>
                           <Typography variant="body2" color="white">
                             {row2Count} ({rowTotal > 0 ? ((row2Count / rowTotal) * 100).toFixed(1) : '0.0'}%)
                           </Typography>
                         </Box>
                         <Box display="flex" justifyContent="space-between" mb={1}>
                           <Typography variant="body2" color="white">Верхняя строка</Typography>
                           <Typography variant="body2" color="white">
                             {row3Count} ({rowTotal > 0 ? ((row3Count / rowTotal) * 100).toFixed(1) : '0.0'}%)
                           </Typography>
                         </Box>
                         <Box display="flex" justifyContent="space-between" mb={1}>
                           <Typography variant="body2" color="white">0/00</Typography>
                           <Typography variant="body2" color="white">
                             {zeroCount} ({rowTotal > 0 ? ((zeroCount / rowTotal) * 100).toFixed(1) : '0.0'}%)
                           </Typography>
                         </Box>
                       </>
                     );
                   })()}
                 </Box>

                 <Box mb={3}>
                   <Typography variant="subtitle2" color="white" mb={2}>
                     Четные/Нечетные и диапазоны:
                   </Typography>
                   {(() => {
                     const evenCount = history.filter(h => GROUPS['EVEN'].includes(h as number)).length;
                     const oddCount = history.filter(h => GROUPS['ODD'].includes(h as number)).length;
                     const lowCount = history.filter(h => GROUPS['1-18'].includes(h as number)).length;
                     const highCount = history.filter(h => GROUPS['19-36'].includes(h as number)).length;
                     const zeroCount = history.filter(h => h === 0 || h === '00').length;
                     const evenOddTotal = evenCount + oddCount + zeroCount;
                     const lowHighTotal = lowCount + highCount + zeroCount;
                     
                     return (
                       <>
                         <Box display="flex" justifyContent="space-between" mb={1}>
                           <Typography variant="body2" color="white">Четные</Typography>
                           <Typography variant="body2" color="white">
                             {evenCount} ({evenOddTotal > 0 ? ((evenCount / evenOddTotal) * 100).toFixed(1) : '0.0'}%)
                           </Typography>
                         </Box>
                         <Box display="flex" justifyContent="space-between" mb={1}>
                           <Typography variant="body2" color="white">Нечетные</Typography>
                           <Typography variant="body2" color="white">
                             {oddCount} ({evenOddTotal > 0 ? ((oddCount / evenOddTotal) * 100).toFixed(1) : '0.0'}%)
                           </Typography>
                         </Box>
                         <Box display="flex" justifyContent="space-between" mb={1}>
                           <Typography variant="body2" color="white">1-18</Typography>
                           <Typography variant="body2" color="white">
                             {lowCount} ({lowHighTotal > 0 ? ((lowCount / lowHighTotal) * 100).toFixed(1) : '0.0'}%)
                           </Typography>
                         </Box>
                         <Box display="flex" justifyContent="space-between" mb={1}>
                           <Typography variant="body2" color="white">19-36</Typography>
                           <Typography variant="body2" color="white">
                             {highCount} ({lowHighTotal > 0 ? ((highCount / lowHighTotal) * 100).toFixed(1) : '0.0'}%)
                           </Typography>
                         </Box>
                         <Box display="flex" justifyContent="space-between" mb={1}>
                           <Typography variant="body2" color="white">0/00</Typography>
                           <Typography variant="body2" color="white">
                             {zeroCount} ({evenOddTotal > 0 ? ((zeroCount / evenOddTotal) * 100).toFixed(1) : '0.0'}%)
                           </Typography>
                         </Box>
                       </>
                     );
                   })()}
                 </Box>
               </Box>
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

  // Компонент панели настроек
  const renderSettingsPanel = () => (
    <Box 
      sx={{
        position: 'fixed',
        top: 0,
        right: showSettings ? 0 : '-400px',
        width: '300px',
        height: '100vh',
        backgroundColor: '#1a1a1a',
        borderLeft: '1px solid #333',
        padding: 3,
        transition: 'right 0.3s ease',
        zIndex: 1000,
        overflowY: 'auto',
      }}
    >
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6" color="white">Настройки</Typography>
        <Button 
          onClick={() => setShowSettings(false)}
          sx={{ color: 'white', minWidth: 'auto', p: 1 }}
        >
          ✕
        </Button>
      </Box>

      <Box mb={3}>
        <Typography variant="subtitle1" color="white" mb={2}>
          История ставок
        </Typography>
        
        <Box mb={2}>
          <Typography variant="body2" color="#ccc" mb={1}>
            Количество строк: {historyRows}
          </Typography>
        <TextField
            type="number"
            value={historyRows}
            onChange={(e) => {
              const value = Math.max(1, Math.min(10, parseInt(e.target.value) || 1));
              updateHistoryRows(value);
            }}
            inputProps={{ min: 1, max: 10 }}
            size="small"
            sx={{
              '& .MuiOutlinedInput-root': {
                color: 'white',
                '& fieldset': { borderColor: '#555' },
                '&:hover fieldset': { borderColor: '#777' },
                '&.Mui-focused fieldset': { borderColor: '#1976d2' },
              },
              '& .MuiInputLabel-root': { color: '#ccc' },
            }}
          />
        </Box>

        <Box mb={2}>
          <Button
            variant="outlined"
            size="small"
            onClick={() => setShowFullHistory(!showFullHistory)}
            sx={{ 
              color: 'white', 
              borderColor: '#555',
              '&:hover': { borderColor: '#777' },
              mb: 1,
              width: '100%'
            }}
          >
            {showFullHistory ? 'Скрыть старую историю' : 'Показать всю историю'}
        </Button>
        </Box>

        <Typography variant="caption" color="#999" mb={2} display="block">
          Элементов на строку: {itemsPerRow}<br/>
          Показывается: {Math.min(maxVisibleItems, history.length)} из {history.length}
        </Typography>
      </Box>

      <Box mb={3}>
        <Typography variant="subtitle1" color="white" mb={2}>
          Действия
        </Typography>
        
        <Box display="flex" flexDirection="column" gap={1}>
          <Button
            variant="outlined"
            onClick={() => {
              setShowStats(true);
              setShowSettings(false);
            }}
            sx={{ 
              color: 'white', 
              borderColor: '#673ab7',
              '&:hover': { borderColor: '#9c27b0' }
            }}
          >
            📊 Статистика
          </Button>
          
          <Button
            variant="outlined"
            onClick={handleShare}
            sx={{ 
              color: 'white', 
              borderColor: '#555',
              '&:hover': { borderColor: '#777' }
            }}
          >
            Поделиться
          </Button>
          
          <Button
            variant="outlined"
            color="error"
            onClick={resetAll}
            sx={{ 
              borderColor: '#d32f2f',
              '&:hover': { borderColor: '#f44336' }
            }}
          >
          Сбросить всё
        </Button>
      </Box>
      </Box>
    </Box>
  );

  if (key && !isConnected) {
    return (
      <Box p={4} display="flex" flexDirection="column" alignItems="center" justifyContent="center" minHeight="60vh">
        <CircularProgress />
        <Typography mt={2}>Загрузка истории с сервера...</Typography>
      </Box>
    );
  }

  return (
    <>
      {/* Overlay для закрытия панели настроек при клике вне её */}
      {showSettings && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 999,
          }}
          onClick={() => setShowSettings(false)}
        />
      )}
      
      {/* Overlay для закрытия панели статистики при клике вне её */}
      {showStats && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 999,
          }}
          onClick={() => setShowStats(false)}
        />
      )}
      
      {renderStatsPanel()}
      {renderSettingsPanel()}
      {renderDetailedStatsModal()}
      <Box p={4}>
      <Typography variant="h6" mt={2} mb={1} display="flex" alignItems="center" gap={1}>
        История выпадений:
      </Typography>
      {renderHistoryWithRepeats()}
      <Typography variant="h6" mt={4} mb={2}>Статистика по ставкам (визуальное расположение):</Typography>
      <Box display="flex" justifyContent="center" alignItems="flex-start">
        {/* Вертикальный столбик 0 и 00 */}
        <Box display="flex" flexDirection="column" alignItems="center">
          {renderCell('00')}
          {renderCell(0)}
        </Box>
        {/* Основное поле 3x12 + 2 to 1 */}
        <Box display="flex" flexDirection="row">
          <Box>
            {[0, 1, 2].map((rowIdx) => (
              <Box key={rowIdx} display="flex" flexDirection="row" >
                {Array.from({ length: 12 }, (_, i) => {
                  const num = 3 * (i + 1) - rowIdx;
                  return renderCell(num);
                })}
              </Box>
            ))}
          </Box>
          {/* Кнопки 2 to 1 */}
          <Box display="flex" flexDirection="column" justifyContent="space-between" ml={1} gap={1}>
            {[0, 1, 2].map((rowIdx) => {
              // Числа ряда для подсветки
              const rowNums = Array.from({ length: 12 }, (_, i) => 3 * (i + 1) - rowIdx);
              // Считаем возраст группы (последнее выпадение любого числа из ряда)
              let groupAge = history.length;
              for (let i = history.length - 1; i >= 0; i--) {
                if (rowNums.includes(history[i] as number)) {
                  groupAge = history.length - 1 - i;
                  break;
                }
              }
              const lightness = Math.max(30, 90 - groupAge * 3);
              const bg = `hsl(40, 100%, ${lightness}%)`;
              return (
                <Tooltip key={rowIdx} title={`2 to 1 — не выпадало: ${groupAge} ставок`} arrow>
                  <Button
                    sx={{
                      background: bg,
                      color: getContrastText(bg),
                      writingMode: 'vertical-rl',
                      border: activeLabel === `2to1-${rowIdx}` ? '2px solid #f1c40f' : undefined,
                      transition: 'background 0.3s',
                      minHeight: '80px',
                      minWidth: '32px',
                      fontWeight: 'bold',
                    }}
                    variant={activeLabel === `2to1-${rowIdx}` ? 'contained' : 'outlined'}
                    size="small"
                    onClick={() => {
                      if (activeLabel === `2to1-${rowIdx}`) {
                        setActiveLabel('');
                        setActiveGroup([]);
                      } else {
                        setActiveLabel(`2to1-${rowIdx}`);
                        setActiveGroup(rowNums);
                      }
                    }}
                  >
                    2 to 1
                  </Button>
                </Tooltip>
              );
            })}
          </Box>
        </Box>
      </Box>
      {/* Секции ставок под полем */}
      <Box display="flex" flexDirection="column" alignItems="center" gap={1}>
        <Box display="flex" gap={1}>
          {[
            { label: '1-18', group: GROUPS['1-18'] },
            { label: 'EVEN', group: GROUPS['EVEN'] },
            { label: 'RED', group: GROUPS['RED'] },
            { label: 'BLACK', group: GROUPS['BLACK'] },
            { label: 'ODD', group: GROUPS['ODD'] },
            { label: '19-36', group: GROUPS['19-36'] },
          ].map(({ label, group }) => {
            let groupAge = history.length;
            for (let i = history.length - 1; i >= 0; i--) {
              if (group.includes(history[i] as number)) {
                groupAge = history.length - 1 - i;
                break;
              }
            }
            const lightness = Math.max(30, 90 - groupAge * 3);
            const bg = `hsl(40, 100%, ${lightness}%)`;
            return (
              <Tooltip key={label} title={`${label} — не выпадало: ${groupAge} ставок`} arrow>
                <Button
                  size="small"
                  variant={activeLabel === label ? 'contained' : 'outlined'}
                  onClick={() => {
                    if (activeLabel === label) {
                      setActiveLabel('');
                      setActiveGroup([]);
                    } else {
                      setActiveLabel(label);
                      setActiveGroup(group);
                    }
                  }}
                  sx={{
                    background: bg,
                    color: getContrastText(bg),
                    border: activeLabel === label ? '2px solid #f1c40f' : undefined,
                    transition: 'background 0.3s',
                  }}
                >
                  {label}
                </Button>
              </Tooltip>
            );
          })}
        </Box>
        <Box display="flex" gap={1} mt={1}>
          {[
            { label: '1st 12', group: GROUPS['1st 12'] },
            { label: '2nd 12', group: GROUPS['2nd 12'] },
            { label: '3rd 12', group: GROUPS['3rd 12'] },
          ].map(({ label, group }) => {
            let groupAge = history.length;
            for (let i = history.length - 1; i >= 0; i--) {
              if (group.includes(history[i] as number)) {
                groupAge = history.length - 1 - i;
                break;
              }
            }
            const lightness = Math.max(30, 90 - groupAge * 3);
            const bg = `hsl(40, 100%, ${lightness}%)`;
            return (
              <Tooltip key={label} title={`${label} — не выпадало: ${groupAge} ставок`} arrow>
                <Button
                  size="small"
                  variant={activeLabel === label ? 'contained' : 'outlined'}
                  onClick={() => {
                    if (activeLabel === label) {
                      setActiveLabel('');
                      setActiveGroup([]);
                    } else {
                      setActiveLabel(label);
                      setActiveGroup(group);
                    }
                  }}
                  sx={{
                    background: bg,
                    color: getContrastText(bg),
                    border: activeLabel === label ? '2px solid #f1c40f' : undefined,
                    transition: 'background 0.3s',
                  }}
                >
                  {label}
                </Button>
              </Tooltip>
            );
          })}
        </Box>
        {/* Самые старые числа */}
        <Box mt={2} mb={2}>
          {(() => {
            const nums: number[] = Array.from({ length: 37 }, (_, i) => i);
            const allNums: (number | '00')[] = [...nums, '00'];
            const ages = allNums.map((n) => ({ n, age: ageMap[String(n)] ?? 0 }));
            ages.sort((a, b) => b.age - a.age);
            const top = ages.slice(0, 3);
            return (
              <Box>
                <Typography variant="subtitle1" mb={1} fontWeight={700} color="#fff">Самые старые числа:</Typography>
                <Box display="flex" gap={1} alignItems="center">
                  {top.map(({ n, age }) => (
                    <Box key={n} sx={{
                      px: 1.5, py: 0.5, borderRadius: 1, background: '#14532d', color: '#fff', fontWeight: 'bold', fontSize: 18, border: '2px dashed #ff5858'
                    }}>{n}
                      <Typography variant="caption" color="#fff" ml={1}>({age})</Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            );
          })()}
        </Box>
        {/* Повторяющееся число */}
        {history.length >= 2 && history[history.length - 1] === history[history.length - 2] && (
          <Box mt={2} mb={2}>
            <Typography variant="subtitle1" fontWeight={700} color="#fff">Повтор подряд:</Typography>
            <Box sx={{ px: 2, py: 1, borderRadius: 1, background: '#14532d', color: '#fff', fontWeight: 'bold', fontSize: 20, border: '2px solid #ffe066', display: 'inline-block' }}>
              {history[history.length - 1]}
            </Box>
          </Box>
        )}
        {/* История повторов */}
        {(() => {
          const repeats: { value: number | '00'; start: number; length: number }[] = [];
          let i = 0;
          while (i < history.length - 1) {
            let j = i;
            while (j + 1 < history.length && history[j] === history[j + 1]) {
              j++;
            }
            if (j > i) {
              repeats.push({ value: history[i], start: i + 1, length: j - i + 1 });
              i = j + 1;
            } else {
              i++;
            }
          }
          if (repeats.length === 0) return null;
          return (
            <Box mt={2} mb={2}>
              <Typography variant="subtitle1" fontWeight={700} color="#fff">История повторов:</Typography>
              <Box display="flex" flexDirection="column" gap={1}>
                {repeats.slice().reverse().map((r, idx) => (
                  <Box key={idx} sx={{ px: 2, py: 1, borderRadius: 1, background: '#14532d', color: '#fff', fontWeight: 'bold', fontSize: 16, border: '2px solid #ffe066', display: 'inline-block' }}>
                    {r.value} — {r.length} раза подряд (начиная с {r.start}-й ставки)
                  </Box>
                ))}
              </Box>
            </Box>
          );
        })()}
      </Box>
    </Box>
    
    {/* Кнопки в нижнем левом углу */}
    <Box sx={{ position: 'fixed', bottom: 20, left: 20, display: 'flex', flexDirection: 'column', gap: 1, zIndex: 999 }}>
      <Button
        onClick={() => setShowStats(!showStats)}
        sx={{
          minWidth: 'auto',
          width: 56,
          height: 56,
          borderRadius: '50%',
          backgroundColor: showStats ? '#9c27b0' : '#673ab7',
          color: 'white',
          fontSize: '24px',
          '&:hover': {
            backgroundColor: '#9c27b0',
          },
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        }}
      >
        📊
      </Button>
      
      <Button
        onClick={() => setShowSettings(!showSettings)}
        sx={{
          minWidth: 'auto',
          width: 56,
          height: 56,
          borderRadius: '50%',
          backgroundColor: showSettings ? '#1565c0' : '#1976d2',
          color: 'white',
          fontSize: '24px',
          '&:hover': {
            backgroundColor: '#1565c0',
          },
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        }}
      >
        ⚙️
      </Button>
    </Box>
    </>
  );
}

export default function RouletteTrackerPage() {
  return (
    <Suspense fallback={
      <Box p={4} display="flex" flexDirection="column" alignItems="center" justifyContent="center" minHeight="60vh">
        <CircularProgress />
        <Typography mt={2}>Загрузка...</Typography>
      </Box>
    }>
      <RouletteTrackerPageContent />
    </Suspense>
  );
}
