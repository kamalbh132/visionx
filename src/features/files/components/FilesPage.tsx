"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  Upload, Link2, Search, Download, Trash2, FileText,
  Video, ExternalLink, Loader2, X, Plus,
  FileSpreadsheet, Presentation, LayoutGrid, List,
  Copy, Check, SortAsc, FolderOpen, Image as ImageIcon,
  ChevronDown, Eye, MessageSquare,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { CommentsPanel } from "./CommentsPanel";

// ── Types ─────────────────────────────────────────────────
interface Uploader { id: string; username: string; avatarColor: string | null }
interface Reaction { id: string; emoji: string; user: { id: string; username: string } }
interface SharedFile {
  id: string; name: string; description: string | null;
  type: string; fileUrl: string; fileSize: number | null;
  mimeType: string | null; uploadedBy: Uploader;
  reactions: Reaction[]; createdAt: string;
  _count?: { comments: number };
}

const FILE_TYPES = ["ALL", "PDF", "DOC", "PPTX", "IMAGE", "VIDEO", "DRIVE_LINK", "OTHER"] as const;
const EMOJIS = ["👍", "❤️", "🔥", "😮", "👏", "🎉"];
const SORT_OPTIONS = [
  { value: "newest",  label: "Newest first" },
  { value: "oldest",  label: "Oldest first" },
  { value: "name",    label: "Name A–Z" },
  { value: "largest", label: "Largest first" },
] as const;

const TYPE_CFG: Record<string, { label: string; color: string; bg: string; icon: React.ComponentType<any> }> = {
  PDF:        { label: "PDF",        color: "#ef4444", bg: "#fef2f2", icon: FileText },
  DOC:        { label: "Document",   color: "#3b82f6", bg: "#eff6ff", icon: FileSpreadsheet },
  PPTX:       { label: "Slides",     color: "#f59e0b", bg: "#fffbeb", icon: Presentation },
  IMAGE:      { label: "Image",      color: "#10b981", bg: "#ecfdf5", icon: ImageIcon },
  VIDEO:      { label: "Video",      color: "#8b5cf6", bg: "#f5f3ff", icon: Video },
  DRIVE_LINK: { label: "Drive Link", color: "#0ea5e9", bg: "#f0f9ff", icon: Link2 },
  OTHER:      { label: "File",       color: "#64748b", bg: "#f8fafc", icon: FileText },
};

const MIME_TO_TYPE: Record<string, string> = {
  "application/pdf": "PDF",
  "application/msword": "DOC",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "DOC",
  "application/vnd.ms-powerpoint": "PPTX",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "PPTX",
  "application/vnd.ms-excel": "DOC",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "DOC",
  "text/plain": "DOC",
  "image/jpeg": "IMAGE", "image/jpg": "IMAGE", "image/png": "IMAGE",
  "image/gif": "IMAGE", "image/webp": "IMAGE", "image/svg+xml": "IMAGE",
  "video/mp4": "VIDEO", "video/webm": "VIDEO", "video/quicktime": "VIDEO",
};

function formatBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1048576).toFixed(1)} MB`;
}

function useDebounce<T>(value: T, delay = 400): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// ── File type icon ────────────────────────────────────────
function FileTypeIcon({ type, size = 22 }: { type: string; size?: number }) {
  const cfg = TYPE_CFG[type] ?? TYPE_CFG.OTHER;
  const Icon = cfg.icon;
  return (
    <div className="h-12 w-12 rounded-2xl flex items-center justify-center shrink-0"
      style={{ background: cfg.bg }}>
      <Icon size={size} style={{ color: cfg.color }} />
    </div>
  );
}

// ── Copy button ───────────────────────────────────────────
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Link copied!");
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={copy} title="Copy link"
      className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
      {copied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
    </button>
  );
}

// ── Image lightbox ────────────────────────────────────────
function Lightbox({ src, name, onClose }: { src: string; name: string; onClose: () => void }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}>
      <div className="relative max-w-4xl max-h-[90vh] w-full" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose}
          className="absolute -top-10 right-0 text-white/70 hover:text-white flex items-center gap-1.5 text-sm">
          <X size={16} /> Close
        </button>
        <img src={src} alt={name} className="w-full h-full object-contain rounded-2xl max-h-[85vh]" />
        <p className="text-white/60 text-xs text-center mt-2">{name}</p>
      </div>
    </div>
  );
}

// ── Reaction tooltip ──────────────────────────────────────
function ReactionBadge({ emoji, count, reacted, users, onClick }: {
  emoji: string; count: number; reacted: boolean;
  users: string[]; onClick: () => void;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      <button onClick={onClick}
        className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-all
          ${reacted ? "bg-violet-50 border-violet-200 text-violet-700" : "bg-slate-50 border-slate-200 text-slate-600 hover:border-violet-200"}`}>
        {emoji} {count}
      </button>
      {show && users.length > 0 && (
        <div className="absolute bottom-7 left-0 z-30 bg-slate-900 text-white text-[11px] px-2.5 py-1.5 rounded-lg whitespace-nowrap shadow-xl">
          {users.slice(0, 5).join(", ")}{users.length > 5 ? ` +${users.length - 5}` : ""}
          <div className="absolute top-full left-3 border-4 border-transparent border-t-slate-900" />
        </div>
      )}
    </div>
  );
}

