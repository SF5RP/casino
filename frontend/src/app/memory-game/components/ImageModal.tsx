import {
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
} from "@mui/material";
import { Close } from "@mui/icons-material";
import Image from "next/image";
import { DraggableImage } from "../types";

interface ImageModalProps {
  open: boolean;
  onClose: () => void;
  draggableImages: DraggableImage[];
  onImageSelect: (image: DraggableImage, imageIndex: number) => void;
}

export const ImageModal = ({
  open,
  onClose,
  draggableImages,
  onImageSelect,
}: ImageModalProps) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          borderRadius: 2,
          width: "calc(100vw - 32px)",
          height: "calc(100vh - 32px)",
          maxWidth: "none",
          maxHeight: "none",
          margin: "16px",
          overflow: "hidden",
        },
      }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          pb: 1,
        }}
      >
        Выберите картинку
        <IconButton onClick={onClose} size="small">
          <Close />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ p: 1, height: "100%", overflow: "hidden" }}>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 0.5,
            height: "100%",
            overflowY: "auto",
            width: "100%",
            padding: 0.5,
          }}
        >
          {draggableImages.map((image, index) => (
            <Box
              key={image.id}
              onClick={() => onImageSelect(image, index)}
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
                  image.usageCount >= image.maxUsage
                    ? "not-allowed"
                    : "pointer",
                transition: "all 0.2s ease",
                position: "relative",
                minWidth: 0,
                minHeight: 0,
                "&:hover":
                  image.usageCount < image.maxUsage
                    ? {
                        boxShadow: 2,
                        transform: "scale(1.05)",
                      }
                    : {},
              }}
            >
              <Box
                sx={{
                  position: "absolute",
                  inset: 1,
                  borderRadius: 0.5,
                  overflow: "hidden",
                  pointerEvents: "none",
                  width: "calc(100% - 2px)",
                  height: "calc(100% - 2px)",
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
              {image.usageCount >= image.maxUsage && (
                <Box
                  sx={{
                    position: "absolute",
                    top: 1,
                    right: 1,
                    backgroundColor: "rgba(0, 0, 0, 0.6)",
                    color: "white",
                    borderRadius: "50%",
                    width: 14,
                    height: 14,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 8,
                    fontWeight: "bold",
                  }}
                >
                  {image.usageCount}/{image.maxUsage}
                </Box>
              )}
            </Box>
          ))}
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 2, pt: 1 }}>
        <Button onClick={onClose} variant="outlined" fullWidth>
          Отмена
        </Button>
      </DialogActions>
    </Dialog>
  );
};
