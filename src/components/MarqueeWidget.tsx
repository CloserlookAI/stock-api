"use client";

import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface MarqueeStock {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
}

export default function MarqueeWidget() {
  const [stocks, setStocks] = useState<MarqueeStock[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/market');
        const result = await response.json();
        if (result.success) {
          const formatted = result.data.map((item: any) => ({
            symbol: item.symbol.replace('^', ''),
            price: item.regularMarketPrice,
            change: item.regularMarketChange,
            changePercent: item.regularMarketChangePercent,
          }));
          setStocks(formatted);
        }
      } catch (error) {
        console.error('Error fetching marquee data:', error);
      }
    };

    fetchData();
    // Update every 5 seconds for continuous real-time updates
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  // Duplicate stocks for seamless loop
  const duplicatedStocks = [...stocks, ...stocks, ...stocks];

  return (
    <div className="relative w-full overflow-hidden bg-neutral-950 border-b border-neutral-800/50">
      <div className="marquee-container">
        <div className="marquee-content">
          {duplicatedStocks.map((stock, index) => (
            <div
              key={`${stock.symbol}-${index}`}
              className="inline-flex items-center gap-2 px-6 py-3 border-r border-neutral-800/50"
            >
              <span className="font-semibold text-sm text-neutral-50">
                {stock.symbol}
              </span>
              <span className="text-sm font-medium">
                ${stock.price?.toFixed(2) || '0.00'}
              </span>
              <span
                className={`flex items-center gap-1 text-xs font-medium ${
                  stock.change >= 0 ? 'text-green-400' : 'text-red-400'
                }`}
              >
                {stock.change >= 0 ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                {stock.changePercent?.toFixed(2)}%
              </span>
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        .marquee-container {
          display: flex;
          width: 100%;
          overflow: hidden;
        }

        .marquee-content {
          display: flex;
          animation: marquee 60s linear infinite;
          will-change: transform;
        }

        @keyframes marquee {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-33.333%);
          }
        }

        .marquee-content:hover {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  );
}