// ── Delete confirm inline ─────────────────────────────────
function DeleteConfirm({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="absolute inset-0 bg-white/95 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center gap-3 z-10 p-4">
      <p className="text-sm font-semibold text-slate-800 text-center">Delete this file?</p>
      <p className="text-xs text-slate-400 text-center">This cannot be undone.</p>
      <div className="flex gap-2 w-full">
        <button onClick={onCancel} className="flex-1 py-1.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
        <button onClick={onConfirm} className="flex-1 py-1.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-semibold">Delete</button>
      </div>
    </div>
  );
}

// ── Upload Modal ──────────────────────────────────────────
function UploadModal({ onClose, onUploaded, initialFile }: {
  onClose: () => void;
  onUploaded: (f: SharedFile) => void;
  initialFile?: globalThis.File | null;
}) {
  const [tab, setTab]           = useState<"file" | "link">(initialFile ? "file" : "file");
  const [name, setName]         = useState(initialFile?.name ?? "");
  const [description, setDesc]  = useState("");
  const [driveUrl, setDriveUrl] = useState("");
  const [file, setFile]         = useState<globalThis.File | null>(initialFile ?? null);
  const [progress, setProgress] = useState(0);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  const detectedType = file ? (MIME_TO_TYPE[file.type] ?? "OTHER") : null;

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setLoading(true); setError(null); setProgress(0);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("name", name || file.name);
      if (description) fd.append("description", description);

      // Use XHR for progress tracking
      const result = await new Promise<SharedFile>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve(JSON.parse(xhr.responseText));
          else reject(new Error(JSON.parse(xhr.responseText)?.error ?? "Upload failed"));
        };
        xhr.onerror = () => reject(new Error("Network error"));
        xhr.open("POST", "/api/v1/files");
        xhr.send(fd);
      });

      onUploaded(result);
      toast.success("File uploaded!");
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); setProgress(0); }
  };

  const handleLinkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !driveUrl) return;
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/v1/files", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, driveUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onUploaded(data);
      toast.success("Link added!");
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  };

  const setFileAndName = (f: globalThis.File) => {
    setFile(f);
    if (!name) setName(f.name);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-bold text-slate-900">Add File</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><X size={16} /></button>
        </div>

        <div className="flex border-b border-slate-100">
          {(["file", "link"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-2.5 text-sm font-medium transition-colors flex items-center justify-center gap-2
                ${tab === t ? "text-violet-700 border-b-2 border-violet-600" : "text-slate-500 hover:text-slate-700"}`}>
              {t === "file" ? <Upload size={14} /> : <Link2 size={14} />}
              {t === "file" ? "Upload File" : "Drive Link"}
            </button>
          ))}
        </div>

        <div className="p-6">
          {tab === "file" ? (
            <form onSubmit={handleFileUpload} className="space-y-4">
              <div
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) setFileAndName(f); }}
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors
                  ${file ? "border-violet-300 bg-violet-50" : "border-slate-200 hover:border-violet-300 hover:bg-slate-50"}`}
              >
                <input ref={fileRef} type="file" className="hidden"
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.zip,.png,.jpg,.jpeg,.gif,.webp,.mp4,.webm,.mov"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) setFileAndName(f); }}
                />
                {file ? (
                  <div className="flex items-center gap-3">
                    {detectedType && <FileTypeIcon type={detectedType} size={18} />}
                    <div className="text-left flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{file.name}</p>
                      <p className="text-xs text-slate-400">{formatBytes(file.size)} · {TYPE_CFG[detectedType ?? "OTHER"]?.label}</p>
                    </div>
                    <button type="button" onClick={(e) => { e.stopPropagation(); setFile(null); setName(""); }}
                      className="text-slate-400 hover:text-red-500 shrink-0"><X size={14} /></button>
                  </div>
                ) : (
                  <>
                    <Upload size={24} className="text-slate-300 mx-auto mb-2" />
                    <p className="text-sm font-medium text-slate-600">Click or drag & drop</p>
                    <p className="text-xs text-slate-400 mt-1">PDF, DOC, PPTX, Images, Videos — max 100MB</p>
                  </>
                )}
              </div>

              {/* Progress bar */}
              {loading && progress > 0 && (
                <div>
                  <div className="flex justify-between text-xs text-slate-500 mb-1">
                    <span>Uploading…</span><span>{progress}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full rounded-full bg-violet-500 transition-all duration-200" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Name</label>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="File name"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Description (optional)</label>
                <textarea value={description} onChange={(e) => setDesc(e.target.value)} rows={2} placeholder="What is this file about?"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400" />
              </div>
              {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
              <div className="flex gap-2">
                <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
                <button type="submit" disabled={loading || !file}
                  className="flex-1 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
                  {loading && <Loader2 size={14} className="animate-spin" />}
                  {loading ? `Uploading ${progress}%` : "Upload"}
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleLinkSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Name *</label>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Project Brief" required
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Drive / External URL *</label>
                <div className="relative">
                  <Link2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input value={driveUrl} onChange={(e) => setDriveUrl(e.target.value)} placeholder="https://drive.google.com/..." required
                    className="w-full pl-8 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Description (optional)</label>
                <textarea value={description} onChange={(e) => setDesc(e.target.value)} rows={2} placeholder="What is this link?"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400" />
              </div>
              {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
              <div className="flex gap-2">
                <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
                <button type="submit" disabled={loading || !name || !driveUrl}
                  className="flex-1 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
                  {loading && <Loader2 size={14} className="animate-spin" />}
                  {loading ? "Adding…" : "Add Link"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

// ── File Card (Grid) ──────────────────────────────────────
function FileCardGrid({ file, myId, onDelete, onReact, onPreview, onOpenComments }: {
  file: SharedFile; myId: string;
  onDelete: (id: string) => void;
  onReact: (fileId: string, emoji: string) => void;
  onPreview: (file: SharedFile) => void;
  onOpenComments: (file: SharedFile) => void;
}) {
  const [showEmojis, setShowEmojis] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const cfg = TYPE_CFG[file.type] ?? TYPE_CFG.OTHER;
  const isOwn = file.uploadedBy.id === myId;

  const grouped = EMOJIS.map((emoji) => ({
    emoji,
    count: file.reactions.filter((r) => r.emoji === emoji).length,
    reacted: file.reactions.some((r) => r.emoji === emoji && r.user.id === myId),
    users: file.reactions.filter((r) => r.emoji === emoji).map((r) => r.user.username),
  })).filter((g) => g.count > 0);

  return (
    <div className="relative bg-white rounded-2xl border border-slate-100 hover:border-slate-200 hover:shadow-lg transition-all group overflow-hidden">
      {confirmDelete && (
        <DeleteConfirm
          onConfirm={() => { setConfirmDelete(false); onDelete(file.id); }}
          onCancel={() => setConfirmDelete(false)}
        />
      )}

      {/* Preview area for images */}
      {file.type === "IMAGE" ? (
        <div className="h-36 bg-slate-50 overflow-hidden cursor-pointer relative" onClick={() => onPreview(file)}>
          <img src={file.fileUrl} alt={file.name} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
            <Eye size={20} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>
      ) : (
        <div className="h-24 flex items-center justify-center" style={{ background: cfg.bg }}>
          <cfg.icon size={36} style={{ color: cfg.color, opacity: 0.7 }} />
        </div>
      )}

      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-1">
          <p className="text-sm font-semibold text-slate-800 truncate flex-1">{file.name}</p>
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0"
            style={{ color: cfg.color, background: cfg.bg }}>{cfg.label}</span>
        </div>
        {file.description && <p className="text-xs text-slate-400 line-clamp-1 mb-2">{file.description}</p>}

        <div className="flex items-center gap-1.5 mb-3">
          <div className="h-4 w-4 rounded-full flex items-center justify-center text-[8px] font-bold text-white shrink-0"
            style={{ background: file.uploadedBy.avatarColor ?? "#6366f1" }}>
            {file.uploadedBy.username.charAt(0).toUpperCase()}
          </div>
          <span className="text-[11px] text-slate-400 truncate">{file.uploadedBy.username}</span>
          <span className="text-[11px] text-slate-300">·</span>
          <span className="text-[11px] text-slate-400 shrink-0">{formatDistanceToNow(new Date(file.createdAt), { addSuffix: true })}</span>
        </div>

        {/* Reactions */}
        <div className="flex items-center gap-1 flex-wrap mb-3 min-h-[22px]">
          {grouped.map((g) => (
            <ReactionBadge key={g.emoji} emoji={g.emoji} count={g.count} reacted={g.reacted}
              users={g.users} onClick={() => onReact(file.id, g.emoji)} />
          ))}
          <div className="relative opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={() => setShowEmojis((v) => !v)}
              className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs border border-dashed border-slate-200 text-slate-400 hover:border-violet-300 hover:text-violet-600 transition-all">
              <Plus size={9} /> React
            </button>
            {showEmojis && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowEmojis(false)} />
                <div className="absolute bottom-7 left-0 z-20 bg-white rounded-xl border border-slate-100 shadow-xl p-2 flex gap-1">
                  {EMOJIS.map((emoji) => (
                    <button key={emoji} onClick={() => { onReact(file.id, emoji); setShowEmojis(false); }}
                      className="text-lg hover:scale-125 transition-transform p-1 rounded-lg hover:bg-slate-50">{emoji}</button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 pt-3 border-t border-slate-50">
          {/* Comment button */}
          <button
            onClick={() => onOpenComments(file)}
            className="flex items-center gap-1 px-2 py-1.5 rounded-xl text-slate-500 hover:bg-slate-50 text-xs font-medium transition-colors"
          >
            <MessageSquare size={12} />
            <span>{file._count?.comments ?? 0}</span>
          </button>

          {file.type === "DRIVE_LINK" ? (
            <>
              <a href={file.fileUrl} target="_blank" rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl bg-sky-50 text-sky-700 text-xs font-semibold hover:bg-sky-100 transition-colors">
                <ExternalLink size={12} /> Open
              </a>
              <CopyButton text={file.fileUrl} />
            </>
          ) : (
            <a href={file.fileUrl} download={file.name}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl bg-violet-50 text-violet-700 text-xs font-semibold hover:bg-violet-100 transition-colors">
              <Download size={12} /> Download
              {file.fileSize && <span className="text-violet-400">· {formatBytes(file.fileSize)}</span>}
            </a>
          )}
          {isOwn && (
            <button onClick={() => setConfirmDelete(true)}
              className="p-1.5 rounded-xl text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── File Row (List) ───────────────────────────────────────
function FileRowList({ file, myId, onDelete, onReact, onPreview, onOpenComments }: {
  file: SharedFile; myId: string;
  onDelete: (id: string) => void;
  onReact: (fileId: string, emoji: string) => void;
  onPreview: (file: SharedFile) => void;
  onOpenComments: (file: SharedFile) => void;
}) {
  const [showEmojis, setShowEmojis] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const cfg = TYPE_CFG[file.type] ?? TYPE_CFG.OTHER;
  const isOwn = file.uploadedBy.id === myId;

  const grouped = EMOJIS.map((emoji) => ({
    emoji,
    count: file.reactions.filter((r) => r.emoji === emoji).length,
    reacted: file.reactions.some((r) => r.emoji === emoji && r.user.id === myId),
    users: file.reactions.filter((r) => r.emoji === emoji).map((r) => r.user.username),
  })).filter((g) => g.count > 0);

  if (confirmDelete) {
    return (
      <div className="flex items-center gap-4 px-4 py-3 bg-red-50 rounded-2xl border border-red-100">
        <p className="text-sm text-red-700 font-medium flex-1">Delete "{file.name}"?</p>
        <button onClick={() => setConfirmDelete(false)} className="text-xs text-slate-500 hover:text-slate-700 px-3 py-1.5 rounded-lg border border-slate-200">Cancel</button>
        <button onClick={() => { setConfirmDelete(false); onDelete(file.id); }} className="text-xs text-white bg-red-500 hover:bg-red-600 px-3 py-1.5 rounded-lg">Delete</button>
      </div>
    );
  }

  return (
    <div className="group flex items-center gap-4 px-4 py-3 bg-white rounded-2xl border border-slate-100 hover:border-slate-200 hover:shadow-sm transition-all">
      {/* Icon */}
      <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0 cursor-pointer"
        style={{ background: cfg.bg }}
        onClick={() => file.type === "IMAGE" ? onPreview(file) : undefined}>
        <cfg.icon size={18} style={{ color: cfg.color }} />
      </div>

      {/* Name + meta */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-slate-800 truncate">{file.name}</p>
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0"
            style={{ color: cfg.color, background: cfg.bg }}>{cfg.label}</span>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[11px] text-slate-400">{file.uploadedBy.username}</span>
          <span className="text-[11px] text-slate-300">·</span>
          <span className="text-[11px] text-slate-400">{formatDistanceToNow(new Date(file.createdAt), { addSuffix: true })}</span>
          {file.fileSize && <><span className="text-[11px] text-slate-300">·</span><span className="text-[11px] text-slate-400">{formatBytes(file.fileSize)}</span></>}
        </div>
      </div>

      {/* Reactions */}
      <div className="flex items-center gap-1 shrink-0">
        {grouped.map((g) => (
          <ReactionBadge key={g.emoji} emoji={g.emoji} count={g.count} reacted={g.reacted}
            users={g.users} onClick={() => onReact(file.id, g.emoji)} />
        ))}
        <div className="relative opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => setShowEmojis((v) => !v)}
            className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs border border-dashed border-slate-200 text-slate-400 hover:border-violet-300 hover:text-violet-600">
            <Plus size={9} /> React
          </button>
          {showEmojis && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowEmojis(false)} />
              <div className="absolute right-0 bottom-7 z-20 bg-white rounded-xl border border-slate-100 shadow-xl p-2 flex gap-1">
                {EMOJIS.map((emoji) => (
                  <button key={emoji} onClick={() => { onReact(file.id, emoji); setShowEmojis(false); }}
                    className="text-lg hover:scale-125 transition-transform p-1 rounded-lg hover:bg-slate-50">{emoji}</button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        {/* Comment count */}
        <button
          onClick={() => onOpenComments(file)}
          className="flex items-center gap-1 px-2 py-1.5 rounded-xl text-slate-500 hover:bg-slate-50 text-xs font-medium transition-colors"
        >
          <MessageSquare size={12} />
          <span>{file._count?.comments ?? 0}</span>
        </button>

        {file.type === "DRIVE_LINK" ? (
          <>
            <a href={file.fileUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-sky-50 text-sky-700 text-xs font-semibold hover:bg-sky-100 transition-colors">
              <ExternalLink size={12} /> Open
            </a>
            <CopyButton text={file.fileUrl} />
          </>
        ) : (
          <a href={file.fileUrl} download={file.name}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-violet-50 text-violet-700 text-xs font-semibold hover:bg-violet-100 transition-colors">
            <Download size={12} /> Download
          </a>
        )}
        {isOwn && (
          <button onClick={() => setConfirmDelete(true)}
            className="p-1.5 rounded-xl text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors">
            <Trash2 size={13} />
          </button>
        )}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────
export function FilesPage({ myId, myRole }: { myId: string; myRole: string }) {
  const [files, setFiles]             = useState<SharedFile[]>([]);
  const [loading, setLoading]         = useState(true);
  const [hasMore, setHasMore]         = useState(false);
  const [cursor, setCursor]           = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [search, setSearch]           = useState("");
  const [typeFilter, setTypeFilter]   = useState("ALL");
  const [onlyMine, setOnlyMine]       = useState(false);
  const [sort, setSort]               = useState<"newest" | "oldest" | "name" | "largest">("newest");
  const [commentFile, setCommentFile] = useState<SharedFile | null>(null);
  const [viewMode, setViewMode]       = useState<"grid" | "list">("grid");
  const [showUpload, setShowUpload]   = useState(false);
  const [dropFile, setDropFile]       = useState<globalThis.File | null>(null);
  const [lightbox, setLightbox]       = useState<SharedFile | null>(null);
  const [showSort, setShowSort]       = useState(false);
  const debouncedSearch = useDebounce(search, 400);

  // Keyboard shortcut: U = upload, Escape = close
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "u" && !e.ctrlKey && !e.metaKey && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) {
        setShowUpload(true);
      }
    };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, []);

  // Page-level drag and drop
  useEffect(() => {
    const onDragOver = (e: DragEvent) => e.preventDefault();
    const onDrop = (e: DragEvent) => {
      e.preventDefault();
      const f = e.dataTransfer?.files[0];
      if (f) { setDropFile(f); setShowUpload(true); }
    };
    document.addEventListener("dragover", onDragOver);
    document.addEventListener("drop", onDrop);
    return () => { document.removeEventListener("dragover", onDragOver); document.removeEventListener("drop", onDrop); };
  }, []);

  const fetchFiles = useCallback(async (cur?: string, q?: string, type?: string) => {
    const params = new URLSearchParams();
    if (cur) params.set("cursor", cur);
    if (q) params.set("q", q);
    if (type && type !== "ALL") params.set("type", type);
    const res = await fetch(`/api/v1/files?${params}`);
    if (!res.ok) return null;
    return res.json();
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchFiles(undefined, debouncedSearch, typeFilter).then((data) => {
      if (!data) return;
      setFiles(data.files ?? []);
      setHasMore(data.hasMore ?? false);
      setCursor(data.nextCursor ?? null);
      setLoading(false);
    });
  }, [fetchFiles, debouncedSearch, typeFilter]);

  const loadMore = async () => {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    const data = await fetchFiles(cursor, debouncedSearch, typeFilter);
    if (data) {
      setFiles((prev) => [...prev, ...(data.files ?? [])]);
      setHasMore(data.hasMore ?? false);
      setCursor(data.nextCursor ?? null);
    }
    setLoadingMore(false);
  };

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/v1/files/${id}`, { method: "DELETE" });
    if (res.ok) { setFiles((prev) => prev.filter((f) => f.id !== id)); toast.success("File deleted"); }
    else toast.error("Failed to delete");
  };

  const handleReact = async (fileId: string, emoji: string) => {
    const res = await fetch(`/api/v1/files/${fileId}/react`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emoji }),
    });
    if (res.ok) {
      const { reactions } = await res.json();
      setFiles((prev) => prev.map((f) => f.id === fileId ? { ...f, reactions } : f));
    }
  };

  const handleCommentCountChange = useCallback((fileId: string, count: number) => {
    setFiles((prev) => prev.map((f) =>
      f.id === fileId ? { ...f, _count: { ...f._count, comments: count } } : f
    ));
  }, []);

  // Client-side sort + mine filter
  const displayFiles = useMemo(() => {
    let list = onlyMine ? files.filter((f) => f.uploadedBy.id === myId) : files;
    switch (sort) {
      case "oldest":  list = [...list].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()); break;
      case "name":    list = [...list].sort((a, b) => a.name.localeCompare(b.name)); break;
      case "largest": list = [...list].sort((a, b) => (b.fileSize ?? 0) - (a.fileSize ?? 0)); break;
      default: break; // newest — already from API
    }
    return list;
  }, [files, sort, onlyMine, myId]);

  // File counts per type
  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: files.length };
    files.forEach((f) => { counts[f.type] = (counts[f.type] ?? 0) + 1; });
    return counts;
  }, [files]);

  return (
    <div className="flex flex-col h-full bg-[#f4f6fb]"
      onDragOver={(e) => e.preventDefault()}>

      {/* Header */}
      <div className="shrink-0 bg-white border-b border-slate-100 px-8 py-5 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            Files
            <span className="text-xs font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
              {files.length} shared
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">Shared documents, media and links · Press <kbd className="px-1 py-0.5 rounded bg-slate-100 text-slate-500 font-mono text-[10px]">U</kbd> to upload</p>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex items-center bg-slate-100 rounded-xl p-1 gap-0.5">
            <button onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-lg transition-colors ${viewMode === "grid" ? "bg-white shadow-sm text-violet-600" : "text-slate-400 hover:text-slate-600"}`}>
              <LayoutGrid size={15} />
            </button>
            <button onClick={() => setViewMode("list")}
              className={`p-1.5 rounded-lg transition-colors ${viewMode === "list" ? "bg-white shadow-sm text-violet-600" : "text-slate-400 hover:text-slate-600"}`}>
              <List size={15} />
            </button>
          </div>

          {/* Sort */}
          <div className="relative">
            <button onClick={() => setShowSort((v) => !v)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors">
              <SortAsc size={13} />
              {SORT_OPTIONS.find((s) => s.value === sort)?.label}
              <ChevronDown size={12} />
            </button>
            {showSort && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowSort(false)} />
                <div className="absolute right-0 top-10 z-20 bg-white rounded-xl border border-slate-100 shadow-xl py-1.5 w-44">
                  {SORT_OPTIONS.map((s) => (
                    <button key={s.value} onClick={() => { setSort(s.value as any); setShowSort(false); }}
                      className={`w-full text-left px-3.5 py-2 text-sm hover:bg-slate-50 transition-colors
                        ${sort === s.value ? "text-violet-700 font-semibold" : "text-slate-700"}`}>
                      {s.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <button onClick={() => setShowUpload(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold transition-colors shadow-sm">
            <Plus size={14} /> Add File
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="shrink-0 bg-white border-b border-slate-100 px-8 py-3 flex items-center gap-3 flex-wrap">
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search files…"
            className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500/30 w-48" />
        </div>

        <div className="flex gap-1.5 flex-wrap">
          {FILE_TYPES.map((t) => {
            const count = typeCounts[t] ?? 0;
            if (t !== "ALL" && count === 0) return null;
            return (
              <button key={t} onClick={() => setTypeFilter(t)}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1
                  ${typeFilter === t ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                {t === "ALL" ? "All" : TYPE_CFG[t]?.label ?? t}
                <span className={`text-[10px] ${typeFilter === t ? "text-violet-200" : "text-slate-400"}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <button onClick={() => setOnlyMine((v) => !v)}
          className={`ml-auto text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors
            ${onlyMine ? "bg-violet-100 text-violet-700" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
          {onlyMine ? "My files ✓" : "My files"}
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-8 py-6">
        {loading ? (
          <div className={viewMode === "grid"
            ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
            : "space-y-2"}>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-slate-100 p-4 animate-pulse">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-xl bg-slate-100 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-slate-100 rounded w-3/4" />
                    <div className="h-2.5 bg-slate-100 rounded w-1/2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : displayFiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="h-16 w-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
              <FolderOpen size={24} className="text-slate-300" />
            </div>
            <p className="text-slate-500 font-semibold">No files found</p>
            <p className="text-sm text-slate-400 mt-1">
              {search ? `No results for "${search}"` : "Upload a file or add a drive link"}
            </p>
            {!search && (
              <button onClick={() => setShowUpload(true)}
                className="mt-4 flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold transition-colors">
                <Plus size={14} /> Add File
              </button>
            )}
          </div>
        ) : viewMode === "grid" ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {displayFiles.map((f) => (
                <FileCardGrid key={f.id} file={f} myId={myId}
                  onDelete={handleDelete} onReact={handleReact} onPreview={setLightbox}
                  onOpenComments={setCommentFile} />
              ))}
            </div>
            {hasMore && (
              <div className="flex justify-center mt-6">
                <button onClick={loadMore} disabled={loadingMore}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-white transition-colors disabled:opacity-50">
                  {loadingMore && <Loader2 size={14} className="animate-spin" />}
                  {loadingMore ? "Loading…" : "Load more"}
                </button>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="space-y-2 max-w-4xl">
              {displayFiles.map((f) => (
                <FileRowList key={f.id} file={f} myId={myId}
                  onDelete={handleDelete} onReact={handleReact} onPreview={setLightbox}
                  onOpenComments={setCommentFile} />
              ))}
            </div>
            {hasMore && (
              <div className="flex justify-center mt-6">
                <button onClick={loadMore} disabled={loadingMore}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-white transition-colors disabled:opacity-50">
                  {loadingMore && <Loader2 size={14} className="animate-spin" />}
                  {loadingMore ? "Loading…" : "Load more"}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modals */}
      {showUpload && (
        <UploadModal
          initialFile={dropFile}
          onClose={() => { setShowUpload(false); setDropFile(null); }}
          onUploaded={(f) => { setFiles((prev) => [f, ...prev]); setShowUpload(false); setDropFile(null); }}
        />
      )}
      {lightbox && (
        <Lightbox src={lightbox.fileUrl} name={lightbox.name} onClose={() => setLightbox(null)} />
      )}
      {commentFile && (
        <CommentsPanel
          fileId={commentFile.id}
          fileName={commentFile.name}
          myId={myId}
          myRole={myRole}
          onClose={() => setCommentFile(null)}
          onCountChange={handleCommentCountChange}
        />
      )}
    </div>
  );
}
