import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ width: string; height: string }> }
) {
  const resolvedParams = await params;
  const { searchParams } = new URL(request.url);
  const text = searchParams.get("text") || "?";
  const width = parseInt(resolvedParams.width) || 150;
  const height = parseInt(resolvedParams.height) || 150;

  // Создаем простой SVG placeholder
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#f0f0f0"/>
      <rect width="100%" height="100%" fill="url(#gradient)"/>
      <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="24" 
            text-anchor="middle" dy=".3em" fill="#666">${text}</text>
      <defs>
        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#e0e0e0;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#c0c0c0;stop-opacity:1" />
        </linearGradient>
      </defs>
    </svg>
  `;

  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
