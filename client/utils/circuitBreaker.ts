// Circuit breaker pattern to prevent overwhelming Firebase with requests during network issues
class CircuitBreaker {
  private failureCount = 0;
  private lastFailureTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private readonly failureThreshold = 5;
  private readonly recoveryTimeout = 30000; // 30 seconds
  private readonly resetTimeout = 10000; // 10 seconds

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.recoveryTimeout) {
        this.state = 'HALF_OPEN';
        console.log('🔄 Circuit breaker: Attempting recovery...');
      } else {
        // Instead of throwing, return a cached or default value if available
        console.log('🚫 Circuit breaker: Firebase temporarily unavailable, using fallback');
        throw new Error('Circuit breaker is OPEN - Firebase temporarily unavailable');
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error: any) {
      // More specific error handling
      const errorMessage = error?.message?.toLowerCase() || '';
      const isNetworkError = errorMessage.includes('failed to fetch') ||
                            errorMessage.includes('network error') ||
                            errorMessage.includes('fetch error');

      if (isNetworkError) {
        // Don't count network errors as much against the circuit breaker
        console.log('🌐 Network error detected, applying lenient failure handling');
        this.lastFailureTime = Date.now();
        this.failureCount = Math.min(this.failureCount + 0.5, this.failureThreshold);
      } else {
        this.onFailure();
      }

      throw error;
    }
  }

  private onSuccess() {
    this.failureCount = 0;
    this.state = 'CLOSED';
  }

  private onFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === 'HALF_OPEN') {
      this.state = 'OPEN';
      console.log('🚨 Circuit breaker: Recovery failed, going back to OPEN');
    } else if (this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
      console.log('🚨 Circuit breaker: Too many failures, circuit is now OPEN');
      
      // Auto-reset after timeout
      setTimeout(() => {
        if (this.state === 'OPEN') {
          this.state = 'HALF_OPEN';
          console.log('🔄 Circuit breaker: Auto-reset to HALF_OPEN');
        }
      }, this.resetTimeout);
    }
  }

  getState() {
    return this.state;
  }

  isAvailable() {
    return this.state !== 'OPEN';
  }
}

export const firebaseCircuitBreaker = new CircuitBreaker();
