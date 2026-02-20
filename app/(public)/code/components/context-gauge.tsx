'use client';

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
 * Hover shows a detailed tooltip with input / output breakdown.
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
  if (total === 0) return null;

  const ratio = Math.min(total / CONTEXT_WINDOW, 1);
  const dashOffset = CIRCUMFERENCE * (1 - ratio);
  const color = arcColor(ratio);
  const track = trackColor(ratio);

  return (
    <span
      className="relative inline-flex shrink-0 cursor-default items-center gap-1.5"
      title={`Context: ${formatTokens(total)} / ${formatTokens(CONTEXT_WINDOW)}\nInput: ${input.toLocaleString()}\nOutput: ${output.toLocaleString()}`}
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
    </span>
  );
}
