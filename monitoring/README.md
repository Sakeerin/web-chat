# Performance Testing and Monitoring

This directory contains the complete performance testing and monitoring infrastructure for the Telegram-like web chat application.

## Overview

The monitoring stack includes:
- **k6** for load testing and concurrent user simulation
- **Prometheus** for metrics collection
- **Grafana** for performance dashboards
- **AlertManager** for performance degradation alerts
- **Web Vitals** for client-side performance monitoring
- **Lighthouse CI** for automated performance audits
- **Performance regression testing** in CI/CD pipeline

## Performance Requirements

Based on the application requirements, we monitor these key metrics:

### Backend Performance
- **API Response Time**: P95 < 200ms
- **Message Latency**: P50 < 150ms (same region)
- **Concurrent Users**: ≥10,000 WebSocket connections
- **Message Throughput**: ≥500 messages/second system-wide
- **Error Rate**: <1%
- **Availability**: 99.9% monthly uptime

### Frontend Performance
- **Initial Load Time**: P95 < 1.2s on 4G
- **Search Response**: P95 < 300ms
- **Core Web Vitals**:
  - LCP (Largest Contentful Paint): <2.5s
  - FID (First Input Delay): <100ms
  - CLS (Cumulative Layout Shift): <0.1

### System Resources
- **Memory Usage**: <2GB per instance
- **CPU Usage**: <80% average

## Quick Start

### 1. Start Monitoring Stack

```bash
# Start the complete monitoring infrastructure
docker-compose -f docker-compose.monitoring.yml up -d

# Access dashboards
# Grafana: http://localhost:3001 (admin/admin123)
# Prometheus: http://localhost:9090
# AlertManager: http://localhost:9093
```

### 2. Run Load Tests

```bash
# Install k6
# On macOS: brew install k6
# On Ubuntu: See installation instructions in CI workflow

# Run baseline load test
k6 run apps/api/k6/load-test.js

# Run concurrent users test (10k users)
k6 run apps/api/k6/concurrent-users-test.js

# Run message throughput test (500+ msg/sec)
k6 run apps/api/k6/message-throughput-test.js
```

### 3. Run Performance Regression Tests

```bash
# Run complete performance regression test suite
node scripts/performance-regression-test.js

# This will:
# - Start the application
# - Run all k6 load tests
# - Run Lighthouse performance audits
# - Compare with baseline
# - Generate performance report
# - Fail if regressions detected
```

### 4. Monitor Client-Side Performance

The Web Vitals collector automatically tracks:
- Core Web Vitals (LCP, FID, CLS, FCP, TTFB)
- Custom app metrics (message send latency, chat load time)
- Performance scores and insights

```typescript
import { trackPerformance } from './utils/webVitals'

// Track custom metrics
const startTime = Date.now()
// ... perform operation
trackPerformance.messageSend(Date.now() - startTime)
```

## Load Testing Scenarios

### 1. Baseline Load Test (`load-test.js`)
- **Purpose**: General API and WebSocket performance
- **Load Pattern**: Ramp up to 1000 concurrent users
- **Duration**: ~25 minutes
- **Metrics**: Response times, message latency, error rates

### 2. Concurrent Users Test (`concurrent-users-test.js`)
- **Purpose**: Test system capacity with high concurrent connections
- **Load Pattern**: Ramp up to 10,000 concurrent WebSocket connections
- **Duration**: ~40 minutes
- **Metrics**: Connection success rate, message delivery, system stability

### 3. Message Throughput Test (`message-throughput-test.js`)
- **Purpose**: Test message processing capacity
- **Load Pattern**: Constant 500+ messages/second
- **Duration**: ~15 minutes
- **Metrics**: Message throughput, delivery latency, system throughput

## Monitoring Dashboards

### Chat Application Performance Dashboard
- **System Overview**: Service status, response times, concurrent users
- **Request Metrics**: Request rate, response time distribution
- **Message Metrics**: Message throughput, latency, delivery rates
- **Resource Usage**: Memory, CPU, database performance
- **Error Tracking**: Error rates, failed requests, WebSocket issues

### Key Panels:
1. **System Health**: Overall status indicators
2. **Performance Metrics**: Response times and latencies
3. **Throughput**: Request and message rates
4. **Resource Usage**: Memory and CPU utilization
5. **Error Rates**: Application and system errors
6. **Database Performance**: Query times and slow queries

## Alerting Rules

