import { describe, expect, it } from 'vitest';
import { BoundedRingQueue } from '../../src/market-data/queue.js';

describe('bounded ring queue', () => {
  it('preserves FIFO order before overflow and drops oldest when full', () => {
    const queue = new BoundedRingQueue<number>(3);

    queue.enqueue(1);
    queue.enqueue(2);
    queue.enqueue(3);

    expect(queue.dequeue()).toBe(1);

    queue.enqueue(4);
    queue.enqueue(5);

    expect(queue.snapshot()).toMatchObject({
      capacity: 3,
      length: 3,
      enqueued: 5,
      dequeued: 1,
      dropped: 1,
    });
    expect([queue.dequeue(), queue.dequeue(), queue.dequeue()]).toEqual([3, 4, 5]);
  });
});
