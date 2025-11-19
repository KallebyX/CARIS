/**
 * MEDIUM-08: Calendar Integration Error Handling
 *
 * Circuit Breaker Pattern implementation for external calendar API calls
 * Prevents cascade failures and provides graceful degradation
 */

export enum CircuitState {
  CLOSED = 'CLOSED',     // Normal operation
  OPEN = 'OPEN',         // Circuit is open, rejecting requests
  HALF_OPEN = 'HALF_OPEN' // Testing if service recovered
}

export interface CircuitBreakerConfig {
  failureThreshold: number      // Number of failures before opening circuit
  successThreshold: number      // Number of successes to close circuit from half-open
  timeout: number               // Time in ms before attempting to close circuit
  monitoringPeriod: number      // Time window in ms for counting failures
}

export interface CircuitBreakerStats {
  state: CircuitState
  failures: number
  successes: number
  lastFailureTime?: Date
  lastSuccessTime?: Date
  nextAttemptTime?: Date
}

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED
  private failures: number = 0
  private successes: number = 0
  private lastFailureTime?: Date
  private lastSuccessTime?: Date
  private nextAttemptTime?: Date
  private failureTimestamps: Date[] = []

  constructor(
    private serviceName: string,
    private config: CircuitBreakerConfig = {
      failureThreshold: 5,
      successThreshold: 2,
      timeout: 60000, // 1 minute
      monitoringPeriod: 120000, // 2 minutes
    }
  ) {}

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (this.shouldAttemptReset()) {
        this.state = CircuitState.HALF_OPEN
        console.log(`[CircuitBreaker:${this.serviceName}] Attempting to close circuit (HALF_OPEN)`)
      } else {
        const error = new Error(`Circuit breaker is OPEN for ${this.serviceName}`)
        error.name = 'CircuitBreakerError'
        throw error
      }
    }

    try {
      const result = await fn()
      this.onSuccess()
      return result
    } catch (error) {
      this.onFailure()
      throw error
    }
  }

  /**
   * Record a successful execution
   */
  private onSuccess(): void {
    this.lastSuccessTime = new Date()
    this.failures = 0

    if (this.state === CircuitState.HALF_OPEN) {
      this.successes++
      console.log(`[CircuitBreaker:${this.serviceName}] Success in HALF_OPEN state (${this.successes}/${this.config.successThreshold})`)

      if (this.successes >= this.config.successThreshold) {
        this.close()
      }
    }
  }

  /**
   * Record a failed execution
   */
  private onFailure(): void {
    this.lastFailureTime = new Date()
    this.failureTimestamps.push(this.lastFailureTime)

    // Remove old failures outside monitoring period
    const cutoffTime = Date.now() - this.config.monitoringPeriod
    this.failureTimestamps = this.failureTimestamps.filter(
      timestamp => timestamp.getTime() > cutoffTime
    )

    this.failures = this.failureTimestamps.length

    console.log(`[CircuitBreaker:${this.serviceName}] Failure recorded (${this.failures}/${this.config.failureThreshold})`)

    if (this.state === CircuitState.HALF_OPEN) {
      // Failed during recovery attempt, open circuit again
      this.open()
    } else if (this.failures >= this.config.failureThreshold) {
      this.open()
    }
  }

  /**
   * Open the circuit breaker
   */
  private open(): void {
    this.state = CircuitState.OPEN
    this.nextAttemptTime = new Date(Date.now() + this.config.timeout)
    console.error(`[CircuitBreaker:${this.serviceName}] Circuit opened due to failures. Next attempt at ${this.nextAttemptTime.toISOString()}`)
  }

  /**
   * Close the circuit breaker
   */
  private close(): void {
    this.state = CircuitState.CLOSED
    this.failures = 0
    this.successes = 0
    this.failureTimestamps = []
    this.nextAttemptTime = undefined
    console.log(`[CircuitBreaker:${this.serviceName}] Circuit closed - service recovered`)
  }

  /**
   * Check if we should attempt to reset the circuit
   */
  private shouldAttemptReset(): boolean {
    return (
      this.nextAttemptTime !== undefined &&
      Date.now() >= this.nextAttemptTime.getTime()
    )
  }

  /**
   * Get current circuit breaker statistics
   */
  getStats(): CircuitBreakerStats {
    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      nextAttemptTime: this.nextAttemptTime,
    }
  }

  /**
   * Manually reset the circuit breaker
   */
  reset(): void {
    this.close()
    console.log(`[CircuitBreaker:${this.serviceName}] Manually reset`)
  }

  /**
   * Check if circuit is open
   */
  isOpen(): boolean {
    return this.state === CircuitState.OPEN
  }
}

/**
 * Circuit Breaker Manager for multiple services
 */
export class CircuitBreakerManager {
  private breakers: Map<string, CircuitBreaker> = new Map()

  getOrCreate(serviceName: string, config?: CircuitBreakerConfig): CircuitBreaker {
    if (!this.breakers.has(serviceName)) {
      this.breakers.set(serviceName, new CircuitBreaker(serviceName, config))
    }
    return this.breakers.get(serviceName)!
  }

  getStats(): Map<string, CircuitBreakerStats> {
    const stats = new Map<string, CircuitBreakerStats>()
    for (const [name, breaker] of this.breakers.entries()) {
      stats.set(name, breaker.getStats())
    }
    return stats
  }

  resetAll(): void {
    for (const breaker of this.breakers.values()) {
      breaker.reset()
    }
  }
}

// Global circuit breaker manager
export const circuitBreakerManager = new CircuitBreakerManager()
