"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Camera, Glasses, LogOut, Mic, Send, Volume2 } from "lucide-react";
import type { LobbyIntent } from "@/lib/lobby-experience";
import { playExperienceSelect, pulseHaptic } from "@/components/experience/experience-audio";
import { useWsStore } from "@/lib/stores/ws-store";
import { useLobbyStore } from "@/lib/stores/lobby-store";
import { createChatMessage, isChatEvent, type ChatMessage } from "@/lib/chat";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useLocalParticipant,
} from "@livekit/components-react";

interface Props {
  intent: LobbyIntent;
  opponent: string;
  location?: string;
  onExit: () => void;
}

export function SocialHandoff({
  intent,
  opponent,
  location,
  onExit,
}: Props) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [talking, setTalking] = useState(false);
  const [livekitToken, setLivekitToken] = useState("");
  const [livekitUrl, setLivekitUrl] = useState("");
  const isDate = intent === "speed_date";
  const wsSubscribe = useWsStore((s) => s.subscribe);
  const wsSend = useWsStore((s) => s.send);
  const matchId = useLobbyStore((s) => s.match?.id);

  const pendingSends = useRef(new Set<string>());
  const unmounted = useRef(false);

  useEffect(() => {
    const unsub = wsSubscribe("lobby", (msg) => {
      if (isChatEvent(msg)) {
        if (pendingSends.current.has(msg.payload.body)) {
          pendingSends.current.delete(msg.payload.body);
          return;
        }
        setMessages((prev) => [
          ...prev,
          createChatMessage(msg.payload.body, "them"),
        ]);
      }
    });
    return () => {
      unmounted.current = true;
      unsub();
    };
  }, [wsSubscribe]);

  useEffect(() => {
    if (!matchId) return;
    import("@/lib/api").then(({ apiFetch }) => {
      apiFetch(`/api/v1/lobby/${matchId}/voice-token`, { method: "POST" })
        .then((res: { token?: string; url?: string }) => {
          if (unmounted.current) return;
          if (res.token) setLivekitToken(res.token);
          if (res.url) setLivekitUrl(res.url);
        })
        .catch(() => {});
    });
  }, [matchId]);

  const send = useCallback(() => {
    const body = input.trim();
    if (!body || !matchId) return;
    pendingSends.current.add(body);
    const optimistic = createChatMessage(body, "me");
    setMessages((prev) => [...prev, optimistic]);
    wsSend("lobby", {
      type: "chat:send",
      payload: { match_id: matchId, body },
    });
    setInput("");
    playExperienceSelect();
    pulseHaptic("select");
  }, [input, matchId, wsSend]);

  return (
    <section className={`social-room ${isDate ? "social-room--date" : ""}`}>
      <div className="social-room__scene" aria-hidden="true">
        <span className="social-room__sun" />
        <span className="social-room__horizon" />
        <span className="social-room__you" />
        <span className="social-room__them" />
      </div>

      <header className="social-room__header">
        <div>
          <p className="lobby-kicker">
            {isDate ? location ?? "Shared world" : "Friend room"}
          </p>
          <h1>{isDate ? "The world opened." : "A quieter room."}</h1>
          <p>
            {isDate
              ? `You and ${opponent} chose the same place. Stay as long as the room feels mutual.`
              : `The game is over. You and ${opponent} can keep the conversation simple.`}
          </p>
        </div>
        <button type="button" className="social-room__exit" onClick={onExit} aria-label="Leave this room">
          <LogOut size={17} />
        </button>
      </header>

      <div className="social-room__messages" aria-live="polite">
        <p className="social-room__system">
          You are still anonymous. Share only what feels comfortable.
        </p>
        {messages.map((item) => (
          <p className="social-room__bubble" key={item.id}>
            {item.body}
          </p>
        ))}
      </div>

      <div className="social-room__composer">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") send(); }}
          placeholder="Say something about the game..."
          aria-label="Message"
        />
        <button type="button" onClick={send} aria-label="Send message">
          <Send size={18} />
        </button>
      </div>

      <div className="social-room__media">
        <button
          type="button"
          className={talking ? "is-active" : ""}
          onPointerDown={() => setTalking(true)}
          onPointerUp={() => setTalking(false)}
          onPointerCancel={() => setTalking(false)}
          aria-label="Hold to talk"
        >
          <Mic size={18} />
          <span>{talking ? "Talking..." : "Hold to talk"}</span>
        </button>
        {isDate && (
          <>
            <button type="button" aria-label="Camera is available in the immersive room">
              <Camera size={18} /><span>Camera</span>
            </button>
            <button type="button" aria-label="Enter VR when a headset is available">
              <Glasses size={18} /><span>VR</span>
            </button>
            <button type="button" aria-label="Spatial audio">
              <Volume2 size={18} /><span>Spatial</span>
            </button>
          </>
        )}
      </div>
      {livekitToken && livekitUrl && (
        <div style={{ display: "none" }}>
          <LiveKitRoom
            token={livekitToken}
            serverUrl={livekitUrl}
            connect={true}
            audio={true}
            video={false}
          >
            <RoomAudioRenderer />
            <PushToTalkMic talking={talking} />
          </LiveKitRoom>
        </div>
      )}
    </section>
  );
}

function PushToTalkMic({ talking }: { talking: boolean }) {
  const { localParticipant } = useLocalParticipant();

  useEffect(() => {
    localParticipant?.setMicrophoneEnabled(talking);
  }, [talking, localParticipant]);

  return null;
}
