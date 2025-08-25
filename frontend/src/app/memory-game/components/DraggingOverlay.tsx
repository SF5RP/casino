import { Box } from "@mui/material";
import Image from "next/image";
import { DraggableImage } from "../types";

interface DraggingOverlayProps {
  isDragging: boolean;
  draggedImage: DraggableImage | null;
  dragPosition: { x: number; y: number };
}

export const DraggingOverlay = ({
  isDragging,
  draggedImage,
  dragPosition,
}: DraggingOverlayProps) => {
  if (!isDragging || !draggedImage) return null;

  return (
    <Box
      sx={{
        position: "fixed",
        left: dragPosition.x - 28,
        top: dragPosition.y - 28,
        width: { xs: 56, sm: 64, md: 80, lg: 96, xl: 112 },
        height: { xs: 56, sm: 64, md: 80, lg: 96, xl: 112 },
        border: "2px solid",
        borderColor: "primary.main",
        borderRadius: 1,
        backgroundColor: "primary.light",
        boxShadow: "0 8px 16px rgba(0,0,0,0.35)",
        transform: "rotate(6deg) scale(1.15)",
        zIndex: 9999,
        pointerEvents: "none",
        transition: "none",
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
          sizes="(max-width: 768px) 56px, (max-width: 1024px) 64px, 80px"
          draggable={false}
          style={{ objectFit: "cover" }}
        />
      </Box>
    </Box>
  );
};
