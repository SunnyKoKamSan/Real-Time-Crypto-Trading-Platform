const nanosecondsPerMillisecond = 1_000_000n;
const nanosecondsPerSecond = 1_000_000_000n;
const bootEpochNanoseconds = BigInt(Date.now()) * nanosecondsPerMillisecond;
const bootMonotonicNanoseconds = process.hrtime.bigint();

export function createHighPrecisionTimestamp(): string {
  const elapsedNanoseconds = process.hrtime.bigint() - bootMonotonicNanoseconds;
  const epochNanoseconds = bootEpochNanoseconds + elapsedNanoseconds;
  const epochMilliseconds = epochNanoseconds / nanosecondsPerMillisecond;
  const nanosecondFraction = epochNanoseconds % nanosecondsPerSecond;
  const isoMilliseconds = new Date(Number(epochMilliseconds)).toISOString();
  const wholeSeconds = isoMilliseconds.slice(0, isoMilliseconds.indexOf('.'));

  return `${wholeSeconds}.${nanosecondFraction.toString().padStart(9, '0')}Z`;
}
