"use client";

import React, { useState } from "react";
import {
  Sparkles,
  Send,
  HelpCircle,
  TrendingDown,
  Warehouse,
  ShieldCheck,
  Package,
  Layers,
  CheckCircle2,
  Bot,
  User,
} from "lucide-react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export default function CopilotPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "👋 Hello! I am **StockSense Copilot**, your real-time inventory intelligence assistant.\n\nI answer questions grounded strictly in your live **PostgreSQL database** (`stocksense`). I never guess or invent data.\n\nClick any prompt below or type your question!",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [inputQuery, setInputQuery] = useState("");
  const [loading, setLoading] = useState(false);

  const samplePrompts = [
    "Why did Steel Rod stock change today?",
    "Which products are low in stock?",
    "What needs my attention right now?",
    "Which warehouse has the most inventory?",
    "Show incoming stock from suppliers",
  ];

  const handleSend = async (queryToSend?: string) => {
    const query = (queryToSend || inputQuery).trim();
    if (!query || loading) return;

    const userMsg: Message = {
      role: "user",
      content: query,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery("");
    setLoading(true);

    try {
      const res = await fetch("/api/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: query }),
      });
      const data = await res.json();

      const assistantMsg: Message = {
        role: "assistant",
        content: data.answer || "I could not retrieve an answer for that query.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "❌ An error occurred while querying the database. Please try again.",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <Sparkles className="w-5 h-5 text-amber-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">StockSense Copilot</h2>
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-300">
                Data-Grounded Assistant
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Grounded conversational assistant querying real-time inventory balances and the immutable Stock Ledger.
            </p>
          </div>
        </div>
      </div>

      {/* Suggested Prompt Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <span className="text-xs font-semibold text-slate-400 whitespace-nowrap">Try asking:</span>
        {samplePrompts.map((prompt, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(prompt)}
            className="px-3 py-1.5 rounded-full bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-300 text-xs font-medium text-slate-700 transition-colors whitespace-nowrap shadow-sm"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Chat Messages Log */}
      <Card className="p-4 sm:p-6 min-h-[460px] flex flex-col justify-between border-slate-200 shadow-sm bg-slate-50/40">
        <div className="space-y-4 mb-4 overflow-y-auto max-h-[500px] pr-2">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex items-start gap-3 ${
                m.role === "user" ? "flex-row-reverse" : "flex-row"
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs ${
                  m.role === "user" ? "bg-slate-800" : "bg-blue-600 shadow-sm shadow-blue-500/30"
                }`}
              >
                {m.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>
              <div
                className={`max-w-2xl rounded-2xl p-4 text-xs leading-relaxed shadow-sm ${
                  m.role === "user"
                    ? "bg-slate-900 text-white rounded-tr-none font-medium"
                    : "bg-white border border-slate-200 text-slate-800 rounded-tl-none space-y-2 whitespace-pre-wrap"
                }`}
              >
                <div dangerouslySetInnerHTML={{ __html: m.content.replace(/\n/g, "<br/>") }} />
                <span
                  className={`block text-[10px] mt-2 ${
                    m.role === "user" ? "text-slate-400 text-right" : "text-slate-400"
                  }`}
                >
                  {m.timestamp}
                </span>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center flex-shrink-0 animate-pulse">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-none p-3.5 text-xs text-slate-500 flex items-center gap-2">
                <div className="w-3.5 h-3.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <span>Querying PostgreSQL stock balances & audit ledger...</span>
              </div>
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div className="pt-3 border-t border-slate-200 flex items-center gap-2 bg-white p-2 rounded-xl border">
          <input
            type="text"
            placeholder="Ask anything about stock, locations, suppliers, or movements..."
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            className="flex-1 px-3 py-2 text-xs bg-transparent focus:outline-none text-slate-900 placeholder:text-slate-400"
          />
          <Button
            variant="primary"
            size="sm"
            onClick={() => handleSend()}
            disabled={!inputQuery.trim() || loading}
          >
            <Send className="w-3.5 h-3.5 mr-1" />
            Send
          </Button>
        </div>
      </Card>
    </div>
  );
}
