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
  title: "CivicAgent — Election Process Guide",
  description:
    "Your AI-powered assistant for understanding election timelines, voter registration, and voting procedures. Personalized guidance for every US state.",
  keywords: [
    "election",
    "voter registration",
    "voting guide",
    "election timeline",
    "civic education",
  ],
  openGraph: {
    title: "CivicAgent — Election Process Guide",
    description:
      "AI-powered election process assistant with personalized state-by-state timelines.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
