"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { LiveKitRoom, RoomAudioRenderer, useParticipants } from "@livekit/components-react";
import AuthProvider from "@/components/AuthProvider";
import { apiFetch, wsConnectRooms } from "@/lib/api";

function SpaceContent() {
  const params = useParams();
  const spaceId = (params.id as string) ?? "";
  const { getToken } = useAuth();
  const [space, setSpace] = useState<any>(null);
  const [serverUrl, setServerUrl] = useState<string>("");
  const [speakers, setSpeakers] = useState<any[]>([]);
  const [canSpeak, setCanSpeak] = useState(false);
  const [requested, setRequested] = useState(false);
  const [livekitToken, setLivekitToken] = useState<string>("");
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    async function init() {
      try {
        const token = await getToken();
        if (!token) return;
        const sp = await apiFetch(`/api/v1/spaces/${spaceId}`, { token });
        setSpace(sp);
        const vt = await apiFetch(`/api/v1/spaces/${spaceId}/voice-token`, {
          token,
          method: "POST",
        });
        setLivekitToken(vt.token);
        setServerUrl(vt.url);
        setCanSpeak(vt.can_publish);
        const speakers = await apiFetch(`/api/v1/spaces/${spaceId}/speakers`, { token });
        setSpeakers(speakers);
        connectWS(token);
      } catch (e: any) {
        console.error("space init failed", e);
      }
    }
    init();
    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, [spaceId, getToken]);

  async function connectWS(jwt: string) {
    const ws = wsConnectRooms(jwt, [`space:${spaceId}`]);
    wsRef.current = ws;
    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        if (msg.type === "space:round_open") {
          setRequested(false);
        } else if (msg.type === "space:request_ack") {
          if (msg.approved) setCanSpeak(true);
          setRequested(true);
        } else if (msg.type === "space:kicked") {
          setCanSpeak(false);
          setRequested(false);
        }
      } catch {
        // ignore
      }
    };
  }

  async function requestSpeak() {
    try {
      const jwt = await getToken();
      if (!jwt) return;
      await apiFetch(`/api/v1/spaces/${spaceId}/request-speak`, {
        token: jwt,
        method: "POST",
      });
      setRequested(true);
    } catch (e: any) {
      console.error("request speak failed", e);
    }
  }

  if (!space) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-200">
        <p className="text-sm text-slate-400">Loading space...</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col bg-slate-950 text-slate-200">
      <header className="border-b border-slate-800 px-6 py-4">
        <h1 className="text-lg font-semibold">{space.name}</h1>
        <p className="text-xs text-slate-500">{space.topic || "Audio Space"}</p>
      </header>

      <div className="flex flex-1 gap-4 p-4">
        <section className="flex flex-1 flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
          <h2 className="text-sm font-medium text-slate-400">Speakers</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {speakers.map((s: any) => (
              <div
                key={s.id}
                className="flex flex-col items-center gap-2 rounded-xl border border-slate-800 bg-slate-800/50 p-3"
              >
                <div className="h-10 w-10 rounded-full bg-rose-600" />
                <span className="text-xs text-slate-300">{s.user_id?.slice(0, 8)}</span>
              </div>
            ))}
          </div>

          {!canSpeak && !requested && (
            <button
              onClick={requestSpeak}
              className="mt-2 inline-flex items-center justify-center rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-500"
            >
              Request to Speak
            </button>
          )}
          {!canSpeak && requested && (
            <p className="mt-2 text-xs text-slate-500">Request pending...</p>
          )}
        </section>

        <aside className="hidden w-64 flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 lg:flex">
          <h2 className="text-sm font-medium text-slate-400">Listeners</h2>
          <p className="text-xs text-slate-500">Listener list coming soon.</p>
        </aside>
      </div>

      {livekitToken && serverUrl && (
        <LiveKitRoom
          token={livekitToken}
          serverUrl={serverUrl}
          connect={true}
          audio={true}
          video={false}
        >
          <RoomAudioRenderer />
          <AudioParticipants />
        </LiveKitRoom>
      )}
    </main>
  );
}

function AudioParticipants() {
  const participants = useParticipants();
  return (
    <div className="sr-only" aria-live="polite">
      {participants.length} participants in room
    </div>
  );
}

export default function SpacePage() {
  return (
    <AuthProvider>
      <SpaceContent />
    </AuthProvider>
  );
}
