'use client';

import React, { useEffect, useState, useMemo, useCallback, Suspense } from 'react';
import { Box, Typography } from '@mui/material';
import CircularProgress from '@mui/material/CircularProgress';
import { useRouletteWebSocket } from '@/components/casino/hooks/useRouletteHistory';
import { useConnectionNotifications } from '@/components/casino/hooks/useConnectionNotifications';
import { useSnackbar } from 'notistack';
import { useSearchParams, useRouter, useParams } from 'next/navigation';
import { useRouletteSettings } from '@/components/casino/hooks/useRouletteSettings';
import { calculateAgeMap } from '@/components/casino/utils/rouletteUtils';
import { RouletteBoard } from '@/components/casino/components/rouletteBoard/RouletteBoard';
import { HistoryPanel } from '@/components/casino/components/HistoryPanel';
import { StatsPanel } from '@/components/casino/components/statsPanel/StatsPanel';
import { SettingsPanel } from '@/components/casino/components/SettingsPanel';
import { DetailedStatsModal } from '@/components/casino/components/DetailedStatsModal';
import { GameInfo } from '@/components/casino/components/GameInfo';
import { FloatingButtons } from '@/components/casino/components/FloatingButtons';
import { ForecastPanel } from '@/components/casino/components/ForecastPanel';
import { ConnectionStatus } from '@/components/casino/components/ConnectionStatus';
import { PasswordEntryForm } from '@/components/casino/components/PasswordEntryForm';
import { CreateRoomDialog } from '@/components/casino/components/CreateRoomDialog';
import type { SortBy, RouletteNumber } from '@/components/casino/types/rouletteTypes';

