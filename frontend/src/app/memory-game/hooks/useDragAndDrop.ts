import { useCallback } from "react";
import { DraggableImage, CellPosition, CardItem } from "../types";

export const useDragAndDrop = (
  isGameStarted: boolean,
  isMobile: boolean,
  gameBoard: CardItem[][],
  setDraggedImage: (image: DraggableImage | null) => void,
  setDragPosition: (position: { x: number; y: number }) => void,
  setIsDragging: (dragging: boolean) => void,
  setDraggedFromCell: (cell: CellPosition | null) => void,
  setIsDraggingFromCell: (dragging: boolean) => void,
  handleImageDrop: (
    image: DraggableImage,
    imageIndex: number,
    row: number,
    col: number
  ) => void,
  handleCellToCell: (
    fromRow: number,
    fromCol: number,
    toRow: number,
    toCol: number
  ) => void
) => {
  // Обработчики drag and drop с поддержкой touch
  const handleImageMouseDown = useCallback(
    (e: React.MouseEvent, image: DraggableImage, imageIndex: number) => {
      if (image.usageCount >= image.maxUsage || !isGameStarted || isMobile)
        return;

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
    [
      isGameStarted,
      handleImageDrop,
      isMobile,
      setDraggedImage,
      setDragPosition,
      setIsDragging,
      setDraggedFromCell,
      setIsDraggingFromCell,
    ]
  );

  // Обработчик начала перетаскивания из ячейки поля
  const handleCellMouseDown = useCallback(
    (e: React.MouseEvent, row: number, col: number) => {
      const cell = gameBoard[row][col];
      if (!cell.image || !cell.isPlaced || !isGameStarted || isMobile) return;

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
    [
      isGameStarted,
      gameBoard,
      handleCellToCell,
      isMobile,
      setDraggedImage,
      setDragPosition,
      setIsDragging,
      setDraggedFromCell,
      setIsDraggingFromCell,
    ]
  );

  return {
    handleImageMouseDown,
    handleCellMouseDown,
  };
};
