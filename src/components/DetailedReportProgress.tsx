"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Activity, AlertCircle, Clock, Loader2, ChevronDown, ChevronRight, Terminal, FileText, Package, Upload } from "lucide-react";
import { useEffect, useState } from "react";

interface DetailedStep {
  id: string;
  title: string;
  description: string;
  tool?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'error';
  timestamp?: string;
  details?: string;
  output?: string;
  backendOperation?: string; // New: raw backend operation description
  args?: Record<string, unknown>; // New: raw args for accordion
  payload?: Record<string, unknown>; // New: raw payload for accordion
}

interface Segment {
  type: string;
  tool?: string;
  args?: {
    filename?: string;
    command?: string;
    content?: string;
    commentary?: string;
    [key: string]: unknown;
  };
  text?: string;
  payload?: {
    url?: string;
    filename?: string;
    stdout?: string;
    stderr?: string;
    status?: string;
    [key: string]: unknown;
  };
}

interface DetailedReportProgressProps {
  segments: Segment[];
  isComplete: boolean;
}

export default function DetailedReportProgress({ segments, isComplete }: DetailedReportProgressProps) {
  const [steps, setSteps] = useState<DetailedStep[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(-1);
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());

  useEffect(() => {
    const processedSteps = processSegments(segments, isComplete);
    setSteps(processedSteps);

    // Find the current step (first in_progress step)
    const currentIdx = processedSteps.findIndex(s => s.status === 'in_progress');
    setCurrentStepIndex(currentIdx);

    // Auto-expand the current in-progress step
    if (currentIdx >= 0 && processedSteps[currentIdx]) {
      setExpandedSteps(prev => new Set(prev).add(processedSteps[currentIdx].id));
    }
  }, [segments, isComplete]);

  const toggleStep = (stepId: string) => {
    setExpandedSteps(prev => {
      const newSet = new Set(prev);
      if (newSet.has(stepId)) {
        newSet.delete(stepId);
      } else {
        newSet.add(stepId);
      }
      return newSet;
    });
  };

  const processSegments = (segs: Segment[], complete: boolean): DetailedStep[] => {
    const detailedSteps: DetailedStep[] = [];
    let stepId = 0;

    for (const segment of segs) {
      if (segment.type === 'tool_call') {
        const tool = segment.tool || 'unknown';
        const commentary = segment.args?.commentary as string || '';

        const step: DetailedStep = {
          id: `step-${stepId++}`,
          title: getToolTitle(tool, segment.args),
          description: commentary || getToolDescription(tool, segment.args),
          tool: tool,
          status: 'in_progress',
          details: formatArgs(segment.args),
          backendOperation: `${tool} - ${commentary || 'Processing...'}`,
          args: segment.args,
        };
        detailedSteps.push(step);
      } else if (segment.type === 'tool_result') {
        // Find the matching tool_call and mark it as completed
        const matchingStep = detailedSteps.find(
          s => s.tool === segment.tool && s.status === 'in_progress'
        );
        if (matchingStep) {
          matchingStep.status = 'completed';
          matchingStep.output = formatOutput(segment.payload);
          matchingStep.payload = segment.payload;
        }
      } else if (segment.type === 'error') {
        // Mark the last in_progress step as error
        const lastInProgress = [...detailedSteps].reverse().find(s => s.status === 'in_progress');
        if (lastInProgress) {
          lastInProgress.status = 'error';
          lastInProgress.details = segment.text || 'Unknown error';
        }
      }
    }

    // If complete, mark all as completed
    if (complete) {
      detailedSteps.forEach(step => {
        if (step.status === 'in_progress') {
          step.status = 'completed';
        }
      });
    }

    return detailedSteps;
  };

  const getToolTitle = (tool: string, args?: Record<string, unknown>): string => {
    switch (tool) {
      case 'run_bash':
        const cmd = args?.command as string || '';
        if (cmd.includes('venv')) return 'Setting Up Python Environment';
        if (cmd.includes('pip install')) return 'Installing Dependencies';
        if (cmd.includes('python') && cmd.includes('fetch')) return 'Fetching Stock Data';
        if (cmd.includes('python') && cmd.includes('generate')) return 'Generating HTML Report';
        return 'Executing Command';
      case 'create_file':
        const filename = args?.filename as string || '';
        if (filename.includes('fetch')) return 'Creating Data Fetching Script';
        if (filename.includes('generate')) return 'Creating Report Generator';
        return 'Creating File';
      case 'publish_agent':
        return 'Publishing Report';
      case 'update_plan':
        return 'Updating Task Plan';
      default:
        return tool.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    }
  };

  const getToolDescription = (tool: string, args?: Record<string, unknown>): string => {
    switch (tool) {
      case 'run_bash':
        const cmd = args?.command as string || '';
        if (cmd.includes('venv')) return 'Initializing isolated Python environment';
        if (cmd.includes('pip install')) return 'Installing required Python packages (yfinance, pandas)';
        if (cmd.includes('fetch')) return 'Retrieving financial data from Yahoo Finance';
        if (cmd.includes('generate')) return 'Creating comprehensive HTML report with embedded styles';
        return 'Running shell command';
      case 'create_file':
        const filename = args?.filename as string || '';
        if (filename.includes('fetch')) return 'Writing Python script to fetch stock data';
        if (filename.includes('generate')) return 'Writing report generator with analysis logic';
        return `Creating ${filename}`;
      case 'publish_agent':
        return 'Making the report publicly accessible via CDN';
      case 'update_plan':
        return 'Tracking progress through the generation pipeline';
      default:
        return `Executing ${tool} operation`;
    }
  };

  const formatArgs = (args?: Record<string, unknown>): string => {
    if (!args) return '';

    const relevantArgs: string[] = [];
    if (args.filename) relevantArgs.push(`File: ${args.filename}`);
    if (args.command) {
      const cmd = args.command as string;
      if (cmd.length > 100) {
        relevantArgs.push(`Command: ${cmd.substring(0, 100)}...`);
      } else {
        relevantArgs.push(`Command: ${cmd}`);
      }
    }

    return relevantArgs.join(' | ');
  };

  const formatOutput = (payload?: Record<string, unknown>): string => {
    if (!payload) return '';

    const outputs: string[] = [];
    if (payload.url) outputs.push(`URL: ${payload.url}`);
    if (payload.filename) outputs.push(`Created: ${payload.filename}`);
    if (payload.stdout) {
      const stdout = payload.stdout as string;
      if (stdout.length > 200) {
        outputs.push(`Output: ${stdout.substring(0, 200)}...`);
      } else {
        outputs.push(`Output: ${stdout}`);
      }
    }

    return outputs.join(' | ');
  };

  const getStatusIcon = (status: DetailedStep['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-400" />;
      case 'in_progress':
        return <Loader2 className="h-5 w-5 text-blue-400 animate-spin" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-400" />;
      default:
        return <Clock className="h-5 w-5 text-neutral-500" />;
    }
  };

  const getStatusColor = (status: DetailedStep['status']) => {
    switch (status) {
      case 'completed':
        return 'border-green-500/30 bg-green-500/5';
      case 'in_progress':
        return 'border-blue-500/30 bg-blue-500/5 animate-pulse';
      case 'error':
        return 'border-red-500/30 bg-red-500/5';
      default:
        return 'border-neutral-700/30 bg-neutral-800/5';
    }
  };

  const getToolIcon = (tool?: string) => {
    switch (tool) {
      case 'run_bash':
        return <Terminal className="h-4 w-4" />;
      case 'create_file':
      case 'str_replace':
      case 'open_file':
        return <FileText className="h-4 w-4" />;
      case 'update_plan':
        return <Activity className="h-4 w-4" />;
      case 'publish_agent':
        return <Upload className="h-4 w-4" />;
      default:
        return <Package className="h-4 w-4" />;
    }
  };

  const formatJsonForDisplay = (obj: Record<string, unknown> | undefined): string => {
    if (!obj) return 'No data';
    try {
      return JSON.stringify(obj, null, 2);
    } catch {
      return String(obj);
    }
  };

  const getProgressPercentage = () => {
    if (steps.length === 0) return 0;
    const completed = steps.filter(s => s.status === 'completed').length;
    return Math.round((completed / steps.length) * 100);
  };

  const currentStep = currentStepIndex >= 0 ? steps[currentStepIndex] : null;

  return (
    <Card className="border-neutral-800/50 bg-gradient-to-br from-neutral-950/80 to-neutral-900/50 backdrop-blur-sm">
      <CardHeader className="border-b border-neutral-800/50 bg-gradient-to-r from-neutral-900/50 to-neutral-950/50">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-3">
            <div className="relative">
              <Activity className={`h-5 w-5 text-blue-400 ${!isComplete ? 'animate-pulse' : ''}`} />
              {!isComplete && (
                <div className="absolute inset-0 h-5 w-5 text-blue-400 animate-ping opacity-20" />
              )}
            </div>
            <span>Report Generation Progress</span>
          </CardTitle>
          <div className="flex items-center gap-3">
            <div className="text-sm text-neutral-400">
              {steps.filter(s => s.status === 'completed').length} / {steps.length} steps
            </div>
          </div>
        </div>

        {/* Current Step Indicator */}
        {currentStep && (
          <div className="mt-3 flex items-center gap-2 text-sm text-blue-300 animate-pulse">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="font-medium">{currentStep.title}...</span>
          </div>
        )}
      </CardHeader>

      <CardContent className="p-6">
        <div className="space-y-3 max-h-[600px] overflow-y-auto scrollbar-thin scrollbar-thumb-neutral-700 scrollbar-track-neutral-900">
          {steps.length === 0 && (
            <div className="text-center py-8 text-neutral-500">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3 text-blue-400" />
              <p>Initializing report generation...</p>
            </div>
          )}

          {steps.filter((step, index) => {
            // Only show completed steps and the first in-progress step
            // Hide all pending steps
            if (step.status === 'completed') return true;
            if (step.status === 'in_progress') {
              // Only show if it's the first in_progress step
              return index === currentStepIndex;
            }
            return false;
          }).map((step, index) => {
            const isExpanded = expandedSteps.has(step.id);
            return (
              <div
                key={step.id}
                className={`rounded-lg border transition-all duration-300 ${getStatusColor(step.status)}`}
                style={{
                  animation: 'slideIn 0.3s ease-out',
                  animationDelay: `${index * 50}ms`,
                  animationFillMode: 'backwards'
                }}
              >
                {/* Main Step Header - Always Visible */}
                <div
                  className="p-4 cursor-pointer hover:bg-neutral-900/30 transition-colors"
                  onClick={() => toggleStep(step.id)}
                >
                  <div className="flex items-start gap-3">
                    {/* Expand/Collapse Icon */}
                    <div className="flex-shrink-0 mt-0.5">
                      {isExpanded ? (
                        <ChevronDown className="h-5 w-5 text-neutral-400" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-neutral-400" />
                      )}
                    </div>

                    {/* Status Icon */}
                    <div className="flex-shrink-0 mt-0.5">
                      {getStatusIcon(step.status)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <h4 className={`font-semibold mb-1 ${
                            step.status === 'completed' ? 'text-green-300' :
                            step.status === 'in_progress' ? 'text-blue-300' :
                            step.status === 'error' ? 'text-red-300' :
                            'text-neutral-400'
                          }`}>
                            {step.title}
                          </h4>
                          <p className="text-sm text-neutral-400">
                            {step.description}
                          </p>
                        </div>

                        {/* Status Badge */}
                        <div className={`flex-shrink-0 px-2 py-1 rounded-full text-xs font-medium ${
                          step.status === 'completed' ? 'bg-green-500/20 text-green-300' :
                          step.status === 'in_progress' ? 'bg-blue-500/20 text-blue-300' :
                          step.status === 'error' ? 'bg-red-500/20 text-red-300' :
                          'bg-neutral-700/20 text-neutral-400'
                        }`}>
                          {step.status === 'completed' && '✓ Done'}
                          {step.status === 'in_progress' && 'In Progress'}
                          {step.status === 'error' && '✗ Error'}
                          {step.status === 'pending' && 'Pending'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Accordion Content - Backend Details */}
                {isExpanded && (
                  <div className="px-4 pb-4 space-y-3 border-t border-neutral-700/30 pt-3 mt-2">
                    {/* Backend Operation */}
                    {step.backendOperation && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-xs font-semibold text-neutral-300 uppercase tracking-wider">
                          {getToolIcon(step.tool)}
                          <span>Backend Operation</span>
                        </div>
                        <div className="p-3 bg-neutral-900/50 rounded border border-neutral-700/30">
                          <p className="text-xs text-blue-400 font-mono">{step.backendOperation}</p>
                        </div>
                      </div>
                    )}

                    {/* Tool Arguments */}
                    {step.args && Object.keys(step.args).length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-xs font-semibold text-neutral-300 uppercase tracking-wider">
                          <Package className="h-4 w-4" />
                          <span>Tool Arguments</span>
                        </div>
                        <div className="p-3 bg-neutral-900/50 rounded border border-neutral-700/30 max-h-80 overflow-y-auto scrollbar-thin scrollbar-thumb-neutral-700 scrollbar-track-neutral-900">
                          <pre className="text-xs text-neutral-400 font-mono whitespace-pre-wrap break-words">
                            {formatJsonForDisplay(step.args)}
                          </pre>
                        </div>
                      </div>
                    )}

                    {/* Tool Result/Payload */}
                    {step.payload && Object.keys(step.payload).length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-xs font-semibold text-green-300 uppercase tracking-wider">
                          <CheckCircle className="h-4 w-4" />
                          <span>Result</span>
                        </div>
                        <div className="p-3 bg-neutral-900/50 rounded border border-green-700/30 max-h-80 overflow-y-auto scrollbar-thin scrollbar-thumb-neutral-700 scrollbar-track-neutral-900">
                          <pre className="text-xs text-green-400 font-mono whitespace-pre-wrap break-words">
                            {formatJsonForDisplay(step.payload)}
                          </pre>
                        </div>
                      </div>
                    )}

                    {/* Human-Readable Output Summary */}
                    {step.output && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-xs font-semibold text-neutral-300 uppercase tracking-wider">
                          <Terminal className="h-4 w-4" />
                          <span>Output Summary</span>
                        </div>
                        <div className="p-3 bg-neutral-900/50 rounded border border-neutral-700/30">
                          <p className="text-xs text-green-400 font-mono break-all">
                            {step.output}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Error Details */}
                    {step.status === 'error' && step.details && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-xs font-semibold text-red-300 uppercase tracking-wider">
                          <AlertCircle className="h-4 w-4" />
                          <span>Error Details</span>
                        </div>
                        <div className="p-3 bg-red-900/20 rounded border border-red-700/30">
                          <p className="text-xs text-red-400 font-mono break-all">
                            {step.details}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Completion Message */}
          {isComplete && steps.length > 0 && (
            <div className="mt-4 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-6 w-6 text-green-400 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-green-300 mb-1">Report Generation Complete!</h4>
                  <p className="text-sm text-neutral-400">
                    All steps completed successfully. Your report is ready to view.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>

      <style jsx>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(-10px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        .scrollbar-thin::-webkit-scrollbar {
          width: 6px;
        }

        .scrollbar-thumb-neutral-700::-webkit-scrollbar-thumb {
          background-color: rgb(64 64 64);
          border-radius: 3px;
        }

        .scrollbar-track-neutral-900::-webkit-scrollbar-track {
          background-color: rgb(23 23 23);
        }
      `}</style>
    </Card>
  );
}
