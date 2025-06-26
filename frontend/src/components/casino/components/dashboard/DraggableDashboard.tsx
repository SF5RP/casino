'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { Layout, Responsive, WidthProvider } from 'react-grid-layout';
import { Box, IconButton, Paper, Typography } from '@mui/material';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import CloseIcon from '@mui/icons-material/Close';
import SettingsIcon from '@mui/icons-material/Settings';
import { RouletteNumber } from '@/components/casino/types/rouletteTypes';
import { StatsPanel } from '@/components/casino/components/statsPanel/StatsPanel';
import { ForecastPanel } from '@/components/casino/components/ForecastPanel';
import { RouletteTrendsChart } from '@/components/casino/components/rouletteTrendsChart';
import { GameInfo } from '@/components/casino/components/GameInfo';
import { NumberStatsWidget } from './NumberStatsWidget';
import { RouletteBoard } from '@/components/casino/components/rouletteBoard/RouletteBoard';
import { DashboardHistoryPanel } from './DashboardHistoryPanel';
import { HoveredNumberWidget } from './HoveredNumberWidget';
import { DistributionChartsWidget } from './DistributionChartsWidget';

const ResponsiveGridLayout = WidthProvider(Responsive);

export interface DashboardWidget {
  id: string;
  title: string;
  component: React.ReactNode;
  defaultSize: { w: number; h: number };
  minSize?: { w: number; h: number };
  maxSize?: { w: number; h: number };
}

interface DraggableDashboardProps {
  history: RouletteNumber[];
  ageMap: Record<string, number>;
  chartHistoryLength: number;
  onToggleSettings: () => void;
  isEditMode: boolean;
  onToggleEditMode: () => void;
  setHistory: React.Dispatch<React.SetStateAction<RouletteNumber[]>>;
  activeLabel: string;
  activeGroup: number[];
  setActiveLabel: (label: string) => void;
  setActiveGroup: (group: number[]) => void;
  setHoveredNumber: (num: RouletteNumber | null) => void;
  showFullHistory: boolean;
  isHistoryWide: boolean;
  hoveredNumber: RouletteNumber | null;
  lastHoveredNumber: RouletteNumber | null;
  onCellClick: (num: RouletteNumber) => void;
}

