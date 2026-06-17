"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { apiFetch, wsConnect } from "@/lib/api";
import AuthProvider from "@/components/AuthProvider";

function CommunityContent() {
  const params = useParams();
  const slug = params.slug as string;
  const { getToken } = useAuth();
  const [community, setCommunity] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const wsRef = useRef<WebSocket | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const token = await getToken();
        const comm = await apiFetch(`/api/v1/communities/${slug}`, { token });
        setCommunity(comm);
        const msgs = await apiFetch(`/api/v1/messages/community/${comm.id}?limit=50`, { token });
        setMessages(msgs.reverse());
      } catch (e: any) {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [slug, getToken]);

  useEffect(() => {
    if (!community?.id) return;
    async function connect() {
      const token = await getToken();
      const ws = wsConnect(token);
      wsRef.current = ws;
      ws.onmessage = (ev) => {
        const msg = JSON.parse(ev.data);
        if (msg.type === "chat:new" && msg.payload.scope_id === community.id) {
          setMessages((prev) => [...prev, msg.payload]);
        }
      };
    }
    connect();
    return () => wsRef.current?.close();
  }, [community?.id, getToken]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || !community) return;
    try {
      const token = await getToken();
      await apiFetch("/api/v1/messages", {
        token,
        method: "POST",
        body: JSON.stringify({
          scope: "community",
          scope_id: community.id,
          body: input.trim(),
        }),
      });
      setInput("");
    } catch {
      // ignore
    }
  }

  if (loading) {
    return (
      <main className="flex items-center justify-center min-h-screen">
        <p className="text-slate-400">Loading...</p>
      </main>
    );
  }

  if (!community) {
    return (
      <main className="flex items-center justify-center min-h-screen">
        <p className="text-red-400">Community not found</p>
      </main>
    );
  }

  return (
    <main className="flex flex-col h-screen max-w-md mx-auto">
      <header className="px-4 py-3 border-b border-slate-800">
        <h1 className="text-lg font-semibold">{community.name}</h1>
        <p className="text-xs text-slate-500">{community.description}</p>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.map((m) => (
          <div key={m.id} className="text-sm">
            <span className="text-slate-500 text-xs">{m.user_id.slice(0, 8)}</span>
            <p className="text-slate-200">{m.body}</p>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={sendMessage} className="px-4 py-3 border-t border-slate-800 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Message..."
          className="flex-1 px-3 py-2 rounded-lg bg-slate-800 text-sm text-slate-100 placeholder-slate-500 outline-none"
        />
        <button
          type="submit"
          className="px-4 py-2 rounded-lg bg-rose-600 text-white text-sm font-medium hover:bg-rose-500 transition"
        >
          Send
        </button>
      </form>
    </main>
  );
}

export default function CommunityPage() {
  return (
    <AuthProvider>
      <CommunityContent />
    </AuthProvider>
  );
}