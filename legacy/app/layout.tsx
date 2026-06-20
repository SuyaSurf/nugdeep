import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bammby Games",
  description: "A social-first network with daily proof-of-judgment games.",
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg"
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
