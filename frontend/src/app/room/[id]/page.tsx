'use client';

import React, { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Typography } from '@mui/material';
import CircularProgress from '@mui/material/CircularProgress';
import { useRouletteWebSocket } from '@/components/casino/hooks/useRouletteHistory';
import { useConnectionNotifications } from '@/components/casino/hooks/useConnectionNotifications';
import { useSnackbar } from 'notistack';
import { useParams, useRouter } from 'next/navigation';
import { useRouletteSettings } from '@/components/casino/hooks/useRouletteSettings';
import { calculateAgeMap, getContrastText, getNumberColor } from '@/components/casino/utils/rouletteUtils';
import { RouletteBoard } from '@/components/casino/components/rouletteBoard/RouletteBoard';
import { HistoryPanel } from '@/components/casino/components/HistoryPanel';
import { StatsPanel } from '@/components/casino/components/statsPanel/StatsPanel';
import { SettingsPanel } from '@/components/casino/components/SettingsPanel';
import { DetailedStatsModal } from '@/components/casino/components/DetailedStatsModal';
import { FloatingButtons } from '@/components/casino/components/FloatingButtons';
import { ForecastPanel } from '@/components/casino/components/ForecastPanel';
import { ConnectionStatus } from '@/components/casino/components/ConnectionStatus';
import { PasswordEntryForm } from '@/components/casino/components/PasswordEntryForm';
import { CreateRoomDialog } from '@/components/casino/components/CreateRoomDialog';
import type { RouletteNumber, SortBy } from '@/components/casino/types/rouletteTypes';
import { RouletteTrendsChart } from '@/components/casino/components/rouletteTrendsChart';
import { DraggableDashboard } from '@/components/casino/components/dashboard';
import { DistributionCharts } from '@/components/casino/components/DistributionCharts';

