
/**
 * Standardized AI request wrapper with exponential backoff and jitter.
 * Designed to handle 429 Resource Exhausted errors gracefully.
 */

interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number; // ms
  maxDelay?: number; // ms
  jitter?: boolean;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 10, // Increased from 7 to allow for more retries in fallback
  initialDelay: 1500, // Increased from 1000ms
  maxDelay: 60000, // Increased from 10000ms (to 1 minute)
  jitter: true
};

export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {},
  context: string = "AI Request"
): Promise<T> {
  const { maxRetries, initialDelay, maxDelay, jitter } = { ...DEFAULT_OPTIONS, ...options };

  let lastError: any;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;

      const isRateLimit =
        error.status === 429 ||
        error.message?.includes('429') ||
        error.message?.toLowerCase().includes('resource exhausted') ||
        error.message?.toLowerCase().includes('rate limit');

      if (!isRateLimit || attempt === maxRetries) {
        throw error;
      }

      // Calculate exponential backoff: delay = initialDelay * 2^attempt
      let delay = initialDelay * Math.pow(2, attempt);

      // Cap at maxDelay
      delay = Math.min(delay, maxDelay);

      // Add jitter: ±25% random variation
      if (jitter) {
        const jitterAmount = delay * 0.25;
        delay = delay + (Math.random() * jitterAmount * 2 - jitterAmount);
      }

      console.warn(`[${context}] ⚠️ Rate limited (429). Retry attempt ${attempt + 1}/${maxRetries} in ${Math.round(delay)}ms...`);

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

