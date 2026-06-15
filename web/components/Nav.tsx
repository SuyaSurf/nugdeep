"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SignInButton, SignUpButton, UserButton, useUser } from "@clerk/nextjs";

function ClerkAuthControls() {
  const { isSignedIn, isLoaded } = useUser();
  if (!isLoaded) {
    return <div className="h-8 w-20 animate-pulse rounded-lg bg-slate-800" />;
  }
  if (isSignedIn) {
    return (
      <>
        <Link href="/lobby" className="text-sm text-slate-300 hover:text-purple-400">Lobby</Link>
        <Link href="/play" className="text-sm text-slate-300 hover:text-white">Play</Link>
        <Link href="/wordcard" className="text-sm text-slate-300 hover:text-white">Cards</Link>
        <Link href="/date" className="text-sm text-slate-300 hover:text-white">Date</Link>
        <Link href="/leaderboard" className="text-sm text-slate-300 hover:text-white">Rank</Link>
        <UserButton />
      </>
    );
  }
  return (
    <>
      <SignInButton>
        <button className="rounded-lg bg-slate-800 px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-700">Sign In</button>
      </SignInButton>
      <SignUpButton>
        <button className="rounded-lg bg-rose-600 px-3 py-1.5 text-sm text-white hover:bg-rose-500">Sign Up</button>
      </SignUpButton>
    </>
  );
}

export default function Nav({ authEnabled = true }: { authEnabled?: boolean }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <nav className="bammby-nav">
      <div className="bammby-nav__inner">
        <Link href="/" className="bammby-nav__brand">
          <span>Bammby</span>
          <small>Night shift / 01</small>
        </Link>
        <div className="bammby-nav__controls">
          {!authEnabled ? (
            <Link href="/lobby" className="text-sm text-slate-300 hover:text-white">
              Enter
            </Link>
          ) : mounted ? (
            <ClerkAuthControls />
          ) : (
            <div className="h-8 w-20 animate-pulse rounded-lg bg-slate-800" />
          )}
        </div>
      </div>
    </nav>
  );
}
