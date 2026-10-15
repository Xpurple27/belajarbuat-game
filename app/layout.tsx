import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LevelUP Math Arena",
  description: "Multiplayer math games for tutor-led learning sessions.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