export const DraggableDashboard: React.FC<DraggableDashboardProps> = ({
                                                                        history,
                                                                        ageMap,
                                                                        chartHistoryLength,
                                                                        onToggleSettings,
                                                                        isEditMode,
                                                                        onToggleEditMode,
                                                                        setHistory,
                                                                        activeLabel,
                                                                        activeGroup,
                                                                        setActiveLabel,
                                                                        setActiveGroup,
                                                                        setHoveredNumber,
                                                                        showFullHistory,
                                                                        isHistoryWide,
                                                                        hoveredNumber,
                                                                        lastHoveredNumber,
                                                                        onCellClick,
                                                                      }) => {
  const [layouts, setLayouts] = useState<{ [key: string]: Layout[] }>({});
  const [hiddenWidgets, setHiddenWidgets] = useState<Set<string>>(new Set());

  const widgets: DashboardWidget[] = useMemo(() => [
    {
      id: 'roulette-board',
      title: 'Стол рулетки',
      component: (
        <RouletteBoard
          ageMap={ageMap}
          activeLabel={activeLabel}
          activeGroup={activeGroup}
          history={history}
          onCellClick={onCellClick}
          setHistory={setHistory}
          setActiveLabel={setActiveLabel}
          setActiveGroup={setActiveGroup}
          setHoveredNumber={setHoveredNumber}
        />
      ),
      defaultSize: { w: 6, h: 8 },
      minSize: { w: 6, h: 8 },
    },
    {
      id: 'history-panel',
      title: 'История',
      component: (
        <DashboardHistoryPanel
          history={history}
          setHistory={setHistory}
          showFullHistory={showFullHistory}
          isWide={isHistoryWide}
          setHoveredNumber={setHoveredNumber}
        />
      ),
      defaultSize: { w: 12, h: 2 },
      minSize: { w: 6, h: 2 }, // Увеличили минимальную высоту для гарантированного размещения одной строки с числами
    },
    {
      id: 'game-info',
      title: 'Игровая информация',
      component: <GameInfo history={history as number[]} ageMap={ageMap} />,
      defaultSize: { w: 4, h: 3 },
      minSize: { w: 3, h: 2 },
    },
    {
      id: 'trends-chart',
      title: 'График трендов',
      component: <RouletteTrendsChart history={history as number[]} chartHistoryLength={chartHistoryLength} />,
      defaultSize: { w: 8, h: 4 },
      minSize: { w: 6, h: 3 },
    },
    {
      id: 'stats-panel',
      title: 'Статистика по группам',
      component: (
        <StatsPanel
          showStats={true}
          setShowStats={() => {
          }}
          setShowDetailedStats={() => {
          }}
          history={history}
          isEmbedded={true}
        />
      ),
      defaultSize: { w: 4, h: 6 },
      minSize: { w: 3, h: 4 },
    },
    {
      id: 'forecast-panel',
      title: 'Прогнозы',
      component: <ForecastPanel history={history} />,
      defaultSize: { w: 4, h: 5 },
      minSize: { w: 3, h: 3 },
    },
    {
      id: 'number-stats-full',
      title: 'Детальная статистика чисел',
      component: <NumberStatsWidget history={history} compact={false} />,
      defaultSize: { w: 6, h: 8 },
      minSize: { w: 4, h: 5 },
    },
    {
      id: 'number-stats-compact',
      title: 'Топ/Редкие числа',
      component: <NumberStatsWidget history={history} compact={true} />,
      defaultSize: { w: 3, h: 4 },
      minSize: { w: 2, h: 3 },
    },
    {
      id: 'hovered-number',
      title: 'Информация о числе',
      component: (
        <HoveredNumberWidget
          history={history}
          hoveredNumber={hoveredNumber}
          lastHoveredNumber={lastHoveredNumber}
        />
      ),
      defaultSize: { w: 4, h: 4 },
      minSize: { w: 3, h: 3 },
    },
    {
      id: 'distribution-charts',
      title: 'Графики распределения',
      component: <DistributionChartsWidget history={history} />,
      defaultSize: { w: 4, h: 8 },
      minSize: { w: 3, h: 6 },
    },
  ], [history, ageMap, chartHistoryLength, setHistory, activeLabel, activeGroup, setActiveLabel, setActiveGroup, setHoveredNumber, showFullHistory, isHistoryWide, hoveredNumber, lastHoveredNumber, onCellClick]);

  const defaultLayouts = useMemo(() => {
    // Создаем оптимальную раскладку виджетов
    const layoutMap: Record<string, { x: number; y: number }> = {
      'history-panel': { x: 0, y: 0 }, // История сверху, во всю ширину
      'roulette-board': { x: 0, y: 4 }, // Стол под историей
      'game-info': { x: 8, y: 4 }, // Игровая информация справа от стола
      'trends-chart': { x: 0, y: 10 }, // График трендов под столом
      'stats-panel': { x: 8, y: 10 }, // Статистика справа от графика
      'forecast-panel': { x: 0, y: 14 }, // Прогнозы в следующем ряду
      'number-stats-compact': { x: 4, y: 14 }, // Компактная статистика рядом
      'hovered-number': { x: 8, y: 6 }, // Информация о числе справа от игровой информации
      'distribution-charts': { x: 8, y: 14 }, // Графики распределения справа
      'number-stats-full': { x: 0, y: 22 }, // Полная статистика в следующем ряду
    };

    const layout: Layout[] = widgets.map((widget) => ({
      i: widget.id,
      x: layoutMap[widget.id]?.x || 0,
      y: layoutMap[widget.id]?.y || 0,
      w: widget.defaultSize.w,
      h: widget.defaultSize.h,
      minW: widget.minSize?.w || 1,
      minH: widget.minSize?.h || 1,
      maxW: widget.maxSize?.w || 12,
      maxH: widget.maxSize?.h || 12,
    }));

    return {
      lg: layout,
      md: layout,
      sm: layout.map(item => ({ ...item, w: Math.min(item.w, 6) })),
      xs: layout.map(item => ({ ...item, w: 12, x: 0 })),
    };
  }, [widgets]);

  const handleLayoutChange = useCallback((layout: Layout[], layouts: { [key: string]: Layout[] }) => {
    setLayouts(layouts);
    // Сохраняем в localStorage
    localStorage.setItem('dashboard-layouts', JSON.stringify(layouts));
  }, []);

  const handleHideWidget = useCallback((widgetId: string) => {
    setHiddenWidgets(prev => {
      const newSet = new Set(prev);
      newSet.add(widgetId);
      localStorage.setItem('hidden-widgets', JSON.stringify([...newSet]));
      return newSet;
    });
  }, []);

  const handleShowWidget = useCallback((widgetId: string) => {
    setHiddenWidgets(prev => {
      const newSet = new Set(prev);
      newSet.delete(widgetId);
      localStorage.setItem('hidden-widgets', JSON.stringify([...newSet]));
      return newSet;
    });
  }, []);

  // Загружаем сохраненные настройки
  React.useEffect(() => {
    const savedLayouts = localStorage.getItem('dashboard-layouts');
    const savedHiddenWidgets = localStorage.getItem('hidden-widgets');

    if (savedLayouts) {
      try {
        setLayouts(JSON.parse(savedLayouts));
      } catch (e) {
        console.error('Failed to parse saved layouts:', e);
      }
    }

    if (savedHiddenWidgets) {
      try {
        setHiddenWidgets(new Set(JSON.parse(savedHiddenWidgets)));
      } catch (e) {
        console.error('Failed to parse hidden widgets:', e);
      }
    }
  }, []);

  const visibleWidgets = widgets.filter(widget => !hiddenWidgets.has(widget.id));

  return (
    <Box sx={{ width: '100%', position: 'relative' }}>
      {/* Панель управления */}
      <Box sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        mb: 2,
        p: 1,
        bgcolor: '#1a1a1a',
        borderRadius: 1,
      }}>
        <Typography variant="h6" color="white">
          Dashboard
        </Typography>
        <Box>
          <IconButton
            onClick={onToggleEditMode}
            color={isEditMode ? 'primary' : 'default'}
            size="small"
            sx={{ color: isEditMode ? '#4CAF50' : 'white' }}
          >
            <DragIndicatorIcon />
          </IconButton>
          <IconButton onClick={onToggleSettings} size="small" sx={{ color: 'white' }}>
            <SettingsIcon />
          </IconButton>
        </Box>
      </Box>

      {/* Скрытые виджеты */}
      {hiddenWidgets.size > 0 && (
        <Box sx={{ mb: 2, p: 1, bgcolor: '#2a2a2a', borderRadius: 1 }}>
          <Typography variant="subtitle2" color="#ccc" sx={{ mb: 1 }}>
            Скрытые виджеты:
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {widgets
              .filter(widget => hiddenWidgets.has(widget.id))
              .map(widget => (
                <Box
                  key={widget.id}
                  onClick={() => handleShowWidget(widget.id)}
                  sx={{
                    px: 2,
                    py: 0.5,
                    bgcolor: '#444',
                    borderRadius: 1,
                    cursor: 'pointer',
                    color: 'white',
                    fontSize: '0.875rem',
                    '&:hover': { bgcolor: '#555' },
                  }}
                >
                  + {widget.title}
                </Box>
              ))}
          </Box>
        </Box>
      )}

      {/* Grid Layout */}
      <ResponsiveGridLayout
        className="layout"
        layouts={Object.keys(layouts).length > 0 ? layouts : defaultLayouts}
        onLayoutChange={handleLayoutChange}
        isDraggable={isEditMode}
        isResizable={isEditMode}
        margin={[16, 16]}
        containerPadding={[0, 0]}
        rowHeight={40}
        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480 }}
        cols={{ lg: 12, md: 10, sm: 6, xs: 4 }}
        compactType="vertical"
        preventCollision={false}
      >
        {visibleWidgets.map(widget => (
          <Box key={widget.id}>
            <Paper
              sx={{
                height: '100%',
                bgcolor: '#181818',
                color: 'white',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                border: isEditMode ? '2px dashed #4CAF50' : '1px solid #333',
                position: 'relative',
              }}
            >
              {/* Заголовок виджета */}
              <Box sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                p: 1,
                borderBottom: '1px solid #333',
                bgcolor: '#222',
                minHeight: 40,
              }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                  {widget.title}
                </Typography>
                {isEditMode && (
                  <IconButton
                    size="small"
                    onClick={() => handleHideWidget(widget.id)}
                    sx={{ color: '#ff4444' }}
                  >
                    <CloseIcon fontSize="small" />
                  </IconButton>
                )}
              </Box>

              {/* Содержимое виджета */}
              <Box sx={{
                flex: 1,
                overflow: 'auto',
                p: 1,
                '& > *': { height: '100%' }
              }}>
                {widget.component}
              </Box>
            </Paper>
          </Box>
        ))}
      </ResponsiveGridLayout>
    </Box>
  );
}; 