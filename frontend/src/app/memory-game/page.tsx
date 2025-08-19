"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import Image from "next/image";
import { Box, Typography, Paper, IconButton, Tooltip } from "@mui/material";
import { keyframes } from "@mui/system";
import { Casino, Refresh, Delete } from "@mui/icons-material";
import Script from "next/script";

interface CardItem {
  id: string;
  image: string;
  isMatched: boolean;
  isFlipped: boolean;
  isPlaced: boolean;
  showDeleteIcon: boolean; // Показывать ли иконку удаления
}

interface DraggableImage {
  id: string;
  image: string;
  fallbackImage: string;
  isUsed: boolean;
  usageCount: number; // Количество раз использовано изображение
  maxUsage: number; // Максимальное количество использований (2)
}

const MEMORY_GAME_PAGE = () => {
  const [gameBoard, setGameBoard] = useState<CardItem[][]>([]);
  const [draggableImages, setDraggableImages] = useState<DraggableImage[]>([]);
  const [isGameStarted, setIsGameStarted] = useState(false);

  // Новые состояния для drag and drop
  const [draggedImage, setDraggedImage] = useState<DraggableImage | null>(null);
  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  // Состояния для перетаскивания между ячейками поля
  const [draggedFromCell, setDraggedFromCell] = useState<{
    row: number;
    col: number;
  } | null>(null);
  const [isDraggingFromCell, setIsDraggingFromCell] = useState(false);

  // Используем draggedFromCell для отладки (предотвращаем предупреждение)
  if (process.env.NODE_ENV === "development" && draggedFromCell) {
    console.debug("Dragging from cell:", draggedFromCell);
  }

  // Состояния для подсветки пар
  const [lastFoundPair, setLastFoundPair] = useState<
    { row: number; col: number }[]
  >([]);
  // Больше не используем общий список пар

  // Кэш оставшихся использований для каждого изображения
  const imageRemainingMap = useMemo(() => {
    const map = new Map<string, number>();
    draggableImages.forEach((img) => {
      map.set(img.image, img.maxUsage - img.usageCount);
    });
    return map;
  }, [draggableImages]);

  // Анимация пульса для последней найденной пары (зелёная)
  const lastPairPulse = keyframes({
    "0%": {
      boxShadow: "0 0 0 0 rgba(76, 175, 80, 0.9)",
    },
    "60%": {
      boxShadow: "0 0 0 14px rgba(76, 175, 80, 0)",
    },
    "100%": {
      boxShadow: "0 0 0 0 rgba(76, 175, 80, 0)",
    },
  });
  // Упростили: не ищем все пары, подсвечиваем только последнюю найденную

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

  // Инициализируем игровое поле 10x6
  const initializeGameBoard = useCallback(() => {
    const board: CardItem[][] = [];
    for (let row = 0; row < 6; row++) {
      const boardRow: CardItem[] = [];
      for (let col = 0; col < 10; col++) {
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
  }, []);

  // Начинаем новую игру
  const startNewGame = useCallback(() => {
    console.log("🎮 Начинаем новую игру...");

    const newBoard = initializeGameBoard();
    const newImages = generateImages();

    console.log("📊 Новое поле:", newBoard);
    console.log("🖼️ Новые изображения:", newImages);

    setGameBoard(newBoard);
    // Сортируем картинки: сначала доступные, потом использованные
    setDraggableImages(
      newImages.sort((a, b) => {
        if (a.usageCount >= a.maxUsage && b.usageCount < b.maxUsage) return 1;
        if (a.usageCount < a.maxUsage && b.usageCount >= b.maxUsage) return -1;
        return 0;
      })
    );

    setIsGameStarted(true);

    // Очищаем подсветку последней пары при новой игре
    setLastFoundPair([]);

    console.log("✅ Игра инициализирована!");
  }, [initializeGameBoard, generateImages]);

  // Проверяем совпадения на поле
  const checkMatches = useCallback(() => {
    setGameBoard((prev) => {
      const newBoard = [...prev];
      const newlyFoundPairs: { row: number; col: number }[] = [];

      // Простая логика проверки совпадений
      for (let row = 0; row < 6; row++) {
        for (let col = 0; col < 10; col++) {
          if (newBoard[row][col].image && !newBoard[row][col].isMatched) {
            const currentImage = newBoard[row][col].image;

            // Проверяем справа
            if (
              col < 9 &&
              newBoard[row][col + 1].image === currentImage &&
              !newBoard[row][col + 1].isMatched
            ) {
              newBoard[row][col].isMatched = true;
              newBoard[row][col + 1].isMatched = true;
              newlyFoundPairs.push({ row, col }, { row, col: col + 1 });
            }

            // Проверяем снизу
            if (
              row < 5 &&
              newBoard[row + 1][col].image === currentImage &&
              !newBoard[row + 1][col].isMatched
            ) {
              newBoard[row][col].isMatched = true;
              newBoard[row + 1][col].isMatched = true;
              newlyFoundPairs.push({ row, col }, { row: row + 1, col });
            }

            // Проверяем по диагонали вправо-вниз
            if (
              row < 5 &&
              col < 9 &&
              newBoard[row + 1][col + 1].image === currentImage &&
              !newBoard[row + 1][col + 1].isMatched
            ) {
              newBoard[row][col].isMatched = true;
              newBoard[row + 1][col + 1].isMatched = true;
              newlyFoundPairs.push(
                { row, col },
                { row: row + 1, col: col + 1 }
              );
            }

            // Проверяем по диагонали влево-вниз
            if (
              row < 5 &&
              col > 0 &&
              newBoard[row + 1][col - 1].image === currentImage &&
              !newBoard[row + 1][col - 1].isMatched
            ) {
              newBoard[row][col].isMatched = true;
              newBoard[row + 1][col - 1].isMatched = true;
              newlyFoundPairs.push(
                { row, col },
                { row: row + 1, col: col - 1 }
              );
            }
          }
        }
      }

      // Если найдены новые пары, сохраняем последнюю найденную пару
      if (newlyFoundPairs.length > 0) {
        // Берем последнюю найденную пару (последние 2 элемента)
        const lastPair = newlyFoundPairs.slice(-2);
        setLastFoundPair(lastPair);

        // Скрываем подсветку последней пары через 3 секунды
        setTimeout(() => {
          setLastFoundPair([]);
        }, 3000);
      }

      // Подсветка только последней пары, общую подсветку пар не используем

      return newBoard;
    });
  }, []);

  // Обработка перемещения картинки между ячейками поля
  const handleCellToCell = useCallback(
    (fromRow: number, fromCol: number, toRow: number, toCol: number) => {
      if (!isGameStarted) return;

      // Если перетаскиваем в ту же ячейку, ничего не делаем
      if (fromRow === toRow && fromCol === toCol) return;

      const fromCell = gameBoard[fromRow][fromCol];
      const toCell = gameBoard[toRow][toCol];

      if (!fromCell.image || !fromCell.isPlaced) return;

      setGameBoard((prev) => {
        const newBoard = prev.map((row) => row.slice()); // Глубокое копирование

        // Если целевая ячейка занята, меняем картинки местами
        if (toCell.image) {
          // Меняем местами, переносим статус совпадения вместе с картинкой
          newBoard[toRow][toCol] = {
            ...toCell,
            image: fromCell.image,
            isFlipped: fromCell.isFlipped,
            isPlaced: true,
            isMatched: fromCell.isMatched,
            showDeleteIcon: false,
          };
          newBoard[fromRow][fromCol] = {
            ...fromCell,
            image: toCell.image,
            isFlipped: toCell.isFlipped,
            isPlaced: true,
            isMatched: toCell.isMatched,
            showDeleteIcon: false,
          };
        } else {
          // Просто перемещаем в пустую ячейку
          newBoard[toRow][toCol] = {
            ...toCell,
            image: fromCell.image,
            isFlipped: fromCell.isFlipped,
            isPlaced: true,
            isMatched: fromCell.isMatched,
            showDeleteIcon: false,
          };
          newBoard[fromRow][fromCol] = {
            ...fromCell,
            image: "",
            isFlipped: false,
            isPlaced: false,
            isMatched: false,
            showDeleteIcon: false,
          };
        }

        return newBoard;
      });

      // Проверяем совпадения после перемещения
      setTimeout(checkMatches, 100);

      // Подсветка только последней пары, общую подсветку пар не используем
    },
    [isGameStarted, gameBoard, checkMatches]
  );

  // Обработка размещения картинки на игровом поле
  const handleImageDrop = useCallback(
    (image: DraggableImage, imageIndex: number, row: number, col: number) => {
      if (!isGameStarted || image.usageCount >= image.maxUsage) return;

      // Проверяем, есть ли уже картинка в этой ячейке
      if (gameBoard[row][col].image) {
        return; // Если ячейка уже занята, ничего не делаем
      }

      // Обновляем игровое поле
      setGameBoard((prev) => {
        const newBoard = [...prev];
        newBoard[row][col] = {
          ...newBoard[row][col],
          image: image.image,
          isFlipped: true,
          isPlaced: true,
          showDeleteIcon: false,
        };
        return newBoard;
      });

      // Увеличиваем счетчик использований только если перетаскиваем из панели изображений
      if (!isDraggingFromCell) {
        setDraggableImages((prev) => {
          const newImages = prev.map((img, idx) =>
            idx === imageIndex
              ? {
                  ...img,
                  usageCount: img.usageCount + 1,
                  isUsed: img.usageCount + 1 >= img.maxUsage,
                }
              : img
          );

          // Сортируем: сначала доступные картинки, потом использованные
          return newImages.sort((a, b) => {
            if (a.usageCount >= a.maxUsage && b.usageCount < b.maxUsage)
              return 1;
            if (a.usageCount < a.maxUsage && b.usageCount >= b.maxUsage)
              return -1;
            return 0;
          });
        });
      }

      // Проверяем совпадения после размещения
      setTimeout(checkMatches, 100);
    },
    [isGameStarted, checkMatches, gameBoard, isDraggingFromCell]
  );

  // Обработчики drag and drop с поддержкой touch
  const handleImageMouseDown = useCallback(
    (e: React.MouseEvent, image: DraggableImage, imageIndex: number) => {
      if (image.usageCount >= image.maxUsage || !isGameStarted) return;

      e.preventDefault();
      setDraggedImage(image);
      setDragPosition({ x: e.clientX, y: e.clientY });
      setIsDragging(true);
      setDraggedFromCell(null); // Перетаскиваем из панели изображений

      const handleMouseMove = (e: MouseEvent) => {
        e.preventDefault();
        setDragPosition({ x: e.clientX, y: e.clientY });
      };

      const handleTouchMove = (e: TouchEvent) => {
        e.preventDefault();
        const touch = e.touches[0];
        setDragPosition({ x: touch.clientX, y: touch.clientY });
      };

      const handleEnd = (e: MouseEvent | TouchEvent) => {
        let clientX, clientY;
        if (e instanceof MouseEvent) {
          clientX = e.clientX;
          clientY = e.clientY;
        } else {
          const touch = e.changedTouches[0];
          clientX = touch.clientX;
          clientY = touch.clientY;
        }

        const elementUnderMouse = document.elementFromPoint(clientX, clientY);
        if (elementUnderMouse) {
          const cellElement = elementUnderMouse.closest("[data-cell-id]");
          if (cellElement) {
            const cellId = cellElement.getAttribute("data-cell-id");
            if (cellId) {
              const [row, col] = cellId.split("-").map(Number);
              handleImageDrop(image, imageIndex, row, col);
            }
          }
        }

        setIsDragging(false);
        setIsDraggingFromCell(false);
        setDraggedImage(null);
        setDraggedFromCell(null);
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleEnd);
        document.removeEventListener("touchmove", handleTouchMove);
        document.removeEventListener("touchend", handleEnd);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleEnd);
      document.addEventListener("touchmove", handleTouchMove, {
        passive: false,
      });
      document.addEventListener("touchend", handleEnd);
    },
    [isGameStarted, handleImageDrop]
  );

  // Обработчик начала перетаскивания из ячейки поля
  const handleCellMouseDown = useCallback(
    (e: React.MouseEvent, row: number, col: number) => {
      const cell = gameBoard[row][col];
      if (!cell.image || !cell.isPlaced || !isGameStarted) return;

      e.preventDefault();
      e.stopPropagation(); // Предотвращаем вызов handleCellClick

      // Создаем объект DraggableImage из ячейки
      const cellImage: DraggableImage = {
        id: `cell-${row}-${col}`,
        image: cell.image,
        fallbackImage: cell.image,
        isUsed: false,
        usageCount: 0,
        maxUsage: 2,
      };

      setDraggedImage(cellImage);
      setDraggedFromCell({ row, col });
      setDragPosition({ x: e.clientX, y: e.clientY });
      setIsDragging(true);
      setIsDraggingFromCell(true);

      const handleMouseMove = (e: MouseEvent) => {
        e.preventDefault();
        setDragPosition({ x: e.clientX, y: e.clientY });
      };

      const handleTouchMove = (e: TouchEvent) => {
        e.preventDefault();
        const touch = e.touches[0];
        setDragPosition({ x: touch.clientX, y: touch.clientY });
      };

      const handleEnd = (e: MouseEvent | TouchEvent) => {
        let clientX, clientY;
        if (e instanceof MouseEvent) {
          clientX = e.clientX;
          clientY = e.clientY;
        } else {
          const touch = e.changedTouches[0];
          clientX = touch.clientX;
          clientY = touch.clientY;
        }

        const elementUnderMouse = document.elementFromPoint(clientX, clientY);
        if (elementUnderMouse) {
          const cellElement = elementUnderMouse.closest("[data-cell-id]");
          if (cellElement) {
            const cellId = cellElement.getAttribute("data-cell-id");
            if (cellId) {
              const [targetRow, targetCol] = cellId.split("-").map(Number);
              // Обрабатываем перенос между ячейками
              handleCellToCell(row, col, targetRow, targetCol);
            }
          }
        }

        setIsDragging(false);
        setIsDraggingFromCell(false);
        setDraggedImage(null);
        setDraggedFromCell(null);
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleEnd);
        document.removeEventListener("touchmove", handleTouchMove);
        document.removeEventListener("touchend", handleEnd);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleEnd);
      document.addEventListener("touchmove", handleTouchMove, {
        passive: false,
      });
      document.addEventListener("touchend", handleEnd);
    },
    [isGameStarted, gameBoard, handleCellToCell]
  );

  // Удаление картинки с игрового поля
  const handleDeleteImage = useCallback(
    (row: number, col: number) => {
      const cell = gameBoard[row][col];
      if (!cell.image) return;
      const deletedImage = cell.image;

      // Находим соответствующее изображение в панели
      const imageIndex = draggableImages.findIndex(
        (img) => img.image === cell.image
      );

      if (imageIndex !== -1) {
        // Уменьшаем счетчик использований
        setDraggableImages((prev) => {
          const newImages = prev.map((img, idx) =>
            idx === imageIndex
              ? {
                  ...img,
                  usageCount: Math.max(0, img.usageCount - 1),
                  isUsed: Math.max(0, img.usageCount - 1) >= img.maxUsage,
                }
              : img
          );

          // Сортируем: сначала доступные картинки, потом использованные
          return newImages.sort((a, b) => {
            if (a.usageCount >= a.maxUsage && b.usageCount < b.maxUsage)
              return 1;
            if (a.usageCount < a.maxUsage && b.usageCount >= b.maxUsage)
              return -1;
            return 0;
          });
        });

        // Очищаем ячейку на игровом поле и снимаем статус совпадения у парной картинки
        setGameBoard((prev) => {
          const newBoard = prev.map((r) => r.map((c) => ({ ...c })));
          // Сброс удаляемой ячейки
          newBoard[row][col] = {
            ...newBoard[row][col],
            image: "",
            isFlipped: false,
            isPlaced: false,
            showDeleteIcon: false,
            isMatched: false,
          };
          // Сброс статуса совпадения у второй половины пары, если есть
          for (let r = 0; r < newBoard.length; r++) {
            for (let c = 0; c < newBoard[r].length; c++) {
              if (newBoard[r][c].image === deletedImage) {
                newBoard[r][c].isMatched = false;
              }
            }
          }
          return newBoard;
        });

        // Сбрасываем подсветку последней найденной пары
        setLastFoundPair([]);

        // Проверяем совпадения после удаления
        setTimeout(checkMatches, 100);
      }
    },
    [gameBoard, draggableImages, checkMatches]
  );

  // Обработчик клика по ячейке (для переворачивания картинок и показа иконки удаления)
  const handleCellClick = useCallback(
    (row: number, col: number, e: React.MouseEvent) => {
      if (!isGameStarted || !gameBoard[row][col].isPlaced || isDragging) return;

      // Предотвращаем всплытие события
      e.stopPropagation();

      const cell = gameBoard[row][col];

      if (cell.showDeleteIcon) {
        // Второй клик - удаляем картинку
        handleDeleteImage(row, col);
      } else {
        // Скрываем все иконки удаления перед показом новой
        setGameBoard((prev) => {
          const newBoard = prev.map((row) =>
            row.map((cell) => ({
              ...cell,
              showDeleteIcon: false,
            }))
          );
          // Показываем иконку удаления для текущей ячейки
          newBoard[row][col].showDeleteIcon = true;
          return newBoard;
        });

        // Автоматически скрываем иконку через 3 секунды
        setTimeout(() => {
          setGameBoard((prev) => {
            const newBoard = [...prev];
            if (newBoard[row][col] && newBoard[row][col].showDeleteIcon) {
              newBoard[row][col].showDeleteIcon = false;
            }
            return newBoard;
          });
        }, 3000);
      }
    },
    [isGameStarted, gameBoard, handleDeleteImage, isDragging]
  );

  // Обработчик клика по игровому полю для скрытия иконок удаления
  const handleGameBoardClick = useCallback((e: React.MouseEvent) => {
    // Проверяем, что клик был именно по игровому полю, а не по ячейке
    if (e.target === e.currentTarget) {
      setGameBoard((prev) => {
        const newBoard = prev.map((row) =>
          row.map((cell) => ({
            ...cell,
            showDeleteIcon: false,
          }))
        );
        return newBoard;
      });
    }
  }, []);

  // Обработчик клика по странице для скрытия иконок удаления
  const handlePageClick = useCallback(() => {
    setGameBoard((prev) => {
      const newBoard = prev.map((row) =>
        row.map((cell) => ({
          ...cell,
          showDeleteIcon: false,
        }))
      );
      return newBoard;
    });
  }, []);

  useEffect(() => {
    startNewGame();
  }, [startNewGame]);

  return (
    <Box
      sx={{
        p: { xs: 1, sm: 2, lg: 3 },
        // Убираем ограничение maxWidth для ПК
        maxWidth: { xs: "100%", sm: "100%", md: "100%", lg: "100%" },
        margin: "0 auto",
        width: "100%",
        minHeight: "100vh",
        boxSizing: "border-box",
      }}
      onClick={handlePageClick}
    >
      <Script id="yandex-metrika" strategy="afterInteractive">
        {`(function(m,e,t, r, i, k, a){
            m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
            m[i].l=1*new Date();
            for (var j = 0; j < document.scripts.length; j++) { if (document.scripts[j].src === r) { return; } }
            k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)
        })(window, document, 'script', 'https://mc.yandex.ru/metrika/tag.js?id=103802063', 'ym');
        ym(103802063, 'init', { ssr: true, webvisor: true, clickmap: true, ecommerce: 'dataLayer', accurateTrackBounce: true, trackLinks: true });`}
      </Script>
      <noscript>
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://mc.yandex.ru/watch/103802063"
            className="ym-noscript"
            alt=""
          />
        </div>
      </noscript>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          mb: { xs: 1, sm: 2, lg: 3 },
          gap: { xs: 1, sm: 2 },
        }}
      >
        <Casino
          sx={{
            fontSize: { xs: 24, sm: 28, md: 30, lg: 32, xl: 34 },
            color: "primary.main",
          }}
        />
        <Typography
          component="h1"
          sx={{
            fontWeight: 600,
            fontSize: { xs: 18, sm: 20, md: 24, lg: 28, xl: 32 },
          }}
        >
          Игра &quot;Найди пару&quot;
        </Typography>
        <Tooltip title="Начать новую игру">
          <IconButton
            onClick={startNewGame}
            color="primary"
            size="medium"
            sx={{ fontSize: { xs: 20, md: 24, lg: 28, xl: 30 } }}
          >
            <Refresh />
          </IconButton>
        </Tooltip>
      </Box>

      <Box
        sx={{
          display: "flex",
          flexDirection: {
            xs: "column",
            sm: "column",
            md: "row",
            // Landscape планшетов - горизонтальное расположение
            "@media (orientation: landscape) and (max-width: 1024px)": {
              flexDirection: "row",
            },
          },
          gap: { xs: 1, sm: 1.5, md: 2 },
          alignItems: { xs: "center", md: "stretch" },
          justifyContent: "center",
          maxHeight: {
            xs: "auto",
            sm: "auto",
            md: "calc(100vh - 180px)",
            // Для landscape планшетов
            "@media (orientation: landscape) and (max-width: 1024px)": {
              maxHeight: "calc(100vh - 120px)",
            },
          },
        }}
      >
        {/* Игровое поле 10x6 */}
        <Paper
          sx={{
            flex: {
              xs: "none",
              md: "1 1 720px", // Увеличено с 640px для ПК, но не слишком много
              lg: "1 1 800px", // Еще больше для больших экранов
              xl: "1 1 1200px", // Максимальный размер 1200px для очень больших экранов
              // Landscape планшеты
              "@media (orientation: landscape) and (max-width: 1024px)": {
                flex: "1 1 auto",
              },
            },
            width: {
              xs: "100%",
              sm: "100%",
              md: "auto",
              // Landscape планшеты
              "@media (orientation: landscape) and (max-width: 1024px)": {
                width: "60vw",
              },
            },
            maxWidth: {
              xs: "100%",
              sm: "80vw",
              md: "none",
              lg: "1200px",
              xl: "1200px",
            },
            p: { xs: 0.5, sm: 1, md: 2 },
            order: { xs: 1, md: 1 },
          }}
          onClick={handleGameBoardClick}
        >
          <Typography
            variant="h6"
            sx={{
              mb: { xs: 1, sm: 1.5, md: 2 },
              textAlign: "center",
              fontSize: { xs: 14, sm: 16, md: 20, lg: 22, xl: 24 },
            }}
          >
            Игровое поле
          </Typography>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(10, 1fr)",
              gap: {
                xs: 0.25,
                sm: 0.5,
                // Landscape планшеты - минимальный gap
                "@media (orientation: landscape) and (max-width: 1024px)": {
                  gap: 0.3,
                },
              },
              width: {
                xs: "100%",
                sm: "min(100%, 70vh)",
                md: "min(100%, calc((100vh - 240px) * 1.6667))",
                lg: "min(100%, 1200px)",
                xl: "min(100%, 1200px)",
                // Landscape планшеты
                "@media (orientation: landscape) and (max-width: 1024px)": {
                  width: "100%",
                },
              },
              maxHeight: {
                xs: "45vh",
                sm: "50vh",
                md: "none",
                // Landscape планшеты
                "@media (orientation: landscape) and (max-width: 1024px)": {
                  maxHeight: "calc(100vh - 160px)",
                },
              },
              mx: "auto",
              aspectRatio: {
                xs: "5/3",
                sm: "5/3",
                md: "auto",
                // Landscape планшеты - более широкое соотношение
                "@media (orientation: landscape) and (max-width: 1024px)": {
                  aspectRatio: "10/6",
                },
              },
            }}
          >
            {gameBoard.map((row, rowIndex) =>
              row.map((cell, colIndex) => (
                <Box
                  key={cell.id}
                  data-cell-id={`${rowIndex}-${colIndex}`}
                  sx={{
                    position: "relative",
                    width: "100%",
                    aspectRatio: "1 / 1",
                    borderStyle: "solid",
                    borderColor: (() => {
                      const isInLastPair = lastFoundPair.some(
                        (pos) => pos.row === rowIndex && pos.col === colIndex
                      );
                      if (cell.isMatched) return "success.main";
                      return isInLastPair ? "success.main" : "#000";
                    })(),
                    borderWidth: (() => {
                      const isInLastPair = lastFoundPair.some(
                        (pos) => pos.row === rowIndex && pos.col === colIndex
                      );
                      if (cell.isMatched) return 2;
                      return isInLastPair ? 4 : 1;
                    })(),
                    borderRadius: 1,
                    backgroundColor: (() => {
                      const remaining = cell.image
                        ? imageRemainingMap.get(cell.image) ?? 0
                        : 0;
                      if (remaining === 1) return "#ffeb3b";
                      if (cell.isMatched) return "success.light";
                      if (cell.isPlaced && cell.isFlipped)
                        return "primary.light";
                      return "grey.100";
                    })(),
                    cursor: cell.isPlaced ? "pointer" : "default",
                    transition: "all 0.3s ease", // Плавная анимация
                    boxShadow: (() => {
                      const isInLastPair = lastFoundPair.some(
                        (pos) => pos.row === rowIndex && pos.col === colIndex
                      );
                      return isInLastPair
                        ? "0 0 12px rgba(76, 175, 80, 0.7), 0 0 20px rgba(76, 175, 80, 0.35)"
                        : "none";
                    })(),
                    outline: "none",
                    animation: (() => {
                      const isInLastPair = lastFoundPair.some(
                        (pos) => pos.row === rowIndex && pos.col === colIndex
                      );
                      return isInLastPair
                        ? `${lastPairPulse} 1.2s ease-in-out infinite`
                        : "none";
                    })(),
                    "&:hover": cell.isPlaced
                      ? {
                          transform: "scale(1.02)",
                          boxShadow: "0 6px 14px rgba(0,0,0,0.25)",
                        }
                      : {},
                  }}
                  onClick={(e) => handleCellClick(rowIndex, colIndex, e)}
                >
                  {cell.image && (
                    <Box
                      onMouseDown={(e) =>
                        handleCellMouseDown(e, rowIndex, colIndex)
                      }
                      onTouchStart={(e) => {
                        const touch = e.touches[0];
                        const mouseEvent = {
                          ...e,
                          clientX: touch.clientX,
                          clientY: touch.clientY,
                          preventDefault: () => e.preventDefault(),
                          stopPropagation: () => e.stopPropagation(),
                        } as unknown as React.MouseEvent;
                        handleCellMouseDown(mouseEvent, rowIndex, colIndex);
                      }}
                      sx={{
                        position: "absolute",
                        inset: 4,
                        borderRadius: 0.5,
                        overflow: "hidden",
                        opacity: cell.isFlipped ? 1 : 0.3,
                        pointerEvents: cell.isPlaced ? "auto" : "none",
                        cursor: cell.isPlaced ? "grab" : "default",
                        userSelect: "none",
                        WebkitUserSelect: "none",
                        "&:active": cell.isPlaced
                          ? {
                              cursor: "grabbing",
                            }
                          : {},
                      }}
                    >
                      <Image
                        src={cell.image}
                        alt="card"
                        fill
                        draggable={false}
                        style={{ objectFit: "cover" }}
                      />
                    </Box>
                  )}

                  {/* Иконка удаления */}
                  {cell.showDeleteIcon && (
                    <Box
                      sx={{
                        position: "absolute",
                        top: 2,
                        right: 2,
                        backgroundColor: "rgba(255, 0, 0, 0.8)",
                        color: "white",
                        borderRadius: "50%",
                        width: { xs: 24, sm: 26, md: 30, lg: 34, xl: 38 }, // Увеличиваем для соответствия картинкам
                        height: { xs: 24, sm: 26, md: 30, lg: 34, xl: 38 }, // Увеличиваем для соответствия картинкам
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        zIndex: 10,
                        "&:hover": {
                          backgroundColor: "rgba(255, 0, 0, 1)",
                        },
                      }}
                    >
                      <Delete
                        sx={{
                          fontSize: { xs: 16, sm: 17, md: 18, lg: 20, xl: 22 },
                        }}
                      />{" "}
                      {/* Увеличиваем для ПК */}
                    </Box>
                  )}
                </Box>
              ))
            )}
          </Box>
        </Paper>

        {/* Панель с картинками для перетаскивания */}
        <Paper
          sx={{
            p: { xs: 1, sm: 1.5, md: 2 },
            width: {
              xs: "100%",
              sm: "100%",
              md: 400, // Уменьшаем ширину для лучшего переноса
              lg: 480, // Оптимизируем для больших экранов
              xl: 520, // Контролируем максимальную ширину
              // Landscape планшеты - оптимизируем ширину
              "@media (orientation: landscape) and (max-width: 1024px)": {
                width: "35vw",
                minWidth: "300px",
                maxWidth: "400px",
              },
            },
            maxWidth: { xs: "100%", sm: "90vw", md: "520px" },
            order: { xs: 2, md: 2 },
            // Убираем ограничения высоты и прокрутку полностью
            overflow: "visible",
            // Предотвращаем случайные touch действия
            touchAction: "manipulation",
          }}
        >
          <Typography
            variant="h6"
            sx={{
              mb: { xs: 1, sm: 1.5, md: 2 },
              textAlign: "center",
              fontSize: { xs: 14, sm: 16, md: 20, lg: 22, xl: 24 },
            }}
          >
            Перетащите на поле
          </Typography>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "repeat(4, 1fr)", // 4 колонки для телефонов
                sm: "repeat(5, 1fr)", // 5 колонок для планшетов
                md: "repeat(5, 1fr)", // 5 колонок для средних экранов (было 6, теперь 5 для лучшей упаковки)
                lg: "repeat(5, 1fr)", // 5 колонок для больших экранов
                xl: "repeat(6, 1fr)", // 6 колонок только для очень больших экранов
                // Landscape планшеты
                "@media (orientation: landscape) and (max-width: 1024px)": {
                  gridTemplateColumns: "repeat(4, 1fr)", // 4 колонки для landscape планшетов
                },
              },
              gap: {
                xs: 0.5, // Уменьшено для экономии места
                sm: 0.75, // Уменьшено
                md: 1, // Уменьшено с 1.5 до 1
                lg: 1.25, // Уменьшено с 2 до 1.25
                xl: 1.5, // Уменьшено с 2.5 до 1.5
              },
              // Убираем все ограничения по высоте и скроллу
              width: "100%",
            }}
          >
            {draggableImages.map((image, index) => (
              <Box
                key={image.id}
                onMouseDown={(e) => handleImageMouseDown(e, image, index)}
                onTouchStart={(e) => {
                  // Преобразуем touch в mouse event
                  const touch = e.touches[0];
                  const mouseEvent = {
                    ...e,
                    clientX: touch.clientX,
                    clientY: touch.clientY,
                    preventDefault: () => e.preventDefault(),
                  } as unknown as React.MouseEvent;
                  handleImageMouseDown(mouseEvent, image, index);
                }}
                sx={{
                  width: "100%",
                  aspectRatio: "1 / 1",
                  border: "1px solid",
                  borderColor:
                    image.usageCount >= image.maxUsage
                      ? "grey.400"
                      : "primary.main",
                  borderRadius: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor:
                    image.usageCount >= image.maxUsage
                      ? "grey.200"
                      : image.maxUsage - image.usageCount === 1
                      ? "#ffeb3b"
                      : "primary.light",
                  opacity: image.usageCount >= image.maxUsage ? 0.5 : 1,
                  cursor:
                    image.usageCount >= image.maxUsage ? "not-allowed" : "grab",
                  transition: "all 0.2s ease",
                  position: "relative",
                  userSelect: "none",
                  WebkitUserSelect: "none", // Safari
                  touchAction: "none", // Предотвращаем scroll на touch устройствах
                  WebkitTouchCallout: "none", // Убираем long-press меню на iOS
                  // Увеличиваем минимальный размер touch target
                  minHeight: { xs: "48px", sm: "56px" },
                  minWidth: { xs: "48px", sm: "56px" },
                  "&:hover":
                    image.usageCount < image.maxUsage
                      ? {
                          boxShadow: 2, // Уменьшено для более тонкого эффекта
                          transform: "scale(1.03)", // Уменьшено для стабильности
                        }
                      : {},
                  "&:active":
                    image.usageCount < image.maxUsage
                      ? {
                          cursor: "grabbing",
                          transform: "scale(0.97)", // Менее агрессивное сжатие
                        }
                      : {},
                }}
              >
                <Box
                  sx={{
                    position: "absolute",
                    inset: 4,
                    borderRadius: 0.5,
                    overflow: "hidden",
                    pointerEvents: "none",
                    userSelect: "none",
                  }}
                >
                  <Image
                    src={image.image}
                    alt={`image-${image.id}`}
                    fill
                    draggable={false}
                    style={{ objectFit: "cover" }}
                  />
                </Box>
              </Box>
            ))}
          </Box>
        </Paper>
      </Box>

      {/* Плавающий элемент для перетаскивания */}
      {isDragging && draggedImage && (
        <Box
          sx={{
            position: "fixed",
            left: dragPosition.x - 28, // Немного сдвигаем для лучшей точности
            top: dragPosition.y - 28,
            width: { xs: 56, sm: 64, md: 80, lg: 96, xl: 112 }, // Увеличиваем размер для соответствия картинкам
            height: { xs: 56, sm: 64, md: 80, lg: 96, xl: 112 }, // Увеличиваем размер для соответствия картинкам
            border: "2px solid",
            borderColor: "primary.main",
            borderRadius: 1,
            backgroundColor: "primary.light",
            boxShadow: "0 8px 16px rgba(0,0,0,0.35)",
            transform: "rotate(6deg) scale(1.15)", // Менее агрессивный эффект
            zIndex: 9999,
            pointerEvents: "none",
            transition: "none",
            // Добавляем индикатор для touch
            opacity: 0.95,
          }}
        >
          <Box
            sx={{
              position: "absolute",
              inset: 4,
              borderRadius: 0.5,
              overflow: "hidden",
              pointerEvents: "none",
            }}
          >
            <Image
              src={draggedImage.image}
              alt="dragging"
              fill
              draggable={false}
              style={{ objectFit: "cover" }}
            />
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default MEMORY_GAME_PAGE;
