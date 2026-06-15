"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { LogOut, Send, Volume2, VolumeX } from "lucide-react";
import { LiveKitRoom, RoomAudioRenderer } from "@livekit/components-react";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import { useLobbyStore } from "@/lib/stores/lobby-store";
import { useWsStore } from "@/lib/stores/ws-store";
import { createChatMessage, isChatEvent, type ChatMessage } from "@/lib/chat";
import { LOCATIONS, getLocation } from "@/lib/locations";
import { playExperienceSelect, pulseHaptic } from "@/components/experience/experience-audio";
import LocationScene from "@/components/date/LocationScene";
import SpatialVoiceControls from "@/components/date/SpatialVoiceControls";

interface Props {
  onExit: () => void;
}

export function DateRoom({ onExit }: Props) {
  const match = useLobbyStore((s) => s.match);
  const locationName = useLobbyStore((s) => s.location);
  const location = LOCATIONS.find((l) => l.name === locationName) ?? LOCATIONS[0];

  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [livekitToken, setLivekitToken] = useState("");
  const [livekitUrl, setLivekitUrl] = useState("");
  const [spatialOn, setSpatialOn] = useState(true);
  const wsSubscribe = useWsStore((s) => s.subscribe);
  const wsSend = useWsStore((s) => s.send);
  const unmounted = useRef(false);

  useEffect(() => {
    if (!match?.id) return;
    const unsub = wsSubscribe("lobby", (msg) => {
      if (isChatEvent(msg)) {
        setMessages((prev) => [...prev, createChatMessage(msg.payload.body, "them")]);
      }
    });

    import("@/lib/api").then(({ apiFetch }) => {
      apiFetch(`/api/v1/lobby/${match.id}/voice-token`, { method: "POST" })
        .then((res: { token?: string; url?: string }) => {
          if (unmounted.current) return;
          if (res.token) setLivekitToken(res.token);
          if (res.url) setLivekitUrl(res.url);
        })
        .catch(() => {});
    });

    return () => {
      unmounted.current = true;
      unsub();
    };
  }, [match?.id, wsSubscribe]);

  const send = useCallback(() => {
    const body = input.trim();
    if (!body || !match?.id) return;
    setMessages((prev) => [...prev, createChatMessage(body, "me")]);
    wsSend("lobby", { type: "chat:send", payload: { match_id: match.id, body } });
    setInput("");
    playExperienceSelect();
    pulseHaptic("select");
  }, [input, match?.id, wsSend]);

  return (
    <section className="social-room social-room--date">
      <div
        className="social-room__scene"
        aria-hidden="true"
        style={{ position: "relative", overflow: "hidden", background: location.colors }}
      >
        <Canvas
          style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
          camera={{ position: [0, 1.5, 3], fov: 60 }}
          gl={{
            antialias: true,
            alpha: false,
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 1.0,
          }}
          dpr={[1, 1.5]}
        >
          <Suspense fallback={null}>
            {location && <LocationScene location={location} />}
          </Suspense>
        </Canvas>
        <span className="social-room__you" style={{ position: "absolute", zIndex: 2, bottom: "19%", left: "31%" }} />
        <span className="social-room__them" style={{ position: "absolute", zIndex: 2, bottom: "19%", right: "31%" }} />
      </div>

      <header className="social-room__header">
        <div>
          <p className="lobby-kicker">{locationName}</p>
          <h1>You are both here.</h1>
          <p>{location.description}</p>
        </div>
        <button type="button" className="social-room__exit" onClick={onExit} aria-label="Leave this room">
          <LogOut size={17} />
        </button>
      </header>

      <div className="social-room__messages" aria-live="polite">
        <p className="social-room__system">
          Your voice is spatial. Move closer in conversation, not in space.
        </p>
        {messages.map((item) => (
          <p className="social-room__bubble" key={item.id}>{item.body}</p>
        ))}
      </div>

      <div className="social-room__composer">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") send(); }}
          placeholder="Say something..."
          aria-label="Message"
        />
        <button type="button" onClick={send} aria-label="Send message">
          <Send size={18} />
        </button>
      </div>

      <div className="social-room__media">
        <button
          type="button"
          className={spatialOn ? "is-active" : ""}
          onClick={() => setSpatialOn(!spatialOn)}
          aria-label="Toggle spatial audio"
        >
          {spatialOn ? <Volume2 size={18} /> : <VolumeX size={18} />}
          <span>{spatialOn ? "Spatial on" : "Spatial off"}</span>
        </button>
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
            <SpatialVoiceControls />
          </LiveKitRoom>
        </div>
      )}
    </section>
  );
}
