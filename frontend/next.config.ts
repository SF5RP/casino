import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Прокси настройки удалены
  async headers() {
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
              "connect-src 'self' https://mc.yandex.ru wss: ws:",
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
