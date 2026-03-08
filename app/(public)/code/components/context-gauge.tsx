'use client';

import { useState } from 'react';
import { Brain, FileText, MessageSquare } from 'lucide-react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from '@/components/ui/drawer';

/**
 * Token usage display showing context window usage.
 *
 * Tap to open detailed context breakdown drawer.
 */

// SVG geometry
const SIZE = 24;
const STROKE = 2.5;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toLocaleString();
}

const GAUGE_COLOR = '#10b981';       // emerald-500
const GAUGE_TRACK = 'rgba(16,185,129,0.10)';

export function ContextGauge({
  input,
  output,
  total,
}: {
  input: number;
  output: number;
  total: number;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  if (total === 0) return null;

  // Show a small arc proportional to token count (capped visually at full circle)
  // This is purely decorative since we no longer track against a fixed limit
  const displayRatio = Math.min(total / 1_000_000, 1);
  const dashOffset = CIRCUMFERENCE * (1 - displayRatio);

  return (
    <>
      <button
        onClick={() => setDrawerOpen(true)}
        className="relative inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-md p-1 transition-colors hover:bg-muted/50 active:bg-muted"
        title="Tap for context details"
      >
        <svg
          width={SIZE}
          height={SIZE}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          className="shrink-0 -rotate-90"
        >
          {/* Background track */}
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke={GAUGE_TRACK}
            strokeWidth={STROKE}
          />
          {/* Filled arc */}
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke={GAUGE_COLOR}
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={dashOffset}
            style={{ transition: 'stroke-dashoffset 0.6s ease, stroke 0.4s ease' }}
          />
        </svg>
        <span
          className="hidden text-[11px] tabular-nums text-muted-foreground sm:inline"
          style={{ color: GAUGE_COLOR }}
        >
          {formatTokens(total)}
        </span>
      </button>

      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerContent className="max-h-[70vh]">
          <DrawerHeader className="gap-2 pb-4">
            <div className="flex items-center gap-2">
              <Brain className="size-5 shrink-0 text-muted-foreground" />
              <DrawerTitle className="text-base font-semibold">
                Context Window Usage
              </DrawerTitle>
            </div>
            <DrawerDescription className="text-xs text-muted-foreground/70">
              Tracking token usage for this conversation
            </DrawerDescription>
          </DrawerHeader>

          {/* Content */}
          <div className="custom-scrollbar flex-1 overflow-auto px-4 pb-6">
            <div className="space-y-4">
              {/* Overall usage card */}
              <div className="overflow-hidden rounded-lg border border-border/40 bg-muted/30 p-4">
                <div className="mb-3">
                  <span className="text-sm font-medium text-foreground">Total Usage</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold tabular-nums" style={{ color: GAUGE_COLOR }}>
                    {formatTokens(total)}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    tokens
                  </span>
                </div>
              </div>

              {/* Breakdown */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Breakdown
                </h3>

                {/* Input tokens */}
                <div className="flex items-center justify-between rounded-lg border border-border/40 bg-muted/20 p-3">
                  <div className="flex items-center gap-3">
                    <div className="rounded-md bg-blue-500/15 p-2">
                      <MessageSquare className="size-4 text-blue-500" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-foreground">Input Tokens</div>
                      <div className="text-xs text-muted-foreground/70">Your messages & context</div>
                    </div>
                  </div>
                  <span className="text-lg font-semibold tabular-nums text-foreground">
                    {formatTokens(input)}
                  </span>
                </div>

                {/* Output tokens */}
                <div className="flex items-center justify-between rounded-lg border border-border/40 bg-muted/20 p-3">
                  <div className="flex items-center gap-3">
                    <div className="rounded-md bg-purple-500/15 p-2">
                      <FileText className="size-4 text-purple-500" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-foreground">Output Tokens</div>
                      <div className="text-xs text-muted-foreground/70">Assistant responses</div>
                    </div>
                  </div>
                  <span className="text-lg font-semibold tabular-nums text-foreground">
                    {formatTokens(output)}
                  </span>
                </div>
              </div>

            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
