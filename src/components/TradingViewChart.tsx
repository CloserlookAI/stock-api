"use client";

import React, { useEffect, useRef, memo } from 'react';

interface TradingViewChartProps {
  symbols?: string[];
}

function TradingViewChart({ symbols = ["NASDAQ:TSLA"] }: TradingViewChartProps) {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!container.current) return;

    // Clear any existing content
    container.current.innerHTML = '';

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-symbol-overview.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = JSON.stringify({
      "symbols": symbols.map(symbol => [
        symbol.split(':')[1] || symbol,
        `${symbol}|1D`
      ]),
      "chartOnly": false,
      "width": "100%",
      "height": "100%",
      "locale": "en",
      "colorTheme": "dark",
      "autosize": true,
      "showVolume": true,
      "showMA": false,
      "hideDateRanges": false,
      "hideMarketStatus": false,
      "hideSymbolLogo": false,
      "scalePosition": "right",
      "scaleMode": "Normal",
      "fontFamily": "-apple-system, BlinkMacSystemFont, Trebuchet MS, Roboto, Ubuntu, sans-serif",
      "fontSize": "12",
      "noTimeScale": false,
      "valuesTracking": "1",
      "changeMode": "price-and-percent",
      "chartType": "area",
      "lineWidth": 3,
      "lineType": 0,
      "dateRanges": [
        "1d|1",
        "1m|30",
        "3m|60",
        "12m|1D",
        "60m|1W",
        "all|1M"
      ],
      "upColor": "#22ab94",
      "downColor": "#f7525f",
      "borderUpColor": "#22ab94",
      "borderDownColor": "#f7525f",
      "wickUpColor": "#22ab94",
      "wickDownColor": "#f7525f",
      "backgroundColor": "#000000",
      "gridLineColor": "rgba(242, 242, 242, 0.1)",
      "fontColor": "rgba(255, 255, 255, 0.9)",
      "widgetFontColor": "#FFFFFF",
      "volumeUpColor": "rgba(34, 171, 148, 0.5)",
      "volumeDownColor": "rgba(247, 82, 95, 0.5)",
      "isTransparent": false
    });

    container.current.appendChild(script);

    return () => {
      if (container.current) {
        container.current.innerHTML = '';
      }
    };
  }, [symbols]);

  return (
    <div className="tradingview-widget-container w-full h-full" ref={container}>
      <div className="tradingview-widget-container__widget"></div>
    </div>
  );
}

export default memo(TradingViewChart);
