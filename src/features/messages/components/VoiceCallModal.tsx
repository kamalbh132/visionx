
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useWebSocket } from "@/core/hooks/useWebSocket";
import { PhoneOff, Mic, MicOff } from "lucide-react";
import { toast } from "sonner";

type User = { id: string; username: string; email?: string; role?: string };

type Props = {
  targetUser: User;
  currentUser: { id: string; name?: string | null; username?: string | null };
  conversationId: string;
  onClose: () => void;
};

type CallState = "calling" | "ringing" | "connected" | "ended";

type WebRtcAnswerEvent = {
  type: "webrtc_answer";
  fromUserId: string;
  answer: RTCSessionDescriptionInit;
};

type WebRtcIceEvent = {
  type: "webrtc_ice_candidate";
  fromUserId: string;
  candidate: RTCIceCandidateInit;
};

type WebRtcEndEvent = {
  type: "webrtc_call_end";
  fromUserId: string;
};

function isAnswerEvent(msg: Record<string, unknown>): msg is WebRtcAnswerEvent {
  return (
    msg.type === "webrtc_answer" &&
    typeof msg.fromUserId === "string" &&
    typeof msg.answer === "object" &&
    msg.answer !== null
  );
}

function isIceEvent(msg: Record<string, unknown>): msg is WebRtcIceEvent {
  return (
    msg.type === "webrtc_ice_candidate" &&
    typeof msg.fromUserId === "string" &&
    typeof msg.candidate === "object" &&
    msg.candidate !== null
  );
}

function isEndEvent(msg: Record<string, unknown>): msg is WebRtcEndEvent {
  return msg.type === "webrtc_call_end" && typeof msg.fromUserId === "string";
}

export function VoiceCallModal({ targetUser, conversationId, onClose }: Props) {
  const [callState, setCallState] = useState<CallState>("calling");
  const [isMuted, setIsMuted] = useState(false);
  const [callSeconds, setCallSeconds] = useState(0);

  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { send, addHandler } = useWebSocket();

  const createPC = useCallback(() => {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
      ],
    });
    pcRef.current = pc;
    pc.onicecandidate = (e) => {
      if (e.candidate)
        send({ type: "webrtc_ice_candidate", targetUserId: targetUser.id, candidate: e.candidate, conversationId });
    };
    pc.ontrack = (e) => {
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = e.streams[0];
        remoteAudioRef.current.play().catch(() => {});
      }
      setCallState("connected");
      timerRef.current = setInterval(() => setCallSeconds((s) => s + 1), 1000);
    };
    return pc;
  }, [send, targetUser.id, conversationId]);

  const startCall = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      localStreamRef.current = stream;
      const pc = createPC();
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      send({ type: "webrtc_offer", targetUserId: targetUser.id, offer, conversationId, callType: "audio" });
    } catch {
      toast.error("Microphone access denied");
      onClose();
    }
  }, [createPC, send, targetUser.id, conversationId, onClose]);

  useEffect(() => {
    startCall();
    const remove = addHandler(async (msg) => {
      if (isAnswerEvent(msg) && msg.fromUserId === targetUser.id) {
        if (pcRef.current) await pcRef.current.setRemoteDescription(new RTCSessionDescription(msg.answer));
      }
      if (isIceEvent(msg) && msg.fromUserId === targetUser.id) {
        if (pcRef.current) await pcRef.current.addIceCandidate(new RTCIceCandidate(msg.candidate));
      }
      if (isEndEvent(msg) && msg.fromUserId === targetUser.id) {
        setCallState("ended");
        if (timerRef.current) clearInterval(timerRef.current);
        setTimeout(onClose, 1500);
      }
    });
    return () => { remove(); if (timerRef.current) clearInterval(timerRef.current); };
  }, [addHandler, targetUser.id, startCall, onClose]);

  const endCall = () => {
    send({ type: "webrtc_call_end", targetUserId: targetUser.id, conversationId });
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    pcRef.current?.close();
    if (timerRef.current) clearInterval(timerRef.current);
    onClose();
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((t) => (t.enabled = isMuted));
      setIsMuted(!isMuted);
    }
  };

  const fmt = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  const statusText: Record<CallState, string> = {
    calling: "Calling...",
    ringing: "Ringing...",
    connected: fmt(callSeconds),
    ended: "Call ended",
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(8px)" }}
    >
      <audio ref={remoteAudioRef} autoPlay />

      <div
        className="flex flex-col items-center gap-6 px-10 py-12 rounded-[28px] w-[320px]"
        style={{
          background: "linear-gradient(160deg, #1a1a2e 0%, #16213e 60%, #0f3460 100%)",
          boxShadow: "0 24px 64px rgba(0,0,0,0.5)",
        }}
      >
        {/* Avatar */}
        <div className="relative">
          <div
            className="h-24 w-24 rounded-full flex items-center justify-center text-white font-black text-[36px]"
            style={{ background: "linear-gradient(135deg, #0084ff, #44bec7)" }}
          >
            {targetUser.username.charAt(0).toUpperCase()}
          </div>
          {callState === "connected" && (
            <span className="absolute bottom-1 right-1 h-4 w-4 rounded-full bg-[#31a24c] border-2 border-[#16213e]" />
          )}
          {/* Ripple when calling */}
          {(callState === "calling" || callState === "ringing") && (
            <>
              <span className="absolute inset-0 rounded-full bg-[#0084ff]/20 animate-ping" />
              <span className="absolute -inset-3 rounded-full border border-[#0084ff]/20 animate-ping" style={{ animationDelay: "300ms" }} />
            </>
          )}
        </div>

        {/* Name */}
        <div className="text-center">
          <p className="text-[20px] font-bold text-white">{targetUser.username}</p>
          <p className={cn("text-[14px] mt-1 font-medium tabular-nums", callState === "connected" ? "text-[#31a24c]" : "text-[#8a8fa3]")}>
            {statusText[callState]}
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-5 mt-2">
          {/* Mute */}
          <button
            onClick={toggleMute}
            className="h-12 w-12 rounded-full flex items-center justify-center transition-colors"
            style={{ background: isMuted ? "#e53935" : "rgba(255,255,255,0.12)" }}
          >
            {isMuted ? <MicOff className="h-5 w-5 text-white" /> : <Mic className="h-5 w-5 text-white" />}
          </button>

          {/* End call */}
          <button
            onClick={endCall}
            className="h-14 w-14 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95"
            style={{ background: "linear-gradient(135deg, #f44336, #e53935)" }}
          >
            <PhoneOff className="h-6 w-6 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}

// cn helper inline (in case it's not imported)
function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
