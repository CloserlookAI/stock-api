import { NextRequest, NextResponse } from 'next/server';

// Configure route for long-running operations
// NO TIMEOUT - Will wait as long as needed for agent to complete
// NOTE: If deployed on Vercel Hobby (5 min limit), upgrade to Pro for unlimited duration
export const maxDuration = 300; // Set to max available on your plan (300 = 5 min for Hobby, increase on Pro)
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs'; // Use Node.js runtime, not Edge

const RAWORC_API_URL = process.env.RAWORC_API_URL || 'https://ra-hyp-1.raworc.com/api/v0';
const RAWORC_API_KEY = process.env.RAWORC_API_KEY || '';
const CORE_AGENT = process.env.RAWORC_CORE_AGENT || 'Stockapi-Agent-Core';

// Map to store agent names by symbol to ensure reusability
const agentsBySymbol = new Map<string, string>();

// Helper to get or create agent name for a symbol
function getAgentNameForSymbol(symbol: string): string {
  if (!agentsBySymbol.has(symbol)) {
    const agentName = `stockapi-agent-${symbol.toLowerCase()}`;
    agentsBySymbol.set(symbol, agentName);
  }
  return agentsBySymbol.get(symbol)!;
}

interface RemixAgentResponse {
  name: string;
  created_by: string;
  state: string;
  description: string | null;
  created_at: string;
}

