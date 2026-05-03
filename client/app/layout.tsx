import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CivicAgent — Election Process Guide",
  description:
    "Your AI-powered assistant for understanding Indian election timelines, voter registration, and voting procedures. Personalized guidance for every state.",
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
      "AI-powered Indian election process assistant with personalized state-by-state timelines.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
