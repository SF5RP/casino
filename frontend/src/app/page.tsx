'use client';

import React, { useEffect, useState, useMemo, useCallback, Suspense } from 'react';
import { Box, Typography } from '@mui/material';
import CircularProgress from '@mui/material/CircularProgress';
import { useRouletteWebSocket } from '../components/casino/hooks/useRouletteHistory';
import { useSnackbar } from 'notistack';
import { useSearchParams, useRouter } from 'next/navigation';
import { useRouletteSettings } from '../components/casino/hooks/useRouletteSettings';
import { calculateAgeMap } from '../components/casino/utils/rouletteUtils';
import { RouletteBoard } from '../components/casino/components/rouletteBoard/RouletteBoard';
import { HistoryPanel } from '../components/casino/components/HistoryPanel';
import { StatsPanel } from '../components/casino/components/statsPanel/StatsPanel';
import { SettingsPanel } from '../components/casino/components/SettingsPanel';
import { DetailedStatsModal } from '../components/casino/components/DetailedStatsModal';
import { GameInfo } from '../components/casino/components/GameInfo';
import { FloatingButtons } from '../components/casino/components/FloatingButtons';
import { ForecastPanel } from '../components/casino/components/ForecastPanel';
import type { SortBy, RouletteNumber } from '../components/casino/types/rouletteTypes';

const RouletteTrackerPageContent: React.FC = () => {
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
  const [sortBy, setSortBy] = useState<SortBy>('number');

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

  // Определяем нужно ли показывать боковое меню
  const isWideScreen = windowWidth > 1700;
  const shouldShowSidebar = isWideScreen && showStats;
  
  // Вычисляем эффективную ширину контента
  const effectiveWidth = shouldShowSidebar ? windowWidth - 350 : windowWidth;

  // Используем кастомный хук для настроек
  const { historyRows, itemsPerRow, maxVisibleItems, updateHistoryRows } = useRouletteSettings(effectiveWidth);

  // Используем useMemo для вычисления ageMap
  const ageMap = useMemo(() => calculateAgeMap(history), [history]);

  useEffect(() => {
    if (!key) {
      const newKey = Math.random().toString(36).substring(2, 15);
      router.replace(`/?key=${newKey}`);
    }
  }, [key, router]);

  // Мемоизируем обработчики событий для оптимизации
  const resetAll = useCallback(() => {
    setHistory([]);
  }, [setHistory]);

  const handleShare = useCallback(async () => {
    const shareUrl = `${window.location.origin}/?key=${key}`;
    await navigator.clipboard.writeText(shareUrl);
    enqueueSnackbar('Ссылка скопирована! Можно делиться.', { variant: 'success' });
  }, [key, enqueueSnackbar]);

  // Мемоизируем колбэки для RouletteBoard
  const handleSetHistory = useCallback((newHistory: React.SetStateAction<RouletteNumber[]>) => {
    setHistory(newHistory);
  }, [setHistory]);

  const handleSetActiveLabel = useCallback((label: string) => {
    setActiveLabel(label);
  }, []);

  const handleSetActiveGroup = useCallback((group: number[]) => {
    setActiveGroup(group);
  }, []);

  // Только после всех хуков — return null, если ключа нет
  if (!key) return null;

  if (key && !isConnected) {
    return (
      <Box p={4} display="flex" flexDirection="column" alignItems="center" justifyContent="center" minHeight="60vh">
        <CircularProgress />
        <Typography mt={2}>Загрузка истории с сервера...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* Боковое меню статистики для широких экранов */}
      {shouldShowSidebar && (
        <Box
          sx={{
            width: 350,
            backgroundColor: '#1a1a1a',
            borderRight: '1px solid #333',
            position: 'fixed',
            left: 0,
            top: 0,
            height: '100vh',
            overflowY: 'auto',
            zIndex: 1000,
            p: 2,
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" color="white">
              Статистика
            </Typography>
            <Box
              onClick={() => setShowStats(false)}
              sx={{
                cursor: 'pointer',
                color: 'white',
                fontSize: '20px',
                '&:hover': { color: '#ccc' }
              }}
            >
              ×
            </Box>
          </Box>
          <StatsPanel
            showStats={true}
            setShowStats={setShowStats}
            setShowDetailedStats={setShowDetailedStats}
            history={history}
            isEmbedded={true}
          />
        </Box>
      )}

      {/* Основной контент */}
      <Box 
        sx={{ 
          flex: 1,
          marginLeft: shouldShowSidebar ? '350px' : 0,
          transition: 'margin-left 0.3s ease',
        }}
      >
        {/* Overlay для закрытия панели настроек при клике вне её */}
        {showSettings && (
          <Box
            sx={{
              position: 'fixed',
              top: 0,
              left: shouldShowSidebar ? 350 : 0,
              width: shouldShowSidebar ? 'calc(100vw - 350px)' : '100vw',
              height: '100vh',
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              zIndex: 999,
            }}
            onClick={() => setShowSettings(false)}
          />
        )}
        
        {/* Overlay для закрытия панели статистики при клике вне её (только для узких экранов) */}
        {showStats && !isWideScreen && (
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
        
        {/* Всплывающая панель статистики для узких экранов */}
        {!isWideScreen && (
          <StatsPanel
            showStats={showStats}
            setShowStats={setShowStats}
            setShowDetailedStats={setShowDetailedStats}
            history={history}
            isEmbedded={false}
          />
        )}
        
        <SettingsPanel
          showSettings={showSettings}
          setShowSettings={setShowSettings}
          setShowStats={setShowStats}
          historyRows={historyRows}
          updateHistoryRows={updateHistoryRows}
          itemsPerRow={itemsPerRow}
          maxVisibleItems={maxVisibleItems}
          historyLength={history.length}
          showFullHistory={showFullHistory}
          setShowFullHistory={setShowFullHistory}
          onShare={handleShare}
          onReset={resetAll}
        />
        
        <DetailedStatsModal
          open={showDetailedStats}
          onClose={() => setShowDetailedStats(false)}
          history={history}
          sortBy={sortBy}
          setSortBy={setSortBy}
        />
        
        <Box p={4}>
        <Typography variant="h6" mt={2} mb={1} display="flex" alignItems="center" gap={1}>
          История выпадений:
        </Typography>
        
        <HistoryPanel
          history={history}
          setHistory={setHistory}
          showFullHistory={showFullHistory}
          maxVisibleItems={maxVisibleItems}
        />
        
        <Typography variant="h6" mt={4} mb={2}>
          Статистика по ставкам (визуальное расположение):
        </Typography>
        
        <RouletteBoard
          ageMap={ageMap}
          activeLabel={activeLabel}
          activeGroup={activeGroup}
          history={history}
          setHistory={handleSetHistory}
          setActiveLabel={handleSetActiveLabel}
          setActiveGroup={handleSetActiveGroup}
        />
        
                <GameInfo history={history} ageMap={ageMap} />
        
        <Box mt={4}>
          <ForecastPanel history={history} maxPredictions={8} />
        </Box>
        </Box>
      
              <FloatingButtons
          showStats={showStats}
          setShowStats={setShowStats}
          showSettings={showSettings}
          setShowSettings={setShowSettings}
        />
        </Box>
      </Box>
    );
};

export default function Home() {
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
