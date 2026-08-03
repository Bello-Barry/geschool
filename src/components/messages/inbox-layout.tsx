"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Loader2, Send, MessageSquare, Plus, ArrowLeft,
  Paperclip, FileText, FileImage, File, X, Download,
} from "lucide-react";
import { InboxSkeleton } from "@/components/ui/skeletons";

interface UserProfile {
  id: string;
  first_name: string;
  last_name: string;
  role: string;
  email: string;
}

interface Participant {
  user_id?: string;
  last_read_at?: string | null;
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
  last_message?: Message | null;
  unread_count?: number;
}

function getAvatarColorAndInitials(name: string) {
  const cleanName = name.replace(/,/g, "").trim();
  const parts = cleanName.split(/\s+/);
  let initials = "";
  if (parts.length > 0 && parts[0]) {
    initials += parts[0][0];
    if (parts.length > 1 && parts[1]) {
      initials += parts[1][0];
    }
  }
  initials = initials.toUpperCase() || "?";

  let hash = 0;
  for (let i = 0; i < cleanName.length; i++) {
    hash = cleanName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = Math.abs(hash) % 360;
  const s = 65;
  const l = 40;
  return {
    initials,
    style: { backgroundColor: `hsl(${h}, ${s}%, ${l}%)`, color: "#ffffff" },
  };
}

function formatRelativeTime(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();

  const dDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const nowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffTime = nowDate.getTime() - dDate.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  } else if (diffDays === 1) {
    return "Hier";
  } else if (diffDays < 7) {
    return d.toLocaleDateString("fr-FR", { weekday: "long" }).replace(/^\w/, (c) => c.toUpperCase());
  } else {
    return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
  }
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
        (payload: { new: Record<string, unknown> }) => {
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
          fetchConversations();
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [activeConv, fetchMessages, userId, role]);

  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Auto-scroll on active conversation select
  useEffect(() => {
    if (activeConv) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
      }, 50);
    }
  }, [activeConv]);

  // Auto-grow logic for input textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  }, [newMsg]);

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
          const fd = new FormData();
          const f = files[i]; if (!f) continue;
          fd.append("file", f);
          fd.append("messageId", message.id);
          fd.append("conversationId", activeConv);
          await fetch("/api/attachments", { method: "POST", body: fd });
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

  function getDateSeparatorLabel(dateStr: string) {
    const d = new Date(dateStr);
    const now = new Date();

    const dDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const nowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const diffTime = nowDate.getTime() - dDate.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return "Aujourd'hui";
    } else if (diffDays === 1) {
      return "Hier";
    } else {
      return d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
    }
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
          {loading && <InboxSkeleton />}
          {!loading && conversations.length === 0 && (
            <p className="text-sm text-muted-foreground p-4 text-center">Aucune conversation</p>
          )}
          {conversations.map((conv) => {
            const others = conv.participants.filter((p) => p.user?.id !== userId);
            const names = others.map((p) => `${p.user?.first_name || ""} ${p.user?.last_name || ""}`).join(", ").trim() || conv.title || "Discussion";
            const avatarInfo = getAvatarColorAndInitials(names);

            // Last message snippet preview
            let lastMsgText = "Pas encore de message";
            if (conv.last_message) {
              const isMe = conv.last_message.sender_id === userId;
              const senderName = isMe ? "Vous" : (conv.participants.find((p) => (p.user_id === conv.last_message?.sender_id || p.user?.id === conv.last_message?.sender_id))?.user?.first_name || "");
              lastMsgText = senderName ? `${senderName}: ${conv.last_message.content}` : conv.last_message.content;
            }

            const isUnread = conv.unread_count && conv.unread_count > 0;

            return (
              <button
                key={conv.id}
                onClick={() => {
                  setActiveConv(conv.id);
                  setMessages([]);
                  // Instantly clear unread count locally for UI responsiveness
                  setConversations(prev => prev.map(c => c.id === conv.id ? { ...c, unread_count: 0 } : c));
                }}
                className={`w-full text-left p-3 border-b hover:bg-muted/50 transition-colors ${activeConv === conv.id ? "bg-muted" : ""}`}
              >
                <div className="flex items-center gap-3">
                  <div
                    style={avatarInfo.style}
                    className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold shadow-sm"
                  >
                    {avatarInfo.initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <p className={`text-sm font-semibold truncate text-marine-900 ${isUnread ? "font-bold" : "font-medium"}`}>
                        {names}
                      </p>
                      <span className="text-xs text-neutral-600 flex-shrink-0 ml-2">
                        {formatRelativeTime(conv.updated_at)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <p className={`text-xs truncate max-w-[85%] ${isUnread ? "text-marine-900 font-medium" : "text-neutral-600"}`}>
                        {lastMsgText}
                      </p>
                      {isUnread && (
                        <span className="flex-shrink-0 min-w-5 h-5 px-1 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-[10px] font-bold shadow-sm">
                          {conv.unread_count}
                        </span>
                      )}
                    </div>
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
            <div className="flex-1 overflow-y-auto p-4 space-y-1 bg-[#f0f2f5] dark:bg-zinc-950">
              {messages.map((msg, idx) => {
                const isMe = msg.sender_id === userId;
                const prevMsg = idx > 0 ? messages[idx - 1] : null;

                // Date separator logic
                const msgDate = new Date(msg.created_at);
                const prevDate = prevMsg ? new Date(prevMsg.created_at) : null;
                const isNewDay = !prevDate ||
                  msgDate.getFullYear() !== prevDate.getFullYear() ||
                  msgDate.getMonth() !== prevDate.getMonth() ||
                  msgDate.getDate() !== prevDate.getDate();

                // Group message consecutive block logic
                const isConsecutive = prevMsg && prevMsg.sender_id === msg.sender_id && !isNewDay;

                // Sender name logic (group chats with > 2 participants, only for others, and only on first message of block)
                const isGroup = activeConvData && activeConvData.participants && activeConvData.participants.length > 2;
                const showSenderName = isGroup && !isMe && !isConsecutive;

                // Display sender name
                const senderName = msg.sender?.first_name
                  ? `${msg.sender.first_name} ${msg.sender.last_name || ""}`.trim()
                  : "";

                return (
                  <div key={msg.id} className="w-full flex flex-col">
                    {/* Date Separator */}
                    {isNewDay && (
                      <div className="flex justify-center my-4">
                        <span className="bg-white/90 dark:bg-zinc-800 text-neutral-600 dark:text-neutral-300 text-xs font-semibold px-3 py-1 rounded-full shadow-sm">
                          {getDateSeparatorLabel(msg.created_at)}
                        </span>
                      </div>
                    )}

                    {/* Message Bubble Container */}
                    <div className={`flex ${isMe ? "justify-end" : "justify-start"} ${isConsecutive ? "mt-1" : "mt-3"}`}>
                      <div
                        className={`max-w-[70%] sm:max-w-[60%] px-3.5 py-2 text-sm shadow-sm transition-all duration-300 ease-out animate-in fade-in slide-in-from-bottom-2 ${
                          isMe
                            ? "bg-primary text-white rounded-2xl rounded-tr-none"
                            : "bg-white dark:bg-zinc-800 text-marine-900 dark:text-neutral-100 rounded-2xl rounded-tl-none"
                        }`}
                      >
                        {showSenderName && senderName && (
                          <p className="text-xs font-semibold text-primary/90 dark:text-primary-foreground mb-1">
                            {senderName}
                          </p>
                        )}

                        <p className="leading-relaxed break-words">{msg.content}</p>

                        {/* Attachments */}
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
                                      isMe
                                        ? "bg-white/10 hover:bg-white/20 text-white"
                                        : "bg-neutral-50 dark:bg-zinc-900 hover:bg-neutral-100 text-marine-900"
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

                        {/* Timing indicator */}
                        <div className="flex justify-end mt-1">
                          <span
                            className={`text-[10px] font-medium leading-none ${
                              isMe ? "text-white/75" : "text-neutral-500"
                            }`}
                          >
                            {formatTime(msg.created_at)}
                          </span>
                        </div>
                      </div>
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
            <div className="p-3 border-t bg-white dark:bg-zinc-900">
              <form onSubmit={(e) => { e.preventDefault(); sendMessage(); }} className="flex items-end gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ALLOWED_TYPES.join(",")}
                  onChange={handleFileSelect}
                  className="hidden"
                  multiple
                />
                <Button type="button" size="icon" variant="ghost" onClick={() => fileInputRef.current?.click()} disabled={sending || uploading} className="rounded-full shrink-0">
                  <Paperclip className="h-5 w-5" />
                </Button>
                <textarea
                  ref={textareaRef}
                  value={newMsg}
                  onChange={(e) => setNewMsg(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  placeholder="Écrivez un message..."
                  disabled={sending || uploading}
                  rows={1}
                  className="flex-1 resize-none bg-neutral-100 dark:bg-zinc-800 rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary max-h-32 min-h-[40px] leading-relaxed border-none outline-none"
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={sending || uploading || (!newMsg.trim() && files.length === 0)}
                  className={`rounded-full shrink-0 h-10 w-10 transition-all duration-300 ${
                    (sending || uploading || (!newMsg.trim() && files.length === 0))
                      ? "bg-neutral-200 text-neutral-400 dark:bg-zinc-800 dark:text-zinc-600 cursor-not-allowed opacity-60 shadow-none border-none"
                      : "bg-primary text-white hover:bg-primary/95 hover:scale-105 shadow-md shadow-primary/20"
                  }`}
                >
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
