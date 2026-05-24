export function formatLatency(milliseconds: number): string {
  if (!Number.isFinite(milliseconds) || milliseconds < 0) {
    return 'n/a';
  }

  return `${Math.round(milliseconds)} ms`;
}

