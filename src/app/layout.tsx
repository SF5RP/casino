import './globals.css';
import { Providers } from './providers';
import React from "react";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
    <head>
      <link
        href="https://fonts.googleapis.com/css2?family=Huninn:wght@400;700&display=swap"
        rel="stylesheet"
      />
    </head>
    <body style={{ fontFamily: 'Huninn, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
        <Providers>{children}</Providers>
    </body>
    </html>
  );
}