### Critical Alerts (Immediate Response)
- **Service Down**: API service unavailable
- **Critical Response Time**: P95 > 500ms
- **Critical Error Rate**: >10% error rate
- **Critical Memory Usage**: >2GB memory usage

### Warning Alerts (Monitor Closely)
- **High Response Time**: P95 > 200ms
- **High Message Latency**: P50 > 150ms
- **High Error Rate**: >5% error rate
- **High Memory Usage**: >1GB memory usage
- **High CPU Usage**: >80% CPU usage
- **Low Message Throughput**: <100 messages/sec
- **Database Slow Queries**: >1 slow query/sec
- **WebSocket Connection Failures**: >0.1 failures/sec

## CI/CD Integration

### Performance Testing Workflow
The GitHub Actions workflow (`performance-test.yml`) runs:

1. **On every push/PR**: Basic performance validation
2. **Daily scheduled**: Complete performance regression testing
3. **Matrix testing**: Parallel execution of different load test scenarios

### Performance Regression Detection
- **Baseline Comparison**: Compare current performance with historical baseline
- **Threshold Validation**: Ensure metrics meet absolute requirements
- **Regression Alerts**: Fail CI if performance degrades significantly
- **PR Comments**: Automatic performance reports on pull requests

### Lighthouse CI Integration
- **Automated Audits**: Performance, accessibility, best practices
- **Performance Budget**: Enforce size and timing budgets
- **Core Web Vitals**: Monitor real user experience metrics

## Performance Optimization Guidelines

### Backend Optimizations
1. **Database**: Use connection pooling, optimize queries, add indexes
2. **Caching**: Implement Redis caching for frequently accessed data
3. **WebSocket**: Use connection pooling and message batching
4. **API**: Implement response compression and pagination

### Frontend Optimizations
1. **Code Splitting**: Lazy load routes and components
2. **Virtual Scrolling**: Handle large message lists efficiently
3. **Image Optimization**: Lazy loading and responsive images
4. **Bundle Size**: Monitor and optimize JavaScript bundle size

### Infrastructure Optimizations
1. **Load Balancing**: Distribute traffic across multiple instances
2. **CDN**: Use CDN for static assets and media files
3. **Database Scaling**: Implement read replicas and partitioning
4. **Monitoring**: Continuous performance monitoring and alerting

## Troubleshooting

### Common Performance Issues

#### High Response Times
1. Check database query performance
2. Verify connection pool settings
3. Monitor memory usage and garbage collection
4. Check for blocking operations

#### High Memory Usage
1. Look for memory leaks in application code
2. Check WebSocket connection cleanup
3. Monitor cache sizes and TTL settings
4. Review database connection pooling

#### WebSocket Issues
1. Check connection limits and timeouts
2. Monitor message queue sizes
3. Verify Redis pub/sub performance
4. Check for connection cleanup issues

### Performance Debugging
1. **Enable detailed logging** for slow operations
2. **Use profiling tools** to identify bottlenecks
3. **Monitor system resources** during load tests
4. **Analyze database query patterns** and optimize indexes

## Maintenance

### Regular Tasks
1. **Review performance trends** weekly
2. **Update performance baselines** after major releases
3. **Tune alert thresholds** based on system behavior
4. **Archive old metrics data** to manage storage

### Capacity Planning
1. **Monitor growth trends** in user base and message volume
2. **Plan infrastructure scaling** based on performance projections
3. **Test scaling scenarios** with load testing
4. **Update performance requirements** as system evolves

## Configuration Files

- `prometheus.yml`: Prometheus configuration and scrape targets
- `alert_rules.yml`: Performance alerting rules
- `grafana/dashboards/`: Grafana dashboard definitions
- `alertmanager.yml`: Alert routing and notification configuration
- `.lighthouserc.json`: Lighthouse CI configuration
- `playwright.performance.config.ts`: Playwright performance test configuration

## Metrics Reference

### Custom Metrics
- `http_request_duration_seconds`: API response time histogram
- `websocket_message_latency_seconds`: Message latency histogram
- `websocket_active_connections`: Current WebSocket connections
- `websocket_messages_total`: Total messages processed
- `database_query_duration_seconds`: Database query time histogram
- `memory_usage_bytes`: Application memory usage
- `cpu_usage_percent`: CPU utilization percentage

### Web Vitals Metrics
- `web_vitals_lcp`: Largest Contentful Paint
- `web_vitals_fid`: First Input Delay
- `web_vitals_cls`: Cumulative Layout Shift
- `web_vitals_fcp`: First Contentful Paint
- `web_vitals_ttfb`: Time to First Byte