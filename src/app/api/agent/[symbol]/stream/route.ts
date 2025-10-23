import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

const RAWORC_API_URL = process.env.RAWORC_API_URL || 'https://ra-hyp-1.raworc.com/api/v0';
const RAWORC_API_KEY = process.env.RAWORC_API_KEY || '';

// Helper to get or create agent name for a symbol
function getAgentNameForSymbol(symbol: string): string {
  return `stockapi-agent-${symbol.toLowerCase()}`;
}

interface RemixAgentResponse {
  name: string;
  created_by: string;
  state: string;
}

interface ResponseObject {
  id: string;
  agent_name: string;
  status: string;
  segments: unknown[];
  output_content: unknown[];
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const { symbol } = await params;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (event: string, data: unknown) => {
        const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(message));
      };

      try {
        sendEvent('status', { message: 'Initializing agent...', step: 'init' });

        // Step 1: Get or create agent
        const remixedAgentName = getAgentNameForSymbol(symbol);
        let remixedAgent: RemixAgentResponse;

        sendEvent('status', { message: `Setting up agent: ${remixedAgentName}`, step: 'agent_setup' });

        const checkAgentResponse = await fetch(`${RAWORC_API_URL}/agents/${remixedAgentName}`, {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${RAWORC_API_KEY}` },
        });

        if (checkAgentResponse.ok) {
          remixedAgent = await checkAgentResponse.json();
          sendEvent('agent_ready', { agent: remixedAgent, reused: true });
        } else {
          sendEvent('status', { message: 'Creating new agent...', step: 'agent_create' });

          const remixResponse = await fetch(`${RAWORC_API_URL}/agents/${process.env.RAWORC_CORE_AGENT || 'Stockapi-Agent-Core'}/remix`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${RAWORC_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              name: remixedAgentName,
              code: true,
              env: true,
              content: true,
            }),
          });

          if (!remixResponse.ok && remixResponse.status !== 409) {
            throw new Error('Failed to create agent');
          }

          const retryFetch = await fetch(`${RAWORC_API_URL}/agents/${remixedAgentName}`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${RAWORC_API_KEY}` },
          });
          remixedAgent = await retryFetch.json();
          sendEvent('agent_ready', { agent: remixedAgent, reused: false });
        }

        // Step 2: Wake agent
        sendEvent('status', { message: 'Waking agent...', step: 'wake' });
        await fetch(`${RAWORC_API_URL}/agents/${remixedAgentName}/wake`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${RAWORC_API_KEY}`,
            'Content-Type': 'application/json',
          },
        });

        // Step 3: Check for existing response
        sendEvent('status', { message: 'Checking for existing reports...', step: 'check_existing' });

        const listResponsesResult = await fetch(
          `${RAWORC_API_URL}/agents/${remixedAgentName}/responses`,
          {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${RAWORC_API_KEY}` },
          }
        );

        let existingCompletedResponse: ResponseObject | null = null;
        if (listResponsesResult.ok) {
          const responses = await listResponsesResult.json();
          if (Array.isArray(responses) && responses.length > 0) {
            const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
            existingCompletedResponse = responses.find((r: ResponseObject) => {
              const isCompleted = r.status === 'completed' || r.status === 'success' || r.status === 'done';
              const isRecent = new Date((r as any).updated_at || (r as any).created_at) > fiveMinutesAgo;
              return isCompleted && isRecent;
            }) || null;
          }
        }

        if (existingCompletedResponse) {
          sendEvent('status', { message: 'Found recent report, returning...', step: 'existing' });
          sendEvent('segments', { segments: existingCompletedResponse.segments || [] });
          sendEvent('complete', {
            response: existingCompletedResponse,
            agent: remixedAgent
          });
          controller.close();
          return;
        }

        // Step 4: Create new response
        sendEvent('status', { message: 'Starting report generation...', step: 'start_generation' });

        const createResponseResult = await fetch(
          `${RAWORC_API_URL}/agents/${remixedAgentName}/responses`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${RAWORC_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              input: {
                content: [
                  {
                    type: 'text',
                    content: `Create a complete HTML stock research report for ${symbol.toUpperCase()}.

The report MUST be a single self-contained HTML file with embedded CSS (no external links).

Required sections:
1. Metadata Section: Company Name, Ticker Symbol (${symbol.toUpperCase()}), Report Type (Deep Research Report), Report Date (${new Date().toISOString().split('T')[0]}), Generated By (agent name)
2. Executive Summary: 3-5 bullet points highlighting key insights
3. Price & Performance: 1Y Return %, 3Y CAGR %, Beta, Market Cap
4. Financial Snapshot (TTM): Revenue, Net Income, Free Cash Flow, Gross Margin %, Debt-to-Equity
5. Valuation Summary: Fair Value Range, Method (DCF/multiples), Key Assumptions (WACC, Terminal Growth, EPS CAGR)
6. Risks: 3-5 key risk factors
7. Catalysts: 2-3 upside drivers
8. Sources/References: At least 3 credible sources (SEC Filings, Yahoo Finance, Company IR, etc.)
9. Footer: © ${new Date().getFullYear()} | Generated automatically by stock-deepresearch agent © ${new Date().getFullYear()}`,
                  },
                ],
              },
              background: true,
            }),
          }
        );

        if (!createResponseResult.ok) {
          const errorText = await createResponseResult.text();
          if (createResponseResult.status === 409 || errorText.includes('busy')) {
            sendEvent('error', {
              error: 'Agent is currently busy',
              details: 'The agent is processing another request. Please try again in a moment.',
              retryable: true
            });
          } else {
            sendEvent('error', {
              error: 'Failed to start report generation',
              details: errorText
            });
          }
          controller.close();
          return;
        }

        const initialResponse = await createResponseResult.json();
        const responseId = initialResponse.id;

        sendEvent('response_created', { responseId, agentName: remixedAgentName });

        // Step 5: Poll for progress and stream segments in real-time
        sendEvent('status', { message: 'Generating report...', step: 'generating' });

        const pollInterval = 2000; // 2 seconds for more real-time feel
        let previousSegmentCount = 0;
        let pollCount = 0;

        while (true) {
          await new Promise(resolve => setTimeout(resolve, pollInterval));
          pollCount++;

          try {
            const pollResult = await fetch(
              `${RAWORC_API_URL}/agents/${remixedAgentName}/responses/${responseId}`,
              {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${RAWORC_API_KEY}` },
              }
            );

            if (pollResult.ok) {
              const pollData = await pollResult.json();

              // Stream new segments as they appear
              if (pollData.segments && pollData.segments.length > previousSegmentCount) {
                const newSegments = pollData.segments.slice(previousSegmentCount);

                // Send each new segment individually for real-time display
                for (const segment of newSegments) {
                  sendEvent('segment', { segment });
                }

                previousSegmentCount = pollData.segments.length;
                sendEvent('progress', {
                  segmentCount: pollData.segments.length,
                  status: pollData.status
                });
              }

              // Check if complete
              const hasSegments = pollData.segments && pollData.segments.length > 0;
              const hasOutput = pollData.output_content && pollData.output_content.length > 0;

              if (pollData.status === 'completed' || pollData.status === 'success' || pollData.status === 'done') {
                sendEvent('status', { message: 'Report completed!', step: 'completed' });
                sendEvent('complete', {
                  response: pollData,
                  agent: remixedAgent
                });
                controller.close();
                break;
              } else if (hasSegments && hasOutput) {
                sendEvent('status', { message: 'Report generated!', step: 'completed' });
                sendEvent('complete', {
                  response: pollData,
                  agent: remixedAgent
                });
                controller.close();
                break;
              } else if (pollData.status === 'failed' || pollData.status === 'error') {
                sendEvent('error', {
                  error: 'Agent failed to generate report',
                  details: pollData
                });
                controller.close();
                break;
              }
            }
          } catch (pollError) {
            console.error('Poll error:', pollError);
            // Continue polling
          }

          // Timeout after 5 minutes (150 polls at 2 seconds each)
          if (pollCount > 150) {
            sendEvent('error', {
              error: 'Timeout',
              details: 'Report generation took too long'
            });
            controller.close();
            break;
          }
        }

      } catch (error) {
        sendEvent('error', {
          error: 'Internal server error',
          details: error instanceof Error ? error.message : 'Unknown error'
        });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
