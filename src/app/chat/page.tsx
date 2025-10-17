"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Header } from "@/components/ui/header";
import { Send, Bot, User, Sparkles, TrendingUp, TrendingDown } from "lucide-react";
import { useState } from "react";

export default function ChatPage() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Hello! I'm your stock market assistant. Ask me anything about stocks, market trends, or trading strategies.",
    },
  ]);

  const handleSend = () => {
    if (!message.trim()) return;

    setMessages([...messages, { role: "user", content: message }]);
    setMessage("");

    // Simulate AI response
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "This is a placeholder response. Connect your AI model to get real-time market insights and analysis.",
        },
      ]);
    }, 1000);
  };

  return (
    <div className="h-screen bg-black flex flex-col">
      <Header />

      {/* Main Content - 60/40 Split */}
      <div className="flex-1 flex overflow-hidden pt-16">
        {/* Left Side - 60% Chat Interface */}
        <div className="w-[60%] flex flex-col border-r border-neutral-800/50">
          {/* Chat Header */}
          <div className="px-6 py-5 border-b border-neutral-800/50 bg-neutral-950/30">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-xl bg-neutral-50 flex items-center justify-center">
                <Bot className="h-6 w-6 text-black" strokeWidth={2.5} />
              </div>
              <div>
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  Market AI Assistant
                  <Sparkles className="h-4 w-4 text-neutral-400" />
                </h2>
                <p className="text-sm text-neutral-500">Powered by advanced analytics</p>
              </div>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.role === "assistant" && (
                  <div className="h-8 w-8 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-center flex-shrink-0 mt-1">
                    <Bot className="h-4 w-4 text-neutral-400" />
                  </div>
                )}

                <div
                  className={`max-w-[75%] rounded-2xl px-5 py-3.5 ${
                    msg.role === "user"
                      ? "bg-neutral-50 text-black"
                      : "bg-neutral-900/80 border border-neutral-800/50 text-neutral-100"
                  }`}
                >
                  <p className="text-[15px] leading-relaxed">{msg.content}</p>
                </div>

                {msg.role === "user" && (
                  <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-neutral-700 to-neutral-800 border border-neutral-700 flex items-center justify-center flex-shrink-0 mt-1">
                    <User className="h-4 w-4 text-neutral-300" />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Input Area */}
          <div className="p-6 border-t border-neutral-800/50 bg-neutral-950/50">
            <div className="flex gap-3 items-end">
              <div className="flex-1 relative">
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="Ask about stocks, market trends, or trading strategies..."
                  rows={1}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3.5 text-[15px] resize-none focus:outline-none focus:ring-2 focus:ring-neutral-700 focus:border-neutral-700 placeholder:text-neutral-600 transition-all"
                  style={{ minHeight: "52px", maxHeight: "150px" }}
                />
              </div>
              <Button
                onClick={handleSend}
                disabled={!message.trim()}
                className="h-[52px] px-5 rounded-xl bg-neutral-50 hover:bg-neutral-200 text-black font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-neutral-600 mt-3 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-neutral-400 animate-pulse" />
              AI can make mistakes. Verify important information.
            </p>
          </div>
        </div>

        {/* Right Side - 40% Context Panel */}
        <div className="w-[40%] overflow-y-auto bg-neutral-950/30">
          <div className="p-6 space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-6">
                <div className="h-8 w-8 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-center">
                  <Sparkles className="h-4 w-4 text-neutral-400" />
                </div>
                <h3 className="text-lg font-semibold">Market Context</h3>
              </div>

              {/* Quick Stats */}
              <Card className="p-5 mb-6 border-neutral-800/50 bg-neutral-900/50">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-4 flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-neutral-400 animate-pulse" />
                  Live Market Data
                </h4>
                <div className="space-y-3.5">
                  <div className="flex justify-between items-center p-2.5 rounded-lg hover:bg-neutral-800/50 transition-colors">
                    <span className="text-sm font-medium">S&P 500</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">4,783.45</span>
                      <span className="text-xs text-green-400 font-medium flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        +1.24%
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center p-2.5 rounded-lg hover:bg-neutral-800/50 transition-colors">
                    <span className="text-sm font-medium">NASDAQ</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">15,089.90</span>
                      <span className="text-xs text-green-400 font-medium flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        +2.01%
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center p-2.5 rounded-lg hover:bg-neutral-800/50 transition-colors">
                    <span className="text-sm font-medium">DOW</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">37,305.16</span>
                      <span className="text-xs text-red-400 font-medium flex items-center gap-1">
                        <TrendingDown className="h-3 w-3" />
                        -0.52%
                      </span>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Suggested Questions */}
              <Card className="p-5 mb-6 border-neutral-800/50 bg-neutral-900/50">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-4">Suggested Questions</h4>
                <div className="space-y-2.5">
                  {[
                    "What are the top tech stocks today?",
                    "Analyze AAPL performance",
                    "Explain current market trends",
                    "What factors affect stock prices?",
                  ].map((question, idx) => (
                    <button
                      key={idx}
                      onClick={() => setMessage(question)}
                      className="w-full text-left text-sm p-3.5 rounded-lg border border-neutral-800/50 hover:border-neutral-700 hover:bg-neutral-800/50 transition-all group"
                    >
                      <span className="group-hover:text-neutral-300 transition-colors">{question}</span>
                    </button>
                  ))}
                </div>
              </Card>

              {/* Recent Analysis */}
              <Card className="p-5 border-neutral-800/50 bg-neutral-900/50">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-4">Recent Analysis</h4>
                <div className="space-y-3">
                  {[
                    { title: "Tech Sector Rally", desc: "AI investments driving growth", color: "blue" },
                    { title: "Fed Rate Decision", desc: "Rates held steady at 5.5%", color: "purple" },
                    { title: "Energy Outlook", desc: "Renewable sector expansion", color: "green" },
                  ].map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-lg bg-neutral-800/30 border border-neutral-800/50 hover:border-neutral-700 transition-all cursor-pointer group"
                    >
                      <p className="text-sm font-medium mb-1.5 group-hover:text-neutral-300 transition-colors">
                        {item.title}
                      </p>
                      <p className="text-xs text-neutral-500">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
