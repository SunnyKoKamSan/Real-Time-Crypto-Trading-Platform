import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';
import type { MarketDataAdapter } from './types.js';

export class FixtureMarketDataAdapter implements MarketDataAdapter {
  private stopped = false;
  private timers = new Set<NodeJS.Timeout>();

  constructor(
    private readonly fixturePath: string,
    private readonly replaySpeed: number,
    private readonly onRawMessage: (raw: string) => void,
    private readonly onError: (error: unknown) => void,
    private readonly onDone?: () => void,
  ) {}

  async start(): Promise<void> {
    this.stopped = false;
    const lines: string[] = [];

    try {
      const reader = createInterface({
        input: createReadStream(this.fixturePath, { encoding: 'utf8' }),
        crlfDelay: Infinity,
      });

      for await (const line of reader) {
        const trimmed = line.trim();
        if (trimmed.length > 0) {
          lines.push(trimmed);
        }
      }
    } catch (error) {
      this.onError(error);
      return;
    }

    let firstTimestamp: number | null = null;
    let lastDelay = 0;

    for (const line of lines) {
      const providerMs = readProviderTimestamp(line);
      if (providerMs !== null && firstTimestamp === null) {
        firstTimestamp = providerMs;
      }

      const delay =
        providerMs !== null && firstTimestamp !== null
          ? Math.max(0, Math.round((providerMs - firstTimestamp) / this.replaySpeed))
          : lastDelay;
      lastDelay = delay;

      const timer = setTimeout(() => {
        this.timers.delete(timer);
        if (!this.stopped) {
          this.onRawMessage(line);
        }
      }, delay);
      this.timers.add(timer);
    }

    const doneTimer = setTimeout(() => {
      this.timers.delete(doneTimer);
      if (!this.stopped) {
        this.onDone?.();
      }
    }, lastDelay + 1);
    this.timers.add(doneTimer);
  }

  async stop(): Promise<void> {
    this.stopped = true;
    for (const timer of this.timers) {
      clearTimeout(timer);
    }
    this.timers.clear();
  }
}

function readProviderTimestamp(line: string): number | null {
  try {
    const message = JSON.parse(line) as {
      events?: Array<{ trades?: Array<{ time?: unknown }> }>;
    };
    const time = message.events?.[0]?.trades?.[0]?.time;
    return typeof time === 'string' ? Date.parse(time) : null;
  } catch (error) {
    void error;
    return null;
  }
}
