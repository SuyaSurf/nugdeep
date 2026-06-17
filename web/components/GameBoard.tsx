"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { apiFetch } from "@/lib/api";

interface Props {
  sessionId: string;
  initialWord: string;
  initialCategories: string[];
  target: number;
  deadline: Date;
}

export default function GameBoard({
  sessionId,
  initialWord,
  initialCategories,
  target,
  deadline,
}: Props) {
  const { getToken } = useAuth();
  const [word, setWord] = useState(initialWord);
  const [categories, setCategories] = useState(initialCategories);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<"" | "won" | "lost" | "expired">("");
  const [feedback, setFeedback] = useState("");
  const [timeLeft, setTimeLeft] = useState(
    Math.max(0, Math.floor((deadline.getTime() - Date.now()) / 1000))
  );
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      const remaining = Math.max(
        0,
        Math.floor((deadline.getTime() - Date.now()) / 1000)
      );
      setTimeLeft(remaining);
      if (remaining <= 0) {
        if (timerRef.current) clearInterval(timerRef.current);
        setResult("expired");
      }
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [deadline]);

  const submit = useCallback(
    async (category: string) => {
      if (result) return;
      try {
        const token = (await getToken()) ?? undefined;
        const res = await apiFetch("/api/v1/game/answer", {
          token,
          method: "POST",
          body: JSON.stringify({ session_id: sessionId, category }),
        });
        if (res.result === "won") {
          setResult("won");
          setProgress(res.progress);
          setFeedback("Access granted!");
          if (timerRef.current) clearInterval(timerRef.current);
        } else if (res.result === "expired") {
          setResult("expired");
          setProgress(res.progress);
          setFeedback("Time's up");
          if (timerRef.current) clearInterval(timerRef.current);
        } else {
          setProgress(res.progress);
          setFeedback(res.result === "correct" ? "Clean move" : "Wrong");
          if (res.word) {
            setWord(res.word);
            setCategories(res.categories);
          }
        }
      } catch (e: any) {
        setFeedback("Error");
      }
    },
    [sessionId, result, getToken]
  );

  return (
    <div className="w-full max-w-sm">
      <div className="flex items-center justify-between mb-6">
        <span className="text-slate-400 text-sm">
          {progress} / {target}
        </span>
        <span className="text-slate-400 text-sm font-mono">
          {timeLeft}s
        </span>
      </div>

      {result ? (
        <div className="text-center">
          <h2
            className={`text-2xl font-bold mb-4 ${
              result === "won" ? "text-rose-400" : "text-red-400"
            }`}
          >
            {result === "won" ? "Access Granted" : "Speed Date Failed"}
          </h2>
          <p className="text-slate-400">{feedback}</p>
        </div>
      ) : (
        <>
          <div className="mb-8 text-center">
            <div className="inline-block px-6 py-4 rounded-xl bg-slate-800 text-2xl font-semibold tracking-tight">
              {word}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => submit(cat)}
                className="px-4 py-3 rounded-lg bg-slate-800 text-slate-200 font-medium hover:bg-slate-700 active:bg-slate-600 transition"
              >
                {cat}
              </button>
            ))}
          </div>

          {feedback && (
            <p className="mt-4 text-center text-sm text-slate-400">{feedback}</p>
          )}
        </>
      )}
    </div>
  );
}
