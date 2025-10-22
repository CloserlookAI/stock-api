"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TrendingUp, TrendingDown } from "lucide-react";

interface TickerData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
}

export default function ModernTicker() {
  const router = useRouter();
  const [tickers] = useState<TickerData[]>([
    { symbol: "AAPL", name: "Apple", price: 178.32, change: 2.45, changePercent: 1.39 },
    { symbol: "MSFT", name: "Microsoft", price: 412.88, change: -1.23, changePercent: -0.30 },
    { symbol: "TSLA", name: "Tesla", price: 242.84, change: 5.67, changePercent: 2.39 },
    { symbol: "NVDA", name: "NVIDIA", price: 495.22, change: 8.91, changePercent: 1.83 },
    { symbol: "AMZN", name: "Amazon", price: 178.35, change: 1.89, changePercent: 1.07 },
    { symbol: "META", name: "Meta", price: 512.33, change: -2.15, changePercent: -0.42 },
    { symbol: "GOOGL", name: "Google", price: 141.80, change: 0.95, changePercent: 0.67 },
    { symbol: "NFLX", name: "Netflix", price: 682.33, change: 4.22, changePercent: 0.62 },
  ]);

  const handleTickerClick = (symbol: string) => {
    router.push(`/ticker/${symbol}`);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price);
  };

  return (
    <div className="w-full bg-gradient-to-r from-neutral-950 via-neutral-900 to-neutral-950 border-y border-neutral-800/50 py-4 overflow-hidden">
      <div className="relative flex overflow-x-hidden">
        <div className="flex animate-marquee whitespace-nowrap">
          {[...tickers, ...tickers].map((ticker, index) => (
            <div
              key={`${ticker.symbol}-${index}`}
              onClick={() => handleTickerClick(ticker.symbol)}
              className="inline-flex items-center mx-4 px-6 py-3 bg-neutral-900/50 hover:bg-neutral-800/70 border border-neutral-800/50 hover:border-neutral-700 rounded-xl transition-all cursor-pointer group backdrop-blur-sm"
            >
              {/* Symbol */}
              <div className="flex items-center gap-3 mr-4 border-r border-neutral-700/50 pr-4">
                <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                <span className="font-bold text-base tracking-wide text-neutral-50 group-hover:text-blue-400 transition-colors">
                  {ticker.symbol}
                </span>
              </div>

              {/* Price */}
              <div className="flex items-center gap-4">
                <span className="text-sm font-semibold text-neutral-200">
                  {formatPrice(ticker.price)}
                </span>

                {/* Change */}
                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg ${
                  ticker.change >= 0
                    ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                    : 'bg-red-500/10 text-red-400 border border-red-500/20'
                }`}>
                  {ticker.change >= 0 ? (
                    <TrendingUp className="h-3.5 w-3.5" />
                  ) : (
                    <TrendingDown className="h-3.5 w-3.5" />
                  )}
                  <span className="text-xs font-bold">
                    {ticker.change >= 0 ? '+' : ''}{ticker.changePercent.toFixed(2)}%
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="absolute top-0 flex animate-marquee2 whitespace-nowrap">
          {[...tickers, ...tickers].map((ticker, index) => (
            <div
              key={`${ticker.symbol}-${index}-2`}
              onClick={() => handleTickerClick(ticker.symbol)}
              className="inline-flex items-center mx-4 px-6 py-3 bg-neutral-900/50 hover:bg-neutral-800/70 border border-neutral-800/50 hover:border-neutral-700 rounded-xl transition-all cursor-pointer group backdrop-blur-sm"
            >
              {/* Symbol */}
              <div className="flex items-center gap-3 mr-4 border-r border-neutral-700/50 pr-4">
                <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                <span className="font-bold text-base tracking-wide text-neutral-50 group-hover:text-blue-400 transition-colors">
                  {ticker.symbol}
                </span>
              </div>

              {/* Price */}
              <div className="flex items-center gap-4">
                <span className="text-sm font-semibold text-neutral-200">
                  {formatPrice(ticker.price)}
                </span>

                {/* Change */}
                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg ${
                  ticker.change >= 0
                    ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                    : 'bg-red-500/10 text-red-400 border border-red-500/20'
                }`}>
                  {ticker.change >= 0 ? (
                    <TrendingUp className="h-3.5 w-3.5" />
                  ) : (
                    <TrendingDown className="h-3.5 w-3.5" />
                  )}
                  <span className="text-xs font-bold">
                    {ticker.change >= 0 ? '+' : ''}{ticker.changePercent.toFixed(2)}%
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        @keyframes marquee {
          0% {
            transform: translateX(0%);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        @keyframes marquee2 {
          0% {
            transform: translateX(50%);
          }
          100% {
            transform: translateX(0%);
          }
        }
        .animate-marquee {
          animation: marquee 40s linear infinite;
        }
        .animate-marquee2 {
          animation: marquee2 40s linear infinite;
        }
      `}</style>
    </div>
  );
}
