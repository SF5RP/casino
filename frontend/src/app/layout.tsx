import "./globals.css";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import { Providers } from "./providers";
import React from "react";
import { Navigation } from "@/components/shared/Navigation";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <body>
        <Providers>
          <Navigation />
          {children}
        </Providers>
      </body>
    </html>
  );
}
