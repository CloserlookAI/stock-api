"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Activity, CheckCircle, Clock, Terminal, FileCode, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

interface Segment {
  type: string;
  tool?: string;
  args?: {
    filename?: string;
    command?: string;
    content?: string;
    [key: string]: unknown;
  };
  channel?: string;
  text?: string;
  payload?: {
    filename?: string;
    command?: string;
    url?: string;
    [key: string]: unknown;
  };
}

interface ProcessingLogProps {
  segments: Segment[];
  agentName?: string;
}

export default function ProcessingLog({ segments, agentName }: ProcessingLogProps) {
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());

  const toggleItem = (index: number) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedItems(newExpanded);
  };
  const getToolIcon = (tool?: string) => {
    if (!tool) return Terminal;
    const toolLower = tool.toLowerCase();
    if (toolLower.includes('create_file') || toolLower.includes('open_file')) return FileCode;
    if (toolLower.includes('run_bash')) return Terminal;
    return Activity;
  };

  const formatArgs = (args: Segment['args']) => {
    if (!args) return null;

    // For better readability, format specific fields
    const formattedArgs: Record<string, unknown> = {};

    if (args.filename) formattedArgs.filename = args.filename;
    if (args.command) {
      // Truncate long commands
      formattedArgs.command = args.command.length > 100
        ? args.command.substring(0, 100) + '...'
        : args.command;
    }
    if (args.content) {
      formattedArgs.content = `(${args.content.length} characters)`;
    }

    return Object.keys(formattedArgs).length > 0 ? formattedArgs : args;
  };

  if (segments.length === 0) {
    return null;
  }

  return (
    <Card className="border-neutral-800/50 bg-gradient-to-br from-neutral-950/80 to-neutral-900/50 backdrop-blur-sm">
      <CardHeader className="border-b border-neutral-800/50 bg-gradient-to-r from-neutral-900/50 to-neutral-950/50">
        <CardTitle className="flex items-center gap-3">
          <div className="relative">
            <Activity className="h-5 w-5 text-neutral-50 animate-pulse" />
            <div className="absolute inset-0 h-5 w-5 text-neutral-50 animate-ping opacity-20" />
          </div>
          <span>Agent Processing Log</span>
        </CardTitle>
        {agentName && (
          <CardDescription className="mt-2">
            Agent: <span className="font-mono text-neutral-50 font-semibold">{agentName}</span>
            <span className="ml-3 text-xs text-neutral-500">• {segments.length} operations</span>
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-2 max-h-[600px] overflow-y-auto custom-scrollbar">
          {segments.map((segment, index) => {
            const ToolIcon = getToolIcon(segment.tool);
            const isExpanded = expandedItems.has(index);
            const isLatest = index === segments.length - 1;

            return (
              <div
                key={index}
                className={`rounded-lg border transition-all duration-300 animate-fade-in ${
                  segment.type === 'tool_call'
                    ? 'bg-neutral-900/30 border-neutral-700/50 hover:border-neutral-600/70'
                    : segment.type === 'tool_result'
                    ? 'bg-neutral-50/5 border-neutral-50/20 hover:border-neutral-50/30'
                    : segment.type === 'commentary'
                    ? 'bg-neutral-900/40 border-neutral-700/40 hover:border-neutral-600/60'
                    : segment.type === 'error'
                    ? 'bg-neutral-800/30 border-neutral-600/40 hover:border-neutral-600/60'
                    : 'bg-neutral-900/50 border-neutral-800/30 hover:border-neutral-700/50'
                } ${isLatest && segment.type === 'tool_call' ? 'ring-2 ring-neutral-50/20 animate-pulse-border' : ''}`}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {/* Header - Always visible */}
                <button
                  onClick={() => toggleItem(index)}
                  className="w-full flex items-start gap-3 p-4 text-left"
                >
                  {segment.type === 'tool_call' ? (
                    <>
                      <div className="relative">
                        <Clock className="h-5 w-5 text-neutral-300 mt-0.5 flex-shrink-0" />
                        {isLatest && (
                          <div className="absolute inset-0 animate-ping">
                            <Clock className="h-5 w-5 text-neutral-300 opacity-30" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <ToolIcon className="h-4 w-4 text-neutral-300" />
                          <p className="font-semibold text-sm text-neutral-200">
                            Tool Call: {segment.tool || 'Unknown'}
                          </p>
                          {isLatest && (
                            <span className="text-xs bg-neutral-50/10 text-neutral-50 px-2 py-0.5 rounded-full border border-neutral-50/20 animate-pulse">
                              Processing...
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-neutral-400">Click to {isExpanded ? 'collapse' : 'expand'} details</p>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="h-5 w-5 text-neutral-400 flex-shrink-0" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-neutral-400 flex-shrink-0" />
                      )}
                    </>
                  ) : segment.type === 'tool_result' ? (
                    <>
                      <CheckCircle className="h-5 w-5 text-neutral-50 mt-0.5 flex-shrink-0 animate-check-appear" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <ToolIcon className="h-4 w-4 text-neutral-50" />
                          <p className="font-semibold text-sm text-neutral-50">
                            Tool Result: {segment.tool || 'Unknown'}
                          </p>
                          <span className="text-xs bg-neutral-50/10 text-neutral-50 px-2 py-0.5 rounded-full border border-neutral-50/20">
                            Success
                          </span>
                        </div>
                        <p className="text-xs text-neutral-400">Click to {isExpanded ? 'collapse' : 'expand'} output</p>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="h-5 w-5 text-neutral-400 flex-shrink-0" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-neutral-400 flex-shrink-0" />
                      )}
                    </>
                  ) : segment.type === 'commentary' ? (
                    <>
                      <Activity className="h-5 w-5 text-neutral-200 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-neutral-200 font-medium mb-1">Commentary</p>
                        <p className="text-sm text-neutral-300 line-clamp-2">{segment.text}</p>
                      </div>
                      {segment.text && segment.text.length > 100 && (
                        isExpanded ? (
                          <ChevronUp className="h-5 w-5 text-neutral-400 flex-shrink-0" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-neutral-400 flex-shrink-0" />
                        )
                      )}
                    </>
                  ) : segment.type === 'error' ? (
                    <>
                      <AlertCircle className="h-5 w-5 text-neutral-400 mt-0.5 flex-shrink-0 animate-shake" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-neutral-300 font-medium mb-1">Error</p>
                        <p className="text-sm text-neutral-300 line-clamp-2">{segment.text || 'An error occurred'}</p>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="h-5 w-5 text-neutral-400 flex-shrink-0" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-neutral-400 flex-shrink-0" />
                      )}
                    </>
                  ) : (
                    <>
                      <div className="h-5 w-5 rounded-full bg-neutral-700/50 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm text-neutral-400 line-clamp-2">
                          {segment.text || JSON.stringify(segment, null, 2)}
                        </p>
                      </div>
                    </>
                  )}
                </button>

                {/* Expandable content */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-0 border-t border-neutral-800/30 animate-expand">
                    {segment.type === 'tool_call' && segment.args && (
                      <div className="mt-3">
                        <p className="text-xs font-semibold text-neutral-400 mb-2">Arguments:</p>
                        <pre className="text-xs text-neutral-300 overflow-x-auto bg-black/40 p-3 rounded border border-neutral-800/50 font-mono">
                          {JSON.stringify(formatArgs(segment.args), null, 2)}
                        </pre>
                      </div>
                    )}
                    {segment.type === 'tool_call' && segment.text && (
                      <div className="mt-3">
                        <p className="text-xs font-semibold text-neutral-400 mb-2">Details:</p>
                        <p className="text-sm text-neutral-300 bg-black/40 p-3 rounded border border-neutral-800/50">{segment.text}</p>
                      </div>
                    )}
                    {segment.type === 'tool_result' && segment.payload && (
                      <div className="mt-3">
                        <p className="text-xs font-semibold text-neutral-400 mb-2">Output:</p>
                        <div className="text-xs text-neutral-300">
                          {typeof segment.payload === 'string' ? (
                            <pre className="overflow-x-auto bg-black/40 p-3 rounded border border-neutral-800/50 font-mono max-h-60 overflow-y-auto custom-scrollbar">
                              {segment.payload.length > 1000
                                ? segment.payload.substring(0, 1000) + '...\n(truncated)'
                                : segment.payload}
                            </pre>
                          ) : (
                            <pre className="overflow-x-auto bg-black/40 p-3 rounded border border-neutral-800/50 font-mono max-h-60 overflow-y-auto custom-scrollbar">
                              {JSON.stringify(segment.payload, null, 2)}
                            </pre>
                          )}
                        </div>
                      </div>
                    )}
                    {segment.type === 'commentary' && segment.text && (
                      <div className="mt-3 bg-black/40 p-3 rounded border border-neutral-800/50">
                        <p className="text-sm text-neutral-300 whitespace-pre-wrap">{segment.text}</p>
                      </div>
                    )}
                    {segment.type === 'error' && segment.text && (
                      <div className="mt-3 bg-neutral-800/40 p-3 rounded border border-neutral-700/40">
                        <p className="text-sm text-neutral-300 whitespace-pre-wrap">{segment.text}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes expand {
          from {
            opacity: 0;
            max-height: 0;
          }
          to {
            opacity: 1;
            max-height: 500px;
          }
        }
        @keyframes check-appear {
          0% {
            transform: scale(0) rotate(-45deg);
          }
          50% {
            transform: scale(1.2) rotate(0deg);
          }
          100% {
            transform: scale(1) rotate(0deg);
          }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        @keyframes pulse-border {
          0%, 100% {
            box-shadow: 0 0 0 0 rgba(250, 250, 250, 0.3);
          }
          50% {
            box-shadow: 0 0 0 4px rgba(250, 250, 250, 0.1);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.4s ease-out forwards;
        }
        .animate-expand {
          animation: expand 0.3s ease-out forwards;
        }
        .animate-check-appear {
          animation: check-appear 0.5s ease-out;
        }
        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
        .animate-pulse-border {
          animation: pulse-border 2s ease-in-out infinite;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(38, 38, 38, 0.5);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(82, 82, 82, 0.8);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(115, 115, 115, 0.9);
        }
      `}</style>
    </Card>
  );
}
