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
  title: "JS Compiler | Desktop JavaScript Compiler",
  description:
    "Write, run, and save JavaScript snippets offline with folders, templates, local DB, and Pro activation.",
  keywords: [
    "JavaScript Compiler",
    "Desktop App",
    "Electron",
    "JS IDE",
    "Code Snippets",
  ],
  openGraph: {
    title: "JS Compiler | Desktop JavaScript Compiler",
    description:
      "Write, run, and save JavaScript snippets offline with folders, templates, and Pro activation.",
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
