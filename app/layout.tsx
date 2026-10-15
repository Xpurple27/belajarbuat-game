import type { Metadata } from "next";
import PlayerFinishNavigator from "@/src/components/PlayerFinishNavigator";
import "./globals.css";
import "./uat-v2.css";
import "./arena-v2.css";
import "./visual-v3.css";

export const metadata: Metadata = {
  title: "LevelUP Math Arena",
  description: "Multiplayer math games for tutor-led learning sessions.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body>
        <PlayerFinishNavigator />
        {children}
      </body>
    </html>
  );
}
