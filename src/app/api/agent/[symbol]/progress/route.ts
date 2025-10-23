import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const RAWORC_API_URL = process.env.RAWORC_API_URL || 'https://ra-hyp-1.raworc.com/api/v0';
const RAWORC_API_KEY = process.env.RAWORC_API_KEY || '';

// GET endpoint to fetch progress for a specific response by ID
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

    const data = await response.json();

    return NextResponse.json({
      success: true,
      response: data,
    });

  } catch (error) {
    console.error('Error fetching progress:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
