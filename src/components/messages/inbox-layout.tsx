"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Loader2, Send, MessageSquare, Plus, ArrowLeft,
  Paperclip, FileText, FileImage, File, X, Download,
} from "lucide-react";

interface UserProfile {
  id: string;
  first_name: string;
  last_name: string;
  role: string;
  email: string;
}

interface Participant {
  user: UserProfile;
}

interface Attachment {
  id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  signed_url: string | null;
}

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  sender: UserProfile;
  attachments?: Attachment[];
}

interface Conversation {
  id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
  participants: Participant[];
}

const ALLOWED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/png",
  "image/jpeg",
  "image/webp",
];
const MAX_SIZE = 10 * 1024 * 1024;

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

function FileIcon({ type }: { type: string }) {
  if (type.startsWith("image/")) return <FileImage className="h-4 w-4" />;
  if (type.includes("pdf")) return <FileText className="h-4 w-4" />;
  if (type.includes("word") || type.includes("document")) return <FileText className="h-4 w-4" />;
  return <File className="h-4 w-4" />;
}

export function InboxLayout({
  userId,
  role,
  availableUsers,
}: {
  userId: string;
  role: string;
  availableUsers: { id: string; first_name: string; last_name: string; role: string }[];
}) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMsg, setNewMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showNewConv, setShowNewConv] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/conversations");
      if (res.ok) setConversations(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMessages = useCallback(async (convId: string) => {
    const res = await fetch(`/api/conversations/${convId}/messages`);
    if (res.ok) setMessages(await res.json());
  }, []);

  useEffect(() => { fetchConversations(); }, [fetchConversations]);

  useEffect(() => {
    if (!activeConv) return;
    fetchMessages(activeConv);

    const supabase = createClient();
    const channel = supabase
      .channel(`messages:${activeConv}`)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${activeConv}` },
        (payload) => {
          const msg = payload.new as any;
          setMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [...prev, {
              id: msg.id,
              content: msg.content,
              sender_id: msg.sender_id,
              created_at: msg.created_at,
              sender: msg.sender_id === userId
                ? { id: userId, first_name: "Vous", last_name: "", role, email: "" }
                : { id: msg.sender_id, first_name: "", last_name: "", role: "", email: "" },
              attachments: [],
            }];
          });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [activeConv, fetchMessages, userId, role]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const startConversation = async () => {
    if (selectedUsers.length === 0) return;
    setCreating(true);
    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participant_ids: selectedUsers }),
      });
      if (res.ok) {
        const conv = await res.json();
        setShowNewConv(false);
        setSelectedUsers([]);
        setActiveConv(conv.id);
        await fetchConversations();
      }
    } finally {
      setCreating(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    const valid = selected.filter((f) => {
      if (!ALLOWED_TYPES.includes(f.type)) { alert(`Type non autorisé: ${f.name}`); return false; }
      if (f.size > MAX_SIZE) { alert(`Fichier trop volumineux: ${f.name} (max 10 Mo)`); return false; }
      return true;
    });
    setFiles((prev) => [...prev, ...valid]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const sendMessage = async () => {
    if ((!newMsg.trim() && files.length === 0) || !activeConv) return;
    setSending(true);
    try {
      const res = await fetch(`/api/conversations/${activeConv}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newMsg.trim() || "(Pièce jointe)" }),
      });
      if (!res.ok) return;
      const message = await res.json();

      if (files.length > 0) {
        setUploading(true);
        for (let i = 0; i < files.length; i++) {
          setUploadProgress(Math.round(((i) / files.length) * 100));
          const fileToUpload = files[i];
          if (fileToUpload) {
            const fd = new FormData();
            fd.append("file", fileToUpload);
            fd.append("messageId", message.id);
            fd.append("conversationId", activeConv);
            await fetch("/api/attachments", { method: "POST", body: fd });
          }
        }
        setUploadProgress(100);
        setFiles([]);
        setUploading(false);
      }

      setNewMsg("");
      await fetchMessages(activeConv);
      await fetchConversations();
    } finally {
      setSending(false);
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const activeConvData = conversations.find((c) => c.id === activeConv);
  const otherParticipants = activeConvData?.participants.filter((p) => p.user.id !== userId) || [];

  function formatTime(dateStr: string) {
    const d = new Date(dateStr);
    return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  }

  function formatDate(dateStr: string) {
    const d = new Date(dateStr);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return formatTime(dateStr);
    return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] border rounded-lg overflow-hidden">
      {/* Sidebar */}
      <div className={`w-full md:w-80 border-r flex flex-col ${activeConv ? "hidden md:flex" : "flex"}`}>
        <div className="p-3 border-b flex items-center justify-between">
          <h2 className="font-semibold">Messages</h2>
          <Button size="sm" variant="ghost" onClick={() => setShowNewConv(!showNewConv)}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {showNewConv && (
          <div className="p-3 border-b space-y-2">
            <p className="text-xs text-muted-foreground">Nouvelle conversation</p>
            <div className="max-h-32 overflow-y-auto space-y-1">
              {availableUsers.map((u) => (
                <label key={u.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted p-1 rounded">
                  <input
                    type="checkbox"
                    checked={selectedUsers.includes(u.id)}
                    onChange={() => setSelectedUsers((prev) =>
                      prev.includes(u.id) ? prev.filter((id) => id !== u.id) : [...prev, u.id]
                    )}
                    className="rounded"
                  />
                  {u.first_name} {u.last_name} ({u.role === "teacher" ? "Enseignant" : u.role === "parent" ? "Parent" : u.role === "admin_school" || u.role === "super_admin" ? "Admin" : u.role})
                </label>
              ))}
            </div>
            <Button size="sm" className="w-full" onClick={startConversation} disabled={creating || selectedUsers.length === 0}>
              {creating ? <Loader2 className="h-3 w-3 animate-spin" /> : "Démarrer"}
            </Button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center p-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}
          {!loading && conversations.length === 0 && (
            <p className="text-sm text-muted-foreground p-4 text-center">Aucune conversation</p>
          )}
          {conversations.map((conv) => {
            const others = conv.participants.filter((p) => p.user.id !== userId);
            const names = others.map((p) => `${p.user.first_name} ${p.user.last_name}`).join(", ");
            return (
              <button
                key={conv.id}
                onClick={() => { setActiveConv(conv.id); setMessages([]); }}
                className={`w-full text-left p-3 border-b hover:bg-muted/50 transition-colors ${activeConv === conv.id ? "bg-muted" : ""}`}
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <MessageSquare className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{names || conv.title || "Discussion"}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(conv.updated_at)}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Chat area */}
      <div className={`flex-1 flex flex-col ${!activeConv ? "hidden md:flex" : "flex"}`}>
        {!activeConv ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-30" />
              <p>Sélectionnez une conversation</p>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="p-3 border-b flex items-center gap-2">
              <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setActiveConv(null)}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="flex-1">
                <p className="text-sm font-medium">
                  {otherParticipants.map((p) => `${p.user.first_name} ${p.user.last_name}`).join(", ") || activeConvData?.title || "Discussion"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {otherParticipants.map((p) => {
                    const label = p.user.role === "teacher" ? "Enseignant" : p.user.role === "parent" ? "Parent" : "Admin";
                    return label;
                  }).join(", ")}
                </p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((msg) => {
                const isMe = msg.sender_id === userId;
                return (
                  <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${isMe ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                      {!isMe && msg.sender?.first_name && (
                        <p className="text-xs font-medium mb-1 opacity-70">{msg.sender.first_name} {msg.sender.last_name}</p>
                      )}
                      <p>{msg.content}</p>
                      {msg.attachments && msg.attachments.length > 0 && (
                        <div className="mt-2 space-y-1.5">
                          {msg.attachments.map((att) => {
                            const isImage = att.file_type.startsWith("image/");
                            return (
                              <div key={att.id}>
                                {isImage && att.signed_url ? (
                                  <a href={att.signed_url} target="_blank" rel="noopener noreferrer" className="block mb-1">
                                    <img
                                      src={att.signed_url}
                                      alt={att.file_name}
                                      className="max-w-full rounded-md max-h-48 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                                    />
                                  </a>
                                ) : null}
                                <a
                                  href={att.signed_url || "#"}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={`flex items-center gap-2 rounded-md p-2 text-xs ${
                                    isMe ? "bg-primary-foreground/10 hover:bg-primary-foreground/20" : "bg-background hover:bg-muted"
                                  } transition-colors`}
                                >
                                  <FileIcon type={att.file_type} />
                                  <span className="flex-1 truncate">{att.file_name}</span>
                                  <span className="opacity-60">{formatFileSize(att.file_size)}</span>
                                  <Download className="h-3 w-3 shrink-0" />
                                </a>
                              </div>
                            );
                          })}
                        </div>
                      )}
                      <p className={`text-xs mt-1 ${isMe ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                        {formatTime(msg.created_at)}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Preview files */}
            {files.length > 0 && (
              <div className="px-3 pt-3 border-t flex flex-wrap gap-2">
                {files.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 bg-muted rounded-md px-2 py-1 text-xs max-w-[200px]">
                    <FileIcon type={f.type} />
                    <span className="truncate flex-1">{f.name}</span>
                    <span className="opacity-60 shrink-0">{formatFileSize(f.size)}</span>
                    <button onClick={() => removeFile(i)} className="shrink-0 hover:text-destructive">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Upload progress */}
            {uploading && (
              <div className="px-3 py-2 border-t">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Upload... {uploadProgress}%
                </div>
                <div className="mt-1 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                </div>
              </div>
            )}

            {/* Input */}
            <div className="p-3 border-t">
              <form onSubmit={(e) => { e.preventDefault(); sendMessage(); }} className="flex gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ALLOWED_TYPES.join(",")}
                  onChange={handleFileSelect}
                  className="hidden"
                  multiple
                />
                <Button type="button" size="icon" variant="ghost" onClick={() => fileInputRef.current?.click()} disabled={sending || uploading}>
                  <Paperclip className="h-4 w-4" />
                </Button>
                <Input
                  value={newMsg}
                  onChange={(e) => setNewMsg(e.target.value)}
                  placeholder="Écrivez un message..."
                  disabled={sending || uploading}
                  className="flex-1"
                />
                <Button type="submit" size="icon" disabled={sending || uploading || (!newMsg.trim() && files.length === 0)}>
                  {sending || uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
