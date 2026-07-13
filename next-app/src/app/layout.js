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
  title: "Vishvajeet Shukla | Full Stack Developer",
  description:
    "Full Stack Developer helping businesses build their online presence with modern web solutions. Specializing in Next.js, React, and Node.js.",
  keywords: [
    "Full Stack Developer",
    "Next.js",
    "React",
    "Node.js",
    "Web Developer",
  ],
  openGraph: {
    title: "Vishvajeet Shukla | Full Stack Developer",
    description:
      "Full Stack Developer helping businesses build their online presence with modern web solutions.",
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
