import { Box, Paper, Typography } from "@mui/material";
import { DraggableImage } from "../types";
import { ImageItem } from "./ImageItem";

interface ImagePanelProps {
  draggableImages: DraggableImage[];
  onImageMouseDown: (
    e: React.MouseEvent,
    image: DraggableImage,
    imageIndex: number
  ) => void;
}

export const ImagePanel = ({
  draggableImages,
  onImageMouseDown,
}: ImagePanelProps) => {
  return (
    <Paper
      sx={{
        p: { xs: 1, sm: 1.5, md: 2 },
        width: {
          xs: "100%",
          sm: "100%",
          md: 400,
          lg: 480,
          xl: 520,
          "@media (orientation: landscape) and (max-width: 1024px)": {
            width: "35vw",
            minWidth: "300px",
            maxWidth: "400px",
          },
        },
        maxWidth: { xs: "100%", sm: "90vw", md: "520px" },
        order: { xs: 2, md: 2 },
        overflow: "visible",
        touchAction: "manipulation",
      }}
    >
      <Typography
        variant="h6"
        sx={{
          mb: { xs: 1, sm: 1.5, md: 2 },
          textAlign: "center",
          fontSize: { xs: 14, sm: 16, md: 20, lg: 22, xl: 24 },
        }}
      >
        Перетащите на поле
      </Typography>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "repeat(4, 1fr)",
            sm: "repeat(5, 1fr)",
            md: "repeat(5, 1fr)",
            lg: "repeat(5, 1fr)",
            xl: "repeat(6, 1fr)",
            "@media (orientation: landscape) and (max-width: 1024px)": {
              gridTemplateColumns: "repeat(4, 1fr)",
            },
          },
          gap: {
            xs: 0.5,
            sm: 0.75,
            md: 1,
            lg: 1.25,
            xl: 1.5,
          },
          width: "100%",
        }}
      >
        {draggableImages.map((image, index) => (
          <ImageItem
            key={image.id}
            image={image}
            index={index}
            onMouseDown={onImageMouseDown}
          />
        ))}
      </Box>
    </Paper>
  );
};
