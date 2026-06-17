"use client";

import { ClerkProvider } from "@clerk/nextjs";

const clerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

export default function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!clerkKey) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-red-400">Auth configuration missing</p>
      </div>
    );
  }
  return (
    <ClerkProvider publishableKey={clerkKey}>
      {children}
    </ClerkProvider>
  );
}