const RoomPageContent: React.FC = () => {
  const params = useParams();
  const router = useRouter();
  const { enqueueSnackbar } = useSnackbar();
  const key = params?.id as string | undefined;

  const [sessionToken, setSessionToken] = useState<string | undefined>(() => {
    if (typeof window !== 'undefined') {
      return window.localStorage.getItem(`token_${key}`) || undefined;
    }
    return undefined;
  });

  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [showCreateRoomDialog, setShowCreateRoomDialog] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const {
    history,
    addNumber,
    removeNumberAtIndex,
    isConnected,
    isReconnecting,
    reconnectAttempts,
    forceReconnect,
  } = useRouletteWebSocket(key, sessionToken);

  useConnectionNotifications({
    isConnected,
    isReconnecting,
    reconnectAttempts,
  });

  const [activeLabel, setActiveLabel] = useState('');
  const [activeGroup, setActiveGroup] = useState<number[]>([]);
  const [showFullHistory, setShowFullHistory] = useState(false);
  const [windowWidth, setWindowWidth] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showDetailedStats, setShowDetailedStats] = useState(false);
  const [sortBy, setSortBy] = useState<SortBy>('number');
  const [chartHistoryLength, setChartHistoryLength] = useState(30);
  const [isHistoryWide, setIsHistoryWide] = useState(false);
  const [hoveredNumber, setHoveredNumber] = useState<RouletteNumber | null>(null);
  const [lastHoveredNumber, setLastHoveredNumber] = useState<RouletteNumber | null>(null);
  const [isDashboardMode, setIsDashboardMode] = useState(false);
  const [isDashboardEditMode, setIsDashboardEditMode] = useState(false);

  const authenticate = useCallback(async (password?: string) => {
    if (!key) return;
    setIsAuthenticating(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api'}/rooms/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, password: password || '' }),
      });

      if (!res.ok) {
        if (res.status === 401) {
          setShowPasswordDialog(true);
          // Не показываем ошибку, просто ждем ввода пароля
          return false;
        }
        const errorData = await res.json();
        throw new Error(errorData.error || 'Ошибка аутентификации');
      }

      const { token } = await res.json();
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(`token_${key}`, token);
      }
      setSessionToken(token);
      setShowPasswordDialog(false);
      forceReconnect();
      return true;
    } catch (error: unknown) {
      enqueueSnackbar(error instanceof Error ? error.message : 'Неизвестная ошибка', { variant: 'error' });
      return false;
    } finally {
      setIsAuthenticating(false);
    }
  }, [key, enqueueSnackbar, forceReconnect]);

  useEffect(() => {
    if (!sessionToken && key) {
      authenticate();
    }
  }, [key, sessionToken, authenticate]);

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isWideScreen = windowWidth > 1700;
  const shouldShowSidebar = isWideScreen && showStats;
  const { historyRows, updateHistoryRows } = useRouletteSettings();
  const ageMap = useMemo(() => calculateAgeMap(history), [history]);

  const resetAll = useCallback(() => {
    if (window.confirm('Вы уверены, что хотите очистить всю историю?')) {
      for (let i = 0; i < history.length; i++) {
        setTimeout(() => removeNumberAtIndex(0), i * 50);
      }
    }
  }, [history.length, removeNumberAtIndex]);

  const deleteLast = useCallback(() => {
    if (history.length > 0) {
      removeNumberAtIndex(history.length - 1);
    }
  }, [history.length, removeNumberAtIndex]);

  const handleShare = useCallback(async () => {
    const shareUrl = `${window.location.origin}/room/${key}`;
    await navigator.clipboard.writeText(shareUrl);
    enqueueSnackbar('Ссылка скопирована! Можно делиться.', { variant: 'success' });
  }, [key, enqueueSnackbar]);

  const handleCellClick = useCallback((number: RouletteNumber) => {
    addNumber(number);
  }, [addNumber]);

  const handleSetHistory = useCallback(() => {
    // Эта функция теперь используется только для UI-взаимодействий, не для синхронизации
    // Например, для временной фильтрации, если бы она была
  }, []);

  const handleSetActiveLabel = useCallback((label: string) => {
    setActiveLabel(label);
  }, []);

  const handleSetActiveGroup = useCallback((group: number[]) => {
    setActiveGroup(group);
  }, []);

  const handleSetHoveredNumber = (num: RouletteNumber | null) => {
    setHoveredNumber(num);
    if (num !== null) setLastHoveredNumber(num);
  };

  const handlePasswordSubmit = (password: string) => {
    authenticate(password);
  };

  const handleCreateRoomSubmit = async (roomKey: string, password?: string) => {
    setIsAuthenticating(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api'}/rooms/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: roomKey, password: password || '' }),
      });

      if (!res.ok) {
        throw new Error((await res.json()).error || 'Не удалось создать комнату');
      }

      const { token } = await res.json();
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(`token_${roomKey}`, token);
      }

      setShowCreateRoomDialog(false);
      router.push(`/room/${roomKey}`);

    } catch (error: unknown) {
      enqueueSnackbar(error instanceof Error ? error.message : 'Неизвестная ошибка', { variant: 'error' });
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleCreateRoomCancel = useCallback(() => {
    setShowCreateRoomDialog(false);
  }, []);

  if (!isConnected && !showPasswordDialog) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (showPasswordDialog) {
    return (
      <PasswordEntryForm
        roomKey={key!}
        onSubmit={handlePasswordSubmit}
        isSubmitting={isAuthenticating}
      />
    );
  }

  if (!key) return null;

  if (isDashboardMode) {
    return (
      <Box sx={{ minHeight: '100vh', p: 2, bgcolor: '#0a0a0a' }}>
        <Box sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 2,
          p: 2,
          bgcolor: '#1a1a1a',
          borderRadius: 2,
        }}>
          <Typography variant="h4" color="white">
            Dashboard - Комната {key}
          </Typography>
          <Box>
            <Box
              onClick={() => setIsDashboardMode(false)}
              sx={{
                px: 2,
                py: 1,
                bgcolor: '#333',
                borderRadius: 1,
                cursor: 'pointer',
                color: 'white',
                '&:hover': { bgcolor: '#444' },
              }}
            >
              ← Обычный режим
            </Box>
          </Box>
        </Box>

        <DraggableDashboard
          history={history}
          ageMap={ageMap}
          chartHistoryLength={chartHistoryLength}
          onToggleSettings={() => setShowSettings(!showSettings)}
          isEditMode={isDashboardEditMode}
          onToggleEditMode={() => setIsDashboardEditMode(!isDashboardEditMode)}
          setHistory={handleSetHistory}
          activeLabel={activeLabel}
          activeGroup={activeGroup}
          setActiveLabel={handleSetActiveLabel}
          setActiveGroup={handleSetActiveGroup}
          setHoveredNumber={handleSetHoveredNumber}
          showFullHistory={showFullHistory}
          isHistoryWide={isHistoryWide}
          hoveredNumber={hoveredNumber}
          lastHoveredNumber={lastHoveredNumber}
          onCellClick={handleCellClick}
        />

        <ConnectionStatus
          isConnected={isConnected}
          isReconnecting={isReconnecting}
          reconnectAttempts={reconnectAttempts}
          onReconnect={forceReconnect}
        />

        <SettingsPanel
          showSettings={showSettings}
          setShowSettings={setShowSettings}
          setShowStats={setShowStats}
          historyRows={historyRows}
          updateHistoryRows={updateHistoryRows}
          historyLength={history.length}
          showFullHistory={showFullHistory}
          setShowFullHistory={setShowFullHistory}
          onShare={handleShare}
          onReset={resetAll}
          onDeleteLast={deleteLast}
          chartHistoryLength={chartHistoryLength}
          setChartHistoryLength={setChartHistoryLength}
          isHistoryWide={isHistoryWide}
          setIsHistoryWide={setIsHistoryWide}
        />
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {shouldShowSidebar && (
        <Box
          sx={{
            width: 350,
            backgroundColor: '#1a1a1a',
            borderRight: '1px solid #333',
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
              sx={{ cursor: 'pointer', color: 'white', fontSize: '20px', '&:hover': { color: '#ccc' } }}
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

      <Box sx={{
        flex: 1,
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        px: 2,
        py: 4,
        justifyContent: 'flex-start'
      }}>
        {!isWideScreen && (
          <StatsPanel
            showStats={showStats}
            setShowStats={setShowStats}
            setShowDetailedStats={setShowDetailedStats}
            history={history}
            isEmbedded={false}
          />
        )}

        <HistoryPanel
          history={history}
          showFullHistory={showFullHistory}
          historyRows={historyRows}
          setHoveredNumber={handleSetHoveredNumber}
        />

        <Box sx={{
          gridColumn: shouldShowSidebar ? '1 / 2' : '1 / 3',
        }}>
          <RouletteBoard
            history={history}
            ageMap={ageMap}
            activeLabel={activeLabel}
            activeGroup={activeGroup}
            onCellClick={handleCellClick}
            setActiveLabel={handleSetActiveLabel}
            setActiveGroup={handleSetActiveGroup}
            setHoveredNumber={handleSetHoveredNumber}
          />
        </Box>

        <Box minWidth={600}>
          <RouletteTrendsChart history={history as number[]} chartHistoryLength={chartHistoryLength} />
        </Box>

        <Box mt={2} mb={2} p={2} bgcolor="#181818" borderRadius={2} minHeight={48} width="100%" maxWidth={600}>
          {hoveredNumber === null && lastHoveredNumber === null ? (
            <Typography color="#888" fontSize={14}>Наведи на число в истории или на столе</Typography>
          ) : (
            (() => {
              const num = hoveredNumber ?? lastHoveredNumber;
              const numStr = String(num);
              const occurrences = history.filter(h => String(h) === numStr).length;
              const lastIndex = [...history].reverse().findIndex(h => String(h) === numStr);
              const percentage = history.length > 0 ? ((occurrences / history.length) * 100) : 0;
              let avgInterval = '';
              if (occurrences > 1) {
                const indexes = history.reduce((arr, h, idx) => (String(h) === numStr ? [...arr, idx] : arr), [] as number[]);
                const intervals = indexes.slice(1).map((v, i) => v - indexes[i]);
                avgInterval = (intervals.reduce((a, b) => a + b, 0) / intervals.length).toFixed(1);
              }
              let maxStreak = 0, curStreak = 0;
              for (let i = 0; i < history.length; i++) {
                if (String(history[i]) === numStr) {
                  curStreak++;
                  if (curStreak > maxStreak) maxStreak = curStreak;
                } else {
                  curStreak = 0;
                }
              }
              const sinceLast = lastIndex === -1 ? '' : `${lastIndex}`;
              return (
                <Box display="flex" alignItems="center" gap={2}>
                  <Box sx={{
                    width: 32,
                    height: 32,
                    borderRadius: 1,
                    background: getNumberColor(num!),
                    color: getContrastText(getNumberColor(num!)),
                    fontWeight: 'bold',
                    fontSize: 18,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>{num}</Box>
                  <Box fontSize={14} color="#eee">
                    <div>Выпадений: <b>{occurrences}</b></div>
                    <div>Процент: <b>{percentage.toFixed(1)}%</b></div>
                    <div>Средний интервал: <b>{avgInterval || '-'}</b></div>
                    <div>Макс. серия: <b>{maxStreak}</b></div>
                    <div>С последнего: <b>{sinceLast}</b></div>
                  </Box>
                </Box>
              );
            })()
          )}
        </Box>
      </Box>

      <Box
        sx={{
          width: 300,
          minWidth: 0,
          display: { xs: 'none', md: 'block' },
          backgroundColor: 'transparent',
          pl: 2,
          pt: 4,
        }}
      >
        <ForecastPanel history={history} />
        <Box mt={2}>
          <DistributionCharts history={history} />
        </Box>
        <Box mt={2} p={1} bgcolor="#181818" borderRadius={2}>
          <Box display="flex" fontSize={12} color="#aaa" fontWeight={500} mb={0.5}>
            <Box width={28}>№</Box>
            <Box width={18}></Box>
            <Box width={32} textAlign="right">Кол-во</Box>
            <Box width={36} textAlign="right">%</Box>
            <Box width={36} textAlign="right">Интервал</Box>
            <Box width={36} textAlign="right">Макс.серия</Box>
            <Box flex={1} textAlign="right">С послед.</Box>
          </Box>
          {[0, ...Array.from({ length: 36 }, (_, i) => i + 1)].map(num => {
            const numStr = String(num);
            const occurrences = history.filter(h => String(h) === numStr).length;
            const lastIndex = [...history].reverse().findIndex(h => String(h) === numStr);
            const percentage = history.length > 0 ? ((occurrences / history.length) * 100) : 0;
            const color = getNumberColor(num);
            let avgInterval = '';
            if (occurrences > 1) {
              const indexes = history.reduce((arr, h, idx) => (String(h) === numStr ? [...arr, idx] : arr), [] as number[]);
              const intervals = indexes.slice(1).map((v, i) => v - indexes[i]);
              avgInterval = (intervals.reduce((a, b) => a + b, 0) / intervals.length).toFixed(1);
            }
            let maxStreak = 0, curStreak = 0;
            for (let i = 0; i < history.length; i++) {
              if (String(history[i]) === numStr) {
                curStreak++;
                if (curStreak > maxStreak) maxStreak = curStreak;
              } else {
                curStreak = 0;
              }
            }
            const sinceLast = lastIndex === -1 ? '' : `${lastIndex}`;
            return (
              <Box key={num} display="flex" alignItems="center" fontSize={12} color="#eee" py={0.2}>
                <Box width={28}>{num}</Box>
                <Box width={18} display="flex" alignItems="center" justifyContent="center">
                  <Box
                    sx={{ width: 10, height: 10, borderRadius: '50%', background: color, border: '1px solid #333' }} />
                </Box>
                <Box width={32} textAlign="right">{occurrences}</Box>
                <Box width={36} textAlign="right">{percentage.toFixed(1)}</Box>
                <Box width={36} textAlign="right">{avgInterval}</Box>
                <Box width={36} textAlign="right">{maxStreak}</Box>
                <Box flex={1} textAlign="right" color="#888">{sinceLast}</Box>
              </Box>
            );
          })}
        </Box>
      </Box>

      <ConnectionStatus
        isConnected={isConnected}
        isReconnecting={isReconnecting}
        reconnectAttempts={reconnectAttempts}
        onReconnect={forceReconnect}
      />

      <FloatingButtons
        showStats={showStats}
        setShowStats={setShowStats}
        showSettings={showSettings}
        setShowSettings={setShowSettings}
        onDeleteLast={deleteLast}
        hasHistory={history.length > 0}
        onToggleDashboard={() => setIsDashboardMode(!isDashboardMode)}
        isDashboardMode={isDashboardMode}
      />

      <CreateRoomDialog
        open={showCreateRoomDialog}
        onSubmit={handleCreateRoomSubmit}
        onCancel={handleCreateRoomCancel}
      />

      <SettingsPanel
        showSettings={showSettings}
        setShowSettings={setShowSettings}
        setShowStats={setShowStats}
        historyRows={historyRows}
        updateHistoryRows={updateHistoryRows}
        historyLength={history.length}
        showFullHistory={showFullHistory}
        setShowFullHistory={setShowFullHistory}
        onShare={handleShare}
        onReset={resetAll}
        onDeleteLast={deleteLast}
        chartHistoryLength={chartHistoryLength}
        setChartHistoryLength={setChartHistoryLength}
        isHistoryWide={isHistoryWide}
        setIsHistoryWide={setIsHistoryWide}
      />

      <DetailedStatsModal
        open={showDetailedStats}
        onClose={() => setShowDetailedStats(false)}
        history={history}
        sortBy={sortBy}
        setSortBy={setSortBy}
      />
    </Box>
  );
};

export default function RoomPage() {
  return (
    <Suspense fallback={
      <Box p={4} display="flex" flexDirection="column" alignItems="center" justifyContent="center" minHeight="60vh">
        <CircularProgress />
        <Typography mt={2}>Загрузка...</Typography>
      </Box>
    }>
      <RoomPageContent />
    </Suspense>
  );
} 