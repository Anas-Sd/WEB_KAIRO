import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "KAIRO — Focus & Productivity",
  description: "Cross-platform productivity app with tasks, lists, and habits.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#09090B",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#09090B] text-[#E3E1EC] min-h-screen antialiased selection:bg-[#5A45FF]/30 selection:text-[#C5C0FF]">
        {children}
      </body>
    </html>
  );
}
