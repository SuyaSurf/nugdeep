"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import AuthProvider from "@/components/AuthProvider";
import { apiFetch } from "@/lib/api";

function ProfileContent() {
  const params = useParams();
  const username = (params.username as string) ?? "";
  const { getToken } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const token = await getToken();
        const data = await apiFetch(`/api/v1/profiles/${encodeURIComponent(username)}`, { token });
        setProfile(data);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [username, getToken]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center text-slate-200">
        <p className="text-sm text-slate-500">Loading...</p>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="flex min-h-screen items-center justify-center text-slate-200">
        <p className="text-sm text-slate-500">User not found.</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center px-6 py-12 text-slate-200">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-rose-600 text-xl font-bold text-white">
            {profile.username?.[0]?.toUpperCase()}
          </div>
          <h1 className="text-xl font-bold">{profile.username}</h1>
          {profile.bio && <p className="mt-1 text-sm text-slate-400">{profile.bio}</p>}
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 text-center">
            <p className="text-lg font-bold text-rose-400">{profile.puzzles_solved}</p>
            <p className="text-xs text-slate-500">Solved</p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 text-center">
            <p className="text-lg font-bold text-rose-400">{profile.wins}</p>
            <p className="text-xs text-slate-500">Wins</p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 text-center">
            <p className="text-lg font-bold text-rose-400">{profile.streak}</p>
            <p className="text-xs text-slate-500">Streak</p>
          </div>
        </div>

        {profile.categories && profile.categories.length > 0 && (
          <div>
            <h2 className="mb-2 text-sm font-semibold text-slate-400">Interests</h2>
            <div className="flex flex-wrap gap-2">
              {profile.categories.map((cat: string) => (
                <span
                  key={cat}
                  className="rounded-lg bg-slate-800 px-2 py-1 text-xs text-slate-300"
                >
                  {cat}
                </span>
              ))}
            </div>
          </div>
        )}

        {profile.communities && profile.communities.length > 0 && (
          <div>
            <h2 className="mb-2 text-sm font-semibold text-slate-400">Communities</h2>
            <div className="space-y-2">
              {profile.communities.map((comm: any) => (
                <a
                  key={comm.id}
                  href={`/c/${comm.slug}`}
                  className="block rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3 text-sm text-slate-300 hover:border-rose-600/40"
                >
                  {comm.name}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

export default function ProfilePage() {
  return (
    <AuthProvider>
      <ProfileContent />
    </AuthProvider>
  );
}
