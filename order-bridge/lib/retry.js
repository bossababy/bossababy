/** Retry with exponential backoff, but only for errors worth retrying. */
export async function withRetry(fn, { attempts = 3, baseDelayMs = 500 } = {}) {
  let lastError;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // A 4xx from the 3PL means the payload is wrong. Sending the
      // identical payload again will fail identically, so stop.
      if (error.retryable === false) break;
      if (attempt === attempts) break;

      const delay = baseDelayMs * 2 ** (attempt - 1);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}
