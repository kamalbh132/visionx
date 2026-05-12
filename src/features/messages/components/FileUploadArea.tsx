
"use client";

import { useState, useRef } from "react";
import { toast } from "sonner";
import { Loader2, Upload, X, FileText } from "lucide-react";
import { cn } from "@/core/lib/utils";

type Props = {
  conversationId: string;
  onSent: (message: any) => void;
  onClose: () => void;
};

export function FileUploadArea({ conversationId, onSent, onClose }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [drag, setDrag] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const pick = (f: File) => {
    setFile(f);
    setPreview(f.type.startsWith("image/") ? URL.createObjectURL(f) : null);
  };

  const handleSend = async () => {
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const up = await fetch("/api/v1/upload", { method: "POST", body: fd });
      if (!up.ok) { const e = await up.json(); throw new Error(e.error ?? "Upload failed"); }
      const ud = await up.json();
      const res = await fetch("/api/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId, type: ud.type, fileUrl: ud.fileUrl, fileName: ud.fileName, fileSize: ud.fileSize, mimeType: ud.mimeType }),
      });
      if (!res.ok) throw new Error("Failed to send");
      onSent(await res.json());
      toast.success("File sent!");
    } catch (e: any) {
      toast.error(e.message ?? "Error");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="mx-3 mb-1.5 border border-[#e4e6eb] rounded-2xl overflow-hidden bg-white">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#e4e6eb] bg-[#f0f2f5]">
        <p className="text-[14px] font-semibold text-[#050505]">Send a file</p>
        <button onClick={onClose} className="h-7 w-7 rounded-full hover:bg-[#e4e6eb] flex items-center justify-center transition-colors">
          <X className="h-4 w-4 text-[#65676b]" />
        </button>
      </div>

      <div
        className={cn(
          "m-3 border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-3 py-6 px-4 cursor-pointer transition-all",
          drag ? "border-[#0084ff] bg-[#e7f3ff]" : "border-[#e4e6eb] hover:border-[#0084ff]/40 hover:bg-[#f8f9fa]"
        )}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) pick(f); }}
        onClick={() => !file && inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) pick(f); }}
        />

        {file ? (
          <div className="flex flex-col items-center gap-2 w-full">
            {preview ? (
              <img src={preview} alt="preview" className="max-h-28 rounded-lg object-cover shadow-sm" />
            ) : (
              <div className="h-12 w-12 rounded-xl bg-[#e7f3ff] flex items-center justify-center">
                <FileText className="h-6 w-6 text-[#0084ff]" />
              </div>
            )}
            <p className="text-[14px] font-semibold text-[#050505] truncate max-w-55">{file.name}</p>
            <p className="text-[12px] text-[#65676b]">{(file.size / 1024).toFixed(1)} KB</p>
            <div className="flex gap-2 mt-1">
              <button
                onClick={(e) => { e.stopPropagation(); setFile(null); setPreview(null); }}
                className="px-4 py-1.5 rounded-full text-[13px] font-semibold bg-[#f0f2f5] text-[#050505] hover:bg-[#e4e6eb] transition-colors"
              >
                Change
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); handleSend(); }}
                disabled={uploading}
                className="px-4 py-1.5 rounded-full text-[13px] font-semibold text-white disabled:opacity-60 flex items-center gap-1.5 transition-opacity hover:opacity-90"
                style={{ background: "linear-gradient(135deg, #0084ff, #44bec7)" }}
              >
                {uploading ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Sending...</> : "Send"}
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="h-12 w-12 rounded-full bg-[#e7f3ff] flex items-center justify-center">
              <Upload className="h-6 w-6 text-[#0084ff]" />
            </div>
            <div className="text-center">
              <p className="text-[14px] font-semibold text-[#050505]">Drop a file or click to browse</p>
              <p className="text-[12px] text-[#65676b] mt-0.5">Images, video, PDF, documents up to 50MB</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}