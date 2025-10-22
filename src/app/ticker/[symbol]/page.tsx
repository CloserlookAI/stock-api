"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Header } from "@/components/ui/header";
import { ArrowLeft, TrendingUp, TrendingDown, Cpu, ExternalLink } from "lucide-react";
import ReportProgress from "@/components/ReportProgress";
import ProcessingLog from "@/components/ProcessingLog";
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
  const [segments, setSegments] = useState<Segment[]>([]);
  const [htmlReport, setHtmlReport] = useState<string>('');
  const [reportUrl, setReportUrl] = useState<string>('');
  const [loadingMessage, setLoadingMessage] = useState<string>('Initializing agent...');

  const { isVisible, message, showToast, hideToast } = useToast();

  useEffect(() => {
    let isMounted = true;
    let messageTimer: NodeJS.Timeout | null = null;

    const fetchAgentReport = async () => {
      try {
        // Reset all state when component mounts or symbol changes
        setLoading(true);
        setError(null);
        setSegments([]);
        setHtmlReport('');
        setReportUrl('');
        setAgentData(null);
        setLoadingMessage('Initializing agent...');

        console.log('Starting agent report generation for:', symbol);

        // Update loading message after 3 seconds
        messageTimer = setTimeout(() => {
          if (isMounted) setLoadingMessage('Generating report... This may take a few minutes...');
        }, 3000);

        const response = await fetch(`/api/agent/${symbol}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!isMounted) return;

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
          console.error('API Error:', errorData);
          throw new Error(errorData.error || errorData.details || `HTTP ${response.status}: Failed to generate report`);
        }

        const data: AgentResponse = await response.json();

        if (!isMounted) return;

        console.log('Agent response received:', data);
        console.log('Response has segments:', !!data.response?.segments);
        console.log('Segments length:', data.response?.segments?.length || 0);
        console.log('Response has output_content:', !!data.response?.output_content);
        console.log('Output content length:', data.response?.output_content?.length || 0);

        setAgentData(data);

        // Extract segments for display
        if (data.response) {
          if (data.response.segments && data.response.segments.length > 0) {
            console.log('Setting segments...');
            setSegments(data.response.segments);
          }

          // Extract HTML report from output_content or segments
          console.log('Extracting HTML report...');
          const htmlContent = extractHtmlReport(data.response);
          console.log('HTML content length:', htmlContent.length);
          if (htmlContent && htmlContent.length > 100) {
            setHtmlReport(htmlContent);
          }

          // Extract report URL from segments (published URL)
          console.log('Extracting report URL...');
          const url = extractReportUrl(data.response.segments || [], data.agent.name, symbol);
          console.log('Report URL:', url);
          if (url) {
            setReportUrl(url);
          }
        } else {
          console.warn('No response found in data');
        }

        console.log('Report generation completed successfully');
        console.log('About to exit loading state...');
        if (messageTimer) clearTimeout(messageTimer);
        setLoading(false);

        // Show success notification
        showToast('✅ Report generated successfully!');

      } catch (err) {
        if (!isMounted) return;
        if (messageTimer) clearTimeout(messageTimer);

        console.error('Error fetching agent report:', err);
        setError(err instanceof Error ? err.message : 'Failed to generate report');
        setLoading(false);
      }
    };

    fetchAgentReport();

    // Cleanup function
    return () => {
      isMounted = false;
      if (messageTimer) clearTimeout(messageTimer);
    };
  }, [symbol, showToast]);

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
          // Prefer ticker-based filename (e.g., tsla_report.html)
          if (filename.toLowerCase().includes(symbol.toLowerCase()) || filename.includes('_report.html')) {
            foundFilename = filename;
          } else if (!foundFilename) {
            // Save as fallback if no ticker-based filename found yet
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

    // Fallback: construct URL with ticker-based filename
    const tickerLower = symbol.toLowerCase();
    const fallbackUrl = `https://ra-hyp-1.raworc.com/content/${agentName}/${tickerLower}_report.html`;
    console.log('Using fallback URL with ticker:', fallbackUrl);
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

              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
                <span className="text-sm text-blue-400 font-medium">Please wait - this may take several minutes</span>
              </div>
            </div>

            {/* Progress Component */}
            <div className="mb-8">
              <ReportProgress segments={segments} isComplete={false} />
            </div>

            {/* Processing Log */}
            {segments.length > 0 && (
              <ProcessingLog segments={segments} agentName={agentData?.agent.name} />
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

            {/* Show processing log if available */}
            {segments.length > 0 && (
              <div className="mt-8">
                <ProcessingLog segments={segments} agentName={agentData?.agent.name} />
              </div>
            )}
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
                      console.log('Opening report URL:', reportUrl);
                      window.open(reportUrl, '_blank');
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

          {/* Progress Indicator */}
          <div className="mb-8">
            <ReportProgress segments={segments} isComplete={true} />
          </div>

          {/* Processing Log - Show before report */}
          {segments.length > 0 && (
            <div className="mb-8">
              <ProcessingLog segments={segments} agentName={agentData?.agent.name} />
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
                        console.log('Opening report URL:', reportUrl);
                        window.open(reportUrl, '_blank');
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
                          href={reportUrl}
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
