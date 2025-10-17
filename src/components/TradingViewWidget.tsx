"use client";

import React, { useEffect, useRef, memo } from 'react';

function TradingViewWidget() {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!container.current) return;

    // Clear any existing content
    container.current.innerHTML = '';

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = JSON.stringify({
      "symbols": [
        {
          "proName": "FOREXCOM:SPXUSD",
          "title": "S&P 500"
        },
        {
          "proName": "FOREXCOM:NSXUSD",
          "title": "NASDAQ 100"
        },
        {
          "proName": "FOREXCOM:DJI",
          "title": "Dow Jones"
        },
        {
          "description": "Apple",
          "proName": "NASDAQ:AAPL"
        },
        {
          "description": "Microsoft",
          "proName": "NASDAQ:MSFT"
        },
        {
          "description": "Tesla",
          "proName": "NASDAQ:TSLA"
        },
        {
          "description": "NVIDIA",
          "proName": "NASDAQ:NVDA"
        },
        {
          "description": "Amazon",
          "proName": "NASDAQ:AMZN"
        },
        {
          "description": "Meta",
          "proName": "NASDAQ:META"
        },
        {
          "description": "Google",
          "proName": "NASDAQ:GOOGL"
        }
      ],
      "showSymbolLogo": false,
      "isTransparent": true,
      "displayMode": "compact",
      "colorTheme": "dark",
      "locale": "en",
      "largeChartUrl": ""
    });

    container.current.appendChild(script);
  }, []);

  return (
    <div className="tradingview-widget-container w-full overflow-hidden" ref={container}>
      <style jsx global>{`
        .tradingview-widget-copyright {
          display: none !important;
        }
        .tradingview-widget-container a {
          display: none !important;
        }
      `}</style>
    </div>
  );
}

export default memo(TradingViewWidget);
