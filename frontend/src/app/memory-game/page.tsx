"use client";

import { useState, useCallback, useEffect } from "react";
import { Box, Typography, Paper, IconButton, Tooltip } from "@mui/material";
import { Casino, Refresh, Delete } from "@mui/icons-material";

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

    console.log("✅ Игра инициализирована!");
  }, [initializeGameBoard, generateImages]);

  // Проверяем совпадения на поле
  const checkMatches = useCallback(() => {
    setGameBoard((prev) => {
      const newBoard = [...prev];

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
            }

            // Проверяем снизу
            if (
              row < 5 &&
              newBoard[row + 1][col].image === currentImage &&
              !newBoard[row + 1][col].isMatched
            ) {
              newBoard[row][col].isMatched = true;
              newBoard[row + 1][col].isMatched = true;
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
            }
          }
        }
      }

      return newBoard;
    });
  }, []);

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

      // Увеличиваем счетчик использований
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
          if (a.usageCount >= a.maxUsage && b.usageCount < b.maxUsage) return 1;
          if (a.usageCount < a.maxUsage && b.usageCount >= b.maxUsage)
            return -1;
          return 0;
        });
      });

      // Проверяем совпадения после размещения
      setTimeout(checkMatches, 100);
    },
    [isGameStarted, checkMatches, gameBoard]
  );

  // Обработчики drag and drop с поддержкой touch
  const handleImageMouseDown = useCallback(
    (e: React.MouseEvent, image: DraggableImage, imageIndex: number) => {
      if (image.usageCount >= image.maxUsage || !isGameStarted) return;

      e.preventDefault();
      setDraggedImage(image);
      setDragPosition({ x: e.clientX, y: e.clientY });
      setIsDragging(true);

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
        setDraggedImage(null);
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

  // Удаление картинки с игрового поля
  const handleDeleteImage = useCallback(
    (row: number, col: number) => {
      const cell = gameBoard[row][col];
      if (!cell.image) return;

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

        // Очищаем ячейку на игровом поле
        setGameBoard((prev) => {
          const newBoard = [...prev];
          newBoard[row][col] = {
            ...newBoard[row][col],
            image: "",
            isFlipped: false,
            isPlaced: false,
            showDeleteIcon: false,
            isMatched: false,
          };
          return newBoard;
        });

        // Проверяем совпадения после удаления
        setTimeout(checkMatches, 100);
      }
    },
    [gameBoard, draggableImages, checkMatches]
  );

  // Обработчик клика по ячейке (для переворачивания картинок и показа иконки удаления)
  const handleCellClick = useCallback(
    (row: number, col: number, e: React.MouseEvent) => {
      if (!isGameStarted || !gameBoard[row][col].isPlaced) return;

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
    [isGameStarted, gameBoard, handleDeleteImage]
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
        maxWidth: "1400px",
        margin: "0 auto",
        width: "100%",
        minHeight: "100vh",
        boxSizing: "border-box",
      }}
      onClick={handlePageClick}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          mb: { xs: 1, sm: 2, lg: 3 },
          gap: { xs: 1, sm: 2 },
        }}
      >
        <Casino
          sx={{ fontSize: { xs: 24, sm: 28, lg: 32 }, color: "primary.main" }}
        />
        <Typography
          component="h1"
          sx={{ fontWeight: 600, fontSize: { xs: 18, sm: 20, md: 24, lg: 28 } }}
        >
          Игра &quot;Найди пару&quot;
        </Typography>
        <Tooltip title="Начать новую игру">
          <IconButton
            onClick={startNewGame}
            color="primary"
            size="medium"
            sx={{ fontSize: { xs: 20, md: 24 } }}
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
              md: "1 1 640px",
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
            maxWidth: { xs: "100%", sm: "80vw", md: "none" },
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
              fontSize: { xs: 14, sm: 16, md: 18 },
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
                    border: "1px solid", // Уменьшена толщина с 2px до 1px
                    borderColor: cell.isMatched
                      ? "success.main"
                      : cell.isPlaced && cell.isFlipped
                      ? "primary.main"
                      : "grey.300",
                    borderRadius: 1,
                    backgroundColor: cell.isMatched
                      ? "success.light"
                      : cell.isPlaced && cell.isFlipped
                      ? "primary.light"
                      : "grey.100",
                    cursor: cell.isPlaced ? "pointer" : "default",
                    transition: "all 0.2s ease",
                    "&:hover": cell.isPlaced
                      ? {
                          transform: "scale(1.02)",
                          boxShadow: 2,
                        }
                      : {},
                  }}
                  onClick={(e) => handleCellClick(rowIndex, colIndex, e)}
                >
                  {cell.image && (
                    <Box
                      component="img"
                      src={cell.image}
                      alt="card"
                      sx={{
                        position: "absolute",
                        inset: 4,
                        width: "calc(100% - 8px)",
                        height: "calc(100% - 8px)",
                        objectFit: "cover",
                        borderRadius: 0.5,
                        opacity: cell.isFlipped ? 1 : 0.3,
                        pointerEvents: "none",
                      }}
                    />
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
                        width: 24,
                        height: 24,
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
                      <Delete sx={{ fontSize: 16 }} />
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
              md: 380,
              lg: 420,
              // Landscape планшеты - увеличиваем ширину
              "@media (orientation: landscape) and (max-width: 1024px)": {
                width: "40vw",
                minWidth: "320px",
              },
            },
            maxWidth: { xs: "100%", sm: "90vw", md: "none" },
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
              fontSize: { xs: 14, sm: 16, md: 18 },
            }}
          >
            Перетащите на поле
          </Typography>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "repeat(4, 1fr)", // Уменьшено с 6 до 4 для увеличения размера
                sm: "repeat(5, 1fr)", // Уменьшено с 8 до 5
                md: "repeat(5, 1fr)", // Уменьшено с 6 до 5
                lg: "repeat(6, 1fr)",
                // Landscape планшеты
                "@media (orientation: landscape) and (max-width: 1024px)": {
                  gridTemplateColumns: "repeat(3, 1fr)", // Еще меньше для landscape
                },
              },
              gap: {
                xs: 0.75, // Увеличено для лучшего touch target
                sm: 1,
                md: 1.25,
                lg: 1.5,
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
                  border: "1px solid", // Уменьшена толщина с 2px до 1px
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
                  component="img"
                  src={image.image}
                  alt={`image-${image.id}`}
                  onError={(e) => {
                    e.currentTarget.src = image.fallbackImage;
                  }}
                  sx={{
                    position: "absolute",
                    inset: 4,
                    width: "calc(100% - 8px)",
                    height: "calc(100% - 8px)",
                    objectFit: "cover",
                    borderRadius: 0.5,
                    pointerEvents: "none",
                    userSelect: "none",
                  }}
                />
                <Box
                  sx={{
                    position: "absolute",
                    top: 2,
                    right: 2,
                    backgroundColor: "rgba(0, 0, 0, 0.7)",
                    color: "white",
                    borderRadius: "50%",
                    width: 20,
                    height: 20,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "12px",
                    fontWeight: "bold",
                    pointerEvents: "none",
                  }}
                >
                  {image.maxUsage - image.usageCount}
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
            width: 56, // Слегка уменьшено для touch точности
            height: 56,
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
            component="img"
            src={draggedImage.image}
            alt="dragging"
            sx={{
              position: "absolute",
              inset: 4,
              width: "calc(100% - 8px)",
              height: "calc(100% - 8px)",
              objectFit: "cover",
              borderRadius: 0.5,
              pointerEvents: "none",
            }}
          />
          <Box
            sx={{
              position: "absolute",
              top: 2,
              right: 2,
              backgroundColor: "rgba(0, 0, 0, 0.8)",
              color: "white",
              borderRadius: "50%",
              width: 18, // Увеличено для лучшей видимости
              height: 18,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "11px",
              fontWeight: "bold",
            }}
          >
            {draggedImage.maxUsage - draggedImage.usageCount}
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default MEMORY_GAME_PAGE;
