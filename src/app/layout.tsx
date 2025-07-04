import type { Metadata } from "next";
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

export const metadata: Metadata = {
  title: "xForm Studio - Design Your Own Instruction Set Architecture",
  description: "Create custom ISAs, write assembly code, and simulate processor execution with our comprehensive development environment for computer architecture education and research.",
  keywords: ["ISA", "Instruction Set Architecture", "Processor Design", "Assembly", "Simulation", "Computer Architecture", "xForm"],
  authors: [{ name: "xForm Studio Team" }],
  icons: {
    icon: [
      {
        url: "/favicon.svg",
        type: "image/svg+xml",
      },
    ],
  },
  openGraph: {
    title: "xForm Studio - Design Your Own ISA",
    description: "Professional tools for designing, developing, and simulating custom instruction set architectures",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "xForm Studio - Design Your Own ISA",
    description: "Professional tools for designing, developing, and simulating custom instruction set architectures",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
