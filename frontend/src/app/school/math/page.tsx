"use client";

import { useState, useCallback } from "react";
import {
  Box,
  Container,
  Typography,
  Paper,
  Button,
  Card,
  CardContent,
  Chip,
  LinearProgress,
  IconButton,
  Grid,
  Fade,
  Zoom,
  useTheme,
  alpha,
} from "@mui/material";
import {
  CloudUpload,
  Image,
  CheckCircle,
  Error as ErrorIcon,
  Close,
} from "@mui/icons-material";
import { useDropzone } from "react-dropzone";

interface ProcessingResult {
  found: boolean;
  count: number;
  squares: Array<{
    x: number;
    y: number;
    width: number;
    height: number;
    confidence: number;
  }>;
  processedImage?: string;
  error?: string;
}

interface UploadedFile {
  id: string;
  file: File;
  name: string;
  size: number;
  processing?: ProcessingResult;
  isProcessing: boolean;
}

export default function MathPage() {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const theme = useTheme();

  const processFile = async (file: File) => {
    const fileId = Math.random().toString(36).substr(2, 9);

    // Добавляем файл в состояние
    const newFile: UploadedFile = {
      id: fileId,
      file,
      name: file.name,
      size: file.size,
      isProcessing: true,
    };

    setUploadedFiles((prev) => [...prev, newFile]);

    // Отправляем на обработку
    try {
      const formData = new FormData();
      formData.append("image", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const result = await response.json();

      // Обновляем результат обработки
      setUploadedFiles((prev) =>
        prev.map((f) =>
          f.id === fileId
            ? { ...f, processing: result.processing, isProcessing: false }
            : f
        )
      );
    } catch (error) {
      console.error("Upload error:", error);
      setUploadedFiles((prev) =>
        prev.map((f) =>
          f.id === fileId
            ? {
                ...f,
                processing: {
                  found: false,
                  count: 0,
                  squares: [],
                  error: "Ошибка обработки",
                },
                isProcessing: false,
              }
            : f
        )
      );
    }
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setIsUploading(true);

    for (const file of acceptedFiles) {
      await processFile(file);
    }

    setIsUploading(false);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".jpeg", ".jpg", ".png", ".gif", ".bmp", ".webp"],
    },
    maxSize: 10 * 1024 * 1024, // 10MB
    multiple: true,
  });

  const removeFile = (id: string) => {
    setUploadedFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        backgroundColor: "background.default",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Main Content */}
      <Container maxWidth="lg" sx={{ flex: 1, py: 4 }}>
        <Grid container spacing={4}>
          {/* Upload Area */}
          <Grid item xs={12} md={uploadedFiles.length > 0 ? 6 : 12}>
            <Zoom in timeout={800}>
              <Paper
                {...getRootProps()}
                sx={{
                  p: 4,
                  textAlign: "center",
                  cursor: "pointer",
                  border: `3px dashed ${
                    isDragActive
                      ? theme.palette.primary.main
                      : theme.palette.divider
                  }`,
                  backgroundColor: isDragActive
                    ? alpha(theme.palette.primary.main, 0.1)
                    : "background.paper",
                  transition: "all 0.3s ease",
                  "&:hover": {
                    borderColor: theme.palette.primary.main,
                    backgroundColor: alpha(theme.palette.primary.main, 0.05),
                  },
                  minHeight: uploadedFiles.length > 0 ? "300px" : "400px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <input {...getInputProps()} />
                <CloudUpload
                  sx={{
                    fontSize: 64,
                    color: isDragActive
                      ? theme.palette.primary.main
                      : theme.palette.text.secondary,
                    mb: 2,
                  }}
                />
                <Typography
                  variant="h5"
                  gutterBottom
                  sx={{ textAlign: "center" }}
                >
                  {isDragActive
                    ? "Отпустите файлы здесь"
                    : "Перетащите изображения сюда"}
                </Typography>
                <Typography
                  variant="body1"
                  color="text.secondary"
                  sx={{ mb: 3, textAlign: "center" }}
                >
                  или нажмите для выбора файлов
                </Typography>
                <Button
                  variant="contained"
                  size="large"
                  disabled={isUploading}
                  // eslint-disable-next-line jsx-a11y/alt-text
                  startIcon={<Image />}
                  sx={{ mb: 2 }}
                >
                  {isUploading ? "Обработка..." : "Выбрать файлы"}
                </Button>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ textAlign: "center" }}
                >
                  Поддерживаются: JPEG, PNG, GIF, BMP, WebP (до 10MB)
                </Typography>
              </Paper>
            </Zoom>
          </Grid>

          {/* Results */}
          {uploadedFiles.length > 0 && (
            <Grid item xs={12} md={6}>
              <Fade in timeout={1200}>
                <Paper sx={{ p: 3, height: "fit-content" }}>
                  <Typography variant="h5" gutterBottom>
                    Результаты анализа ({uploadedFiles.length})
                  </Typography>
                  <Box sx={{ maxHeight: "400px", overflow: "auto" }}>
                    {uploadedFiles.map((file, index) => (
                      <Zoom in timeout={1000 + index * 200} key={file.id}>
                        <Card sx={{ mb: 2 }}>
                          <CardContent>
                            <Box
                              display="flex"
                              justifyContent="space-between"
                              alignItems="flex-start"
                              mb={2}
                            >
                              <Box>
                                <Typography variant="h6" noWrap>
                                  {file.name}
                                </Typography>
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                >
                                  {formatFileSize(file.size)}
                                </Typography>
                              </Box>
                              <IconButton
                                onClick={() => removeFile(file.id)}
                                color="error"
                                size="small"
                              >
                                <Close />
                              </IconButton>
                            </Box>

                            {file.isProcessing ? (
                              <Box display="flex" alignItems="center" gap={2}>
                                <LinearProgress sx={{ flex: 1 }} />
                                <Typography variant="body2" color="primary">
                                  Обработка...
                                </Typography>
                              </Box>
                            ) : file.processing ? (
                              <Box>
                                <Box
                                  display="flex"
                                  alignItems="center"
                                  gap={2}
                                  mb={2}
                                >
                                  <Chip
                                    icon={
                                      file.processing.found ? (
                                        <CheckCircle />
                                      ) : (
                                        <ErrorIcon />
                                      )
                                    }
                                    label={
                                      file.processing.found
                                        ? `Найдено: ${file.processing.count}`
                                        : "Не найдено"
                                    }
                                    color={
                                      file.processing.found
                                        ? "success"
                                        : "error"
                                    }
                                    variant="outlined"
                                  />
                                  {file.processing.error && (
                                    <Chip
                                      icon={<ErrorIcon />}
                                      label={file.processing.error}
                                      color="error"
                                      size="small"
                                    />
                                  )}
                                </Box>

                                {file.processing.squares.length > 0 && (
                                  <Box>
                                    <Typography
                                      variant="subtitle2"
                                      gutterBottom
                                    >
                                      Найденные квадраты:
                                    </Typography>
                                    <Grid container spacing={1}>
                                      {file.processing.squares.map(
                                        (square, idx) => (
                                          <Grid item xs={6} key={idx}>
                                            <Card
                                              variant="outlined"
                                              sx={{ p: 1 }}
                                            >
                                              <Typography
                                                variant="caption"
                                                display="block"
                                              >
                                                Позиция: ({square.x}, {square.y}
                                                )
                                              </Typography>
                                              <Typography
                                                variant="caption"
                                                display="block"
                                              >
                                                Размер: {square.width} ×{" "}
                                                {square.height}
                                              </Typography>
                                              <Typography
                                                variant="caption"
                                                display="block"
                                              >
                                                Уверенность:{" "}
                                                {(
                                                  square.confidence * 100
                                                ).toFixed(1)}
                                                %
                                              </Typography>
                                            </Card>
                                          </Grid>
                                        )
                                      )}
                                    </Grid>
                                  </Box>
                                )}

                                {file.processing.processedImage && (
                                  <Box mt={2}>
                                    <Typography
                                      variant="subtitle2"
                                      gutterBottom
                                    >
                                      Обработанное изображение:
                                    </Typography>
                                    <Typography
                                      variant="caption"
                                      color="text.secondary"
                                    >
                                      {file.processing.processedImage}
                                    </Typography>
                                  </Box>
                                )}
                              </Box>
                            ) : null}
                          </CardContent>
                        </Card>
                      </Zoom>
                    ))}
                  </Box>
                </Paper>
              </Fade>
            </Grid>
          )}
        </Grid>
      </Container>
    </Box>
  );
}
