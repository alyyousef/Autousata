/**
 * API Timeout Wrapper Utility
 * Prevents hanging requests and provides better error messages
 */

/**
 * Wraps a promise with a timeout
 * @param promise - The promise to wrap
 * @param timeoutMs - Timeout duration in milliseconds (default: 30 seconds)
 * @param errorMessage - Custom error message for timeout
 * @returns The promise result or throws a timeout error
 */
export const withTimeout = async <T>(
  promise: Promise<T>,
  timeoutMs: number = 30000,
  errorMessage: string = 'Request timed out. Please try again.'
): Promise<T> => {
  let timeoutHandle: NodeJS.Timeout;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      const error = new Error(errorMessage);
      error.name = 'TimeoutError';
      reject(error);
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timeoutHandle!);
    return result;
  } catch (error) {
    clearTimeout(timeoutHandle!);
    throw error;
  }
};

/**
 * Retry a promise with exponential backoff
 * @param fn - Function that returns a promise
 * @param maxRetries - Maximum number of retries (default: 3)
 * @param baseDelay - Base delay in milliseconds (default: 1000)
 * @returns The promise result or throws the last error
 */
export const withRetry = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> => {
  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      // Don't retry on auth errors or client errors (4xx)
      if (
        error instanceof Error &&
        (error.message?.includes('401') ||
          error.message?.includes('403') ||
          error.message?.includes('400'))
      ) {
        throw error;
      }

      // If this was the last attempt, throw the error
      if (attempt === maxRetries) {
        throw error;
      }

      // Wait with exponential backoff before retrying
      const delay = baseDelay * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
};

/**
 * Combines timeout and retry for robust API calls
 * @param fn - Function that returns a promise
 * @param options - Configuration options
 * @returns The promise result or throws an error
 */
export const robustApiCall = async <T>(
  fn: () => Promise<T>,
  options: {
    timeoutMs?: number;
    maxRetries?: number;
    baseDelay?: number;
    timeoutMessage?: string;
  } = {}
): Promise<T> => {
  const {
    timeoutMs = 30000,
    maxRetries = 3,
    baseDelay = 1000,
    timeoutMessage = 'Request timed out. Please try again.',
  } = options;

  return withRetry(
    () => withTimeout(fn(), timeoutMs, timeoutMessage),
    maxRetries,
    baseDelay
  );
};
