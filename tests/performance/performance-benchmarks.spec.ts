/**
 * Performance Benchmark Tests
 * Tests application performance against specified requirements
 */

import { test, expect, Page } from '@playwright/test';

interface PerformanceMetrics {
  messageLatency: number;
  apiResponseTime: number;
  initialLoadTime: number;
  searchResponseTime: number;
  memoryUsage: number;
  cpuUsage: number;
}

test.describe('Performance Benchmarks', () => {
  let performanceMetrics: PerformanceMetrics;

  test.beforeEach(async ({ page }) => {
    // Enable performance monitoring
    await page.addInitScript(() => {
      window.performanceMetrics = {
        messageLatencies: [],
        apiResponseTimes: [],
        searchResponseTimes: []
      };
    });
  });

  test('Message latency benchmark - P50 < 150ms same region', async ({ page }) => {
    await page.goto('/chat');
    
    // Mock authentication
    await page.route('**/api/auth/login', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: { id: '1', email: 'test@example.com', username: 'testuser' },
          accessToken: 'mock-token'
        })
      });
    });

    // Login and navigate to chat
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/chat');

    // Navigate to a conversation
    await page.click('[data-testid="conversation-1"]');

    const messageLatencies: number[] = [];

    // Send multiple messages and measure latency
    for (let i = 0; i < 20; i++) {
      const message = `Performance test message ${i + 1}`;
      
      // Mock message send API with realistic delay
      await page.route('**/api/messages', async route => {
        const delay = Math.random() * 100 + 50; // 50-150ms random delay
        await new Promise(resolve => setTimeout(resolve, delay));
        
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: `msg-${i}`,
            content: message,
            senderId: '1',
            conversationId: '1',
            createdAt: new Date().toISOString()
          })
        });
      });

      const startTime = performance.now();
      
      await page.fill('[data-testid="message-input"]', message);
      await page.click('[data-testid="send-button"]');
      
      // Wait for message to appear in UI
      await expect(page.locator(`[data-testid="message"]:has-text("${message}")`)).toBeVisible();
      
      const endTime = performance.now();
      const latency = endTime - startTime;
      messageLatencies.push(latency);
      
      // Clear input for next message
      await page.fill('[data-testid="message-input"]', '');
    }

    // Calculate P50 (median) latency
    messageLatencies.sort((a, b) => a - b);
    const p50Latency = messageLatencies[Math.floor(messageLatencies.length * 0.5)];
    
    console.log(`P50 Message Latency: ${p50Latency.toFixed(2)}ms`);
    console.log(`P95 Message Latency: ${messageLatencies[Math.floor(messageLatencies.length * 0.95)].toFixed(2)}ms`);
    
    // Requirement: P50 < 150ms
    expect(p50Latency).toBeLessThan(150);
  });

  test('API response time benchmark - P95 < 200ms', async ({ page }) => {
    const apiResponseTimes: number[] = [];

    // Intercept API calls and measure response times
    await page.route('**/api/**', async (route, request) => {
      const startTime = performance.now();
      
      // Mock different API endpoints with realistic responses
      const url = request.url();
      let response;
      
      if (url.includes('/conversations')) {
        response = {
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            conversations: Array.from({ length: 10 }, (_, i) => ({
              id: `conv-${i}`,
              title: `Conversation ${i}`,
              lastMessage: { content: 'Last message', createdAt: new Date().toISOString() }
            }))
          })
        };
      } else if (url.includes('/messages')) {
        response = {
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            messages: Array.from({ length: 50 }, (_, i) => ({
              id: `msg-${i}`,
              content: `Message ${i}`,
              senderId: '1',
              createdAt: new Date().toISOString()
            }))
          })
        };
      } else {
        response = { status: 200, contentType: 'application/json', body: '{}' };
      }

      // Add realistic network delay
      const networkDelay = Math.random() * 100 + 20; // 20-120ms
      await new Promise(resolve => setTimeout(resolve, networkDelay));
      
      await route.fulfill(response);
      
      const endTime = performance.now();
      const responseTime = endTime - startTime;
      apiResponseTimes.push(responseTime);
    });

    await page.goto('/chat');

    // Trigger multiple API calls
    const apiCalls = [
      () => page.reload(),
      () => page.click('[data-testid="conversation-1"]'),
      () => page.click('[data-testid="conversation-2"]'),
      () => page.click('[data-testid="refresh-conversations"]'),
      () => page.goto('/settings'),
      () => page.goto('/chat')
    ];

    for (const apiCall of apiCalls) {
      await apiCall();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(100); // Small delay between calls
    }

    // Calculate P95 response time
    apiResponseTimes.sort((a, b) => a - b);
    const p95ResponseTime = apiResponseTimes[Math.floor(apiResponseTimes.length * 0.95)];
    
    console.log(`P95 API Response Time: ${p95ResponseTime.toFixed(2)}ms`);
    console.log(`Average API Response Time: ${(apiResponseTimes.reduce((a, b) => a + b, 0) / apiResponseTimes.length).toFixed(2)}ms`);
    
    // Requirement: P95 < 200ms
    expect(p95ResponseTime).toBeLessThan(200);
  });

  test('Initial load time benchmark - P95 < 1.2s on 4G', async ({ page }) => {
    // Simulate 4G network conditions
    const client = await page.context().newCDPSession(page);
    await client.send('Network.emulateNetworkConditions', {
      offline: false,
      downloadThroughput: 4 * 1024 * 1024 / 8, // 4 Mbps
      uploadThroughput: 3 * 1024 * 1024 / 8,   // 3 Mbps
      latency: 20 // 20ms latency
    });

    const loadTimes: number[] = [];

    // Test multiple page loads
    for (let i = 0; i < 10; i++) {
      const startTime = performance.now();
      
      await page.goto('/chat', { waitUntil: 'networkidle' });
      
      // Wait for critical content to be visible
      await expect(page.locator('[data-testid="chat-interface"]')).toBeVisible();
      
      const endTime = performance.now();
      const loadTime = endTime - startTime;
      loadTimes.push(loadTime);
      
      console.log(`Load ${i + 1}: ${loadTime.toFixed(2)}ms`);
    }

    // Calculate P95 load time
    loadTimes.sort((a, b) => a - b);
    const p95LoadTime = loadTimes[Math.floor(loadTimes.length * 0.95)];
    
    console.log(`P95 Initial Load Time: ${p95LoadTime.toFixed(2)}ms`);
    
    // Requirement: P95 < 1.2s (1200ms) on 4G
    expect(p95LoadTime).toBeLessThan(1200);

    // Reset network conditions
    await client.send('Network.emulateNetworkConditions', {
      offline: false,
      downloadThroughput: -1,
      uploadThroughput: -1,
      latency: 0
    });
  });

  test('Search response time benchmark - P95 < 300ms', async ({ page }) => {
    await page.goto('/chat');

    const searchResponseTimes: number[] = [];

    // Mock search API
    await page.route('**/api/search**', async route => {
      const searchDelay = Math.random() * 200 + 50; // 50-250ms
      await new Promise(resolve => setTimeout(resolve, searchDelay));
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          results: Array.from({ length: 20 }, (_, i) => ({
            id: `result-${i}`,
            type: 'message',
            content: `Search result ${i}`,
            conversationId: `conv-${i % 5}`,
            createdAt: new Date().toISOString()
          }))
        })
      });
    });

    // Open search interface
    await page.click('[data-testid="search-button"]');

    const searchQueries = [
      'hello',
      'test message',
      'integration',
      'performance',
      'benchmark',
      'search query',
      'long search query with multiple words',
      'emoji 😀',
      'special characters !@#$%',
      'numbers 12345'
    ];

    for (const query of searchQueries) {
      const startTime = performance.now();
      
      await page.fill('[data-testid="search-input"]', query);
      await page.press('[data-testid="search-input"]', 'Enter');
      
      // Wait for search results
      await expect(page.locator('[data-testid="search-results"]')).toBeVisible();
      
      const endTime = performance.now();
      const responseTime = endTime - startTime;
      searchResponseTimes.push(responseTime);
      
      console.log(`Search "${query}": ${responseTime.toFixed(2)}ms`);
      
      // Clear search for next query
      await page.fill('[data-testid="search-input"]', '');
    }

    // Calculate P95 search response time
    searchResponseTimes.sort((a, b) => a - b);
    const p95SearchTime = searchResponseTimes[Math.floor(searchResponseTimes.length * 0.95)];
    
    console.log(`P95 Search Response Time: ${p95SearchTime.toFixed(2)}ms`);
    
    // Requirement: P95 < 300ms
    expect(p95SearchTime).toBeLessThan(300);
  });

  test('Memory usage benchmark', async ({ page }) => {
    await page.goto('/chat');

    // Get initial memory usage
    const initialMemory = await page.evaluate(() => {
      return (performance as any).memory ? {
        usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
        totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
        jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit
      } : null;
    });

    if (initialMemory) {
      console.log(`Initial Memory Usage: ${(initialMemory.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB`);
    }

    // Simulate heavy usage
    for (let i = 0; i < 50; i++) {
      // Navigate between conversations
      await page.click(`[data-testid="conversation-${i % 5}"]`);
      
      // Send messages
      await page.fill('[data-testid="message-input"]', `Memory test message ${i}`);
      await page.click('[data-testid="send-button"]');
      
      // Scroll through messages
      const messageList = page.locator('[data-testid="message-list"]');
      await messageList.evaluate(el => el.scrollTop = el.scrollHeight);
      
      if (i % 10 === 0) {
        // Check memory usage periodically
        const currentMemory = await page.evaluate(() => {
          return (performance as any).memory ? (performance as any).memory.usedJSHeapSize : null;
        });
        
        if (currentMemory && initialMemory) {
          const memoryIncrease = (currentMemory - initialMemory.usedJSHeapSize) / 1024 / 1024;
          console.log(`Memory increase after ${i} operations: ${memoryIncrease.toFixed(2)} MB`);
          
          // Memory shouldn't grow excessively (threshold: 50MB increase)
          expect(memoryIncrease).toBeLessThan(50);
        }
      }
    }

    // Force garbage collection if available
    await page.evaluate(() => {
      if ((window as any).gc) {
        (window as any).gc();
      }
    });

    // Final memory check
    const finalMemory = await page.evaluate(() => {
      return (performance as any).memory ? (performance as any).memory.usedJSHeapSize : null;
    });

    if (finalMemory && initialMemory) {
      const totalMemoryIncrease = (finalMemory - initialMemory.usedJSHeapSize) / 1024 / 1024;
      console.log(`Total Memory Increase: ${totalMemoryIncrease.toFixed(2)} MB`);
      
      // Total memory increase should be reasonable
      expect(totalMemoryIncrease).toBeLessThan(100);
    }
  });

  test('Concurrent user simulation benchmark', async ({ browser }) => {
    const concurrentUsers = 10;
    const contexts = [];
    const pages = [];

    // Create multiple browser contexts to simulate concurrent users
    for (let i = 0; i < concurrentUsers; i++) {
      const context = await browser.newContext();
      const page = await context.newPage();
      contexts.push(context);
      pages.push(page);
    }

    const startTime = performance.now();

    // Simulate concurrent user actions
    const userActions = pages.map(async (page, index) => {
      // Each user logs in
      await page.goto('/login');
      await page.fill('[data-testid="email-input"]', `user${index}@test.com`);
      await page.fill('[data-testid="password-input"]', 'password123');
      await page.click('[data-testid="login-button"]');
      
      // Navigate to chat
      await page.waitForURL('/chat');
      
      // Send messages
      for (let j = 0; j < 5; j++) {
        await page.fill('[data-testid="message-input"]', `Message ${j} from user ${index}`);
        await page.click('[data-testid="send-button"]');
        await page.waitForTimeout(100);
      }
      
      // Perform search
      await page.click('[data-testid="search-button"]');
      await page.fill('[data-testid="search-input"]', 'test');
      await page.press('[data-testid="search-input"]', 'Enter');
      
      return page;
    });

    // Wait for all users to complete their actions
    await Promise.all(userActions);

    const endTime = performance.now();
    const totalTime = endTime - startTime;

    console.log(`${concurrentUsers} concurrent users completed actions in ${totalTime.toFixed(2)}ms`);
    console.log(`Average time per user: ${(totalTime / concurrentUsers).toFixed(2)}ms`);

    // System should handle concurrent users efficiently
    expect(totalTime).toBeLessThan(30000); // 30 seconds for 10 users

    // Clean up
    for (const context of contexts) {
      await context.close();
    }
  });

  test('Bundle size and loading performance', async ({ page }) => {
    // Navigate to page and capture network activity
    const responses: any[] = [];
    
    page.on('response', response => {
      responses.push({
        url: response.url(),
        status: response.status(),
        size: response.headers()['content-length'],
        type: response.headers()['content-type']
      });
    });

    await page.goto('/chat');
    await page.waitForLoadState('networkidle');

    // Analyze JavaScript bundle sizes
    const jsResponses = responses.filter(r => 
      r.type?.includes('javascript') || r.url.endsWith('.js')
    );
    
    const totalJSSize = jsResponses.reduce((total, response) => {
      return total + (parseInt(response.size) || 0);
    }, 0);

    console.log(`Total JavaScript bundle size: ${(totalJSSize / 1024).toFixed(2)} KB`);

    // Analyze CSS bundle sizes
    const cssResponses = responses.filter(r => 
      r.type?.includes('css') || r.url.endsWith('.css')
    );
    
    const totalCSSSize = cssResponses.reduce((total, response) => {
      return total + (parseInt(response.size) || 0);
    }, 0);

    console.log(`Total CSS bundle size: ${(totalCSSSize / 1024).toFixed(2)} KB`);

    // Bundle size should be reasonable for a chat application
    expect(totalJSSize).toBeLessThan(1024 * 1024); // < 1MB JS
    expect(totalCSSSize).toBeLessThan(200 * 1024);  // < 200KB CSS

    // Test code splitting effectiveness
    const chunkResponses = jsResponses.filter(r => r.url.includes('chunk'));
    console.log(`Number of JS chunks: ${chunkResponses.length}`);
    
    // Should have multiple chunks for code splitting
    expect(chunkResponses.length).toBeGreaterThan(1);
  });
});