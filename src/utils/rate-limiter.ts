interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

class SocketRateLimiter {
  private requests = new Map<string, number[]>();

  check(socketId: string, config: RateLimitConfig): boolean {
    const now = Date.now();
    const requests = this.requests.get(socketId) || [];

    // Remove old requests
    const recentRequests = requests.filter(
      time => now - time < config.windowMs
    );

    if (recentRequests.length >= config.maxRequests) {
      return false;
    }

    recentRequests.push(now);
    this.requests.set(socketId, recentRequests);
    return true;
  }

  cleanup() {
    const now = Date.now();
    for (const [socketId, requests] of this.requests.entries()) {
      const recent = requests.filter(time => now - time < 60000);
      if (recent.length === 0) {
        this.requests.delete(socketId);
      } else {
        this.requests.set(socketId, recent);
      }
    }
  }

  reset(socketId: string) {
    this.requests.delete(socketId);
  }
}

export const rateLimiter = new SocketRateLimiter();

// Cleanup every minute
setInterval(() => rateLimiter.cleanup(), 60000);
