"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { PhoneOff, Mic, MicOff, Video, VideoOff } from "lucide-react";
import { UserInfo } from "./types";
import { Avatar } from "./Avatar";
import { useWebSocket } from "@/core/hooks/useWebSocket";
import { toast } from "sonner";
import { cn } from "@/core/lib/utils";

type CallState = "calling" | "connected" | "ended";

type Props = {
  type: "audio" | "video";
  targetUser: UserInfo;
  conversationId: string;
  onEnd: () => void;
};

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

export function CallOverlay({ type, targetUser, conversationId, onEnd }: Props) {
  const [callState, setCallState] = useState<CallState>("calling");
  const [muted, setMuted] = useState(false);
  const [videoOff, setVideoOff] = useState(false);
  const [seconds, setSeconds] = useState(0);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { send, addHandler } = useWebSocket();

  const fmt = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  const cleanup = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    pcRef.current?.close();
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  useEffect(() => {
    if (callState === "connected") {
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [callState]);

  useEffect(() => {
    const remove = addHandler(async (msg) => {
      if (!(isAnswerEvent(msg) || isIceEvent(msg) || isEndEvent(msg))) return;
      if (msg.fromUserId !== targetUser.id) return;

      if (isAnswerEvent(msg) && pcRef.current) {
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(msg.answer));
        setCallState("connected");
      }
      if (isIceEvent(msg) && pcRef.current) {
        await pcRef.current.addIceCandidate(new RTCIceCandidate(msg.candidate));
      }
      if (isEndEvent(msg)) {
        setCallState("ended");
        cleanup();
        setTimeout(onEnd, 1500);
      }
    });
    return remove;
  }, [addHandler, cleanup, onEnd, targetUser.id]);

  useEffect(() => {
    const start = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: type === "video",
        });
        streamRef.current = stream;

        if (type === "video" && localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        const pc = new RTCPeerConnection({
          iceServers: [
            { urls: "stun:stun.l.google.com:19302" },
            { urls: "stun:stun1.l.google.com:19302" },
          ],
        });
        pcRef.current = pc;

        stream.getTracks().forEach((t) => pc.addTrack(t, stream));

        pc.onicecandidate = (e) => {
          if (e.candidate) {
            send({
              type: "webrtc_ice_candidate",
              targetUserId: targetUser.id,
              candidate: e.candidate,
              conversationId,
            });
          }
        };

        pc.ontrack = (e) => {
          if (type === "video" && remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = e.streams[0];
          } else if (remoteAudioRef.current) {
            remoteAudioRef.current.srcObject = e.streams[0];
            remoteAudioRef.current.play().catch(() => {});
          }
        };

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        send({
          type: "webrtc_offer",
          targetUserId: targetUser.id,
          offer,
          conversationId,
          callType: type,
        });
      } catch {
        toast.error("Could not access camera/microphone");
        onEnd();
      }
    };

    start();
    return cleanup;
  }, [cleanup, conversationId, onEnd, send, targetUser.id, type]);

  const endCall = () => {
    send({
      type: "webrtc_call_end",
      targetUserId: targetUser.id,
      conversationId,
    });
    cleanup();
    onEnd();
  };

  const toggleMute = () => {
    streamRef.current?.getAudioTracks().forEach((t) => (t.enabled = muted));
    setMuted((v) => !v);
  };

  const toggleVideo = () => {
    streamRef.current?.getVideoTracks().forEach((t) => (t.enabled = videoOff));
    setVideoOff((v) => !v);
  };

  return (
    <div
      className="fixed inset-0 z-999 flex flex-col items-center justify-center"
      style={{
        background:
          type === "video"
            ? "#0a0a14"
            : "linear-gradient(160deg, #1e1b4b 0%, #1e3a5f 100%)",
      }}
    >
      <audio ref={remoteAudioRef} autoPlay />

      {type === "video" && (
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
          style={{ display: callState === "connected" ? "block" : "none" }}
        />
      )}

      {type === "video" && (
        <div className="absolute top-5 right-5 w-36 h-24 rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl z-10">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
          {videoOff && (
            <div className="absolute inset-0 bg-slate-800 flex items-center justify-center">
              <VideoOff size={24} className="text-white/40" />
            </div>
          )}
        </div>
      )}

      <div className="absolute top-5 left-5 bg-white/10 backdrop-blur-sm rounded-xl px-3 py-2 z-10">
        <p className="text-white/60 text-xs">Chat continues in background</p>
      </div>

      <div className="flex flex-col items-center gap-5 z-10 relative">
        <div className="relative flex items-center justify-center">
          {callState === "calling" && (
            <>
              <span className="absolute inline-block w-32 h-32 rounded-full bg-white/10 animate-ping" />
              <span
                className="absolute inline-block w-24 h-24 rounded-full bg-white/15 animate-ping"
                style={{ animationDelay: "300ms" }}
              />
            </>
          )}
          <Avatar name={targetUser.username} size={96} />
        </div>

        <div className="text-center">
          <p className="text-white text-2xl font-bold">{targetUser.username}</p>
          <p
            className={cn(
              "text-sm font-medium mt-1",
              callState === "connected" ? "text-green-400" : "text-white/50"
            )}
          >
            {callState === "calling" && "Calling..."}
            {callState === "connected" && fmt(seconds)}
            {callState === "ended" && "Call ended"}
          </p>
        </div>
      </div>

      <div className="absolute bottom-12 flex items-center gap-5 z-10">
        <button
          onClick={toggleMute}
          className={cn(
            "w-14 h-14 rounded-full flex items-center justify-center transition-colors",
            muted ? "bg-red-500" : "bg-white/15 hover:bg-white/25"
          )}
        >
          {muted ? <MicOff size={22} className="text-white" /> : <Mic size={22} className="text-white" />}
        </button>

        <button
          onClick={endCall}
          className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-lg shadow-red-500/40"
        >
          <PhoneOff size={26} className="text-white" />
        </button>

        {type === "video" && (
          <button
            onClick={toggleVideo}
            className={cn(
              "w-14 h-14 rounded-full flex items-center justify-center transition-colors",
              videoOff ? "bg-red-500" : "bg-white/15 hover:bg-white/25"
            )}
          >
            {videoOff ? <VideoOff size={22} className="text-white" /> : <Video size={22} className="text-white" />}
          </button>
        )}
      </div>
    </div>
  );
}
