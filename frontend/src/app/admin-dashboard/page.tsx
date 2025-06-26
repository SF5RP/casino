'use client';

import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography
} from '@mui/material';

interface Connection {
  id: string;
  key: string;
  connectedAt: string;
  lastActivity: string;
  status: 'connected' | 'disconnected' | 'reconnecting';
  ipAddress?: string;
  userAgent?: string;
}

interface Session {
  key: string;
  password?: string;
  createdAt: string;
  lastActivity: string;
  historyLength: number;
  activeConnections: number;
  totalConnections: number;
  connections: Connection[];
}

interface AdminStats {
  totalSessions: number;
  activeSessions: number;
  totalConnections: number;
  activeConnections: number;
  averageHistoryLength: number;
}

function AdminDashboardPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [stats, setStats] = useState<AdminStats>({
    totalSessions: 0,
    activeSessions: 0,
    totalConnections: 0,
    activeConnections: 0,
    averageHistoryLength: 0
  });
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [viewHistoryDialog, setViewHistoryDialog] = useState(false);
  const [sessionHistory, setSessionHistory] = useState<number[]>([]);

  const fetchSessions = async () => {
    try {
      setLoading(true);

      // Получаем данные с реального API
      const response = await fetch('http://localhost:8080/api/admin/sessions');
      if (!response.ok) {
        throw new Error('Failed to fetch sessions');
      }

      const sessions = await response.json();
      setSessions(sessions);

      // Получаем статистику
      const statsResponse = await fetch('http://localhost:8080/api/admin/stats');
      if (statsResponse.ok) {
        const stats = await statsResponse.json();
        setStats(stats);
      } else {
        // Fallback: вычисляем статистику локально
        const activeSessions = sessions.filter((s: Session) => s.activeConnections > 0).length;
        const totalConnections = sessions.reduce((sum: number, s: Session) => sum + s.totalConnections, 0);
        const activeConnections = sessions.reduce((sum: number, s: Session) => sum + s.activeConnections, 0);
        const totalHistory = sessions.reduce((sum: number, s: Session) => sum + s.historyLength, 0);

        setStats({
          totalSessions: sessions.length,
          activeSessions: activeSessions,
          totalConnections: totalConnections,
          activeConnections: activeConnections,
          averageHistoryLength: totalHistory / sessions.length || 0
        });
      }

    } catch (error) {
      console.error('Ошибка загрузки данных:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
    const interval = setInterval(fetchSessions, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleViewHistory = async (session: Session) => {
    setSelectedSession(session);

    try {
      const response = await fetch(`http://localhost:8080/api/admin/sessions/${session.key}/history`);
      if (response.ok) {
        const history = await response.json();
        setSessionHistory(history);
      } else {
        // Fallback: генерируем моковую историю
        const mockHistory = Array.from({ length: session.historyLength }, () =>
          Math.floor(Math.random() * 37)
        );
        setSessionHistory(mockHistory);
      }
    } catch (error) {
      console.error('Failed to fetch history:', error);
      // Fallback: генерируем моковую историю
      const mockHistory = Array.from({ length: session.historyLength }, () =>
        Math.floor(Math.random() * 37)
      );
      setSessionHistory(mockHistory);
    }

    setViewHistoryDialog(true);
  };


  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ru-RU');
  };

  const formatDuration = (dateString: string) => {
    const minutes = Math.floor((Date.now() - new Date(dateString).getTime()) / 60000);
    if (minutes < 1) return 'только что';
    if (minutes < 60) return `${minutes} мин назад`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} ч назад`;
    const days = Math.floor(hours / 24);
    return `${days} дн назад`;
  };

  return (
    <Box sx={{ p: 3, minHeight: '100vh', backgroundColor: '#0a0a0a' }}>
      <Typography variant="h4" color="white" mb={3}>
        Админ-панель Casino Roulette (Упрощенная версия)
      </Typography>

      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6}>
          <Card sx={{ backgroundColor: '#1a1a1a', color: 'white' }}>
            <CardContent>
              <Typography variant="h6" color="primary">
                {stats.activeSessions}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Активных сессий
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6}>
          <Card sx={{ backgroundColor: '#1a1a1a', color: 'white' }}>
            <CardContent>
              <Typography variant="h6" color="success.main">
                {stats.activeConnections}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Активных подключений
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" color="white">
          Сессии и подключения
        </Typography>
        <Button
          variant="contained"
          onClick={fetchSessions}
          disabled={loading}
        >
          🔄 Обновить
        </Button>
      </Box>

      <TableContainer component={Paper} sx={{ backgroundColor: '#1a1a1a' }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Сессия</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Создана</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Последняя активность</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>История</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Подключения</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Действия</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sessions.map((session) => (
              <React.Fragment key={session.key}>
                {/* Строка сессии */}
                <TableRow sx={{ backgroundColor: '#2a2a2a' }}>
                  <TableCell sx={{ color: 'white' }}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                        {session.key}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell sx={{ color: 'white' }}>
                    <Typography variant="body2">
                      {formatDate(session.createdAt)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {formatDuration(session.createdAt)}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ color: 'white' }}>
                    <Typography variant="body2">
                      {formatDate(session.lastActivity)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {formatDuration(session.lastActivity)}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ color: 'white' }}>
                    <Typography variant="body2">
                      {session.historyLength} чисел
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ color: 'white' }}>
                    <Box display="flex" gap={1}>
                      <Chip
                        label={`${session.activeConnections} активных`}
                        color={session.activeConnections > 0 ? 'success' : 'default'}
                        size="small"
                      />
                      <Chip
                        label={`${session.totalConnections} всего`}
                        color="info"
                        size="small"
                      />
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => handleViewHistory(session)}
                      sx={{ color: 'primary.main', borderColor: 'primary.main' }}
                    >
                      👁️ История
                    </Button>
                  </TableCell>
                </TableRow>
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {sessions.length === 0 && !loading && (
        <Alert severity="info" sx={{ mt: 2 }}>
          Нет активных сессий
        </Alert>
      )}

      <Dialog
        open={viewHistoryDialog}
        onClose={() => setViewHistoryDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          История сессии: {selectedSession?.key}
        </DialogTitle>
        <DialogContent>
          <Box display="flex" flexWrap="wrap" gap={1} p={2}>
            {sessionHistory.map((number, index) => (
              <Chip
                key={index}
                label={number}
                sx={{
                  backgroundColor: number === 0 ? '#4caf50' :
                    [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36].includes(number) ? '#f44336' : '#333',
                  color: 'white',
                  fontWeight: 'bold'
                }}
              />
            ))}
          </Box>
          {sessionHistory.length === 0 && (
            <Typography color="text.secondary" align="center" p={3}>
              История пуста
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewHistoryDialog(false)}>
            Закрыть
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default AdminDashboardPage; 