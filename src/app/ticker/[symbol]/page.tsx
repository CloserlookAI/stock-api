"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Header } from "@/components/ui/header";
import { ArrowLeft, TrendingUp, TrendingDown, Cpu, ExternalLink } from "lucide-react";
import { Toast, useToast } from "@/components/ui/toast";

interface AgentResponse {
  success: boolean;
  agent: {
    name: string;
    created_by: string;
    state: string;
  };
  response: {
    id: string;
    agent_name: string;
    status: string;
    segments: Segment[];
    output_content: OutputContent[];
  };
  symbol: string;
}

interface OutputContent {
  type: string;
  content?: string;
}

interface Segment {
  type: string;
  tool?: string;
  args?: {
    filename?: string;
    [key: string]: unknown;
  };
  channel?: string;
  text?: string;
  output?: unknown;
  payload?: {
    url?: string;
    filename?: string;
    [key: string]: unknown;
  };
}

export default function TickerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const symbol = params.symbol as string;

  const [loading, setLoading] = useState(true);
  const [agentData, setAgentData] = useState<AgentResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [htmlReport, setHtmlReport] = useState<string>('');
  const [reportUrl, setReportUrl] = useState<string>('');
  const [loadingMessage, setLoadingMessage] = useState<string>('Initializing agent...');
  const [agentState, setAgentState] = useState<string>('init');
  const [currentSegments, setCurrentSegments] = useState<Segment[]>([]);
  const [displayedSegments, setDisplayedSegments] = useState<Segment[]>([]);
  const [previousSegmentCount, setPreviousSegmentCount] = useState<number>(0);

  const { isVisible, message, showToast, hideToast } = useToast();

  // Progressive segment display - show all segments immediately to avoid glitching
  useEffect(() => {
    if (currentSegments.length === 0) {
      setDisplayedSegments([]);
      return;
    }

    // Show all segments immediately to prevent UI glitching
    if (currentSegments.length !== displayedSegments.length) {
      setDisplayedSegments(currentSegments);
    }
  }, [currentSegments, displayedSegments.length]);

  // Main polling implementation (like ra-cloud)
  useEffect(() => {

    let isMounted = true;
    let pollInterval: NodeJS.Timeout | null = null;

    const fetchAgentReport = async () => {
      try {
        // Reset all state when component mounts or symbol changes
        setLoading(true);
        setError(null);
        setHtmlReport('');
        setReportUrl('');
        setAgentData(null);
        setLoadingMessage('Initializing agent...');
        setAgentState('init');
        setCurrentSegments([]);
        setPreviousSegmentCount(0);

        // Start the request but don't wait for it - we'll poll for progress
        fetch(`/api/agent/${symbol}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        }).then(async (response) => {
          if (!isMounted) return;

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
            throw new Error(errorData.error || errorData.details || `HTTP ${response.status}: Failed to generate report`);
          }

          const data: AgentResponse = await response.json();

          // Extract final report when complete
          if (data.response) {
            if (data.response.output_content) {
              const htmlContent = extractHtmlReport(data.response);
              if (htmlContent && htmlContent.length > 100) {
                setHtmlReport(htmlContent);
              }
            }

            if (data.response.segments) {
              const url = extractReportUrl(data.response.segments, data.agent.name, symbol);
              if (url) {
                setReportUrl(url);
              }
            }
          }

          setAgentData(data);
          setAgentState('completed');
          setLoading(false);
          showToast('✅ Report generated successfully!');
        }).catch((err) => {
          if (!isMounted) return;
          setError(err instanceof Error ? err.message : 'Failed to generate report');
          setLoading(false);
        });

        // Construct agent name directly (we know the pattern)
        const foundAgentName = `stockapi-agent-${symbol.toLowerCase()}`;

        // Wait a moment for the response to be created
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Start polling immediately for progress
        setLoadingMessage('Generating report...');
        setAgentState('busy');

        const startPolling = async () => {
          // Initial immediate poll
          const doPoll = async () => {
            if (!isMounted) return;

            try {
              // Fetch latest responses to get segments
              const pollResponse = await fetch(
                `/api/raworc/agents/${foundAgentName}/responses?limit=5`,
                {
                  credentials: 'include',
                  cache: 'no-store',
                }
              );

              if (pollResponse.ok) {
                const responses = await pollResponse.json();

                if (Array.isArray(responses) && responses.length > 0) {
                  // Get the most recent response
                  const latestResponse = responses[0];

                  // Progressive segment updates - only add NEW segments
                  if (latestResponse.segments && Array.isArray(latestResponse.segments) && latestResponse.segments.length > 0) {
                    const newSegmentCount = latestResponse.segments.length;

                    // Only update if there are NEW segments
                    if (newSegmentCount > previousSegmentCount) {
                      // Add only the new segments progressively
                      setCurrentSegments(latestResponse.segments);
                      setPreviousSegmentCount(newSegmentCount);
                    }
                  }

                  // Update agent state based on response status
                  const status = latestResponse.status || 'processing';
                  if (status === 'processing' || status === 'pending') {
                    setAgentState('busy');
                    const segCount = latestResponse.segments?.length || 0;
                    setLoadingMessage(segCount > 0 ? `Processing... ${segCount} steps completed` : 'Starting...');
                  } else if (status === 'completed' || status === 'success' || status === 'done') {
                    if (pollInterval) clearInterval(pollInterval);
                    setAgentState('completed');
                  } else if (status === 'failed' || status === 'error') {
                    if (pollInterval) clearInterval(pollInterval);
                    setError('Report generation failed');
                    setLoading(false);
                  }
                }
              }
            } catch {
              // Silent error handling
            }
          };

          // Do initial poll immediately
          await doPoll();

          // Then poll every 2 seconds
          pollInterval = setInterval(doPoll, 2000);
        };

        startPolling();

      } catch (err) {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : 'Failed to generate report');
        setLoading(false);
      }
    };

    fetchAgentReport();

    // Cleanup function
    return () => {
      isMounted = false;
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [symbol, showToast, previousSegmentCount]);

  const extractHtmlReport = (response: AgentResponse['response']): string => {
    // Try to extract HTML from output_content
    if (response.output_content && response.output_content.length > 0) {
      for (const content of response.output_content) {
        if (content.type === 'text' && content.content) {
          return content.content;
        }
      }
    }

    // Try to extract from segments (final type)
    if (response.segments && response.segments.length > 0) {
      for (const segment of response.segments) {
        if (segment.type === 'final' && segment.text) {
          return segment.text;
        }
      }
    }

    return '<p class="text-neutral-400">No report content available</p>';
  };

  const extractReportUrl = (segments: Segment[], agentName: string, symbol: string): string => {
    console.log('Extracting report URL from segments:', segments.length);
    console.log('Agent name:', agentName);
    console.log('Symbol:', symbol);

    let foundFilename = '';

    // Look for publish tool call with URL or file path
    for (const segment of segments) {
      // Check tool_result for publish_agent
      if (segment.type === 'tool_result' && segment.tool === 'publish_agent') {
        console.log('Found publish_agent tool_result:', segment.payload);
        if (segment.payload && segment.payload.url) {
          return segment.payload.url;
        }
        // Check for filename in payload
        if (segment.payload && segment.payload.filename) {
          foundFilename = segment.payload.filename;
        }
      }

      // Check tool_call for publish_agent
      if (segment.type === 'tool_call' && segment.tool === 'publish_agent') {
        console.log('Found publish_agent tool_call:', segment.args);
        if (segment.args && segment.args.filename) {
          foundFilename = segment.args.filename;
        }
      }

      // Check for output type with URL
      if (segment.type === 'output' && segment.payload) {
        console.log('Found output segment:', segment.payload);
        if (segment.payload.url) {
          return segment.payload.url;
        }
      }

      // Check for create_file with HTML files
      if (segment.type === 'tool_call' && segment.tool === 'create_file') {
        const filename = segment.args?.filename || '';
        if (filename.includes('.html')) {
          // Look for report.html or any HTML file
          if (filename.includes('report.html')) {
            foundFilename = filename;
          } else if (!foundFilename) {
            // Save as fallback if no report.html found yet
            foundFilename = filename;
          }
        }
      }
    }

    // If we found a filename, construct the URL
    if (foundFilename) {
      const cleanFilename = foundFilename.replace(/^content\//, '').replace(/^\//, '');
      const url = `https://ra-hyp-1.raworc.com/content/${agentName}/${cleanFilename}`;
      console.log('Constructed URL from found filename:', url);
      return url;
    }

    // Fallback: construct URL with standard report.html filename
    const fallbackUrl = `https://ra-hyp-1.raworc.com/content/${agentName}/report.html`;
    console.log('Using fallback URL:', fallbackUrl);
    return fallbackUrl;
  };


  // Placeholder data - will be replaced with real API data later
  const tickerData = {
    symbol: symbol,
    name: getCompanyName(symbol),
    price: 178.32,
    change: 2.45,
    changePercent: 1.39,
    open: 176.25,
    high: 179.88,
    low: 175.92,
    volume: "52.3M",
    marketCap: "$2.85T",
    pe: 28.45,
    eps: 6.27,
    yearHigh: 199.62,
    yearLow: 164.08,
  };

  function getCompanyName(symbol: string): string {
    const companies: { [key: string]: string } = {
      'AAPL': 'Apple Inc.',
      'MSFT': 'Microsoft Corporation',
      'TSLA': 'Tesla, Inc.',
      'NVDA': 'NVIDIA Corporation',
      'AMZN': 'Amazon.com, Inc.',
      'META': 'Meta Platforms, Inc.',
      'GOOGL': 'Alphabet Inc.',
      'NFLX': 'Netflix, Inc.',
    };
    return companies[symbol] || `${symbol} Corporation`;
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price);
  };

  const isPositive = tickerData.change >= 0;

  // Render loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-black">
        <Header />
        <main className="pt-20 px-6 py-8">
          <div className="max-w-7xl mx-auto">
            <button
              onClick={() => router.push('/')}
              className="mb-8 px-5 py-2.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 rounded-lg transition-all inline-flex items-center gap-2.5 text-sm font-medium shadow-sm"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </button>

            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-blue-500/10 border-2 border-blue-500/20 mb-6 animate-pulse">
                <Cpu className="h-10 w-10 text-blue-400" />
              </div>
              <h2 className="text-3xl font-bold mb-3">Generating Deep Research Report</h2>
              <p className="text-lg text-neutral-400 mb-2">for {symbol}</p>
              <p className="text-sm text-neutral-500 mb-4">{loadingMessage}</p>

              {/* Thinking indicator like ra-cloud */}
              {agentState === 'busy' && (
                <div className="flex mb-6 justify-center">
                  <div className="flex items-center gap-3 px-4 py-3 rounded-full bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-100 dark:border-blue-800/50 shadow-sm">
                    <div className="relative">
                      <div className="w-4 h-4 relative">
                        <div className="absolute inset-0 w-4 h-4 border-2 border-blue-200/30 rounded-full"></div>
                        <div className="absolute inset-0 w-4 h-4 border-2 border-transparent border-t-blue-500 rounded-full animate-spin"></div>
                        <div className="absolute inset-0.5 w-3 h-3 border border-transparent border-t-indigo-400 rounded-full animate-spin" style={{animationDirection: 'reverse', animationDuration: '0.8s'}}></div>
                      </div>
                      <div className="absolute inset-0 w-4 h-4 flex items-center justify-center">
                        <div className="w-1 h-1 bg-blue-500 rounded-full animate-pulse"></div>
                      </div>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Analyzing & Thinking...</span>
                      <div className="flex gap-1 mt-1">
                        <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                        <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                        <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Real-time agent activity - ALWAYS show when segments exist (even after completion) */}
            {displayedSegments.length > 0 && (
              <div className="w-full mt-8">
                <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-sm font-medium text-neutral-400 uppercase tracking-wide">
                      Agent Activity
                    </h3>
                    <span className="text-xs text-neutral-500">
                      {displayedSegments.length} / {currentSegments.length} {currentSegments.length === 1 ? 'operation' : 'operations'}
                    </span>
                  </div>
                  <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                  {displayedSegments.map((segment, index) => {
                    const segType = String(segment.type || '').toLowerCase();
                    const segChannel = String(segment.channel || '').toLowerCase();
                    const segTool = String(segment.tool || '');
                    const segText = String(segment.text || '');
                    const uniqueKey = `${segType}-${segTool || 'notool'}-${index}`;

                    // Show thinking/commentary - like ra-cloud
                    if (segType === 'commentary' || segChannel === 'analysis' || segChannel === 'commentary') {
                      return (
                        <div key={uniqueKey}>
                          <div className="bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200/50 dark:border-purple-800/30 rounded-lg p-3">
                            <div className="flex items-start gap-3">
                              <div className="text-purple-400 mt-0.5">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                </svg>
                              </div>
                              <div className="flex-1 text-sm text-purple-900 dark:text-purple-100 italic">
                                {segText}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    }

                    // Show tool calls - like ra-cloud
                    if (segType === 'tool_call') {
                      return (
                        <div key={uniqueKey}>
                          <details className="group bg-neutral-800/30 border border-neutral-700/50 rounded-lg overflow-hidden hover:border-neutral-600/50 transition-colors">
                            <summary className="cursor-pointer p-3 flex items-center gap-3 hover:bg-neutral-800/50">
                              <div className="flex items-center gap-2 flex-1">
                                <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div>
                                <span className="text-xs font-medium text-blue-400">{segTool}</span>
                              </div>
                              <svg className="w-4 h-4 text-neutral-500 transition-transform group-open:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </summary>
                            {segment.args && (
                              <div className="border-t border-neutral-700/50 bg-neutral-900/50 p-3">
                                <div className="text-xs text-neutral-500 mb-2">Arguments</div>
                                <pre className="text-xs text-neutral-300 bg-neutral-950/50 p-2 rounded overflow-x-auto border border-neutral-800">
                                  {JSON.stringify(segment.args, null, 2)}
                                </pre>
                              </div>
                            )}
                          </details>
                        </div>
                      );
                    }

                    // Show tool results - like ra-cloud
                    if (segType === 'tool_result') {
                      return (
                        <div key={uniqueKey}>
                          <details className="group bg-neutral-800/30 border border-neutral-700/50 rounded-lg overflow-hidden hover:border-neutral-600/50 transition-colors">
                            <summary className="cursor-pointer p-3 flex items-center gap-3 hover:bg-neutral-800/50">
                              <div className="flex items-center gap-2 flex-1">
                                <div className="w-1.5 h-1.5 rounded-full bg-green-400"></div>
                                <span className="text-xs font-medium text-green-400">{segTool}</span>
                                <span className="text-xs text-neutral-500">→ completed</span>
                              </div>
                              <svg className="w-4 h-4 text-neutral-500 transition-transform group-open:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </summary>
                            {!!segment.output && (
                              <div className="border-t border-neutral-700/50 bg-neutral-900/50 p-3">
                                <div className="text-xs text-neutral-500 mb-2">Output</div>
                                <pre className="text-xs text-neutral-300 bg-neutral-950/50 p-2 rounded overflow-x-auto max-h-60 border border-neutral-800">
                                  {typeof segment.output === 'string' ? segment.output : JSON.stringify(segment.output, null, 2)}
                                </pre>
                              </div>
                            )}
                          </details>
                        </div>
                      );
                    }

                    // Fallback: show any unrecognized segment types
                    return (
                      <div key={uniqueKey}>
                        <div className="bg-neutral-800/20 border border-neutral-700/30 rounded-lg p-3">
                          <div className="text-xs text-neutral-400">
                            <div className="font-medium mb-1 text-neutral-300">{segType || 'processing'}</div>
                            {segText && <div className="mt-1 text-neutral-500">{segText}</div>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

          </div>
        </main>
        <Toast message={message} isVisible={isVisible} onClose={hideToast} />
      </div>
    );
  }

  // Render error state only if not loading
  if (error && !loading) {
    return (
      <div className="min-h-screen bg-black">
        <Header />
        <main className="pt-20 px-6 py-8">
          <div className="max-w-7xl mx-auto">
            <button
              onClick={() => router.push('/')}
              className="mb-8 px-5 py-2.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 rounded-lg transition-all inline-flex items-center gap-2.5 text-sm font-medium shadow-sm"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </button>

            <Card className="border-red-800/50 bg-red-950/10">
              <CardHeader>
                <CardTitle className="text-red-400">Error Generating Report</CardTitle>
                <CardDescription className="text-neutral-400 mt-2">
                  The agent encountered an issue while generating the report for {symbol}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-black/30 rounded-lg border border-red-800/30">
                    <p className="text-sm text-neutral-300 font-mono">{error}</p>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => window.location.reload()}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors font-medium"
                    >
                      Retry Generation
                    </button>
                    <button
                      onClick={() => router.push('/')}
                      className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-colors font-medium"
                    >
                      Back to Dashboard
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>

          </div>
        </main>
        <Toast message={message} isVisible={isVisible} onClose={hideToast} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <Header />
      <main className="pt-20 px-6 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Back Button */}
          <button
            onClick={() => router.push('/')}
            className="mb-8 px-5 py-2.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 rounded-lg transition-all inline-flex items-center gap-2.5 text-sm font-medium shadow-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </button>

          {/* Header Section */}
          <div className="mb-8">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-4xl font-bold mb-2">{tickerData.symbol}</h1>
                <p className="text-lg text-neutral-400">{tickerData.name}</p>
              </div>
              <div className="text-right">
                <div className="text-4xl font-bold mb-2">{formatPrice(tickerData.price)}</div>
                <div className={`flex items-center justify-end gap-2 text-lg font-semibold ${
                  isPositive ? 'text-green-400' : 'text-red-400'
                }`}>
                  {isPositive ? (
                    <TrendingUp className="h-5 w-5" />
                  ) : (
                    <TrendingDown className="h-5 w-5" />
                  )}
                  <span>
                    {isPositive ? '+' : ''}{tickerData.change} ({isPositive ? '+' : ''}{tickerData.changePercent}%)
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Report Ready Banner */}
          {reportUrl && (
            <Card className="border-neutral-50/20 bg-gradient-to-r from-neutral-900/50 to-neutral-950/50 mb-8">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-neutral-50/10 border-2 border-neutral-50/30 flex items-center justify-center">
                      <Cpu className="h-6 w-6 text-neutral-50" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-neutral-50 mb-1">Report Ready!</h3>
                      <p className="text-sm text-neutral-300">Your deep research report has been generated by {agentData?.agent.name}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      // Add cache-busting timestamp to always fetch the latest report
                      const urlWithTimestamp = `${reportUrl}?t=${Date.now()}`;
                      console.log('Opening report URL:', urlWithTimestamp);
                      window.open(urlWithTimestamp, '_blank');
                    }}
                    className="px-6 py-3 bg-neutral-50 text-black hover:bg-neutral-200 rounded-lg transition-all text-base font-semibold inline-flex items-center gap-2 shadow-lg hover:shadow-xl transform hover:scale-105"
                  >
                    <ExternalLink className="h-5 w-5" />
                    View Full Report
                  </button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Open */}
            <Card className="border-neutral-800/50 bg-neutral-950/50">
              <CardHeader className="pb-3">
                <CardDescription className="text-xs uppercase tracking-wider text-neutral-500">
                  Open
                </CardDescription>
                <CardTitle className="text-2xl font-bold">
                  {formatPrice(tickerData.open)}
                </CardTitle>
              </CardHeader>
            </Card>

            {/* High */}
            <Card className="border-neutral-800/50 bg-neutral-950/50">
              <CardHeader className="pb-3">
                <CardDescription className="text-xs uppercase tracking-wider text-neutral-500">
                  Day High
                </CardDescription>
                <CardTitle className="text-2xl font-bold text-green-400">
                  {formatPrice(tickerData.high)}
                </CardTitle>
              </CardHeader>
            </Card>

            {/* Low */}
            <Card className="border-neutral-800/50 bg-neutral-950/50">
              <CardHeader className="pb-3">
                <CardDescription className="text-xs uppercase tracking-wider text-neutral-500">
                  Day Low
                </CardDescription>
                <CardTitle className="text-2xl font-bold text-red-400">
                  {formatPrice(tickerData.low)}
                </CardTitle>
              </CardHeader>
            </Card>

            {/* Volume */}
            <Card className="border-neutral-800/50 bg-neutral-950/50">
              <CardHeader className="pb-3">
                <CardDescription className="text-xs uppercase tracking-wider text-neutral-500">
                  Volume
                </CardDescription>
                <CardTitle className="text-2xl font-bold">
                  {tickerData.volume}
                </CardTitle>
              </CardHeader>
            </Card>
          </div>


          {/* Agent Activity - Show after completion too */}
          {displayedSegments.length > 0 && (
            <div className="w-full mt-8">
              <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-sm font-medium text-neutral-400 uppercase tracking-wide">
                    Agent Activity
                  </h3>
                  <span className="text-xs text-neutral-500">
                    {displayedSegments.length} {displayedSegments.length === 1 ? 'operation' : 'operations'} completed
                  </span>
                </div>
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                  {displayedSegments.map((segment, index) => {
                    const segType = String(segment.type || '').toLowerCase();
                    const segChannel = String(segment.channel || '').toLowerCase();
                    const segTool = String(segment.tool || '');
                    const segText = String(segment.text || '');
                    const uniqueKey = `completed-${segType}-${segTool || 'notool'}-${index}`;

                    if (segType === 'commentary' || segChannel === 'analysis' || segChannel === 'commentary') {
                      return (
                        <div key={uniqueKey}>
                          <div className="bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200/50 dark:border-purple-800/30 rounded-lg p-3">
                            <div className="flex items-start gap-3">
                              <div className="text-purple-400 mt-0.5">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                </svg>
                              </div>
                              <div className="flex-1 text-sm text-purple-900 dark:text-purple-100 italic">
                                {segText}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    }

                    if (segType === 'tool_call') {
                      return (
                        <div key={uniqueKey}>
                          <details className="group bg-neutral-800/30 border border-neutral-700/50 rounded-lg overflow-hidden hover:border-neutral-600/50 transition-colors">
                            <summary className="cursor-pointer p-3 flex items-center gap-3 hover:bg-neutral-800/50">
                              <div className="flex items-center gap-2 flex-1">
                                <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div>
                                <span className="text-xs font-medium text-blue-400">{segTool}</span>
                              </div>
                              <svg className="w-4 h-4 text-neutral-500 transition-transform group-open:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </summary>
                            {segment.args && (
                              <div className="border-t border-neutral-700/50 bg-neutral-900/50 p-3">
                                <div className="text-xs text-neutral-500 mb-2">Arguments</div>
                                <pre className="text-xs text-neutral-300 bg-neutral-950/50 p-2 rounded overflow-x-auto border border-neutral-800">
                                  {JSON.stringify(segment.args, null, 2)}
                                </pre>
                              </div>
                            )}
                          </details>
                        </div>
                      );
                    }

                    if (segType === 'tool_result') {
                      return (
                        <div key={uniqueKey}>
                          <details className="group bg-neutral-800/30 border border-neutral-700/50 rounded-lg overflow-hidden hover:border-neutral-600/50 transition-colors">
                            <summary className="cursor-pointer p-3 flex items-center gap-3 hover:bg-neutral-800/50">
                              <div className="flex items-center gap-2 flex-1">
                                <div className="w-1.5 h-1.5 rounded-full bg-green-400"></div>
                                <span className="text-xs font-medium text-green-400">{segTool}</span>
                                <span className="text-xs text-neutral-500">→ completed</span>
                              </div>
                              <svg className="w-4 h-4 text-neutral-500 transition-transform group-open:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </summary>
                            {!!segment.output && (
                              <div className="border-t border-neutral-700/50 bg-neutral-900/50 p-3">
                                <div className="text-xs text-neutral-500 mb-2">Output</div>
                                <pre className="text-xs text-neutral-300 bg-neutral-950/50 p-2 rounded overflow-x-auto max-h-60 border border-neutral-800">
                                  {typeof segment.output === 'string' ? segment.output : JSON.stringify(segment.output, null, 2)}
                                </pre>
                              </div>
                            )}
                          </details>
                        </div>
                      );
                    }

                    return null;
                  })}
                </div>
            </div>
          )}

          {/* Agent Generated Report */}
          {(htmlReport || reportUrl) && (
            <Card className="border-neutral-800/50 bg-neutral-950/50 mt-8">
              <CardHeader className="border-b border-neutral-800/50 bg-neutral-900/20">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Cpu className="h-5 w-5 text-neutral-50" />
                      Deep Research Report
                    </CardTitle>
                    <CardDescription className="mt-1">
                      Generated by Agent: <span className="font-mono text-neutral-50">{agentData?.agent.name || 'N/A'}</span>
                    </CardDescription>
                  </div>
                  {reportUrl && (
                    <button
                      onClick={() => {
                        // Add cache-busting timestamp to always fetch the latest report
                        const urlWithTimestamp = `${reportUrl}?t=${Date.now()}`;
                        window.open(urlWithTimestamp, '_blank');
                      }}
                      className="px-4 py-2 bg-neutral-50 text-black hover:bg-neutral-200 rounded-lg transition-colors text-sm font-medium inline-flex items-center gap-2 shadow-lg"
                    >
                      <ExternalLink className="h-4 w-4" />
                      View Report
                    </button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-6">
                {/* Report URL Display */}
                {reportUrl && (
                  <div className="mb-6 p-4 bg-neutral-900/50 border border-neutral-800/50 rounded-lg">
                    <div className="flex items-start gap-3">
                      <ExternalLink className="h-5 w-5 text-neutral-50 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-neutral-300 mb-1">Report URL</p>
                        <a
                          href={`${reportUrl}?t=${Date.now()}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-neutral-50 hover:text-neutral-200 break-all font-mono transition-colors"
                        >
                          {reportUrl}
                        </a>
                      </div>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(reportUrl);
                          showToast('Report URL copied to clipboard!');
                        }}
                        className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 rounded text-xs font-medium transition-colors flex-shrink-0"
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                )}

                <div
                  className="prose prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: htmlReport }}
                />
              </CardContent>
            </Card>
          )}

        </div>
      </main>

      {/* Toast Notification */}
      <Toast message={message} isVisible={isVisible} onClose={hideToast} />
    </div>
  );
}
