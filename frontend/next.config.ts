import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "cdn.discordapp.com", pathname: "/**" },
      { protocol: "https", hostname: "media.discordapp.net", pathname: "/**" },
      { protocol: "https", hostname: "avatars.githubusercontent.com", pathname: "/**" },
      { protocol: "https", hostname: "lh3.googleusercontent.com", pathname: "/**" },
    ],
  },
  // Добавляем прокси для API запросов в режиме разработки
  async rewrites() {
    const isDevelopment = process.env.NODE_ENV === "development";

    if (isDevelopment) {
      return [
        {
          source: "/api/:path*",
          destination: "http://localhost:8011/api/:path*",
        },
        {
          source: "/ws",
          destination: "http://localhost:8011/ws",
        },
      ];
    }

    return [];
  },

  async headers() {
    // В режиме разработки разрешаем подключения к localhost
    const isDevelopment = process.env.NODE_ENV === "development";

    return [
      {
        // Разрешаем отображение страницы в iframe для Яндекс Метрики
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://mc.yandex.ru https://yastatic.net",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: https://mc.yandex.ru",
              isDevelopment
                ? "connect-src 'self' https://mc.yandex.ru wss: ws: http://localhost:* http://127.0.0.1:*"
                : "connect-src 'self' https://mc.yandex.ru wss: ws: http://localhost:8011 http://127.0.0.1:8011",
              "frame-ancestors 'self' https://webvisor.com https://*.yandex.ru https://*.yandex.com",
              "object-src 'none'",
              "base-uri 'self'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
