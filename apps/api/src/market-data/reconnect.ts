export type ReconnectState = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'stopped';

export interface ReconnectBackoffOptions {
  baseMs: number;
  maxMs: number;
  jitterRatio: number;
  random?: () => number;
}

export class ReconnectController {
  private attempts = 0;
  private state: ReconnectState = 'idle';
  private readonly random: () => number;

  constructor(private readonly options: ReconnectBackoffOptions) {
    this.random = options.random ?? Math.random;
  }

  getState(): ReconnectState {
    return this.state;
  }

  getAttempts(): number {
    return this.attempts;
  }

  connect(): void {
    this.state = 'connecting';
  }

  connected(): void {
    this.attempts = 0;
    this.state = 'connected';
  }

  disconnected(): number {
    this.attempts += 1;
    this.state = 'reconnecting';
    return this.nextDelayMs();
  }

  stop(): void {
    this.state = 'stopped';
  }

  private nextDelayMs(): number {
    const exponential = this.options.baseMs * 2 ** Math.max(0, this.attempts - 1);
    const capped = Math.min(exponential, this.options.maxMs);
    const jitterWindow = capped * this.options.jitterRatio;
    const jitter = (this.random() * 2 - 1) * jitterWindow;
    return Math.min(this.options.maxMs, Math.max(0, Math.round(capped + jitter)));
  }
}
