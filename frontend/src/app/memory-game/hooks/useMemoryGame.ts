import { useState, useCallback, useMemo } from "react";
import {
  CardItem,
  DraggableImage,
  CellPosition,
  AnimationType,
} from "../types";

export const useMemoryGame = () => {
  const [gameBoard, setGameBoard] = useState<CardItem[][]>([]);
  const [draggableImages, setDraggableImages] = useState<DraggableImage[]>([]);
  const [isGameStarted, setIsGameStarted] = useState(false);
  const [draggedImage, setDraggedImage] = useState<DraggableImage | null>(null);
  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [draggedFromCell, setDraggedFromCell] = useState<CellPosition | null>(
    null
  );
  const [isDraggingFromCell, setIsDraggingFromCell] = useState(false);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [selectedCell, setSelectedCell] = useState<CellPosition | null>(null);
  const [useTextModal, setUseTextModal] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [lastFoundPair, setLastFoundPair] = useState<CellPosition[]>([]);
  const [animationType, setAnimationType] = useState<AnimationType>(null);
  const [isAnimationRunning, setIsAnimationRunning] = useState(false);

  // Кэш оставшихся использований для каждого изображения
  const imageRemainingMap = useMemo(() => {
    const map = new Map<string, number>();
    draggableImages.forEach((img) => {
      map.set(img.image, img.maxUsage - img.usageCount);
    });
    return map;
  }, [draggableImages]);

  // Генерируем 30 уникальных картинок для игры
  const generateImages = useCallback(() => {
    const images = [];
    for (let i = 1; i <= 30; i++) {
      images.push({
        id: `img-${i}`,
        image: `/images/memory-game/image-${i}.jpg`,
        fallbackImage: `/images/memory-game/image-${i}.jpg`,
        isUsed: false,
        usageCount: 0,
        maxUsage: 2,
      });
    }
    console.log("🖼️ Сгенерировано изображений:", images.length);
    return images;
  }, []);

  // Инициализируем игровое поле 10x6 для мобильных, 6x10 для десктопа
  const initializeGameBoard = useCallback(() => {
    const board: CardItem[][] = [];
    const rows = isMobile ? 10 : 6;
    const cols = isMobile ? 6 : 10;

    for (let row = 0; row < rows; row++) {
      const boardRow: CardItem[] = [];
      for (let col = 0; col < cols; col++) {
        boardRow.push({
          id: `cell-${row}-${col}`,
          image: "",
          isMatched: false,
          isFlipped: false,
          isPlaced: false,
          showDeleteIcon: false,
        });
      }
      board.push(boardRow);
    }
    return board;
  }, [isMobile]);

  // Начинаем новую игру
  const startNewGame = useCallback(() => {
    console.log("🎮 Начинаем новую игру...");
    console.log("📱 Текущее состояние isMobile:", isMobile);

    // Принудительно очищаем все состояния
    setGameBoard([]);
    setDraggableImages([]);
    setLastFoundPair([]);
    setAnimationType(null);
    setIsAnimationRunning(false);
    setDraggedImage(null);
    setDraggedFromCell(null);
    setIsDragging(false);
    setIsDraggingFromCell(false);
    setIsImageModalOpen(false);
    setSelectedCell(null);

    // Небольшая задержка для корректной очистки состояний
    setTimeout(() => {
      const newBoard = initializeGameBoard();
      const newImages = generateImages();

      console.log("📊 Новое поле:", {
        rows: newBoard.length,
        cols: newBoard[0]?.length || 0,
        totalCells: newBoard.flat().length,
      });
      console.log("🖼️ Новые изображения:", newImages.length);

      setGameBoard(newBoard);
      // Сортируем картинки: сначала доступные, потом использованные
      setDraggableImages(
        newImages.sort((a, b) => {
          if (a.usageCount >= a.maxUsage && b.usageCount < b.maxUsage) return 1;
          if (a.usageCount < a.maxUsage && b.usageCount >= b.maxUsage)
            return -1;
          return 0;
        })
      );

      setIsGameStarted(true);

      console.log("✅ Игра инициализирована!");
      console.log("🎯 Состояние isGameStarted установлено в true");
    }, 100);
  }, [initializeGameBoard, generateImages, isMobile]);

  // Проверяем совпадения на поле
  const checkMatches = useCallback(() => {
    // Защита от множественных вызовов
    if (isAnimationRunning) return;

    setGameBoard((prev) => {
      const newBoard = [...prev];
      const newlyFoundPairs: CellPosition[] = [];
      const rows = newBoard.length;
      const cols = newBoard[0]?.length || 0;

      // Логика проверки совпадений по всему полю
      const processedPairs = new Set<string>(); // Чтобы избежать дублирования пар

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          if (newBoard[row][col].image && !newBoard[row][col].isMatched) {
            const currentImage = newBoard[row][col].image;

            // Ищем все ячейки с таким же изображением по всему полю
            for (let searchRow = 0; searchRow < rows; searchRow++) {
              for (let searchCol = 0; searchCol < cols; searchCol++) {
                // Пропускаем ту же ячейку
                if (searchRow === row && searchCol === col) continue;

                // Проверяем, есть ли совпадение
                if (
                  newBoard[searchRow][searchCol].image === currentImage &&
                  !newBoard[searchRow][searchCol].isMatched
                ) {
                  // Создаем уникальный ключ для пары (сортируем координаты для консистентности)
                  const pair1 = `${row}-${col}`;
                  const pair2 = `${searchRow}-${searchCol}`;
                  const pairKey = [pair1, pair2].sort().join("|");

                  // Если эта пара еще не обработана
                  if (!processedPairs.has(pairKey)) {
                    processedPairs.add(pairKey);

                    // Помечаем обе ячейки как найденные
                    newBoard[row][col].isMatched = true;
                    newBoard[searchRow][searchCol].isMatched = true;

                    // Добавляем в список найденных пар
                    newlyFoundPairs.push(
                      { row, col },
                      { row: searchRow, col: searchCol }
                    );
                  }
                }
              }
            }
          }
        }
      }

      // Если найдены новые пары, запускаем анимацию только один раз
      if (newlyFoundPairs.length > 0 && !isAnimationRunning) {
        // Берем последнюю найденную пару (последние 2 элемента)
        const lastPair = newlyFoundPairs.slice(-2);

        // Устанавливаем защиту от множественных анимаций
        setIsAnimationRunning(true);

        // Запускаем анимацию празднования
        setLastFoundPair(lastPair);
        setAnimationType("celebration");

        // Единый таймер для управления анимацией
        setTimeout(() => {
          setAnimationType(null);
          setLastFoundPair([]); // Сразу скрываем подсветку
          setIsAnimationRunning(false); // Снимаем защиту
        }, 2000); // Анимация празднования длится 2 секунды
      }

      return newBoard;
    });
  }, [isAnimationRunning]);

  return {
    // Состояния
    gameBoard,
    draggableImages,
    isGameStarted,
    draggedImage,
    dragPosition,
    isDragging,
    draggedFromCell,
    isDraggingFromCell,
    isImageModalOpen,
    selectedCell,
    useTextModal,
    isMobile,
    lastFoundPair,
    animationType,
    isAnimationRunning,
    imageRemainingMap,

    // Сеттеры
    setGameBoard,
    setDraggableImages,
    setDraggedImage,
    setDragPosition,
    setIsDragging,
    setDraggedFromCell,
    setIsDraggingFromCell,
    setIsImageModalOpen,
    setSelectedCell,
    setUseTextModal,
    setIsMobile,
    setLastFoundPair,
    setAnimationType,
    setIsAnimationRunning,

    // Функции
    startNewGame,
    checkMatches,
    generateImages,
    initializeGameBoard,
  };
};
