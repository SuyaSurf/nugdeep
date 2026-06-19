import type { Metadata, Viewport } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import Script from "next/script";
import Nav from "@/components/Nav";
import "./globals.css";

export const dynamic = "force-dynamic";
const clerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

export const metadata: Metadata = {
  title: "Bammby — Play. Match. Decide what happens next.",
  description: "Pick a game, face a real player, then rematch, chat, or leave.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#0f172a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <Script
        strategy="afterInteractive"
        id="sw-register"
        dangerouslySetInnerHTML={{
          __html: `
            if ("serviceWorker" in navigator) {
              window.addEventListener("load", () => {
                navigator.serviceWorker.register("/sw.js");
              });
            }
          `,
        }}
      />
      <body className="bg-slate-950 text-slate-100 min-h-screen antialiased">
        {clerkKey ? (
          <ClerkProvider publishableKey={clerkKey}>
            <Nav authEnabled />
            {children}
          </ClerkProvider>
        ) : (
          <>
            <Nav authEnabled={false} />
            {children}
          </>
        )}
      </body>
    </html>
  );
}