const RoomPageContent: React.FC = () => {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { enqueueSnackbar } = useSnackbar();
  const key = params?.id as string | undefined;

  const [sessionToken, setSessionToken] = useState<string | undefined>(() => {
    if (typeof window !== 'undefined') {
      const token = window.sessionStorage.getItem(`token_${key}`);
      return token || undefined;
    }
    return undefined;
  });

  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [showCreateRoomDialog, setShowCreateRoomDialog] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const {
    history,
    setHistory,
    isConnected,
    isReconnecting,
    reconnectAttempts,
    needsAuth,
    authError,
    forceReconnect,
  } = useRouletteWebSocket(key, sessionToken);

  useConnectionNotifications({
    isConnected,
    isReconnecting,
    reconnectAttempts
  });

  useEffect(() => {
    if (needsAuth && !showPasswordDialog) {
      setShowPasswordDialog(true);
    }
  }, [needsAuth, showPasswordDialog]);

  const [activeLabel, setActiveLabel] = useState('');
  const [activeGroup, setActiveGroup] = useState<number[]>([]);
  const [showFullHistory, setShowFullHistory] = useState(false);
  const [windowWidth, setWindowWidth] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showDetailedStats, setShowDetailedStats] = useState(false);
  const [sortBy, setSortBy] = useState<SortBy>('number');

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
  const effectiveWidth = shouldShowSidebar ? windowWidth - 350 : windowWidth;
  const { historyRows, itemsPerRow, maxVisibleItems, updateHistoryRows } = useRouletteSettings(effectiveWidth);
  const ageMap = useMemo(() => calculateAgeMap(history), [history]);

  const resetAll = useCallback(() => {
    setHistory([]);
  }, [setHistory]);

  const deleteLast = useCallback(() => {
    setHistory(prev => prev.slice(0, -1));
  }, [setHistory]);

  const handleShare = useCallback(async () => {
    const shareUrl = `${window.location.origin}/room/${key}`;
    await navigator.clipboard.writeText(shareUrl);
    enqueueSnackbar('Ссылка скопирована! Можно делиться.', { variant: 'success' });
  }, [key, enqueueSnackbar]);

  const handleSetHistory = useCallback((newHistory: React.SetStateAction<RouletteNumber[]>) => {
    setHistory(newHistory);
  }, [setHistory]);

  const handleSetActiveLabel = useCallback((label: string) => {
    setActiveLabel(label);
  }, []);

  const handleSetActiveGroup = useCallback((group: number[]) => {
    setActiveGroup(group);
  }, []);

  const authenticate = async (password?: string) => {
    if (!key) return;
    try {
      const res = await fetch('http://localhost:8080/api/rooms/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, password: password || '' }),
      });

      if (!res.ok) {
        throw new Error((await res.json()).error || 'Ошибка аутентификации');
      }

      const { token } = await res.json();
      if (typeof window !== 'undefined') {
        window.sessionStorage.setItem(`token_${key}`, token);
      }
      setSessionToken(token);
      setShowPasswordDialog(false);
      forceReconnect();
      return true;
    } catch (error: any) {
      enqueueSnackbar(error.message, { variant: 'error' });
      return false;
    }
  };

  const handlePasswordSubmit = (password: string) => {
    authenticate(password);
  };

  const handlePasswordCancel = useCallback(() => {
    setShowPasswordDialog(false);
    // Просто переходим на новую комнату, без манипуляций с URL
    router.replace(`/room/${Math.random().toString(36).substring(2, 15)}`);
  }, [router]);

  const handleCreateRoom = useCallback(() => {
    setShowCreateRoomDialog(true);
  }, []);

  const handleCreateRoomSubmit = async (roomKey: string, password?: string) => {
    setIsAuthenticating(true);
    try {
      const res = await fetch('http://localhost:8080/api/rooms/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: roomKey, password: password || '' }),
      });

      if (!res.ok) {
        throw new Error((await res.json()).error || 'Не удалось создать комнату');
      }
      
      const { token } = await res.json();
      if (typeof window !== 'undefined') {
        window.sessionStorage.setItem(`token_${roomKey}`, token);
      }

      setShowCreateRoomDialog(false);
      router.push(`/room/${roomKey}`);

    } catch (error: any) {
      enqueueSnackbar(error.message, { variant: 'error' });
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleCreateRoomCancel = useCallback(() => {
    setShowCreateRoomDialog(false);
  }, []);

  if (!isConnected && !needsAuth) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (needsAuth) {
    return (
      <PasswordEntryForm
        roomKey={key!}
        onSubmit={handlePasswordSubmit}
        error={authError}
        isSubmitting={isAuthenticating}
      />
    );
  }

  if (!key) return null;

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
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
      <Box sx={{ flex: 1 }}>
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
          onDeleteLast={deleteLast}
        />
        <DetailedStatsModal
          open={showDetailedStats}
          onClose={() => setShowDetailedStats(false)}
          history={history}
          sortBy={sortBy}
          setSortBy={setSortBy}
        />
        <ConnectionStatus
          isConnected={isConnected}
          isReconnecting={isReconnecting}
          reconnectAttempts={reconnectAttempts}
          onReconnect={forceReconnect}
        />
        <Box p={4}>
          <HistoryPanel
            history={history}
            setHistory={setHistory}
            showFullHistory={showFullHistory}
            maxVisibleItems={maxVisibleItems}
          />
          <Box position="relative" display="flex" justifyContent="center" alignItems="flex-start">
            <Box display="flex" flexDirection="column" alignItems="center">
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
            </Box>
            <Box
              position="absolute"
              right={0}
              top={0}
              width="300px"
              sx={{
                '@media (max-width: 1200px)': {
                  display: 'none'
                }
              }}
            >
              <ForecastPanel history={history} maxPredictions={8} />
            </Box>
          </Box>
          <Box
            sx={{
              display: 'none',
              '@media (max-width: 1200px)': {
                display: 'block',
                mt: 4
              }
            }}
          >
            <ForecastPanel history={history} maxPredictions={8} />
          </Box>
        </Box>
        <FloatingButtons
          showStats={showStats}
          setShowStats={setShowStats}
          showSettings={showSettings}
          setShowSettings={setShowSettings}
          onDeleteLast={deleteLast}
          hasHistory={history.length > 0}
          onCreateRoom={handleCreateRoom}
        />
        <CreateRoomDialog
          open={showCreateRoomDialog}
          onSubmit={handleCreateRoomSubmit}
          onCancel={handleCreateRoomCancel}
        />
      </Box>
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