import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("image") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "image/bmp",
      "image/webp",
    ];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: "Invalid file type" }, { status: 400 });
    }

    // Validate file size (10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json({ error: "File too large" }, { status: 400 });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const extension = file.name.split(".").pop();
    const filename = `${timestamp}_${randomString}.${extension}`;

    // File processing will be done by backend

    // Send file to backend for blue square detection
    const backendFormData = new FormData();
    backendFormData.append("image", file);

    try {
      // Получаем URL бэкенда из переменных окружения
      const backendUrl =
        process.env.BACKEND_URL ||
        process.env.NEXT_PUBLIC_API_URL ||
        "http://127.0.0.1:8011";
      const backendEndpoint = `${backendUrl.replace(
        "/api",
        ""
      )}/api/detect-blue-square`;

      console.log("Backend URL:", backendUrl);
      console.log("Backend Endpoint:", backendEndpoint);

      const backendResponse = await fetch(backendEndpoint, {
        method: "POST",
        body: backendFormData,
      });

      if (!backendResponse.ok) {
        throw new Error("Backend processing failed");
      }

      const backendResult = await backendResponse.json();
      console.log("Backend processing result:", backendResult);

      // Очищаем промежуточные изображения после обработки
      try {
        const cleanupResponse = await fetch(
          `${request.nextUrl.origin}/api/cleanup`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              originalPath: backendResult.processingSteps?.original,
              finalProcessedPath: backendResult.finalProcessedImage,
            }),
          }
        );

        if (cleanupResponse.ok) {
          const cleanupResult = await cleanupResponse.json();
          console.log("Frontend cleanup result:", cleanupResult);
        }
      } catch (cleanupError) {
        console.error("Frontend cleanup error:", cleanupError);
        // Не прерываем основной процесс из-за ошибки очистки
      }

      return NextResponse.json({
        success: true,
        filename,
        size: file.size,
        type: file.type,
        processing: backendResult,
      });
    } catch (backendError) {
      console.error("Backend error:", backendError);
      // Return success even if backend fails, but include error info
      return NextResponse.json({
        success: true,
        filename,
        size: file.size,
        type: file.type,
        processing: {
          found: false,
          error: "Backend processing failed",
        },
      });
    }
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
