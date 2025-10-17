import { NextResponse } from 'next/server';
const yf = require('yahoo-finance2').default;

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
  } catch (error: any) {
    console.error('Test error:', error);
    return NextResponse.json(
      { success: false, error: error.message, stack: error.stack },
      { status: 500 }
    );
  }
}
