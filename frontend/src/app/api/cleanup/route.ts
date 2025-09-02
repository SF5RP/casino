import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

export async function POST(request: NextRequest) {
  try {
    const { originalPath, finalProcessedPath } = await request.json();

    const uploadsDir = path.join(process.cwd(), "public", "uploads");

    // Получаем список всех файлов в директории uploads
    const files = await fs.readdir(uploadsDir);

    // Паттерны временных файлов для удаления
    const tempPatterns = [
      "temp_*",
      "edges_debug_*",
      "*_row_*.bmp",
      "*_r*c*.bmp",
      "cropped_*",
      "original_*",
    ];

    let deletedCount = 0;
    const deletedFiles: string[] = [];

    for (const file of files) {
      const filePath = path.join(uploadsDir, file);

      // Пропускаем оригинальный и финальный обработанный файлы
      if (filePath === originalPath || filePath === finalProcessedPath) {
        continue;
      }

      // Проверяем, является ли файл временным
      let shouldDelete = false;

      for (const pattern of tempPatterns) {
        if (matchPattern(file, pattern)) {
          shouldDelete = true;
          break;
        }
      }

      // Дополнительная проверка на временные файлы по содержимому имени
      if (!shouldDelete) {
        if (
          file.includes("temp_") ||
          file.includes("debug_") ||
          file.includes("_row_") ||
          (file.includes("_r") && file.includes("c")) ||
          file.startsWith("cropped_") ||
          file.startsWith("original_")
        ) {
          shouldDelete = true;
        }
      }

      if (shouldDelete) {
        try {
          await fs.unlink(filePath);
          deletedFiles.push(file);
          deletedCount++;
          console.log(`[Frontend Cleanup] Deleted temp file: ${file}`);
        } catch (error) {
          console.error(
            `[Frontend Cleanup] Failed to delete temp file ${file}:`,
            error
          );
        }
      }
    }

    console.log(
      `[Frontend Cleanup] Cleanup completed. Deleted ${deletedCount} temporary files`
    );

    return NextResponse.json({
      success: true,
      deletedCount,
      deletedFiles,
      message: `Deleted ${deletedCount} temporary files`,
    });
  } catch (error) {
    console.error("[Frontend Cleanup] Error:", error);
    return NextResponse.json(
      {
        error: "Cleanup failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// Простая функция для проверки соответствия паттерну
function matchPattern(filename: string, pattern: string): boolean {
  // Заменяем * на .* для regex
  const regexPattern = pattern.replace(/\*/g, ".*");
  const regex = new RegExp(`^${regexPattern}$`);
  return regex.test(filename);
}
