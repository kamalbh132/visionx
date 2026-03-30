
"use client";

import { useState, useRef } from "react";
import { Paperclip, Mic, Send, Square, X, Loader2 } from "lucide-react";

import { toast } from "sonner";
import { cn } from "@/core/lib/utils";
import { Message } from "./types";
import { formatRecSeconds } from "./helpers";

type Props = {
  conversationId: string;
  replyTo: Message | null;
  onReplyCancel: () => void;
  onMessageSent: (msg: Message) => void;
  onTyping: () => void;
};

export function ChatInput({
  conversationId,
  replyTo,
  onReplyCancel,
  onMessageSent,
  onTyping,
}: Props) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  // File attach
  const [showAttach, setShowAttach] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Voice recording
  const [recording, setRecording] = useState(false);
  const [recSecs, setRecSecs] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recChunksRef = useRef<Blob[]>([]);
  const recTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ── Send text message ── */
  const sendText = async () => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    setSending(true);
    setText("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    try {
      const res = await fetch("/api/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId,
          content: trimmed,
          type: "TEXT",
          replyToId: replyTo?.id ?? null,
        }),
      });
      if (!res.ok) throw new Error();
      const msg: Message = await res.json();
      onMessageSent(msg);
      onReplyCancel();
    } catch {
      toast.error("Failed to send message");
      setText(trimmed);
    } finally {
      setSending(false);
    }
  };

  /* ── Send file ── */
  const sendFile = async (file: File) => {
    setUploadingFile(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const up = await fetch("/api/v1/upload", { method: "POST", body: fd });
      if (!up.ok) {
        const err = await up.json();
        throw new Error(err.error ?? "Upload failed");
      }
      const ud = await up.json();

      const res = await fetch("/api/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId,
          type: ud.type,
          fileUrl: ud.fileUrl,
          fileName: ud.fileName,
          fileSize: ud.fileSize,
          mimeType: ud.mimeType,
          replyToId: replyTo?.id ?? null,
        }),
      });
      if (!res.ok) throw new Error("Send failed");
      const msg: Message = await res.json();
      onMessageSent(msg);
      onReplyCancel();
      setShowAttach(false);
      toast.success("File sent!");
    } catch (e: any) {
      toast.error(e.message ?? "Failed to send file");
    } finally {
      setUploadingFile(false);
    }
  };

  /* ── Voice recording ── */
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      recorderRef.current = mr;
      recChunksRef.current = [];

      mr.ondataavailable = (e) => {
        if (e.data.size > 0) recChunksRef.current.push(e.data);
      };
      mr.onstop = () => {
        const blob = new Blob(recChunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        setAudioPreviewUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((t) => t.stop());
      };

      mr.start();
      setRecording(true);
      setRecSecs(0);
      recTimerRef.current = setInterval(
        () => setRecSecs((s) => s + 1),
        1000
      );
    } catch {
      toast.error("Microphone access denied");
    }
  };

  const stopRecording = () => {
    recorderRef.current?.stop();
    setRecording(false);
    if (recTimerRef.current) clearInterval(recTimerRef.current);
  };

  const cancelRecording = () => {
    if (recorderRef.current?.state === "recording") {
      recorderRef.current.stop();
    }
    setRecording(false);
    setAudioBlob(null);
    setAudioPreviewUrl(null);
    if (recTimerRef.current) clearInterval(recTimerRef.current);
  };

  const sendVoice = async () => {
    if (!audioBlob) return;
    const file = new File([audioBlob], "voice.webm", { type: "audio/webm" });
    await sendFile(file);
    setAudioBlob(null);
    setAudioPreviewUrl(null);
  };

  /* ── Textarea helpers ── */
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    onTyping();
    // auto-resize
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendText();
    }
  };

  /* ── Render ── */
  return (
    <div className="border-t border-gray-100 bg-white shrink-0">
      {/* Reply bar */}
      {replyTo && (
        <div className="flex items-center gap-2 px-4 py-2 bg-indigo-50 border-l-4 border-indigo-400">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-indigo-600 truncate">
              Replying to {replyTo.sender.username}
            </p>
            <p className="text-xs text-gray-500 truncate">
              {replyTo.content ?? "📎 Attachment"}
            </p>
          </div>
          <button
            onClick={onReplyCancel}
            className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-indigo-100 transition-colors"
          >
            <X size={13} className="text-gray-500" />
          </button>
        </div>
      )}

      {/* Voice preview */}
      {audioBlob && audioPreviewUrl && (
        <div className="flex items-center gap-3 px-4 py-2 bg-green-50 border-t border-green-100">
          <div className="w-7 h-7 rounded-full bg-green-500 flex items-center justify-center shrink-0">
            <Mic size={13} className="text-white" />
          </div>
          <audio src={audioPreviewUrl} controls className="flex-1 h-8" />
          <button
            onClick={cancelRecording}
            className="w-6 h-6 rounded-full hover:bg-green-100 flex items-center justify-center"
          >
            <X size={13} className="text-gray-500" />
          </button>
        </div>
      )}

      {/* File attach panel */}
      {showAttach && (
        <div className="flex items-center gap-3 px-4 py-2.5 bg-gray-50 border-t border-gray-100">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip,audio/*"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) sendFile(f);
              e.target.value = "";
            }}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingFile}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-dashed border-indigo-300 bg-white text-indigo-600 text-sm font-medium hover:bg-indigo-50 transition-colors disabled:opacity-60"
          >
            {uploadingFile ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Paperclip size={14} />
            )}
            {uploadingFile ? "Uploading…" : "Choose file"}
          </button>
          <span className="text-xs text-gray-400">
            Images, PDF, video, audio — max 50 MB
          </span>
          <button onClick={() => setShowAttach(false)} className="ml-auto text-gray-400 hover:text-gray-600">
            <X size={15} />
          </button>
        </div>
      )}

      {/* Main input row */}
      <div className="px-3 py-3">
        {recording ? (
          /* Recording pill */
          <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-red-50 border border-red-200">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0 animate-pulse" />
            <span className="text-sm font-semibold text-red-600 flex-1 tabular-nums">
              Recording {formatRecSeconds(recSecs)}
            </span>
            <button
              onClick={cancelRecording}
              className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center hover:bg-red-200 transition-colors"
            >
              <X size={14} className="text-red-500" />
            </button>
            <button
              onClick={stopRecording}
              className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center hover:bg-red-600 transition-colors"
              title="Stop recording"
            >
              <Square size={12} className="text-white fill-white" />
            </button>
          </div>
        ) : (
          <div className="flex items-end gap-2">
            {/* Attach button */}
            <button
              onClick={() => setShowAttach((v) => !v)}
              className={cn(
                "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                showAttach
                  ? "bg-indigo-100 text-indigo-600"
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              )}
              title="Attach file"
            >
              <Paperclip size={16} />
            </button>

            {/* Text area */}
            <div className="flex-1 bg-gray-100 rounded-2xl px-4 py-2.5 flex items-end gap-2">
              <textarea
                ref={textareaRef}
                value={text}
                onChange={handleTextChange}
                onKeyDown={handleKeyDown}
                placeholder={audioBlob ? "Voice ready — press send ↑" : "Type a message…"}
                disabled={!!audioBlob}
                rows={1}
                className="flex-1 bg-transparent text-sm text-gray-900 placeholder:text-gray-400 resize-none outline-none leading-5.5 disabled:opacity-60"
                style={{ maxHeight: 120, overflow: "hidden" }}
              />
            </div>

            {/* Send or Mic */}
            {text.trim() || audioBlob ? (
              <button
                onClick={audioBlob ? sendVoice : sendText}
                disabled={sending || uploadingFile}
                className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center shrink-0 hover:bg-indigo-700 transition-colors disabled:opacity-60 shadow-sm"
              >
                {sending ? (
                  <Loader2 size={15} className="text-white animate-spin" />
                ) : (
                  <Send size={15} className="text-white translate-x-px" />
                )}
              </button>
            ) : (
              <button
                onClick={startRecording}
                className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center shrink-0 hover:bg-indigo-50 hover:text-indigo-600 text-gray-500 transition-colors"
                title="Record voice message"
              >
                <Mic size={16} />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}