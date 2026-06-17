"use client";

export const dynamic = "force-dynamic";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import AuthProvider from "@/components/AuthProvider";
import { apiFetch } from "@/lib/api";

function CodeContent() {
  const params = useParams();
  const code = params.code as string;
  const { getToken } = useAuth();
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  async function redeem() {
    setLoading(true);
    setStatus("");
    try {
      const token = await getToken();
      const community = await apiFetch(`/api/v1/codes/${code}/redeem`, {
        token,
        method: "POST",
      });
      setStatus(`Unlocked ${community.name}`);
    } catch (e: any) {
      setStatus(e.message || "Code redemption failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-12 text-center">
      <div className="max-w-md rounded-2xl border border-slate-800 bg-slate-900/70 p-8">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.3em] text-rose-400">
          Unlock Code
        </p>
        <h1 className="mb-3 text-2xl font-bold text-slate-50">Redeem community access</h1>
        <p className="mb-6 break-all text-sm text-slate-400">{code}</p>
        <button
          type="button"
          onClick={redeem}
          disabled={loading}
          className="rounded-lg bg-rose-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Redeeming..." : "Redeem code"}
        </button>
        {status && <p className="mt-5 text-sm text-slate-300">{status}</p>}
      </div>
    </main>
  );
}

export default function CodePage() {
  return (
    <AuthProvider>
      <CodeContent />
    </AuthProvider>
  );
}
