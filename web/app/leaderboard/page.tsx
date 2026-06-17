"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import AuthProvider from "@/components/AuthProvider";
import { apiFetch } from "@/lib/api";

function LeaderboardContent() {
  const { getToken } = useAuth();
  const [entries, setEntries] = useState<any[]>([]);
  const [scope, setScope] = useState("daily");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const token = await getToken();
        const data = await apiFetch(`/api/v1/leaderboard/${scope}/${date}?n=20`, { token });
        setEntries(data.entries || []);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [scope, date, getToken]);

  return (
    <main className="flex min-h-screen flex-col items-center px-6 py-12 text-slate-200">
      <div className="w-full max-w-lg">
        <h1 className="mb-6 text-2xl font-bold tracking-tight">Leaderboard</h1>
        <div className="mb-6 flex gap-3">
          <select
            value={scope}
            onChange={(e) => setScope(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200"
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
          </select>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200"
          />
        </div>

        {loading && <p className="text-sm text-slate-500">Loading...</p>}

        {!loading && entries.length === 0 && (
          <p className="text-sm text-slate-500">No scores yet.</p>
        )}

        <div className="space-y-2">
          {entries.map((e: any, i: number) => (
            <div
              key={e.user_id}
              className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-800 text-xs font-bold text-slate-400">
                  {i + 1}
                </span>
                <span className="text-sm font-medium text-slate-300">
                  {e.user_id?.slice(0, 8)}
                </span>
              </div>
              <span className="text-sm font-semibold text-rose-400">{e.score}</span>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

export default function LeaderboardPage() {
  return (
    <AuthProvider>
      <LeaderboardContent />
    </AuthProvider>
  );
}
