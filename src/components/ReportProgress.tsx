"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, FileText, Activity, Code, Database, LineChart, AlertCircle } from "lucide-react";

interface ProgressStep {
  id: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  status: 'pending' | 'in_progress' | 'completed' | 'error';
}

interface Segment {
  type: string;
  tool?: string;
  args?: {
    filename?: string;
    command?: string;
    [key: string]: unknown;
  };
  channel?: string;
  text?: string;
  payload?: {
    filename?: string;
    command?: string;
    [key: string]: unknown;
  };
}

interface ReportProgressProps {
  segments: Segment[];
  isComplete: boolean;
}

export default function ReportProgress({ segments, isComplete }: ReportProgressProps) {
  // Map segments to progress steps
  const getProgressSteps = (): ProgressStep[] => {
    const steps: ProgressStep[] = [
      {
        id: 'fetch_data',
        label: 'Fetching Financial Data',
        description: 'Using yfinance to retrieve latest market data',
        icon: Database,
        status: 'pending'
      },
      {
        id: 'install_packages',
        label: 'Installing Dependencies',
        description: 'Setting up required Python packages',
        icon: Code,
        status: 'pending'
      },
      {
        id: 'analyze_data',
        label: 'Analyzing Stock Performance',
        description: 'Processing financial metrics and trends',
        icon: LineChart,
        status: 'pending'
      },
      {
        id: 'generate_report',
        label: 'Generating HTML Report',
        description: 'Creating comprehensive stock analysis report',
        icon: FileText,
        status: 'pending'
      },
      {
        id: 'publish',
        label: 'Publishing Report',
        description: 'Making report publicly accessible',
        icon: Activity,
        status: 'pending'
      }
    ];

    // Update status based on segments
    for (const segment of segments) {
      if (segment.type === 'tool_call') {
        const tool = segment.tool?.toLowerCase() || '';

        if (tool.includes('fetch_data') || segment.args?.filename?.includes('fetch_data')) {
          updateStepStatus(steps, 'fetch_data', 'in_progress');
        } else if (tool.includes('run_bash') && segment.args?.command?.includes('pip install')) {
          updateStepStatus(steps, 'install_packages', 'in_progress');
        } else if (tool.includes('run_bash') && segment.args?.command?.includes('python')) {
          updateStepStatus(steps, 'analyze_data', 'in_progress');
        } else if (tool.includes('create_file') && segment.args?.filename?.includes('report.html')) {
          updateStepStatus(steps, 'generate_report', 'in_progress');
        } else if (tool.includes('publish')) {
          updateStepStatus(steps, 'publish', 'in_progress');
        }
      } else if (segment.type === 'tool_result') {
        const tool = segment.tool?.toLowerCase() || '';

        if (tool.includes('fetch_data') || segment.payload?.filename?.includes('fetch_data')) {
          completeStep(steps, 'fetch_data');
          updateStepStatus(steps, 'install_packages', 'in_progress');
        } else if (tool.includes('run_bash') && segment.payload?.command?.includes('pip install')) {
          completeStep(steps, 'install_packages');
          updateStepStatus(steps, 'analyze_data', 'in_progress');
        } else if (tool.includes('run_bash') && segment.payload?.command?.includes('python')) {
          completeStep(steps, 'analyze_data');
          updateStepStatus(steps, 'generate_report', 'in_progress');
        } else if (tool.includes('create_file') && segment.payload?.filename?.includes('report.html')) {
          completeStep(steps, 'generate_report');
          updateStepStatus(steps, 'publish', 'in_progress');
        } else if (tool.includes('publish')) {
          completeStep(steps, 'publish');
        }
      }
    }

    if (isComplete) {
      steps.forEach(step => {
        if (step.status !== 'error') {
          step.status = 'completed';
        }
      });
    }

    return steps;
  };

  const updateStepStatus = (steps: ProgressStep[], id: string, status: ProgressStep['status']) => {
    const step = steps.find(s => s.id === id);
    if (step && step.status === 'pending') {
      step.status = status;
    }
  };

  const completeStep = (steps: ProgressStep[], id: string) => {
    const step = steps.find(s => s.id === id);
    if (step) {
      step.status = 'completed';
    }
  };

  const progressSteps = getProgressSteps();

  const currentStep = progressSteps.find(s => s.status === 'in_progress');

  return (
    <Card className="border-neutral-800/50 bg-gradient-to-br from-neutral-950/80 to-neutral-900/50 backdrop-blur-sm">
      <CardHeader className="border-b border-neutral-800/50 bg-gradient-to-r from-neutral-900/50 to-neutral-950/50">
        <CardTitle className="flex items-center gap-3">
          <div className="relative">
            <Activity className="h-5 w-5 text-neutral-50 animate-pulse" />
            <div className="absolute inset-0 h-5 w-5 text-neutral-50 animate-ping opacity-20" />
          </div>
          <span>Report Generation Progress</span>
        </CardTitle>
        {currentStep && (
          <div className="mt-2 text-sm text-neutral-300 flex items-center gap-2 animate-pulse">
            <div className="h-2 w-2 rounded-full bg-neutral-50"></div>
            Currently {currentStep.label}...
          </div>
        )}
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-4">
          {progressSteps.map((step, index) => {
            const Icon = step.icon;
            const isLast = index === progressSteps.length - 1;

            return (
              <div key={step.id} className="relative animate-fade-in" style={{ animationDelay: `${index * 100}ms` }}>
                <div className="flex items-start gap-4">
                  {/* Icon with enhanced animation */}
                  <div className={`relative flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                    step.status === 'completed'
                      ? 'bg-neutral-50/20 border-neutral-50 text-neutral-50 shadow-lg shadow-neutral-50/20 scale-110'
                      : step.status === 'in_progress'
                      ? 'bg-neutral-50/10 border-neutral-50 text-neutral-50 animate-pulse-scale shadow-lg shadow-neutral-50/30'
                      : step.status === 'error'
                      ? 'bg-neutral-400/20 border-neutral-400 text-neutral-400'
                      : 'bg-neutral-800/50 border-neutral-700 text-neutral-500'
                  }`}>
                    {step.status === 'completed' ? (
                      <CheckCircle className="h-6 w-6 animate-check-bounce" />
                    ) : step.status === 'error' ? (
                      <AlertCircle className="h-6 w-6" />
                    ) : step.status === 'in_progress' ? (
                      <>
                        <Icon className="h-6 w-6 animate-spin-slow" />
                        <div className="absolute inset-0 rounded-full border-2 border-neutral-50 animate-ping opacity-30" />
                      </>
                    ) : (
                      <Icon className="h-5 w-5" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 pb-8">
                    <div className={`font-semibold mb-1 text-base transition-all duration-300 ${
                      step.status === 'completed'
                        ? 'text-neutral-50'
                        : step.status === 'in_progress'
                        ? 'text-neutral-50 animate-pulse'
                        : step.status === 'error'
                        ? 'text-neutral-400'
                        : 'text-neutral-400'
                    }`}>
                      {step.label}
                    </div>
                    <div className={`text-sm transition-colors ${
                      step.status === 'in_progress' ? 'text-neutral-300' : 'text-neutral-500'
                    }`}>
                      {step.description}
                    </div>

                    {/* Status badge with animation */}
                    {step.status !== 'pending' && (
                      <div className={`inline-flex items-center gap-2 mt-3 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-300 ${
                        step.status === 'completed'
                          ? 'bg-neutral-50/10 text-neutral-50 border border-neutral-50/30 shadow-sm shadow-neutral-50/10'
                          : step.status === 'in_progress'
                          ? 'bg-neutral-50/10 text-neutral-50 border border-neutral-50/30 shadow-sm shadow-neutral-50/10 animate-pulse'
                          : 'bg-neutral-400/10 text-neutral-400 border border-neutral-400/30'
                      }`}>
                        {step.status === 'completed' && (
                          <>
                            <CheckCircle className="h-3 w-3" />
                            <span>Completed</span>
                          </>
                        )}
                        {step.status === 'in_progress' && (
                          <>
                            <div className="h-2 w-2 rounded-full bg-neutral-50 animate-pulse" />
                            <span>Processing...</span>
                          </>
                        )}
                        {step.status === 'error' && (
                          <>
                            <AlertCircle className="h-3 w-3" />
                            <span>Error</span>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Animated connecting line */}
                {!isLast && (
                  <div className={`absolute left-6 top-12 w-0.5 h-full -ml-px transition-all duration-500 ${
                    step.status === 'completed'
                      ? 'bg-gradient-to-b from-neutral-50/50 to-neutral-50/20'
                      : step.status === 'in_progress'
                      ? 'bg-gradient-to-b from-neutral-50/50 to-neutral-700/30 animate-gradient'
                      : 'bg-neutral-700/30'
                  }`} />
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
        @keyframes pulse-scale {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.05);
          }
        }
        @keyframes check-bounce {
          0% {
            transform: scale(0);
          }
          50% {
            transform: scale(1.2);
          }
          100% {
            transform: scale(1);
          }
        }
        @keyframes spin-slow {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.5s ease-out forwards;
        }
        .animate-pulse-scale {
          animation: pulse-scale 2s ease-in-out infinite;
        }
        .animate-check-bounce {
          animation: check-bounce 0.5s ease-out;
        }
        .animate-spin-slow {
          animation: spin-slow 3s linear infinite;
        }
      `}</style>
    </Card>
  );
}
