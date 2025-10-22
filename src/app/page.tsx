"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Header } from "@/components/ui/header";
import { TrendingUp, TrendingDown, Activity, BarChart, Search, X } from "lucide-react";
import ModernTicker from "@/components/ModernTicker";
import TradingViewChart from "@/components/TradingViewChart";
import { useEffect, useState } from "react";

interface MarketQuote {
  symbol: string;
  shortName: string;
  regularMarketPrice: number;
  regularMarketChange: number;
  regularMarketChangePercent: number;
  regularMarketDayHigh: number;
  regularMarketDayLow: number;
  regularMarketVolume: number;
  marketCap: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
}

export default function Home() {
  const [marketData, setMarketData] = useState<MarketQuote[]>([]);
  const [topGainers, setTopGainers] = useState<MarketQuote[]>([]);
  const [loading, setLoading] = useState(true);
  const [chartSymbols, setChartSymbols] = useState<string[]>(["NASDAQ:TSLA"]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchedSymbol, setSearchedSymbol] = useState<string>("NASDAQ:TSLA");
  const [showDropdown, setShowDropdown] = useState(false);
  const [filteredStocks, setFilteredStocks] = useState<MarketQuote[]>([]);

  const fetchMarketData = async () => {
    try {
      const response = await fetch('/api/market', {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
        },
      });
      const result = await response.json();
      console.log('API Response:', result);

      if (result.success) {
        setMarketData(result.data);
        setTopGainers(result.topGainers || []);

        console.log('Top Gainers:', result.topGainers);
      } else {
        console.error('API returned error:', result);
      }
    } catch (error) {
      console.error('Error fetching market data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMarketData();
    // Removed auto-refresh to prevent chart from reloading
  }, []);

  const indices = marketData.filter(q => q.symbol.startsWith('^')).slice(0, 3);
  const topStocks = marketData.filter(q => !q.symbol.startsWith('^')).slice(0, 4);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price);
  };

  const formatNumber = (num: number) => {
    if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`;
    if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
    return num.toLocaleString();
  };

  const handleSearchInput = (value: string) => {
    setSearchQuery(value);
    if (value.trim()) {
      // Filter stocks based on search query
      const stocks = marketData.filter(q => !q.symbol.startsWith('^'));
      const filtered = stocks.filter(stock =>
        stock.symbol.toLowerCase().includes(value.toLowerCase()) ||
        stock.shortName.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredStocks(filtered);
      setShowDropdown(true);
    } else {
      setShowDropdown(false);
      setFilteredStocks([]);
    }
  };

  const selectStock = (stock: MarketQuote) => {
    const formattedSymbol = `NASDAQ:${stock.symbol}`;
    setSearchedSymbol(formattedSymbol);
    setChartSymbols([formattedSymbol]);
    setSearchQuery(stock.symbol);
    setShowDropdown(false);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setShowDropdown(false);
  };

  const clearSearch = () => {
    setSearchQuery("");
    setSearchedSymbol("NASDAQ:TSLA");
    setChartSymbols(["NASDAQ:TSLA"]);
    setShowDropdown(false);
  };

  return (
    <div className="min-h-screen bg-black">
      <Header />

      <main className="pt-16">
        {/* Modern Ticker Tape */}
        <ModernTicker />

        {/* Market Stats - Full Width */}
        <div className="w-full px-6 py-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold mb-2">Market Indices</h2>
            <p className="text-sm text-neutral-500">Live data from Yahoo Finance</p>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader className="pb-3">
                    <div className="h-4 bg-neutral-800 rounded w-20 mb-2" />
                    <div className="h-8 bg-neutral-800 rounded w-32" />
                  </CardHeader>
                  <CardContent>
                    <div className="h-4 bg-neutral-800 rounded w-24" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {indices.map((index) => (
                <Card key={index.symbol} className="hover:border-neutral-700 transition-all group">
                  <CardHeader className="pb-3">
                    <CardDescription className="text-xs uppercase tracking-wider text-neutral-500">
                      {index.shortName}
                    </CardDescription>
                    <CardTitle className="text-3xl font-bold">
                      {formatPrice(index.regularMarketPrice)}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className={`flex items-center text-sm font-medium ${
                      index.regularMarketChange >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {index.regularMarketChange >= 0 ? (
                        <TrendingUp className="h-4 w-4 mr-1.5" />
                      ) : (
                        <TrendingDown className="h-4 w-4 mr-1.5" />
                      )}
                      <span>{index.regularMarketChangePercent?.toFixed(2)}%</span>
                      <span className="text-neutral-600 ml-2">
                        {index.regularMarketChange >= 0 ? '+' : ''}
                        {index.regularMarketChange?.toFixed(2)}
                      </span>
                    </div>
                    <div className="mt-3 pt-3 border-t border-neutral-800 space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-neutral-500">Day High</span>
                        <span className="font-medium">{formatPrice(index.regularMarketDayHigh)}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-neutral-500">Day Low</span>
                        <span className="font-medium">{formatPrice(index.regularMarketDayLow)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Main Content Grid - Full Width */}
        <div className="w-full px-6 pb-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Chart Section - Takes 8 columns */}
            <div className="lg:col-span-8">
              <Card className="h-full border-neutral-800/50">
                <CardHeader className="border-b border-neutral-800/50">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <BarChart className="h-5 w-5 text-neutral-50" />
                        Live Market Chart
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {searchedSymbol && searchedSymbol !== "NASDAQ:TSLA" ? `Viewing: ${searchedSymbol}` : "Real-time price visualization - Tesla (TSLA)"}
                      </CardDescription>
                    </div>
                    <form onSubmit={handleSearch} className="flex items-center gap-2">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500 z-10" />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => handleSearchInput(e.target.value)}
                          onFocus={() => searchQuery && setShowDropdown(true)}
                          onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                          placeholder="Search stock (e.g., AAPL, Tesla)"
                          className="pl-9 pr-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-sm focus:outline-none focus:border-neutral-700 w-64"
                        />
                        {showDropdown && filteredStocks.length > 0 && (
                          <div className="absolute top-full left-0 right-0 mt-1 bg-neutral-900 border border-neutral-800 rounded-lg shadow-xl max-h-64 overflow-y-auto z-50">
                            {filteredStocks.map((stock) => (
                              <div
                                key={stock.symbol}
                                onClick={() => selectStock(stock)}
                                className="px-4 py-3 hover:bg-neutral-800 cursor-pointer border-b border-neutral-800/50 last:border-b-0"
                              >
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="font-semibold text-sm">{stock.symbol}</p>
                                    <p className="text-xs text-neutral-500 truncate">{stock.shortName}</p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-sm font-medium">{formatPrice(stock.regularMarketPrice)}</p>
                                    <p className={`text-xs ${stock.regularMarketChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                      {stock.regularMarketChangePercent?.toFixed(2)}%
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      {searchedSymbol && searchedSymbol !== "NASDAQ:TSLA" && (
                        <button
                          type="button"
                          onClick={clearSearch}
                          className="p-2 bg-neutral-900 border border-neutral-800 rounded-lg hover:bg-neutral-800 transition-colors"
                          title="Reset to Tesla"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </form>
                  </div>
                </CardHeader>
                <CardContent className="p-0 pb-0">
                  <div className="h-[750px] w-full bg-black">
                    {loading ? (
                      <div className="h-full flex items-center justify-center">
                        <div className="text-center">
                          <div className="h-20 w-20 rounded-full bg-neutral-900 flex items-center justify-center mx-auto mb-6 border border-neutral-800 animate-pulse">
                            <Activity className="h-10 w-10 text-neutral-500" />
                          </div>
                          <p className="text-neutral-400 text-base font-medium">Loading chart data...</p>
                        </div>
                      </div>
                    ) : (
                      <TradingViewChart symbols={chartSymbols} />
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar - Takes 4 columns */}
            <div className="lg:col-span-4 space-y-6">
              {/* Top Gainers */}
              <Card className="border-neutral-800/50">
                <CardHeader className="border-b border-neutral-800/50 pb-4">
                  <CardTitle className="text-base flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-neutral-50 animate-pulse" />
                    Top Stocks
                  </CardTitle>
                  <CardDescription className="text-xs">Live market data</CardDescription>
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                  {loading ? (
                    Array(4).fill(0).map((_, i) => (
                      <div key={i} className="p-3 rounded-lg bg-neutral-900/50 border border-neutral-800/50 animate-pulse">
                        <div className="h-4 bg-neutral-800 rounded w-20 mb-2" />
                        <div className="h-3 bg-neutral-800 rounded w-32" />
                      </div>
                    ))
                  ) : (
                    topStocks.map((stock) => (
                      <div
                        key={stock.symbol}
                        className="flex items-center justify-between p-3 rounded-lg bg-neutral-900/50 border border-neutral-800/50 hover:border-neutral-700 transition-all cursor-pointer group"
                      >
                        <div className="flex-1">
                          <p className="font-semibold text-sm group-hover:text-neutral-50 transition-colors">
                            {stock.symbol}
                          </p>
                          <p className="text-xs text-neutral-500">{stock.shortName}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">{formatPrice(stock.regularMarketPrice)}</p>
                          <p className={`text-xs font-medium ${
                            stock.regularMarketChange >= 0 ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {stock.regularMarketChangePercent?.toFixed(2)}%
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              {/* Top 5 Stocks of the Day */}
              <Card className="border-neutral-800/50">
                <CardHeader className="border-b border-neutral-800/50 pb-4">
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-green-400" />
                    Top 5 Stocks Today
                  </CardTitle>
                  <CardDescription className="text-xs">Highest gainers • Real-time data</CardDescription>
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                  {loading ? (
                    <div className="space-y-3 animate-pulse">
                      {Array(5).fill(0).map((_, i) => (
                        <div key={i} className="h-16 bg-neutral-800 rounded" />
                      ))}
                    </div>
                  ) : topGainers.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-neutral-500 text-sm">Loading stock data...</p>
                      <p className="text-neutral-600 text-xs mt-2">Market data will appear shortly</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {topGainers.map((stock, index) => (
                        <div
                          key={stock.symbol}
                          className="p-3 rounded-lg bg-neutral-900/50 border border-neutral-800/50 hover:border-neutral-700 transition-all group"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div className="h-6 w-6 rounded-full bg-green-400/10 flex items-center justify-center text-xs font-bold text-green-400">
                                {index + 1}
                              </div>
                              <div>
                                <p className="font-semibold text-sm group-hover:text-neutral-50 transition-colors">
                                  {stock.symbol}
                                </p>
                                <p className="text-xs text-neutral-500 truncate max-w-[120px]">
                                  {stock.shortName}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-medium">{formatPrice(stock.regularMarketPrice)}</p>
                              <p className="text-xs font-medium text-green-400 flex items-center justify-end gap-1">
                                <TrendingUp className="h-3 w-3" />
                                +{stock.regularMarketChangePercent?.toFixed(2)}%
                              </p>
                            </div>
                          </div>
                          <div className="flex justify-between text-xs text-neutral-600 pt-2 border-t border-neutral-800">
                            <span>Vol: {formatNumber(stock.regularMarketVolume)}</span>
                            <span>Cap: {formatNumber(stock.marketCap)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Company Details Cards Below Chart - Full Width */}
        <div className="w-full px-6 pb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Stock Details Card */}
            <Card className="border-neutral-800/50">
              <CardHeader className="border-b border-neutral-800/50 pb-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity className="h-4 w-4 text-blue-400" />
                  Stock Details
                </CardTitle>
                <CardDescription className="text-xs">
                  {searchedSymbol ? searchedSymbol.split(':')[1] : 'TSLA'} - Market Information
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4">
                {loading ? (
                  <div className="space-y-3 animate-pulse">
                    {Array(4).fill(0).map((_, i) => (
                      <div key={i} className="h-12 bg-neutral-800 rounded" />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {(() => {
                      const currentSymbol = searchedSymbol ? searchedSymbol.split(':')[1] : 'TSLA';
                      const stockData = marketData.find(q => q.symbol === currentSymbol);

                      if (!stockData) {
                        return (
                          <div className="text-center py-8">
                            <p className="text-neutral-500 text-sm">Stock data not available</p>
                          </div>
                        );
                      }

                      return (
                        <>
                          <div className="flex justify-between items-center p-3 rounded-lg bg-neutral-900/50 border border-neutral-800/50">
                            <span className="text-sm text-neutral-400">Current Price</span>
                            <span className="text-lg font-bold">{formatPrice(stockData.regularMarketPrice)}</span>
                          </div>
                          <div className="flex justify-between items-center p-3 rounded-lg bg-neutral-900/50 border border-neutral-800/50">
                            <span className="text-sm text-neutral-400">Day Change</span>
                            <span className={`text-sm font-semibold ${stockData.regularMarketChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {stockData.regularMarketChange >= 0 ? '+' : ''}{stockData.regularMarketChange?.toFixed(2)} ({stockData.regularMarketChangePercent?.toFixed(2)}%)
                            </span>
                          </div>
                          <div className="flex justify-between items-center p-3 rounded-lg bg-neutral-900/50 border border-neutral-800/50">
                            <span className="text-sm text-neutral-400">Day Range</span>
                            <span className="text-sm font-medium">
                              {formatPrice(stockData.regularMarketDayLow)} - {formatPrice(stockData.regularMarketDayHigh)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center p-3 rounded-lg bg-neutral-900/50 border border-neutral-800/50">
                            <span className="text-sm text-neutral-400">Volume</span>
                            <span className="text-sm font-medium">{formatNumber(stockData.regularMarketVolume)}</span>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Company Info Card */}
            <Card className="border-neutral-800/50">
              <CardHeader className="border-b border-neutral-800/50 pb-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart className="h-4 w-4 text-purple-400" />
                  Company Overview
                </CardTitle>
                <CardDescription className="text-xs">
                  Key Financial Metrics
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4">
                {loading ? (
                  <div className="space-y-3 animate-pulse">
                    {Array(4).fill(0).map((_, i) => (
                      <div key={i} className="h-12 bg-neutral-800 rounded" />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {(() => {
                      const currentSymbol = searchedSymbol ? searchedSymbol.split(':')[1] : 'TSLA';
                      const stockData = marketData.find(q => q.symbol === currentSymbol);

                      if (!stockData) {
                        return (
                          <div className="text-center py-8">
                            <p className="text-neutral-500 text-sm">Company data not available</p>
                          </div>
                        );
                      }

                      return (
                        <>
                          <div className="flex justify-between items-center p-3 rounded-lg bg-neutral-900/50 border border-neutral-800/50">
                            <span className="text-sm text-neutral-400">Company Name</span>
                            <span className="text-sm font-medium">{stockData.shortName}</span>
                          </div>
                          <div className="flex justify-between items-center p-3 rounded-lg bg-neutral-900/50 border border-neutral-800/50">
                            <span className="text-sm text-neutral-400">Market Cap</span>
                            <span className="text-sm font-medium">{formatNumber(stockData.marketCap)}</span>
                          </div>
                          <div className="flex justify-between items-center p-3 rounded-lg bg-neutral-900/50 border border-neutral-800/50">
                            <span className="text-sm text-neutral-400">52 Week High</span>
                            <span className="text-sm font-medium">{formatPrice(stockData.fiftyTwoWeekHigh)}</span>
                          </div>
                          <div className="flex justify-between items-center p-3 rounded-lg bg-neutral-900/50 border border-neutral-800/50">
                            <span className="text-sm text-neutral-400">52 Week Low</span>
                            <span className="text-sm font-medium">{formatPrice(stockData.fiftyTwoWeekLow)}</span>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-800/50 bg-neutral-950/50">
        <div className="w-full px-6 py-8">
          <div className="text-center text-neutral-500 text-sm">
            <p className="font-medium">Stock API - Real-time market data and analysis</p>
            <p className="mt-2 text-xs text-neutral-600">Data provided for informational purposes only. Not financial advice.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
