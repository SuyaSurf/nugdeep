"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Volume2, VolumeX } from "lucide-react";
import { SignInButton, SignUpButton, UserButton, useUser } from "@clerk/nextjs";
import { useAudioStore } from "@/lib/stores/audio-store";
import {
  enableExperienceAudio,
  disableExperienceAudio,
  pulseHaptic,
} from "@/components/experience/experience-audio";

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

function SoundToggle() {
  const { isEnabled, setEnabled } = useAudioStore();

  const handleToggle = async () => {
    pulseHaptic("select");
    if (isEnabled) {
      disableExperienceAudio();
      setEnabled(false);
    } else {
      const ok = await enableExperienceAudio();
      setEnabled(ok);
    }
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-label={isEnabled ? "Mute sound" : "Enable sound"}
      className="rounded-lg p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
    >
      {isEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
    </button>
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
        <div className="bammby-nav__controls" style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          {mounted && <SoundToggle />}
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
