import { Box, Paper, Typography } from "@mui/material";
import { CardItem, CellPosition, AnimationType } from "../types";
import { GameCell } from "./GameCell";

interface GameBoardProps {
  gameBoard: CardItem[][];
  isMobile: boolean;
  lastFoundPair: CellPosition[];
  animationType: AnimationType;
  imageRemainingMap: Map<string, number>;
  celebrationAnimation: string;
  deletionAnimation: string;
  onCellClick: (row: number, col: number, e: React.MouseEvent) => void;
  onCellMouseDown: (e: React.MouseEvent, row: number, col: number) => void;
  onGameBoardClick: (e: React.MouseEvent) => void;
}

export const GameBoard = ({
  gameBoard,
  isMobile,
  lastFoundPair,
  animationType,
  imageRemainingMap,
  celebrationAnimation,
  deletionAnimation,
  onCellClick,
  onCellMouseDown,
  onGameBoardClick,
}: GameBoardProps) => {
  return (
    <Paper
      sx={{
        flex: {
          xs: "none",
          md: "1 1 720px",
          lg: "1 1 800px",
          xl: "1 1 1200px",
          "@media (orientation: landscape) and (max-width: 1024px)": {
            flex: "1 1 auto",
          },
        },
        width: {
          xs: "100%",
          sm: "100%",
          md: "auto",
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
      onClick={onGameBoardClick}
    >
      <Typography
        variant="h6"
        sx={{
          mb: { xs: 1, sm: 1.5, md: 2 },
          textAlign: "center",
          fontSize: { xs: 14, sm: 16, md: 20, lg: 22, xl: 24 },
        }}
      >
        Игровое поле {isMobile ? "(10×6)" : "(6×10)"}
        {isMobile && (
          <Typography
            variant="body2"
            sx={{
              fontSize: { xs: 10, sm: 12 },
              color: "text.secondary",
              mt: 0.5,
            }}
          >
            Нажмите на ячейку для выбора картинки
          </Typography>
        )}
      </Typography>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: isMobile ? "repeat(6, 1fr)" : "repeat(10, 1fr)",
          gap: {
            xs: 0.25,
            sm: 0.5,
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
            "@media (orientation: landscape) and (max-width: 1024px)": {
              width: "100%",
            },
          },
          maxHeight: {
            xs: "45vh",
            sm: "50vh",
            md: "none",
            "@media (orientation: landscape) and (max-width: 1024px)": {
              maxHeight: "calc(100vh - 160px)",
            },
          },
          mx: "auto",
          aspectRatio: isMobile ? "3/5" : "5/3",
        }}
      >
        {gameBoard.map((row, rowIndex) =>
          row.map((cell, colIndex) => {
            const isInLastPair = lastFoundPair.some(
              (pos) => pos.row === rowIndex && pos.col === colIndex
            );
            const imageRemaining = cell.image
              ? imageRemainingMap.get(cell.image) ?? 0
              : 0;

            return (
              <GameCell
                key={cell.id}
                cell={cell}
                rowIndex={rowIndex}
                colIndex={colIndex}
                isInLastPair={isInLastPair}
                animationType={animationType}
                imageRemaining={imageRemaining}
                onCellClick={onCellClick}
                onCellMouseDown={onCellMouseDown}
                celebrationAnimation={celebrationAnimation}
                deletionAnimation={deletionAnimation}
              />
            );
          })
        )}
      </Box>
    </Paper>
  );
};
