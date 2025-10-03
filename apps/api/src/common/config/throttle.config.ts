import { ThrottlerModuleOptions } from '@nestjs/throttler'

export const createThrottlerConfig = (): ThrottlerModuleOptions => {
  return {
    ttl: 60000, // 1 minute
    limit: 100, // 100 requests per minute
    // For now using simple configuration, can be upgraded to multiple throttlers later
  }
}