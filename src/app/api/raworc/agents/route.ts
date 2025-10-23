import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const RAWORC_API_URL = process.env.RAWORC_API_URL || 'https://ra-hyp-1.raworc.com/api/v0';
const RAWORC_API_KEY = process.env.RAWORC_API_KEY || '';

// GET endpoint to list all agents
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = searchParams.get('limit') || '100';

    const response = await fetch(
      `${RAWORC_API_URL}/agents?limit=${limit}`,
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
        { error: 'Failed to fetch agents', details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Ensure we return an array
    if (Array.isArray(data)) {
      return NextResponse.json(data);
    } else if (data && typeof data === 'object') {
      // If it's an object with an agents property, return that
      return NextResponse.json(data.agents || []);
    } else {
      return NextResponse.json([]);
    }

  } catch (error) {
    console.error('Error fetching agents:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
