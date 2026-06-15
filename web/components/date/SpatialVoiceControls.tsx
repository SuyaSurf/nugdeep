"use client";

import { useState, useEffect } from "react";
import { Track } from "livekit-client";
import {
  useLocalParticipant,
  useRemoteParticipants,
} from "@livekit/components-react";
import { Mic, MicOff, Volume2 } from "lucide-react";

export default function SpatialVoiceControls() {
  const { localParticipant } = useLocalParticipant();
  const remoteParticipants = useRemoteParticipants();
  const [micOn, setMicOn] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [remoteCount, setRemoteCount] = useState(0);

  useEffect(() => {
    setRemoteCount(remoteParticipants.length);
  }, [remoteParticipants]);

  const toggleMic = () => {
    const next = !micOn;
    localParticipant?.setMicrophoneEnabled(next);
    setMicOn(next);
  };

  useEffect(() => {
    if (!micOn || !localParticipant) return;
    const track =     localParticipant.getTrackPublication(Track.Source.Microphone);
    if (!track?.audioTrack) return;

    const ctx = new AudioContext();
    const src = ctx.createMediaStreamSource(
      new MediaStream([track.audioTrack.mediaStreamTrack]),
    );
    const analyser = ctx.createAnalyser();
    src.connect(analyser);
    const buffer = new Uint8Array(analyser.frequencyBinCount);
    let frameId = 0;

    const check = () => {
      analyser.getByteFrequencyData(buffer);
      const avg = buffer.reduce((a, b) => a + b, 0) / buffer.length;
      setSpeaking(avg > 20);
      if (micOn) frameId = requestAnimationFrame(check);
    };
    check();

    return () => {
      cancelAnimationFrame(frameId);
      ctx.close();
    };
  }, [micOn, localParticipant]);

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs transition ${
          micOn
            ? speaking
              ? "border-green-500 bg-green-500/10 text-green-400"
              : "border-slate-600 bg-slate-800 text-slate-300"
            : "border-slate-700 bg-slate-900/60 text-slate-500"
        }`}
        onClick={toggleMic}
        aria-label={micOn ? "Mute microphone" : "Unmute microphone"}
      >
        {micOn ? <Mic size={16} /> : <MicOff size={16} />}
        <span>{micOn ? (speaking ? "Speaking" : "Muted") : "Silent"}</span>
      </button>

      <div className="flex items-center gap-1.5 text-xs text-slate-500">
        <Volume2 size={14} />
        <span>
          {remoteCount} {remoteCount === 1 ? "person" : "people"} here
        </span>
      </div>
    </div>
  );
}
