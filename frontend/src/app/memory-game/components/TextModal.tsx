import {
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  Typography,
} from "@mui/material";
import { Close } from "@mui/icons-material";
import { DraggableImage } from "../types";

interface TextModalProps {
  open: boolean;
  onClose: () => void;
  draggableImages: DraggableImage[];
  onImageSelect: (image: DraggableImage, imageIndex: number) => void;
}

export const TextModal = ({
  open,
  onClose,
  draggableImages,
  onImageSelect,
}: TextModalProps) => {
  // Генерируем тестовые названия на основе индекса
  const testNames = [
    "Машина",
    "Дискета",
    "Тако",
    "Пульт",
    "Кроссовок",
    "Скотч",
    "Кострюля",
    "Планшет",
    "Молоток",
    "Удостоверение",
    "Валик",
    "Котик",
    "Телефон",
    "Шашка",
    "Деньги",
    "Пистолет",
    "1929",
    "Кактус",
    "Ваза",
    "FUD",
    "Подушка",
    "Микрофон",
    "Пицца",
    "Пончик",
    "Хрень",
    "Ракетка",
    "Бусы",
    "Кусачки",
    "Сигары",
    "Газировка",
  ];

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
        Выберите название
        <IconButton onClick={onClose} size="small">
          <Close />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ p: 1, height: "100%", overflow: "hidden" }}>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: { xs: 0.75, sm: 1 },
            height: "100%",
            overflowY: "auto",
            width: "100%",
            padding: 0.5,
            alignContent: "start",
          }}
        >
          {draggableImages.map((image, index) => {
            const testName = testNames[index] || `Название ${index + 1}`;

            return (
              <Box
                key={image.id}
                onClick={() => onImageSelect(image, index)}
                sx={{
                  width: "100%",
                  minHeight: { xs: 32, sm: 36, md: 40 },
                  padding: { xs: 0.5, sm: 0.75 },
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
                  "&:hover":
                    image.usageCount < image.maxUsage
                      ? {
                          boxShadow: 2,
                          transform: "scale(1.05)",
                        }
                      : {},
                }}
              >
                <Typography
                  variant="body2"
                  sx={{
                    fontSize: { xs: 10, sm: 12, md: 14 },
                    fontWeight: 600,
                    textAlign: "center",
                    color:
                      image.usageCount >= image.maxUsage
                        ? "text.disabled"
                        : "text.primary",
                    padding: 0.5,
                    lineHeight: 1.2,
                  }}
                >
                  {testName}
                </Typography>

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
            );
          })}
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
