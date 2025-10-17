"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Activity, BarChart3, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

export function Header() {
  const pathname = usePathname();

  return (
    <header className="fixed top-0 left-0 right-0 border-b border-neutral-800/50 bg-black/60 backdrop-blur-2xl z-50">
      <div className="w-full px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="h-9 w-9 rounded-lg bg-neutral-50 flex items-center justify-center group-hover:scale-105 transition-transform">
            <Activity className="h-5 w-5 text-black" strokeWidth={2.5} />
          </div>
          <span className="text-lg font-semibold tracking-tight">Stock API</span>
        </Link>

        {/* Navigation */}
        <nav className="flex items-center gap-2">
          <Link href="/">
            <Button
              variant="ghost"
              className={cn(
                "gap-2 transition-all",
                pathname === "/"
                  ? "bg-neutral-800/80 text-neutral-50"
                  : "text-neutral-400 hover:text-neutral-50 hover:bg-neutral-800/50"
              )}
            >
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Market</span>
            </Button>
          </Link>
          <Link href="/chat">
            <Button
              variant="ghost"
              className={cn(
                "gap-2 transition-all",
                pathname === "/chat"
                  ? "bg-neutral-800/80 text-neutral-50"
                  : "text-neutral-400 hover:text-neutral-50 hover:bg-neutral-800/50"
              )}
            >
              <MessageSquare className="h-4 w-4" />
              <span className="hidden sm:inline">Chat</span>
            </Button>
          </Link>
        </nav>
      </div>
    </header>
  );
}
