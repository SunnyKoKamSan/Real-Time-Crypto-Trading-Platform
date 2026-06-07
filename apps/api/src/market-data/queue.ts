export interface QueueSnapshot {
  capacity: number;
  length: number;
  enqueued: number;
  dequeued: number;
  dropped: number;
}

export class BoundedRingQueue<T> {
  private readonly items: Array<T | undefined>;
  private head = 0;
  private count = 0;
  private enqueued = 0;
  private dequeued = 0;
  private dropped = 0;

  constructor(private readonly capacity: number) {
    if (!Number.isInteger(capacity) || capacity <= 0) {
      throw new RangeError('queue capacity must be a positive integer');
    }

    this.items = new Array<T | undefined>(capacity);
  }

  get length(): number {
    return this.count;
  }

  enqueue(item: T): void {
    if (this.count === this.capacity) {
      this.items[this.head] = undefined;
      this.head = (this.head + 1) % this.capacity;
      this.count -= 1;
      this.dropped += 1;
    }

    const tail = (this.head + this.count) % this.capacity;
    this.items[tail] = item;
    this.count += 1;
    this.enqueued += 1;
  }

  dequeue(): T | undefined {
    if (this.count === 0) {
      return undefined;
    }

    const item = this.items[this.head];
    this.items[this.head] = undefined;
    this.head = (this.head + 1) % this.capacity;
    this.count -= 1;
    this.dequeued += 1;
    return item;
  }

  snapshot(): QueueSnapshot {
    return {
      capacity: this.capacity,
      length: this.count,
      enqueued: this.enqueued,
      dequeued: this.dequeued,
      dropped: this.dropped,
    };
  }
}
