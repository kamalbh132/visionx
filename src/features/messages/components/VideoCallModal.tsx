
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useWebSocket } from "@/core/hooks/useWebSocket";
import { PhoneOff, Mic, MicOff, Video, VideoOff } from "lucide-react";
import { toast } from "sonner";

type User = { id: string; username: string; email?: string; role?: string };

type Props = {
  targetUser: User;
  currentUser: { id: string; name?: string | null; username?: string | null };
  conversationId: string;
  onClose: () => void;
};

type CallState = "calling" | "connected" | "ended";

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

export function VideoCallModal({ targetUser, conversationId, onClose }: Props) {
  const [callState, setCallState] = useState<CallState>("calling");
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [callSeconds, setCallSeconds] = useState(0);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
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
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = e.streams[0];
      setCallState("connected");
      timerRef.current = setInterval(() => setCallSeconds((s) => s + 1), 1000);
    };
    return pc;
  }, [send, targetUser.id, conversationId]);

  const startCall = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      const pc = createPC();
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      send({ type: "webrtc_offer", targetUserId: targetUser.id, offer, conversationId, callType: "video" });
    } catch {
      toast.error("Camera/microphone access denied");
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
      setIsMuted((v) => !v);
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach((t) => (t.enabled = isVideoOff));
      setIsVideoOff((v) => !v);
    }
  };

  const fmt = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
      <div
        className="relative w-full max-w-180 rounded-4xl overflow-hidden"
        style={{ height: "480px", background: "#1a1a2e" }}
      >
        {/* Remote video */}
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
          style={{ display: callState === "connected" ? "block" : "none" }}
        />

        {/* Calling overlay */}
        {callState !== "connected" && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center gap-5"
            style={{ background: "linear-gradient(160deg, #1a1a2e 0%, #0f3460 100%)" }}
          >
            <div className="relative">
              <div
                className="h-24 w-24 rounded-full flex items-center justify-center text-white font-black text-[36px]"
                style={{ background: "linear-gradient(135deg, #0084ff, #44bec7)" }}
              >
                {targetUser.username.charAt(0).toUpperCase()}
              </div>
              {callState === "calling" && (
                <>
                  <span className="absolute inset-0 rounded-full bg-[#0084ff]/20 animate-ping" />
                  <span className="absolute -inset-4 rounded-full border border-[#0084ff]/15 animate-ping" style={{ animationDelay: "300ms" }} />
                </>
              )}
              {callState === "ended" && (
                <span className="absolute bottom-1 right-1 h-4 w-4 rounded-full bg-red-500 border-2 border-[#1a1a2e]" />
              )}
            </div>
            <div className="text-center">
              <p className="text-[22px] font-bold text-white">{targetUser.username}</p>
              <p className="text-[14px] text-[#8a8fa3] mt-1">
                {callState === "calling" ? "Calling..." : "Call ended"}
              </p>
            </div>
          </div>
        )}

        {/* Local PiP */}
        <div
          className="absolute top-4 right-4 overflow-hidden rounded-[14px] border-2 border-white/20 shadow-xl"
          style={{ width: 140, height: 90, background: "#0f3460" }}
        >
          <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
          {isVideoOff && (
            <div className="absolute inset-0 flex items-center justify-center bg-[#0f3460]">
              <VideoOff className="h-6 w-6 text-white/50" />
            </div>
          )}
        </div>

        {/* Connected timer */}
        {callState === "connected" && (
          <div
            className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-full"
            style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
          >
            <span className="h-2 w-2 rounded-full bg-[#31a24c] animate-pulse" />
            <span className="text-white text-[13px] font-semibold tabular-nums">{fmt(callSeconds)}</span>
          </div>
        )}

        {/* Controls */}
        <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-4">
          <button
            onClick={toggleMute}
            className="h-12 w-12 rounded-full flex items-center justify-center transition-all hover:scale-105"
            style={{ background: isMuted ? "#e53935" : "rgba(255,255,255,0.15)" }}
          >
            {isMuted ? <MicOff className="h-5 w-5 text-white" /> : <Mic className="h-5 w-5 text-white" />}
          </button>

          <button
            onClick={endCall}
            className="h-14 w-14 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-lg"
            style={{ background: "linear-gradient(135deg, #f44336, #e53935)" }}
          >
            <PhoneOff className="h-6 w-6 text-white" />
          </button>

          <button
            onClick={toggleVideo}
            className="h-12 w-12 rounded-full flex items-center justify-center transition-all hover:scale-105"
            style={{ background: isVideoOff ? "#e53935" : "rgba(255,255,255,0.15)" }}
          >
            {isVideoOff ? <VideoOff className="h-5 w-5 text-white" /> : <Video className="h-5 w-5 text-white" />}
          </button>
        </div>
      </div>
    </div>
  );
}
