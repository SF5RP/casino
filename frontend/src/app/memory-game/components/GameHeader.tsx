import { Box, Typography, IconButton, Tooltip } from "@mui/material";
import { Casino, Refresh } from "@mui/icons-material";

interface GameHeaderProps {
  onNewGame: () => void;
  useTextModal: boolean;
  onToggleModalType: () => void;
}

export const GameHeader = ({
  onNewGame,
  useTextModal,
  onToggleModalType,
}: GameHeaderProps) => {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        mb: { xs: 1, sm: 2, lg: 3 },
        gap: { xs: 1, sm: 2 },
      }}
    >
      <Casino
        sx={{
          fontSize: { xs: 24, sm: 28, md: 30, lg: 32, xl: 34 },
          color: "primary.main",
        }}
      />
      <Typography
        component="h1"
        sx={{
          fontWeight: 600,
          fontSize: { xs: 18, sm: 20, md: 24, lg: 28, xl: 32 },
        }}
      >
        Игра &quot;Найди пару&quot;
      </Typography>
      <Tooltip title="Начать новую игру">
        <IconButton
          onClick={onNewGame}
          color="primary"
          size="medium"
          sx={{ fontSize: { xs: 20, md: 24, lg: 28, xl: 30 } }}
        >
          <Refresh />
        </IconButton>
      </Tooltip>

      {/* Переключатель типа модального окна - только для мобильных */}
      <Box
        sx={{
          display: { xs: "flex", md: "none" },
          alignItems: "center",
          gap: 1,
          ml: 2,
        }}
      >
        <Typography
          variant="body2"
          sx={{
            fontSize: { xs: 10, sm: 12 },
            color: "text.secondary",
            whiteSpace: "nowrap",
          }}
        >
          {useTextModal ? "Текст" : "Картинки"}
        </Typography>
        <Tooltip
          title={`Переключить на ${useTextModal ? "картинки" : "текст"}`}
        >
          <IconButton
            onClick={onToggleModalType}
            color="secondary"
            size="small"
            sx={{
              fontSize: { xs: 16, sm: 18 },
              backgroundColor: useTextModal ? "secondary.light" : "grey.100",
              "&:hover": {
                backgroundColor: useTextModal ? "secondary.main" : "grey.200",
              },
            }}
          >
            {useTextModal ? "🖼️" : "📝"}
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );
};
