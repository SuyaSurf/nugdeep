"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@clerk/nextjs";
import AuthProvider from "@/components/AuthProvider";
import { apiFetch, wsConnectRooms } from "@/lib/api";

const AGE_BUCKETS = [
  "18-24", "25-34", "35-44", "45-54", "55+",
];

const GENDER_OPTIONS = [
  "male", "female", "non-binary", "other",
];

function DateContent() {
  const { getToken, userId: clerkUserId } = useAuth();
  const [phase, setPhase] = useState<"idle" | "queued" | "matched" | "playing" | "decided" | "messaged">("idle");
  const [match, setMatch] = useState<any>(null);
  const [game, setGame] = useState<any>(null);
  const [message, setMessage] = useState("");
  const [winnerId, setWinnerId] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState("");
  const [chatLog, setChatLog] = useState<string[]>([]);
  const [myUserId, setMyUserId] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  // Profile state
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [datingEligible, setDatingEligible] = useState<boolean | null>(null);
  const [profile, setProfile] = useState({
    age_bucket: "",
    gender_identity: "",
    location_label: "",
    categories: [] as string[],
    bio: "",
    username: "",
  });
  const [categoryInput, setCategoryInput] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        if (!token) { setLoadingProfile(false); return; }
        const me = await apiFetch("/api/v1/me", { token });
        setMyUserId(me.id);
        setDatingEligible(me.dating_eligible);
        setProfile({
          age_bucket: me.age_bucket || "",
          gender_identity: me.gender_identity || "",
          location_label: me.location_label || "",
          categories: me.categories || [],
          bio: me.bio || "",
          username: me.username || "",
        });
      } catch {
        // user not yet created
      }
      setLoadingProfile(false);
    })();
  }, [getToken]);

  useEffect(() => {
    return () => {
      if (wsRef.current) { wsRef.current.close(); wsRef.current = null; }
    };
  }, []);

  async function connectWS(rooms: string[]) {
    const token = await getToken();
    const ws = wsConnectRooms(token, rooms);
    wsRef.current = ws;
    ws.onmessage = (ev: MessageEvent) => {
      try {
        const msg = JSON.parse(ev.data);
        if (msg.type === "date:matched") {
          setMatch(msg.match);
          setPhase("matched");
          setMessage("Opponent found! Starting game...");
          ws.send(JSON.stringify({ type: "room:join", room: msg.room }));
        } else if (msg.type === "date:game_started") {
          setPhase("playing");
          setMessage("Game started!");
          startGame(msg.match_id);
        } else if (msg.type === "date:decided") {
          setPhase("decided");
          setWinnerId(msg.winner_id);
          setMessage(msg.winner_id === myUserId ? "You won! Send the first message." : "Opponent won. Waiting for their first message.");
        } else if (msg.type === "date:message") {
          setChatLog((prev) => [...prev, msg.payload.body]);
          if (phaseRef.current !== "messaged") setPhase("messaged");
        } else if (msg.type === "date:flip") {
          setPhase("decided");
          setMessage("Time's up! You can now send the first message.");
          setWinnerId(null);
        } else if (msg.type === "date:progress") {
          // Ignore progress updates for now
        }
      } catch {
        // ignore
      }
    };
  }

  async function saveProfile() {
    setSavingProfile(true);
    setMessage("");
    try {
      const token = await getToken();
      const result = await apiFetch("/api/v1/me", {
        token,
        method: "PATCH",
        body: JSON.stringify(profile),
      });
      setDatingEligible(result.dating_eligible);
      setMessage("Profile saved! You can now join the queue.");
    } catch (e: any) {
      setMessage(e.message || "Failed to save profile");
    }
    setSavingProfile(false);
  }

  async function joinQueue() {
    setMessage("");
    try {
      const token = await getToken();
      const result = await apiFetch("/api/v1/dates/queue", {
        token,
        method: "POST",
        body: JSON.stringify({ categories: [] }),
      });
      if (result.status === "matched" && result.match) {
        setMatch(result.match);
        setPhase("matched");
        connectWS([`date:${result.match.id}`]);
      } else {
        setPhase("queued");
        setMessage("You are now in the dating queue.");
      }
    } catch (e: any) {
      setPhase("idle");
      setMessage(e.message || "Failed to join queue");
    }
  }

  async function leaveQueue() {
    try {
      const token = await getToken();
      await apiFetch("/api/v1/dates/queue", { token, method: "DELETE" });
      if (wsRef.current) wsRef.current.close();
      setPhase("idle");
      setMatch(null);
      setMessage("Left the queue.");
    } catch (e: any) {
      setMessage(e.message || "Failed to leave queue");
    }
  }

  async function startGame(matchId: string) {
    try {
      const token = await getToken();
      const data = await apiFetch(`/api/v1/dates/${matchId}/start`, { token, method: "POST" });
      setGame(data);
    } catch (e: any) {
      setMessage(e.message || "Failed to start game");
    }
  }

  async function submitAnswer(category: string) {
    if (!game) return;
    try {
      const token = await getToken();
      const data = await apiFetch("/api/v1/game/answer", {
        token,
        method: "POST",
        body: JSON.stringify({ session_id: game.session_id, category }),
      });
      if (data.result === "won") {
        setMessage("You finished the puzzle!");
        setGame((g: any) => ({ ...g, progress: data.progress, done: true }));
      } else if (data.result === "expired") {
        setMessage("Time's up!");
        setGame((g: any) => ({ ...g, done: true }));
      } else {
        setGame((g: any) => ({
          ...g,
          progress: data.progress,
          word: data.word,
          categories: data.categories,
        }));
      }
    } catch (e: any) {
      setMessage(e.message || "Answer failed");
    }
  }

  async function sendMessage() {
    if (!chatInput.trim() || !match) return;
    try {
      const token = await getToken();
      await apiFetch(`/api/v1/dates/${match.id}/message`, {
        token,
        method: "POST",
        body: JSON.stringify({ body: chatInput }),
      });
      setChatInput("");
    } catch (e: any) {
      setMessage(e.message || "Failed to send message");
    }
  }

  function addCategory() {
    const c = categoryInput.trim().toLowerCase();
    if (c && !profile.categories.includes(c)) {
      setProfile(p => ({ ...p, categories: [...p.categories, c] }));
    }
    setCategoryInput("");
  }

  function removeCategory(cat: string) {
    setProfile(p => ({ ...p, categories: p.categories.filter(c => c !== cat) }));
  }

  if (loadingProfile) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center px-6 py-12 text-center">
        <p className="text-sm text-slate-400">Loading...</p>
      </main>
    );
  }

  if (datingEligible === false) {
    const fieldsMissing = [
      !profile.age_bucket && "age range",
      !profile.gender_identity && "gender identity",
      !profile.location_label && "location",
      profile.categories.length === 0 && "interests",
    ].filter(Boolean);

    return (
      <main className="flex min-h-screen flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900/70 p-8 shadow-2xl">
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.3em] text-rose-400">Speed Date</p>
          <h1 className="mb-2 text-2xl font-bold text-slate-50">Set up your profile</h1>
          <p className="mb-6 text-sm text-slate-400">
            Required to join:
            {fieldsMissing.length > 0 && (
              <span className="mt-1 block text-amber-400">Missing: {fieldsMissing.join(", ")}</span>
            )}
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Username</label>
              <input type="text" value={profile.username} onChange={e => setProfile(p => ({ ...p, username: e.target.value }))}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:border-rose-500 focus:outline-none" />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Age Range</label>
              <select value={profile.age_bucket} onChange={e => setProfile(p => ({ ...p, age_bucket: e.target.value }))}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 focus:border-rose-500 focus:outline-none">
                <option value="">Select age range...</option>
                {AGE_BUCKETS.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Gender Identity</label>
              <select value={profile.gender_identity} onChange={e => setProfile(p => ({ ...p, gender_identity: e.target.value }))}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 focus:border-rose-500 focus:outline-none">
                <option value="">Select gender...</option>
                {GENDER_OPTIONS.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Location</label>
              <input type="text" value={profile.location_label} onChange={e => setProfile(p => ({ ...p, location_label: e.target.value }))}
                placeholder="e.g. New York, USA"
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:border-rose-500 focus:outline-none" />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Interests (categories)</label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {profile.categories.map(cat => (
                  <span key={cat} className="inline-flex items-center gap-1 rounded-full bg-rose-600/20 px-2.5 py-0.5 text-xs text-rose-300">
                    {cat}
                    <button type="button" onClick={() => removeCategory(cat)} className="text-rose-400 hover:text-rose-200">&times;</button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input type="text" value={categoryInput} onChange={e => setCategoryInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addCategory(); } }}
                  placeholder="Add an interest..."
                  className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:border-rose-500 focus:outline-none" />
                <button type="button" onClick={addCategory} className="rounded-lg bg-slate-700 px-3 py-2 text-sm text-slate-300 hover:bg-slate-600">Add</button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Bio (optional, max 120)</label>
              <textarea value={profile.bio} onChange={e => setProfile(p => ({ ...p, bio: e.target.value.slice(0, 120) }))}
                rows={2} maxLength={120}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:border-rose-500 focus:outline-none" />
            </div>

            <button type="button" onClick={saveProfile} disabled={savingProfile}
              className="w-full rounded-lg bg-rose-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-rose-500 disabled:opacity-50">
              {savingProfile ? "Saving..." : "Save and join"}
            </button>
          </div>

          {message && <p className="mt-4 text-sm text-slate-300">{message}</p>}
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-12 text-center">
      <div className="max-w-md rounded-2xl border border-slate-800 bg-slate-900/70 p-8 shadow-2xl shadow-rose-950/20">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.3em] text-rose-400">Speed Date</p>
        <h1 className="mb-4 text-3xl font-bold tracking-tight text-slate-50">Find a match</h1>

        {phase === "idle" && (
          <button type="button" onClick={joinQueue} className="inline-flex rounded-lg bg-rose-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-rose-500">
            Join queue
          </button>
        )}
        {phase === "queued" && (
          <div className="space-y-4">
            <p className="text-sm text-slate-400">In queue...</p>
            <button type="button" onClick={leaveQueue} className="inline-flex rounded-lg bg-slate-800 px-5 py-3 text-sm font-semibold text-slate-200 transition hover:bg-slate-700">
              Leave queue
            </button>
          </div>
        )}
        {(phase === "matched" || phase === "playing") && (
          <div className="space-y-4">
            <p className="text-sm text-slate-300">{phase === "playing" ? "Round in progress" : "Match found"}</p>
            {game && !game.done && (
              <div className="rounded-lg bg-slate-800/50 p-4 text-left">
                <p className="text-sm text-slate-300">Word: <span className="font-semibold text-white">{game.word}</span></p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {game.categories?.map((cat: string) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => submitAnswer(cat)}
                      className="rounded-lg bg-rose-600/20 px-3 py-2 text-xs font-medium text-rose-300 transition hover:bg-rose-600/30"
                    >
                      {cat}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-xs text-slate-500">Progress: {game.progress} / {game.target}</p>
              </div>
            )}
            {game?.done && (
              <p className="text-sm text-slate-400">Waiting for opponent to finish...</p>
            )}
            <button type="button" onClick={leaveQueue} className="inline-flex rounded-lg bg-slate-800 px-5 py-3 text-sm font-semibold text-slate-200 transition hover:bg-slate-700">
              Leave
            </button>
          </div>
        )}
        {(phase === "decided" || phase === "messaged") && (
          <div className="space-y-4">
            <p className="text-sm text-slate-300">
              {winnerId ? "Round over. Chat unlocked." : "Round over."}
            </p>
            <div className="max-h-32 overflow-y-auto rounded-lg bg-slate-800/50 p-3 text-left">
              {chatLog.length === 0 && <p className="text-xs text-slate-500 italic">No messages</p>}
              {chatLog.map((msg, i) => (
                <p key={i} className="text-sm text-slate-300">{msg}</p>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                placeholder="Type a message..."
                className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:border-rose-500 focus:outline-none"
              />
              <button type="button" onClick={sendMessage} className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-500">
                Send
              </button>
            </div>
          </div>
        )}
        {message && <p className="mt-5 text-sm text-slate-300">{message}</p>}
      </div>
    </main>
  );
}

export default function DatePage() {
  return (
    <AuthProvider>
      <DateContent />
    </AuthProvider>
  );
}
