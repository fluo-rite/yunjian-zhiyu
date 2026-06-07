export const STREAM_RECONNECT_MAX_ATTEMPTS = 5;
export const STREAM_RECONNECT_MAX_WINDOW_MS = 30_000;
export const STREAM_RECONNECT_MAX_DELAY_MS = 8_000;
export const STREAM_RECONNECT_BASE_DELAY_MS = 1_000;

export type StreamReconnectDecision = {
  shouldReconnect: boolean;
  nextAttempt: number;
  delayMs: number;
  firstFailureAt: number;
};

export function getStreamReconnectDelayMs(attempt: number) {
  if (attempt <= 1) {
    return 0;
  }

  return Math.min(
    STREAM_RECONNECT_BASE_DELAY_MS * 2 ** (attempt - 2),
    STREAM_RECONNECT_MAX_DELAY_MS,
  );
}

export function getStreamReconnectDecision(args: {
  attemptCount: number;
  firstFailureAt: number | null;
  now: number;
}) : StreamReconnectDecision {
  const firstFailureAt = args.firstFailureAt ?? args.now;
  const nextAttempt = args.attemptCount + 1;
  const elapsedMs = args.now - firstFailureAt;

  if (
    nextAttempt > STREAM_RECONNECT_MAX_ATTEMPTS ||
    elapsedMs > STREAM_RECONNECT_MAX_WINDOW_MS
  ) {
    return {
      shouldReconnect: false,
      nextAttempt,
      delayMs: 0,
      firstFailureAt,
    };
  }

  return {
    shouldReconnect: true,
    nextAttempt,
    delayMs: getStreamReconnectDelayMs(nextAttempt),
    firstFailureAt,
  };
}
