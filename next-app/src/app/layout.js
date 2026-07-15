import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "JS Compiler | Offline Desktop JavaScript IDE",
  description:
    "Write, run, and save JavaScript offline. Free & Pro plans, multi-OS installers, and auto-update.",
  keywords: [
    "JavaScript Compiler",
    "Desktop App",
    "Electron",
    "JS IDE",
    "Code Snippets",
    "offline JavaScript",
  ],
  openGraph: {
    title: "JS Compiler | Offline Desktop JavaScript IDE",
    description:
      "Write, run, and save JavaScript offline with Pro languages, npm packages, and auto-update.",
    type: "website",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
