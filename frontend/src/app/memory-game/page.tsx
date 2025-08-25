"use client";

import { useEffect } from "react";
import { Box } from "@mui/material";
import Script from "next/script";
import "./styles.css";

// Компоненты
import {
  GameHeader,
  GameBoard,
  ImagePanel,
  DraggingOverlay,
  ImageModal,
  TextModal,
} from "./components";

// Хуки
import {
  useMemoryGame,
  useGameActions,
  useDragAndDrop,
  useMobileDetection,
} from "./hooks";

// Утилиты
import { celebrationAnimation, deletionAnimation } from "./utils/animations";

// Типы
import { DraggableImage } from "./types";

const MEMORY_GAME_PAGE = () => {
  const {
    // Состояния
    gameBoard,
    draggableImages,
    isGameStarted,
    draggedImage,
    dragPosition,
    isDragging,
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
  } = useMemoryGame();

  // Хук для действий с игрой
  const {
    handleCellToCell,
    handleImageDrop,
    handleCellClick,
    handleGameBoardClick,
    handlePageClick,
    handleImageSelect,
  } = useGameActions(
    gameBoard,
    draggableImages,
    isGameStarted,
    isMobile,
    isDragging,
    isDraggingFromCell,
    isAnimationRunning,
    setGameBoard,
    setDraggableImages,
    setLastFoundPair,
    setAnimationType,
    setIsAnimationRunning,
    checkMatches
  );

  // Хук для drag and drop
  const { handleImageMouseDown, handleCellMouseDown } = useDragAndDrop(
    isGameStarted,
    isMobile,
    gameBoard,
    setDraggedImage,
    setDragPosition,
    setIsDragging,
    setDraggedFromCell,
    setIsDraggingFromCell,
    handleImageDrop,
    handleCellToCell
  );

  // Хук для определения мобильного устройства
  useMobileDetection(setIsMobile);

  // Пересоздаем игровое поле при изменении мобильного режима
  useEffect(() => {
    if (isGameStarted) {
      console.log("📱 Режим изменился, пересоздаем игровое поле");
      startNewGame();
    }
  }, [isMobile, isGameStarted, startNewGame]);

  useEffect(() => {
    console.log("🚀 useEffect startNewGame вызван");
    startNewGame();
  }, [startNewGame]);

  // Очистка таймеров при размонтировании
  useEffect(() => {
    return () => {
      // Очищаем все таймеры при размонтировании
      setIsAnimationRunning(false);
      setLastFoundPair([]);
      setAnimationType(null);
    };
  }, [setIsAnimationRunning, setLastFoundPair, setAnimationType]);

  // Логирование состояния модального окна
  useEffect(() => {
    console.log("🔍 Состояние модального окна изменилось:", {
      isImageModalOpen,
      selectedCell,
      isMobile,
    });
  }, [isImageModalOpen, selectedCell, isMobile]);

  // Логирование изменения isMobile
  useEffect(() => {
    console.log("📱 Состояние isMobile изменилось:", isMobile);
  }, [isMobile]);

  // Добавляем отладку для проверки состояния игры
  useEffect(() => {
    console.log("🎮 Состояние игры изменилось:", {
      isGameStarted,
      gameBoardLength: gameBoard.length,
      gameBoardRows: gameBoard[0]?.length || 0,
      draggableImagesLength: draggableImages.length,
      isMobile,
      expectedRows: isMobile ? 10 : 6,
      expectedCols: isMobile ? 6 : 10,
    });
  }, [isGameStarted, gameBoard, draggableImages, isMobile]);

  // Отладка для проверки перерисовки поля
  useEffect(() => {
    console.log("🔄 Игровое поле изменилось:", {
      rows: gameBoard.length,
      cols: gameBoard[0]?.length || 0,
      totalCells: gameBoard.flat().length,
      placedImages: gameBoard.flat().filter((cell) => cell.isPlaced).length,
      matchedPairs:
        gameBoard.flat().filter((cell) => cell.isMatched).length / 2,
    });
  }, [gameBoard]);

  // Обработчик клика по ячейке с дополнительной логикой
  const handleCellClickWithModal = (
    row: number,
    col: number,
    e: React.MouseEvent
  ) => {
    const result = handleCellClick(row, col, e);

    if (result?.action === "openModal" && result.cell) {
      setSelectedCell(result.cell);
      setIsImageModalOpen(true);
    }
  };

  // Обработчик выбора изображения из модального окна
  const handleImageSelectFromModal = (
    image: DraggableImage,
    imageIndex: number
  ) => {
    if (selectedCell) {
      handleImageSelect(image, imageIndex, selectedCell);
      setIsImageModalOpen(false);
      setSelectedCell(null);
    }
  };

  // Обработчик закрытия модального окна
  const handleCloseModal = () => {
    setIsImageModalOpen(false);
    setSelectedCell(null);
  };

  // Обработчик переключения типа модального окна
  const handleToggleModalType = () => {
    console.log(
      `🔄 Переключаем модальное окно с ${
        useTextModal ? "текста" : "картинок"
      } на ${useTextModal ? "картинки" : "текст"}`
    );
    setUseTextModal(!useTextModal);
  };

  return (
    <Box
      sx={{
        p: { xs: 1, sm: 2, lg: 3 },
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

      <GameHeader
        onNewGame={startNewGame}
        useTextModal={useTextModal}
        onToggleModalType={handleToggleModalType}
      />

      <Box
        sx={{
          display: "flex",
          flexDirection: {
            xs: "column",
            sm: "column",
            md: "row",
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
            "@media (orientation: landscape) and (max-width: 1024px)": {
              maxHeight: "calc(100vh - 120px)",
            },
          },
        }}
      >
        <GameBoard
          gameBoard={gameBoard}
          isMobile={isMobile}
          lastFoundPair={lastFoundPair}
          animationType={animationType}
          imageRemainingMap={imageRemainingMap}
          celebrationAnimation={celebrationAnimation}
          deletionAnimation={deletionAnimation}
          onCellClick={handleCellClickWithModal}
          onCellMouseDown={handleCellMouseDown}
          onGameBoardClick={handleGameBoardClick}
        />

        {!isMobile && (
          <ImagePanel
            draggableImages={draggableImages}
            onImageMouseDown={handleImageMouseDown}
          />
        )}
      </Box>

      <DraggingOverlay
        isDragging={isDragging}
        draggedImage={draggedImage}
        dragPosition={dragPosition}
      />

      <ImageModal
        open={isImageModalOpen && !useTextModal}
        onClose={handleCloseModal}
        draggableImages={draggableImages}
        onImageSelect={handleImageSelectFromModal}
      />

      <TextModal
        open={isImageModalOpen && useTextModal}
        onClose={handleCloseModal}
        draggableImages={draggableImages}
        onImageSelect={handleImageSelectFromModal}
      />
    </Box>
  );
};

export default MEMORY_GAME_PAGE;
