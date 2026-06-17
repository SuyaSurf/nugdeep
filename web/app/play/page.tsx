"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { apiFetch } from "@/lib/api";
import GameBoard from "@/components/GameBoard";
import AuthProvider from "@/components/AuthProvider";

function PlayContent() {
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [session, setSession] = useState<{
    session_id: string;
    deadline: string;
    word: string;
    categories: string[];
    target: number;
    progress: number;
  } | null>(null);

  useEffect(() => {
    async function start() {
      try {
        const token = await getToken();
        const daily = await apiFetch("/api/v1/spotlight", { token });
        const puzzleId = daily?.puzzle_id ?? "test";
        const res = await apiFetch("/api/v1/game/start", {
          token,
          method: "POST",
          body: JSON.stringify({
            puzzle_id: puzzleId,
            context: "daily",
          }),
        });
        setSession(res);
      } catch (e: any) {
        setError(e.message || "Failed to start game");
      } finally {
        setLoading(false);
      }
    }
    start();
  }, [getToken]);

  if (loading) {
    return (
      <main className="flex items-center justify-center min-h-screen">
        <p className="text-slate-400">Loading puzzle...</p>
      </main>
    );
  }

  if (error || !session) {
    return (
      <main className="flex items-center justify-center min-h-screen px-6">
        <p className="text-red-400">{error || "No puzzle available"}</p>
      </main>
    );
  }

  return (
    <main className="flex flex-col items-center justify-center min-h-screen px-6 py-12">
      <GameBoard
        sessionId={session.session_id}
        initialWord={session.word}
        initialCategories={session.categories}
        target={session.target}
        deadline={new Date(session.deadline)}
      />
    </main>
  );
}

export default function PlayPage() {
  return (
    <AuthProvider>
      <PlayContent />
    </AuthProvider>
  );
}