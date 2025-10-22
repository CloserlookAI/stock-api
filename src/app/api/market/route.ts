import { NextResponse } from 'next/server';
import yf from 'yahoo-finance2';

// Disable caching for real-time data
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    // Fetch data for major indices and stocks
    const symbols = [
      '^GSPC', '^IXIC', '^DJI',
      'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'TSLA', 'META',
      'AMD', 'NFLX', 'BABA', 'JPM', 'V', 'WMT', 'DIS', 'COIN', 'INTC', 'BA'
    ];

    const quotes = await Promise.all(
      symbols.map(async (symbol) => {
        try {
          // Use yahoo-finance2 v2.11.3 which has better compatibility
          const quote = await yf.quote(symbol);

          if (!quote) {
            console.log(`No quote data for ${symbol}`);
            return null;
          }

          return {
            symbol: quote.symbol || symbol,
            shortName: quote.shortName || quote.longName || symbol,
            regularMarketPrice: quote.regularMarketPrice || 0,
            regularMarketChange: quote.regularMarketChange || 0,
            regularMarketChangePercent: quote.regularMarketChangePercent || 0,
            regularMarketDayHigh: quote.regularMarketDayHigh || 0,
            regularMarketDayLow: quote.regularMarketDayLow || 0,
            regularMarketVolume: quote.regularMarketVolume || 0,
            marketCap: quote.marketCap || 0,
            fiftyTwoWeekHigh: quote.fiftyTwoWeekHigh || 0,
            fiftyTwoWeekLow: quote.fiftyTwoWeekLow || 0,
            regularMarketOpen: quote.regularMarketOpen || 0,
            regularMarketPreviousClose: quote.regularMarketPreviousClose || 0,
          };
        } catch (error) {
          console.error(`Error fetching ${symbol}:`, error instanceof Error ? error.message : 'Unknown error');
          return null;
        }
      })
    );

    const validQuotes = quotes.filter(q => q !== null);

    console.log(`Fetched ${validQuotes.length} valid quotes out of ${symbols.length} symbols`);

    // If no data was fetched, return mock data for testing
    if (validQuotes.length === 0) {
      console.log('No quotes fetched, returning mock data');
      const mockData = [
        { symbol: '^GSPC', shortName: 'S&P 500', regularMarketPrice: 4783.45, regularMarketChange: 58.32, regularMarketChangePercent: 1.24, regularMarketDayHigh: 4800, regularMarketDayLow: 4750, regularMarketVolume: 2400000000, marketCap: 45200000000000, fiftyTwoWeekHigh: 4900, fiftyTwoWeekLow: 4200, regularMarketOpen: 4760, regularMarketPreviousClose: 4725.13 },
        { symbol: '^IXIC', shortName: 'NASDAQ', regularMarketPrice: 15089.90, regularMarketChange: 297.14, regularMarketChangePercent: 2.01, regularMarketDayHigh: 15100, regularMarketDayLow: 14950, regularMarketVolume: 3500000000, marketCap: 18000000000000, fiftyTwoWeekHigh: 15500, fiftyTwoWeekLow: 13800, regularMarketOpen: 14950, regularMarketPreviousClose: 14792.76 },
        { symbol: '^DJI', shortName: 'Dow Jones', regularMarketPrice: 37305.16, regularMarketChange: -195.74, regularMarketChangePercent: -0.52, regularMarketDayHigh: 37450, regularMarketDayLow: 37200, regularMarketVolume: 450000000, marketCap: 12000000000000, fiftyTwoWeekHigh: 38000, fiftyTwoWeekLow: 35500, regularMarketOpen: 37400, regularMarketPreviousClose: 37500.90 },
        { symbol: 'NVDA', shortName: 'NVIDIA Corporation', regularMarketPrice: 875.28, regularMarketChange: 47.12, regularMarketChangePercent: 5.67, regularMarketDayHigh: 880, regularMarketDayLow: 828, regularMarketVolume: 42000000, marketCap: 2150000000000, fiftyTwoWeekHigh: 900, fiftyTwoWeekLow: 400, regularMarketOpen: 832, regularMarketPreviousClose: 828.16 },
        { symbol: 'TSLA', shortName: 'Tesla, Inc.', regularMarketPrice: 248.50, regularMarketChange: 10.09, regularMarketChangePercent: 4.23, regularMarketDayHigh: 252, regularMarketDayLow: 238, regularMarketVolume: 115000000, marketCap: 785000000000, fiftyTwoWeekHigh: 299, fiftyTwoWeekLow: 138, regularMarketOpen: 240, regularMarketPreviousClose: 238.41 },
        { symbol: 'AMD', shortName: 'Advanced Micro Devices', regularMarketPrice: 180.45, regularMarketChange: 6.75, regularMarketChangePercent: 3.89, regularMarketDayHigh: 182, regularMarketDayLow: 173, regularMarketVolume: 68000000, marketCap: 291000000000, fiftyTwoWeekHigh: 200, fiftyTwoWeekLow: 92, regularMarketOpen: 174, regularMarketPreviousClose: 173.70 },
        { symbol: 'AAPL', shortName: 'Apple Inc.', regularMarketPrice: 182.89, regularMarketChange: 4.38, regularMarketChangePercent: 2.45, regularMarketDayHigh: 184, regularMarketDayLow: 178, regularMarketVolume: 52000000, marketCap: 2830000000000, fiftyTwoWeekHigh: 199, fiftyTwoWeekLow: 139, regularMarketOpen: 179, regularMarketPreviousClose: 178.51 },
        { symbol: 'MSFT', shortName: 'Microsoft Corporation', regularMarketPrice: 425.17, regularMarketChange: 8.92, regularMarketChangePercent: 2.14, regularMarketDayHigh: 428, regularMarketDayLow: 416, regularMarketVolume: 23000000, marketCap: 3160000000000, fiftyTwoWeekHigh: 450, fiftyTwoWeekLow: 325, regularMarketOpen: 418, regularMarketPreviousClose: 416.25 },
      ];

      const mockStocks = mockData.filter(q => !q.symbol.startsWith('^'));
      const mockSorted = [...mockStocks].sort((a, b) => b.regularMarketChangePercent - a.regularMarketChangePercent);

      return NextResponse.json({
        success: true,
        data: mockData,
        topGainers: mockSorted.slice(0, 5),
        timestamp: new Date().toISOString(),
        isMockData: true,
      });
    }

    // Sort stocks by percentage change to get top gainers
    const stocks = validQuotes.filter(q => !q.symbol.startsWith('^'));
    const sortedByGain = [...stocks].sort((a, b) =>
      (b.regularMarketChangePercent || 0) - (a.regularMarketChangePercent || 0)
    );

    console.log('Top 5 gainers:', sortedByGain.slice(0, 5).map(s => `${s.symbol}: ${s.regularMarketChangePercent}%`));

    return NextResponse.json({
      success: true,
      data: validQuotes,
      topGainers: sortedByGain.slice(0, 5),
      timestamp: new Date().toISOString(),
      isMockData: false,
    });
  } catch (error) {
    console.error('Market data fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch market data', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
