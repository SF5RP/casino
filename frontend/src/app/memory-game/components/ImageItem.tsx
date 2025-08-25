import { Box } from "@mui/material";
import Image from "next/image";
import { DraggableImage } from "../types";

interface ImageItemProps {
  image: DraggableImage;
  index: number;
  onMouseDown: (
    e: React.MouseEvent,
    image: DraggableImage,
    imageIndex: number
  ) => void;
}

export const ImageItem = ({ image, index, onMouseDown }: ImageItemProps) => {
  return (
    <Box
      onMouseDown={(e) => onMouseDown(e, image, index)}
      onTouchStart={(e) => {
        const touch = e.touches[0];
        const mouseEvent = {
          ...e,
          clientX: touch.clientX,
          clientY: touch.clientY,
          preventDefault: () => e.preventDefault(),
        } as unknown as React.MouseEvent;
        onMouseDown(mouseEvent, image, index);
      }}
      sx={{
        width: "100%",
        aspectRatio: "1 / 1",
        border: "1px solid",
        borderColor:
          image.usageCount >= image.maxUsage ? "grey.400" : "primary.main",
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
        cursor: image.usageCount >= image.maxUsage ? "not-allowed" : "grab",
        transition: "all 0.2s ease",
        position: "relative",
        userSelect: "none",
        WebkitUserSelect: "none",
        touchAction: "none",
        WebkitTouchCallout: "none",
        minHeight: { xs: "48px", sm: "56px" },
        minWidth: { xs: "48px", sm: "56px" },
        "&:hover":
          image.usageCount < image.maxUsage
            ? {
                boxShadow: 2,
                transform: "scale(1.03)",
              }
            : {},
        "&:active":
          image.usageCount < image.maxUsage
            ? {
                cursor: "grabbing",
                transform: "scale(0.97)",
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
          sizes="(max-width: 768px) 56px, (max-width: 1024px) 64px, 80px"
          draggable={false}
          style={{ objectFit: "cover" }}
        />
      </Box>
    </Box>
  );
};
