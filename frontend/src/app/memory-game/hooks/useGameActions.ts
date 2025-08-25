import { useCallback } from "react";
import {
  DraggableImage,
  CellPosition,
  CardItem,
  AnimationType,
} from "../types";

export const useGameActions = (
  gameBoard: CardItem[][],
  draggableImages: DraggableImage[],
  isGameStarted: boolean,
  isMobile: boolean,
  isDragging: boolean,
  isDraggingFromCell: boolean,
  isAnimationRunning: boolean,
  setGameBoard: (
    updater: CardItem[][] | ((prev: CardItem[][]) => CardItem[][])
  ) => void,
  setDraggableImages: (
    updater: DraggableImage[] | ((prev: DraggableImage[]) => DraggableImage[])
  ) => void,
  setLastFoundPair: (pairs: CellPosition[]) => void,
  setAnimationType: (type: AnimationType) => void,
  setIsAnimationRunning: (running: boolean) => void,
  checkMatches: () => void
) => {
  // Обработка перемещения картинки между ячейками поля
  const handleCellToCell = useCallback(
    (fromRow: number, fromCol: number, toRow: number, toCol: number) => {
      if (!isGameStarted) return;

      // Если перетаскиваем в ту же ячейку, ничего не делаем
      if (fromRow === toRow && fromCol === toCol) return;

      const fromCell = gameBoard[fromRow][fromCol];
      const toCell = gameBoard[toRow][toCol];

      if (!fromCell.image || !fromCell.isPlaced) return;

      setGameBoard((prev: CardItem[][]) => {
        const newBoard = prev.map((row: CardItem[]) => row.slice()); // Глубокое копирование

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

      // Проверяем совпадения после перемещения с задержкой
      setTimeout(() => {
        if (!isAnimationRunning) {
          checkMatches();
        }
      }, 200);
    },
    [isGameStarted, gameBoard, checkMatches, isAnimationRunning, setGameBoard]
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
      setGameBoard((prev: CardItem[][]) => {
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
        setDraggableImages((prev: DraggableImage[]) => {
          const newImages = prev.map((img: DraggableImage, idx: number) =>
            idx === imageIndex
              ? {
                  ...img,
                  usageCount: img.usageCount + 1,
                  isUsed: img.usageCount + 1 >= img.maxUsage,
                }
              : img
          );

          // Сортируем: сначала доступные картинки, потом использованные
          return newImages.sort((a: DraggableImage, b: DraggableImage) => {
            if (a.usageCount >= a.maxUsage && b.usageCount < b.maxUsage)
              return 1;
            if (a.usageCount < a.maxUsage && b.usageCount >= b.maxUsage)
              return -1;
            return 0;
          });
        });
      }

      // Проверяем совпадения после размещения с задержкой
      setTimeout(() => {
        if (!isAnimationRunning) {
          checkMatches();
        }
      }, 200);
    },
    [
      isGameStarted,
      checkMatches,
      gameBoard,
      isDraggingFromCell,
      isAnimationRunning,
      setGameBoard,
      setDraggableImages,
    ]
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
        setDraggableImages((prev: DraggableImage[]) => {
          const newImages = prev.map((img: DraggableImage, idx: number) =>
            idx === imageIndex
              ? {
                  ...img,
                  usageCount: Math.max(0, img.usageCount - 1),
                  isUsed: Math.max(0, img.usageCount - 1) >= img.maxUsage,
                }
              : img
          );

          // Сортируем: сначала доступные картинки, потом использованные
          return newImages.sort((a: DraggableImage, b: DraggableImage) => {
            if (a.usageCount >= a.maxUsage && b.usageCount < b.maxUsage)
              return 1;
            if (a.usageCount < a.maxUsage && b.usageCount >= b.maxUsage)
              return -1;
            return 0;
          });
        });

        // Очищаем ячейку на игровом поле и снимаем статус совпадения у парной картинки
        setGameBoard((prev: CardItem[][]) => {
          const newBoard = prev.map((r: CardItem[]) =>
            r.map((c: CardItem) => ({ ...c }))
          );
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

        // Запускаем короткую анимацию удаления только если нет других анимаций
        if (!isAnimationRunning) {
          setIsAnimationRunning(true);
          setTimeout(() => {
            setAnimationType("deletion");
            setLastFoundPair([{ row, col }]);
            setTimeout(() => {
              setLastFoundPair([]);
              setAnimationType(null);
              setIsAnimationRunning(false);
            }, 1000); // Короткая подсветка для удаления
          }, 100);
        }

        // Проверяем совпадения после удаления с задержкой
        setTimeout(() => {
          if (!isAnimationRunning) {
            checkMatches();
          }
        }, 200);
      }
    },
    [
      gameBoard,
      draggableImages,
      checkMatches,
      isAnimationRunning,
      setGameBoard,
      setDraggableImages,
      setLastFoundPair,
      setAnimationType,
      setIsAnimationRunning,
    ]
  );

  // Обработчик клика по ячейке (для переворачивания картинок и показа иконки удаления)
  const handleCellClick = useCallback(
    (row: number, col: number, e: React.MouseEvent) => {
      console.log("🎯 handleCellClick вызван:", {
        row,
        col,
        isGameStarted,
        isDragging,
        isMobile,
      });
      console.log("📊 Состояние ячейки:", gameBoard[row]?.[col]);

      if (!isGameStarted) {
        console.log("❌ Игра не начата");
        return;
      }

      // Для мобильных устройств разрешаем клик по пустым ячейкам для размещения картинки
      if (!isMobile && !gameBoard[row]?.[col]?.isPlaced) {
        console.log("❌ Ячейка не содержит картинку (только для десктопа)");
        return;
      }

      if (isDragging) {
        console.log("❌ Происходит перетаскивание");
        return;
      }

      // Для мобильных устройств открываем модальное окно с картинками (работает для всех ячеек)
      if (isMobile) {
        console.log("📱 Мобильное устройство, открываем модальное окно");
        console.log("🎯 Устанавливаем selectedCell:", { row, col });
        console.log("🚪 Устанавливаем isImageModalOpen в true");
        return { action: "openModal", cell: { row, col } };
      }

      // Предотвращаем всплытие события
      e.stopPropagation();

      const cell = gameBoard[row][col];
      console.log("✅ Ячейка валидна, cell:", cell);

      if (cell.showDeleteIcon) {
        // Второй клик - удаляем картинку
        handleDeleteImage(row, col);
        return { action: "delete" };
      } else {
        // Скрываем все иконки удаления перед показом новой
        setGameBoard((prev: CardItem[][]) => {
          const newBoard = prev.map((row: CardItem[]) =>
            row.map((cell: CardItem) => ({
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
          setGameBoard((prev: CardItem[][]) => {
            const newBoard = [...prev];
            if (newBoard[row][col] && newBoard[row][col].showDeleteIcon) {
              newBoard[row][col].showDeleteIcon = false;
            }
            return newBoard;
          });
        }, 3000);

        return { action: "showDeleteIcon" };
      }
    },
    [
      isGameStarted,
      gameBoard,
      handleDeleteImage,
      isDragging,
      isMobile,
      setGameBoard,
    ]
  );

  // Обработчик клика по игровому полю для скрытия иконок удаления
  const handleGameBoardClick = useCallback(
    (e: React.MouseEvent) => {
      // Проверяем, что клик был именно по игровому полю, а не по ячейке
      if (e.target === e.currentTarget) {
        setGameBoard((prev: CardItem[][]) => {
          const newBoard = prev.map((row: CardItem[]) =>
            row.map((cell: CardItem) => ({
              ...cell,
              showDeleteIcon: false,
            }))
          );
          return newBoard;
        });
      }
    },
    [setGameBoard]
  );

  // Обработчик клика по странице для скрытия иконок удаления
  const handlePageClick = useCallback(() => {
    setGameBoard((prev: CardItem[][]) => {
      const newBoard = prev.map((row: CardItem[]) =>
        row.map((cell: CardItem) => ({
          ...cell,
          showDeleteIcon: false,
        }))
      );
      return newBoard;
    });
  }, [setGameBoard]);

  // Размещение картинки из модального окна
  const handleImageSelect = useCallback(
    (image: DraggableImage, imageIndex: number, selectedCell: CellPosition) => {
      console.log("🖼️ handleImageSelect вызван:", {
        image,
        imageIndex,
        selectedCell,
        isGameStarted,
      });

      if (!selectedCell) {
        console.log("❌ Нет выбранной ячейки");
        return;
      }

      if (!isGameStarted) {
        console.log("❌ Игра не начата");
        return;
      }

      if (image.usageCount >= image.maxUsage) {
        console.log("❌ Картинка уже использована максимальное количество раз");
        return;
      }

      const { row, col } = selectedCell;
      console.log("✅ Размещаем картинку в ячейку:", { row, col });

      // Проверяем, есть ли уже картинка в этой ячейке
      if (gameBoard[row][col].image) {
        console.log(
          "❌ Ячейка уже занята картинкой:",
          gameBoard[row][col].image
        );
        return; // Если ячейка уже занята, ничего не делаем
      }

      // Обновляем игровое поле
      setGameBoard((prev: CardItem[][]) => {
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
      setDraggableImages((prev: DraggableImage[]) => {
        const newImages = prev.map((img: DraggableImage, idx: number) =>
          idx === imageIndex
            ? {
                ...img,
                usageCount: img.usageCount + 1,
                isUsed: img.usageCount + 1 >= img.maxUsage,
              }
            : img
        );

        // Сортируем: сначала доступные картинки, потом использованные
        return newImages.sort((a: DraggableImage, b: DraggableImage) => {
          if (a.usageCount >= a.maxUsage && b.usageCount < b.maxUsage) return 1;
          if (a.usageCount < a.maxUsage && b.usageCount >= b.maxUsage)
            return -1;
          return 0;
        });
      });

      console.log("✅ Картинка успешно размещена, закрываем модальное окно");

      // Проверяем совпадения после размещения с задержкой
      setTimeout(() => {
        if (!isAnimationRunning) {
          checkMatches();
        }
      }, 200);
    },
    [
      isGameStarted,
      gameBoard,
      checkMatches,
      isAnimationRunning,
      setGameBoard,
      setDraggableImages,
    ]
  );

  return {
    handleCellToCell,
    handleImageDrop,
    handleDeleteImage,
    handleCellClick,
    handleGameBoardClick,
    handlePageClick,
    handleImageSelect,
  };
};
