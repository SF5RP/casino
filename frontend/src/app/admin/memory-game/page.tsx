"use client";

import { useState, useCallback, useEffect } from "react";
import {
  Box,
  Typography,
  Grid,
  Paper,
  IconButton,
  Tooltip,
} from "@mui/material";
import { Casino, Refresh, Help, ArrowBack } from "@mui/icons-material";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "react-beautiful-dnd";

interface CardItem {
  id: string;
  image: string;
  isMatched: boolean;
  isFlipped: boolean;
  isPlaced: boolean;
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
  const [score, setScore] = useState(0);

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
    setDraggableImages(newImages);

    setIsGameStarted(true);
    setScore(0);

    console.log("✅ Игра инициализирована!");
  }, [initializeGameBoard, generateImages]);

  // Проверяем совпадения на поле
  const checkMatches = useCallback(() => {
    setGameBoard((prev) => {
      const newBoard = [...prev];
      let newScore = score;

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
              newScore += 10;
            }

            // Проверяем снизу
            if (
              row < 5 &&
              newBoard[row + 1][col].image === currentImage &&
              !newBoard[row + 1][col].isMatched
            ) {
              newBoard[row][col].isMatched = true;
              newBoard[row + 1][col].isMatched = true;
              newScore += 10;
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
              newScore += 15; // Бонус за диагональное совпадение
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
              newScore += 15; // Бонус за диагональное совпадение
            }
          }
        }
      }

      setScore(newScore);
      return newBoard;
    });
  }, [score]);

  // Обработка перетаскивания картинки на игровое поле
  const handleDragEnd = useCallback(
    (result: DropResult) => {
      if (!result.destination || !isGameStarted) return;

      const { source, destination } = result;

      // Если перетаскиваем с панели картинок на игровое поле
      if (
        source.droppableId === "draggable-images" &&
        destination.droppableId.startsWith("cell-")
      ) {
        const [row, col] = destination.droppableId
          .replace("cell-", "")
          .split("-")
          .map(Number);
        const imageId =
          source.droppableId === "draggable-images" ? source.index : 0;
        const image = draggableImages[imageId];

        if (image && image.usageCount < image.maxUsage) {
          // Обновляем игровое поле
          setGameBoard((prev) => {
            const newBoard = [...prev];
            newBoard[row][col] = {
              ...newBoard[row][col],
              image: image.image,
              isFlipped: true,
              isPlaced: true,
            };
            return newBoard;
          });

          // Увеличиваем счетчик использований
          setDraggableImages((prev) =>
            prev.map((img, idx) =>
              idx === imageId
                ? {
                    ...img,
                    usageCount: img.usageCount + 1,
                    isUsed: img.usageCount + 1 >= img.maxUsage, // Помечаем как использованное только когда достигнут лимит
                  }
                : img
            )
          );

          // Проверяем совпадения после размещения
          setTimeout(checkMatches, 100);
        }
      }
    },
    [draggableImages, isGameStarted, checkMatches]
  );

  // Обработчик клика по ячейке (для переворачивания картинок)
  const handleCellClick = useCallback(
    (row: number, col: number) => {
      if (!isGameStarted || !gameBoard[row][col].isPlaced) return;

      // Переворачиваем картинку
      setGameBoard((prev) => {
        const newBoard = [...prev];
        newBoard[row][col].isFlipped = !newBoard[row][col].isFlipped;
        return newBoard;
      });

      // Проверяем совпадения после каждого хода
      setTimeout(checkMatches, 100);
    },
    [isGameStarted, gameBoard, checkMatches]
  );

  useEffect(() => {
    startNewGame();
  }, [startNewGame]);

  return (
    <Box sx={{ p: 3, maxWidth: "1400px", margin: "0 auto" }}>
      <Box sx={{ display: "flex", alignItems: "center", mb: 3, gap: 2 }}>
        <Casino sx={{ fontSize: 32, color: "primary.main" }} />
        <Typography variant="h4" component="h1">
          Игра &quot;Найди пару&quot; - Помогатор
        </Typography>
        <Tooltip title="Начать новую игру">
          <IconButton onClick={startNewGame} color="primary" size="large">
            <Refresh />
          </IconButton>
        </Tooltip>
        <Tooltip title="Помощь по игре">
          <IconButton color="info" size="large">
            <Help />
          </IconButton>
        </Tooltip>
        <Tooltip title="Вернуться в админ-панель">
          <IconButton href="/admin" color="inherit" size="large">
            <ArrowBack />
          </IconButton>
        </Tooltip>
      </Box>

      <DragDropContext onDragEnd={handleDragEnd}>
        <Box
          sx={{
            display: "flex",
            gap: 3,
            flexWrap: "wrap",
            alignItems: "flex-start",
          }}
        >
          {/* Игровое поле 10x6 */}
          <Paper
            sx={{
              flex: 2,
              minWidth: "800px",
              maxWidth: "calc(100% - 200px)",
            }}
          >
            <Typography variant="h6" sx={{ mb: 2, textAlign: "center" }}>
              Игровое поле
            </Typography>
            <Grid container spacing={1}>
              {gameBoard.map((row, rowIndex) =>
                row.map((cell, colIndex) => (
                  <Grid item xs={1.2} key={cell.id}>
                    <Droppable
                      droppableId={`cell-${rowIndex}-${colIndex}`}
                      isDropDisabled={false}
                      isCombineEnabled={false}
                      ignoreContainerClipping={false}
                    >
                      {(provided, snapshot) => (
                        <Box
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          sx={{
                            width: "100%",
                            height: "100%",
                            minWidth: 80,
                            minHeight: 80,
                            maxWidth: 80,
                            maxHeight: 80,
                            border: "2px solid",
                            borderColor: cell.isMatched
                              ? "success.main"
                              : cell.isPlaced && cell.isFlipped
                              ? "primary.main"
                              : snapshot.isDraggingOver
                              ? "warning.main"
                              : "grey.300",
                            borderRadius: 1,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            backgroundColor: cell.isMatched
                              ? "success.light"
                              : cell.isPlaced && cell.isFlipped
                              ? "primary.light"
                              : snapshot.isDraggingOver
                              ? "warning.light"
                              : "grey.100",
                            cursor: cell.isPlaced ? "pointer" : "default",
                            transition: "all 0.2s",
                            "&:hover": cell.isPlaced
                              ? {
                                  transform: "scale(1.05)",
                                  boxShadow: 2,
                                }
                              : {},
                            ...(snapshot.isDraggingOver && {
                              backgroundColor: "warning.light",
                              borderColor: "warning.main",
                              transform: "scale(1.1)",
                            }),
                          }}
                          onClick={() => handleCellClick(rowIndex, colIndex)}
                        >
                          {cell.image && (
                            <Box
                              component="img"
                              src={cell.image}
                              alt="card"
                              sx={{
                                width: "100%",
                                height: "100%",
                                maxWidth: 60,
                                maxHeight: 60,
                                objectFit: "cover",
                                borderRadius: 0.5,
                                opacity: cell.isFlipped ? 1 : 0.3,
                              }}
                            />
                          )}
                          {provided.placeholder}
                        </Box>
                      )}
                    </Droppable>
                  </Grid>
                ))
              )}
            </Grid>
          </Paper>

          {/* Панель с картинками для перетаскивания */}
          <Paper sx={{ p: 2, width: "500px" }}>
            <Typography variant="h6" sx={{ mb: 2, textAlign: "center" }}>
              Перетащите на поле
            </Typography>
            <Droppable
              droppableId="draggable-images"
              isDropDisabled={false}
              isCombineEnabled={false}
              ignoreContainerClipping={false}
            >
              {(provided) => (
                <Box
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "repeat(6, 1fr)",
                    gap: 1,
                    minHeight: "500px",
                    maxWidth: "100%",
                    overflow: "hidden",
                  }}
                >
                  {draggableImages.map((image, index) => (
                    <Draggable
                      key={image.id}
                      draggableId={image.id}
                      index={index}
                      isDragDisabled={image.usageCount >= image.maxUsage}
                    >
                      {(provided, snapshot) => (
                        <Box
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          sx={{
                            width: "100%",
                            height: "100%",
                            maxWidth: 120,
                            maxHeight: 120,
                            border: "2px solid",
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
                            opacity:
                              image.usageCount >= image.maxUsage ? 0.5 : 1,
                            cursor:
                              image.usageCount >= image.maxUsage
                                ? "not-allowed"
                                : "grab",
                            transition: "all 0.2s",
                            position: "relative",
                            "&:hover":
                              image.usageCount < image.maxUsage
                                ? {
                                    transform: "scale(1.05)",
                                    boxShadow: 3,
                                  }
                                : {},
                            // Делаем картинки статичными - они не двигаются при перетаскивании
                            transform: snapshot.isDragging ? "none" : "none",
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
                              width: "100%",
                              height: "100%",
                              maxWidth: 100,
                              maxHeight: 100,
                              objectFit: "cover",
                              borderRadius: 0.5,
                              pointerEvents: "none",
                            }}
                          />
                          {/* Счетчик оставшихся использований */}
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
                            }}
                          >
                            {image.maxUsage - image.usageCount}
                          </Box>
                        </Box>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </Box>
              )}
            </Droppable>
          </Paper>
        </Box>
      </DragDropContext>

      {/* Инструкции по игре */}
      <Paper sx={{ p: 2, mt: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Как играть:
        </Typography>
        <Typography variant="body2" sx={{ mb: 1 }}>
          1. Нажмите кнопку &quot;Обновить&quot; для начала новой игры
        </Typography>
        <Typography variant="body2" sx={{ mb: 1 }}>
          2. Перетаскивайте картинки с правой панели на игровое поле
        </Typography>
        <Typography variant="body2" sx={{ mb: 1 }}>
          3. Используйте drag and drop для удобного размещения
        </Typography>
        <Typography variant="body2" sx={{ mb: 1 }}>
          4. Картинки в панели остаются на месте при перетаскивании
        </Typography>
        <Typography variant="body2" sx={{ mb: 1 }}>
          5. Каждое изображение можно разместить на поле **дважды**
        </Typography>
        <Typography variant="body2" sx={{ mb: 1 }}>
          6. Кликайте по размещенным картинкам, чтобы перевернуть их
        </Typography>
        <Typography variant="body2" sx={{ mb: 1 }}>
          7. Найдите пары одинаковых картинок для получения очков
        </Typography>
        <Typography variant="body2" sx={{ mb: 1 }}>
          8. Бонусы: горизонтальные/вертикальные пары = +10, диагональные = +15
        </Typography>
        <Typography variant="body2" sx={{ mb: 1 }}>
          9. Цель - набрать как можно больше очков за минимальное количество
          ходов
        </Typography>
        <Typography variant="body2">
          10. Используйте drag and drop для удобного размещения картинок!
        </Typography>
      </Paper>
    </Box>
  );
};

export default MEMORY_GAME_PAGE;
