import type { Redis } from 'ioredis';

export interface RateLimitRule {
  limit: number;
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: Date;
  retryAfterSeconds?: number;
}

export interface RateLimitStore {
  check(key: string, rule: RateLimitRule, now: Date): Promise<RateLimitResult>;
}

const redisSlidingWindowScript = `
local key = KEYS[1]
local now = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local limit = tonumber(ARGV[3])
local member = ARGV[4]
redis.call('ZREMRANGEBYSCORE', key, 0, now - window)
local count = redis.call('ZCARD', key)
if count >= limit then
  local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
  local reset = now + window
  if oldest[2] then
    reset = tonumber(oldest[2]) + window
  end
  return {0, limit, 0, reset}
end
redis.call('ZADD', key, now, member)
redis.call('PEXPIRE', key, window)
count = count + 1
return {1, limit, limit - count, now + window}
`;

function buildResult(values: [number, number, number, number], now: Date): RateLimitResult {
  const allowed = values[0] === 1;
  const resetAt = new Date(values[3]);
  const retryAfterSeconds = allowed
    ? undefined
    : Math.max(1, Math.ceil((resetAt.getTime() - now.getTime()) / 1_000));

  return {
    allowed,
    limit: values[1],
    remaining: values[2],
    resetAt,
    ...(retryAfterSeconds ? { retryAfterSeconds } : {}),
  };
}

export class RedisRateLimitStore implements RateLimitStore {
  constructor(private readonly redis: Redis) {}

  async check(key: string, rule: RateLimitRule, now: Date): Promise<RateLimitResult> {
    const result = (await this.redis.eval(
      redisSlidingWindowScript,
      1,
      key,
      String(now.getTime()),
      String(rule.windowMs),
      String(rule.limit),
      `${now.getTime()}:${Math.random()}`,
    )) as [number, number, number, number];

    return buildResult(result, now);
  }
}

export class MemoryRateLimitStore implements RateLimitStore {
  private readonly hits = new Map<string, number[]>();

  async check(key: string, rule: RateLimitRule, now: Date): Promise<RateLimitResult> {
    const cutoff = now.getTime() - rule.windowMs;
    const activeHits = (this.hits.get(key) ?? []).filter((hit) => hit > cutoff);
    const allowed = activeHits.length < rule.limit;

    if (allowed) {
      activeHits.push(now.getTime());
    }

    this.hits.set(key, activeHits);

    const oldest = activeHits[0] ?? now.getTime();
    const resetAt = new Date(oldest + rule.windowMs);
    const remaining = allowed ? Math.max(0, rule.limit - activeHits.length) : 0;

    return {
      allowed,
      limit: rule.limit,
      remaining,
      resetAt,
      ...(!allowed
        ? { retryAfterSeconds: Math.max(1, Math.ceil((resetAt.getTime() - now.getTime()) / 1_000)) }
        : {}),
    };
  }
}
