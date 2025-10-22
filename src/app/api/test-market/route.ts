import { NextResponse } from 'next/server';
import yf from 'yahoo-finance2';

export async function GET() {
  try {
    // Test with a single symbol first
    const testSymbol = 'AAPL';
    console.log('Testing fetch for:', testSymbol);

    const quote = await yf.quote(testSymbol);

    console.log('Quote received:', JSON.stringify(quote, null, 2));

    return NextResponse.json({
      success: true,
      data: quote,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Test error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error', stack: error instanceof Error ? error.stack : undefined },
      { status: 500 }
    );
  }
}
