import { Box } from "@mui/material";
import Image from "next/image";
import { Delete } from "@mui/icons-material";
import { CardItem, AnimationType } from "../types";

interface GameCellProps {
  cell: CardItem;
  rowIndex: number;
  colIndex: number;
  isInLastPair: boolean;
  animationType: AnimationType;
  imageRemaining: number;
  onCellClick: (row: number, col: number, e: React.MouseEvent) => void;
  onCellMouseDown: (e: React.MouseEvent, row: number, col: number) => void;
  celebrationAnimation: string;
  deletionAnimation: string;
}

export const GameCell = ({
  cell,
  rowIndex,
  colIndex,
  isInLastPair,
  animationType,
  imageRemaining,
  onCellClick,
  onCellMouseDown,
  celebrationAnimation,
  deletionAnimation,
}: GameCellProps) => {
  return (
    <Box
      data-cell-id={`${rowIndex}-${colIndex}`}
      className={(() => {
        if (!isInLastPair) return "";

        switch (animationType) {
          case "celebration":
            return "memory-game-found-pair memory-game-celebration";
          case "deletion":
            return "memory-game-found-pair memory-game-deletion";
          default:
            return "memory-game-found-pair";
        }
      })()}
      sx={{
        position: "relative",
        width: "100%",
        aspectRatio: "1 / 1",
        borderStyle: "solid",
        borderColor: (() => {
          if (cell.isMatched) return "success.main";
          if (!isInLastPair) return "#000";

          switch (animationType) {
            case "celebration":
              return "#00ff00";
            case "deletion":
              return "#f44336";
            default:
              return "#00ff00";
          }
        })(),
        borderWidth: (() => {
          if (cell.isMatched) return 2;
          return isInLastPair ? 6 : 1;
        })(),
        borderRadius: 1,
        backgroundColor: (() => {
          if (imageRemaining === 1) return "#ffeb3b";
          if (cell.isMatched) return "success.light";
          if (isInLastPair) {
            switch (animationType) {
              case "celebration":
                return "rgba(0, 255, 0, 0.2)";
              case "deletion":
                return "rgba(244, 67, 54, 0.2)";
              default:
                return "rgba(0, 255, 0, 0.2)";
            }
          }
          if (cell.isPlaced && cell.isFlipped) return "primary.light";
          return "grey.100";
        })(),
        cursor: cell.isPlaced ? "pointer" : "default",
        transition: "all 0.3s ease",
        boxShadow: (() => {
          if (!isInLastPair) return "none";

          switch (animationType) {
            case "celebration":
              return "0 0 20px rgba(0, 255, 0, 0.9), 0 0 30px rgba(0, 255, 0, 0.6), 0 0 40px rgba(0, 255, 0, 0.4), inset 0 0 10px rgba(0, 255, 0, 0.3)";
            case "deletion":
              return "0 0 20px rgba(244, 67, 54, 0.9), 0 0 30px rgba(244, 67, 54, 0.6), 0 0 40px rgba(244, 67, 54, 0.4), inset 0 0 10px rgba(244, 67, 54, 0.3)";
            default:
              return "0 0 20px rgba(0, 255, 0, 0.9), 0 0 30px rgba(0, 255, 0, 0.6), 0 0 40px rgba(0, 255, 0, 0.4), inset 0 0 10px rgba(0, 255, 0, 0.3)";
          }
        })(),
        outline: "none",
        animation: (() => {
          if (!isInLastPair) return "none";

          switch (animationType) {
            case "celebration":
              return `${celebrationAnimation} 0.6s ease-in-out 3`;
            case "deletion":
              return `${deletionAnimation} 0.8s ease-in-out infinite`;
            default:
              return "none";
          }
        })(),
        "&:hover": cell.isPlaced
          ? {
              transform: "scale(1.02)",
              boxShadow: "0 6px 14px rgba(0,0,0,0.25)",
            }
          : {},
      }}
      onClick={(e) => onCellClick(rowIndex, colIndex, e)}
    >
      {cell.image && (
        <Box
          onMouseDown={(e) => onCellMouseDown(e, rowIndex, colIndex)}
          onTouchStart={(e) => {
            const touch = e.touches[0];
            const mouseEvent = {
              ...e,
              clientX: touch.clientX,
              clientY: touch.clientY,
              preventDefault: () => e.preventDefault(),
              stopPropagation: () => e.stopPropagation(),
            } as unknown as React.MouseEvent;
            onCellMouseDown(mouseEvent, rowIndex, colIndex);
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
            sizes="(max-width: 768px) 56px, (max-width: 1024px) 64px, 80px"
            draggable={false}
            style={{ objectFit: "cover" }}
          />

          {isInLastPair && <Box className="found-pair-glow" />}
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
            width: { xs: 24, sm: 26, md: 30, lg: 34, xl: 38 },
            height: { xs: 24, sm: 26, md: 30, lg: 34, xl: 38 },
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
              fontSize: {
                xs: 16,
                sm: 17,
                md: 18,
                lg: 20,
                xl: 22,
              },
            }}
          />
        </Box>
      )}
    </Box>
  );
};
