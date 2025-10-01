import React from "react";
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Collapse,
  IconButton,
  Typography,
} from "@mui/material";
import {
  Error as ErrorIcon,
  CheckCircle as CheckCircleIcon,
  Refresh as RefreshIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
} from "@mui/icons-material";

interface DatabaseStatusAlertProps {
  isConnected: boolean;
  isChecking: boolean;
  error?: string;
  onRetry: () => void;
  className?: string;
}

export const DatabaseStatusAlert: React.FC<DatabaseStatusAlertProps> = ({
  isConnected,
  isChecking,
  error,
  onRetry,
  className,
}) => {
  const [expanded, setExpanded] = React.useState(false);

  if (isConnected) {
    return (
      <Alert
        severity="success"
        icon={<CheckCircleIcon />}
        className={className}
        sx={{ backgroundColor: "#1a4d1a", border: "1px solid #2e7d2e" }}
      >
        <AlertTitle>База данных подключена</AlertTitle>
        PostgreSQL работает корректно
      </Alert>
    );
  }

  return (
    <Alert
      severity="error"
      icon={<ErrorIcon />}
      className={className}
      sx={{ backgroundColor: "#4d1a1a", border: "1px solid #7d2e2e" }}
    >
      <AlertTitle>Ошибка подключения к PostgreSQL</AlertTitle>

      <Typography variant="body2" sx={{ mb: 2 }}>
        Не удается подключиться к базе данных. Приложение работает в режиме
        in-memory storage.
      </Typography>

      <Box
        sx={{
          mb: 2,
          p: 1,
          backgroundColor: "rgba(0,0,0,0.2)",
          borderRadius: 1,
        }}
      >
        <Typography
          variant="caption"
          sx={{ color: "#bbb", fontSize: "0.7rem" }}
        >
          🔍 Проверяемый URL: {process.env.NEXT_PUBLIC_API_URL || "/api"}
          /health/database
        </Typography>
      </Box>

      <Box display="flex" alignItems="center" gap={1}>
        <Button
          variant="outlined"
          size="small"
          onClick={onRetry}
          disabled={isChecking}
          startIcon={<RefreshIcon />}
          sx={{
            color: "white",
            borderColor: "white",
            "&:hover": { borderColor: "#ccc" },
          }}
        >
          {isChecking ? "Проверка..." : "Повторить"}
        </Button>

        {error && (
          <IconButton
            size="small"
            onClick={() => setExpanded(!expanded)}
            sx={{ color: "white" }}
          >
            {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
        )}
      </Box>

      <Collapse in={expanded} timeout="auto" unmountOnExit>
        <Box
          sx={{
            mt: 2,
            p: 2,
            backgroundColor: "rgba(0,0,0,0.3)",
            borderRadius: 1,
            border: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          <Typography
            variant="body2"
            component="pre"
            sx={{
              fontSize: "0.75rem",
              fontFamily: "monospace",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              lineHeight: 1.4,
              color: "#ffcdd2",
            }}
          >
            {error}
          </Typography>

          <Box
            sx={{
              mt: 2,
              p: 1,
              backgroundColor: "rgba(0,0,0,0.2)",
              borderRadius: 1,
            }}
          >
            <Typography
              variant="caption"
              sx={{ color: "#bbb", fontSize: "0.7rem" }}
            >
              💡 Совет: Проверьте, что backend сервер запущен на порту 8011
            </Typography>
          </Box>
        </Box>
      </Collapse>
    </Alert>
  );
};
