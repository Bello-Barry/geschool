"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Loader2, Sparkles, MessageSquare, History, Languages } from "lucide-react";
import { chatbotResponse } from "@/lib/ai/gemini";
import { Card } from "@/components/ui/card";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export default function ChatbotPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content: "Bonjour! Je suis votre assistant IA. Je peux répondre à vos questions sur la scolarité de vos enfants en Français ou en Lingala. Comment puis-je vous aider?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const suggestedQuestions = [
    { label: "Moyenne générale", query: "Quelle est la moyenne générale de mon enfant ?", icon: Sparkles },
    { label: "Absences", query: "Combien d'absences mon enfant a-t-il cette semaine ?", icon: History },
    { label: "Paiements", query: "Quel est le solde restant à payer ?", icon: MessageSquare },
    { label: "Traduction Lingala", query: "Peux-tu me donner le résumé en Lingala ?", icon: Languages },
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const response = await chatbotResponse(input);

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: response,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 2).toString(),
        role: "assistant",
        content: "Désolé, une erreur est survenue. Veuillez réessayer.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex gap-6 p-6">
      {/* Sidebar suggestions */}
      <div className="hidden lg:flex flex-col w-72 gap-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Suggestions
        </h2>
        <div className="space-y-2">
          {suggestedQuestions.map((q, i) => (
            <Button
              key={i}
              variant="outline"
              className="w-full justify-start text-left h-auto py-3 px-4 break-words whitespace-normal"
              onClick={() => setInput(q.query)}
              disabled={loading}
            >
              <q.icon className="h-4 w-4 mr-2 shrink-0" />
              <span className="text-sm">{q.label}</span>
            </Button>
          ))}
        </div>

        <Card className="mt-auto p-4 bg-muted/50 border-none">
          <p className="text-xs text-muted-foreground">
            L'assistant IA utilise vos données scolaires pour répondre précisément à vos besoins.
          </p>
        </Card>
      </div>

      {/* Main Chat Area */}
      <Card className="flex-1 flex flex-col overflow-hidden border-primary/10">
      <div className="p-4 border-b bg-muted/30 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Assistant IA</h1>
          <p className="text-xs text-muted-foreground">En ligne | Support Multi-langue</p>
        </div>
        <div className="bg-green-500/10 text-green-600 text-[10px] px-2 py-1 rounded-full font-bold uppercase">
          Actif
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-md p-4 rounded-lg ${
                message.role === "user"
                  ? "bg-blue-600 text-white rounded-br-none"
                  : "bg-gray-200 text-gray-800 rounded-bl-none"
              }`}
            >
              <p className="text-sm">{message.content}</p>
              <span className="text-xs mt-1 block opacity-70">
                {message.timestamp.toLocaleTimeString("fr-FR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-200 text-gray-800 p-4 rounded-lg rounded-bl-none flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">L'assistant réfléchit...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t bg-muted/10">
        <div className="flex gap-2">
          <Input
            placeholder="Posez votre question en Français ou Lingala..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSend()}
            disabled={loading}
            className="bg-white"
          />
          <Button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            size="icon"
            className="shrink-0"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        <div className="flex items-center gap-4 mt-2">
          <p className="text-[10px] text-gray-500">
            💡 Conseil: Demandez "Donne moi le résumé en Lingala" pour une traduction.
          </p>
        </div>
      </div>
      </Card>
    </div>
  );
}
