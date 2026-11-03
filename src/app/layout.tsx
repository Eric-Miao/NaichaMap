import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import "./globals.css";
import "maplibre-gl/dist/maplibre-gl.css";

export const metadata: Metadata = {
  title: "奶茶地图 · 商场里的那一杯",
  description: "先看你所在的商场，再看 1 公里内的奶茶、饮品和咖啡店。",
  applicationName: "奶茶地图",
  formatDetection: { telephone: false, address: false, email: false },
  appleWebApp: { capable: true, title: "奶茶地图", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f6f0e5",
  colorScheme: "light",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