interface ResponseObject {
  id: string;
  agent_name: string;
  status: string;
  input_content: unknown[];
  output_content: unknown[];
  segments: unknown[];
  created_at: string;
  updated_at: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  try {
    const { symbol } = await params;

    // Log environment variables (without exposing full key)
    console.log('=== Agent Creation Started ===');
    console.log('RAWORC_API_URL:', RAWORC_API_URL);
    console.log('CORE_AGENT:', CORE_AGENT);
    console.log('API Key present:', !!RAWORC_API_KEY);
    console.log('Symbol:', symbol);

    // Step 1: Get or create agent name for this symbol
    const remixedAgentName = getAgentNameForSymbol(symbol);
    console.log('Agent name for symbol:', remixedAgentName);

    // Check if agent already exists
    let remixedAgent: RemixAgentResponse;
    const checkAgentResponse = await fetch(`${RAWORC_API_URL}/agents/${remixedAgentName}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${RAWORC_API_KEY}`,
      },
    });

    if (checkAgentResponse.ok) {
      // Agent already exists, reuse it
      remixedAgent = await checkAgentResponse.json();
      console.log('Reusing existing agent:', remixedAgent.name);
    } else {
      // Create a new remixed agent
      const remixPayload = {
        name: remixedAgentName,
        code: true,
        env: true,
        content: true,
      };

      console.log('Creating new agent with payload:', JSON.stringify(remixPayload, null, 2));

      const remixResponse = await fetch(`${RAWORC_API_URL}/agents/${CORE_AGENT}/remix`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RAWORC_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(remixPayload),
      });

      console.log('Remix response status:', remixResponse.status);

      if (!remixResponse.ok) {
        // If 409 (agent already exists), try to fetch it again
        if (remixResponse.status === 409) {
          console.log('Agent already exists (409), attempting to fetch existing agent...');
          const retryFetch = await fetch(`${RAWORC_API_URL}/agents/${remixedAgentName}`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${RAWORC_API_KEY}`,
            },
          });

          if (retryFetch.ok) {
            remixedAgent = await retryFetch.json();
            console.log('Successfully fetched existing agent:', remixedAgent.name);
          } else {
            const errorText = await remixResponse.text();
            console.error('Failed to fetch existing agent after 409:', errorText);
            return NextResponse.json(
              { error: 'Agent exists but could not be fetched', details: errorText },
              { status: 500 }
            );
          }
        } else {
          const errorText = await remixResponse.text();
          console.error('Remix failed with error:', errorText);
          return NextResponse.json(
            { error: 'Failed to create remixed agent', details: errorText, status: remixResponse.status },
            { status: remixResponse.status }
          );
        }
      } else {
        remixedAgent = await remixResponse.json();
        console.log('New agent created successfully:', remixedAgent.name);
      }
    }

    // Step 2: Wake the agent (if needed)
    console.log('Waking agent:', remixedAgentName);
    const wakeResponse = await fetch(`${RAWORC_API_URL}/agents/${remixedAgentName}/wake`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RAWORC_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });
    console.log('Wake response status:', wakeResponse.status);
    // 400 status is okay - agent might already be awake

    // Step 2.5: Check for existing completed responses (to avoid duplicate work)
    console.log('Checking for existing completed responses...');
    let existingCompletedResponse: ResponseObject | null = null;

    try {
      const listResponsesResult = await fetch(
        `${RAWORC_API_URL}/agents/${remixedAgentName}/responses`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${RAWORC_API_KEY}`,
          },
        }
      );

      if (listResponsesResult.ok) {
        const responses = await listResponsesResult.json();
        console.log('Found existing responses:', responses.length || 0);

        // Look for a recent completed response (within last 5 minutes)
        if (Array.isArray(responses) && responses.length > 0) {
          const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
          const recentCompletedResponse = responses.find((r: ResponseObject) => {
            const isCompleted = r.status === 'completed' || r.status === 'success' || r.status === 'done';
            const isRecent = new Date(r.updated_at || r.created_at) > fiveMinutesAgo;
            return isCompleted && isRecent;
          });

          if (recentCompletedResponse) {
            existingCompletedResponse = recentCompletedResponse;
            console.log('Found recent completed response:', recentCompletedResponse.id);
          }
        }
      }
    } catch (err) {
      console.log('Could not check existing responses:', err);
      // Continue anyway
    }

    // If we have a recent completed response, return it immediately
    if (existingCompletedResponse) {
      console.log('Returning existing completed response');
      return NextResponse.json({
        success: true,
        agent: remixedAgent,
        response: existingCompletedResponse,
        symbol: symbol,
      });
    }

    // Step 3: Create a new response (always create new, don't reuse in-progress)
    let responseId: string;

    {
      console.log('Creating new response for agent:', remixedAgentName);
      console.log('Starting agent task in background...');

      let createResponseResult;
      try {
        // Start the response creation
        createResponseResult = await fetch(
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
              background: true, // Non-blocking mode - start task and return immediately
            }),
          }
        );
      } catch (fetchError) {
        console.error('Fetch error during response creation:', fetchError);
        return NextResponse.json(
          {
            error: 'Network error while creating response',
            details: fetchError instanceof Error ? fetchError.message : 'Unknown fetch error'
          },
          { status: 500 }
        );
      }

      if (!createResponseResult.ok) {
        const errorText = await createResponseResult.text();
        console.error('Response creation failed:', errorText);

        // If agent is busy, return clear error message
        if (createResponseResult.status === 409 || errorText.includes('busy')) {
          console.log('Agent is currently busy processing another request');
          return NextResponse.json(
            {
              error: 'Agent is currently busy',
              details: `The agent for ${symbol} is processing another request. Please wait a moment and try again.`,
              retryable: true
            },
            { status: 409 }
          );
        } else {
          return NextResponse.json(
            { error: 'Failed to start response creation', details: errorText },
            { status: createResponseResult.status }
          );
        }
      } else {
        const initialResponse = await createResponseResult.json();
        responseId = initialResponse.id;
        console.log('Response created with ID:', responseId);
      }
    }

    console.log('Polling for completion with response ID:', responseId);
    console.log('⏳ Waiting for agent to complete - NO TIMEOUT, will wait as long as needed...');

    // Poll indefinitely until response is complete - NO MAX POLLS LIMIT
    const pollInterval = 5000; // 5 seconds
    let pollCount = 0;
    let response: ResponseObject | null = null;

    while (true) {
      await new Promise(resolve => setTimeout(resolve, pollInterval));
      pollCount++;

      console.log(`Poll attempt ${pollCount} (no limit)...`);

      try {
        const pollResult = await fetch(
          `${RAWORC_API_URL}/agents/${remixedAgentName}/responses/${responseId}`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${RAWORC_API_KEY}`,
            },
          }
        );

        if (pollResult.ok) {
          const pollData = await pollResult.json();
          console.log('Poll status:', pollData.status);
          console.log('Poll has segments:', pollData.segments ? pollData.segments.length : 0);
          console.log('Poll has output_content:', pollData.output_content ? pollData.output_content.length : 0);

          // Check if we have segments indicating completion (even if status not explicitly "completed")
          const hasSegments = pollData.segments && pollData.segments.length > 0;
          const hasOutput = pollData.output_content && pollData.output_content.length > 0;

          if (pollData.status === 'completed' || pollData.status === 'success' || pollData.status === 'done') {
            response = pollData;
            console.log('✅ Agent response completed successfully!');
            console.log('✅ Breaking poll loop - report is ready');
            break;
          } else if (hasSegments && hasOutput) {
            // Even if status isn't "completed", if we have segments and output, it's done
            response = pollData;
            console.log('✅ Agent has generated output - treating as completed');
            console.log('✅ Breaking poll loop - report is ready');
            break;
          } else if (pollData.status === 'failed' || pollData.status === 'error') {
            console.error('❌ Agent response failed:', pollData);
            return NextResponse.json(
              { error: 'Agent failed to generate report', details: pollData },
              { status: 500 }
            );
          } else {
            console.log('⏳ Still processing... status:', pollData.status);
          }
          // Continue polling if status is 'pending', 'running', 'in_progress', etc.
        } else {
          console.log('⚠️  Poll request failed with status:', pollResult.status);
        }
      } catch (pollError) {
        console.error('Poll error:', pollError);
        // Continue polling despite error
      }
    }

    console.log('Number of segments:', response.segments?.length || 0);
    console.log('Number of output_content items:', response.output_content?.length || 0);
    console.log('Returning success response to frontend');

    return NextResponse.json({
      success: true,
      agent: remixedAgent,
      response: response,
      symbol: symbol,
    });

  } catch (error) {
    console.error('Error in agent route:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// GET endpoint to fetch response by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  try {
    await params; // Await params even though we don't use symbol here
    const searchParams = request.nextUrl.searchParams;
    const agentName = searchParams.get('agent');
    const responseId = searchParams.get('responseId');

    if (!agentName || !responseId) {
      return NextResponse.json(
        { error: 'Missing agent name or response ID' },
        { status: 400 }
      );
    }

    const response = await fetch(
      `${RAWORC_API_URL}/agents/${agentName}/responses/${responseId}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${RAWORC_API_KEY}`,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: 'Failed to fetch response', details: errorText },
        { status: response.status }
      );
    }

    const data: ResponseObject = await response.json();

    return NextResponse.json({
      success: true,
      response: data,
    });

  } catch (error) {
    console.error('Error fetching response:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
