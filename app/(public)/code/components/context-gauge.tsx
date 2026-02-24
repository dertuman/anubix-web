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
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

/**
 * Circular progress gauge showing context window usage.
 *
 * - 200k context window by default (Claude's standard context).
 * - The arc fills as tokens accumulate; the colour shifts:
 *     0-50 %  → emerald (green)
 *    50-70 %  → amber
 *    70-87.5% → orange  (≥ 700k of an 800k window, but we normalise to the ratio)
 *    87.5%+   → red
 *   The 700k → red threshold maps to 87.5% of an 800k window,
 *   so we use the *ratio* so it works for any context size.
 *
 * Tap to open detailed context breakdown drawer.
 */

const CONTEXT_WINDOW = 200_000; // tokens – Claude's standard context

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

/** Returns a Tailwind-friendly colour class string based on fill ratio. */
function arcColor(ratio: number): string {
  if (ratio >= 0.875) return '#ef4444';  // red-500
  if (ratio >= 0.7) return '#f97316';    // orange-500
  if (ratio >= 0.5) return '#f59e0b';    // amber-500
  return '#10b981';                       // emerald-500
}

function trackColor(ratio: number): string {
  if (ratio >= 0.875) return 'rgba(239,68,68,0.15)';
  if (ratio >= 0.7) return 'rgba(249,115,22,0.12)';
  if (ratio >= 0.5) return 'rgba(245,158,11,0.12)';
  return 'rgba(16,185,129,0.10)';
}

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

  const ratio = Math.min(total / CONTEXT_WINDOW, 1);
  const dashOffset = CIRCUMFERENCE * (1 - ratio);
  const color = arcColor(ratio);
  const track = trackColor(ratio);
  const percentage = (ratio * 100).toFixed(1);

  return (
    <>
      <button
        onClick={() => setDrawerOpen(true)}
        className="relative inline-flex shrink-0 items-center gap-1.5 rounded-md p-1 transition-colors hover:bg-muted/50 active:bg-muted"
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
            stroke={track}
            strokeWidth={STROKE}
          />
          {/* Filled arc */}
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke={color}
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={dashOffset}
            style={{ transition: 'stroke-dashoffset 0.6s ease, stroke 0.4s ease' }}
          />
        </svg>
        <span
          className="hidden text-[11px] tabular-nums text-muted-foreground sm:inline"
          style={{ color }}
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
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-foreground">Total Usage</span>
                  <Badge
                    variant="outline"
                    className={cn(
                      'h-6 px-2 text-xs font-semibold',
                      ratio >= 0.875 && 'border-red-500/50 bg-red-500/15 text-red-500',
                      ratio >= 0.7 && ratio < 0.875 && 'border-orange-500/50 bg-orange-500/15 text-orange-500',
                      ratio >= 0.5 && ratio < 0.7 && 'border-amber-500/50 bg-amber-500/15 text-amber-500',
                      ratio < 0.5 && 'border-emerald-500/50 bg-emerald-500/15 text-emerald-500',
                    )}
                  >
                    {percentage}%
                  </Badge>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold tabular-nums" style={{ color }}>
                    {formatTokens(total)}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    / {formatTokens(CONTEXT_WINDOW)} tokens
                  </span>
                </div>
                {/* Progress bar */}
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full transition-all duration-500 ease-out"
                    style={{
                      width: `${ratio * 100}%`,
                      backgroundColor: color,
                    }}
                  />
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

              {/* Info note */}
              <div className="rounded-lg border border-border/20 bg-muted/10 p-3">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  <span className="font-semibold text-foreground">Note:</span> Claude has a {formatTokens(CONTEXT_WINDOW)} token context window.
                  When the context fills up, earlier messages may be truncated to stay within the limit.
                </p>
              </div>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
