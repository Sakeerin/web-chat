import { test, expect } from '@playwright/test'

test.describe('Chat Performance Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login')
    await page.fill('[data-testid="email-input"]', 'test@example.com')
    await page.fill('[data-testid="password-input"]', 'password123')
    await page.click('[data-testid="login-button"]')
    await page.waitForURL('/chat')
  })

  test('chat initial load performance', async ({ page }) => {
    const startTime = Date.now()
    
    // Navigate to chat page
    await page.goto('/chat')
    
    // Wait for chat interface to be fully loaded
    await page.waitForSelector('[data-testid="chat-interface"]', { state: 'visible' })
    await page.waitForSelector('[data-testid="conversation-list"]', { state: 'visible' })
    await page.waitForSelector('[data-testid="message-list"]', { state: 'visible' })
    
    const loadTime = Date.now() - startTime
    
    // Assert load time is under 1.2 seconds (P95 requirement)
    expect(loadTime).toBeLessThan(1200)
    
    // Check for layout shifts
    const cls = await page.evaluate(() => {
      return new Promise((resolve) => {
        new PerformanceObserver((list) => {
          const entries = list.getEntries()
          const clsEntry = entries.find(entry => entry.entryType === 'layout-shift')
          resolve(clsEntry ? (clsEntry as any).value : 0)
        }).observe({ entryTypes: ['layout-shift'] })
        
        // Resolve after a short delay if no layout shifts
        setTimeout(() => resolve(0), 1000)
      })
    })
    
    expect(cls).toBeLessThan(0.1) // CLS should be less than 0.1
    
    console.log(`Chat load time: ${loadTime}ms, CLS: ${cls}`)
  })

  test('message sending performance', async ({ page }) => {
    await page.goto('/chat')
    await page.waitForSelector('[data-testid="message-composer"]')
    
    const messageInput = page.locator('[data-testid="message-input"]')
    const sendButton = page.locator('[data-testid="send-button"]')
    
    // Measure message send latency
    const measurements = []
    
    for (let i = 0; i < 5; i++) {
      const startTime = Date.now()
      
      await messageInput.fill(`Performance test message ${i}`)
      await sendButton.click()
      
      // Wait for message to appear in the message list
      await page.waitForSelector(`[data-testid="message"]:has-text("Performance test message ${i}")`)
      
      const latency = Date.now() - startTime
      measurements.push(latency)
      
      // Clear input for next message
      await messageInput.clear()
      
      // Small delay between messages
      await page.waitForTimeout(100)
    }
    
    const averageLatency = measurements.reduce((a, b) => a + b, 0) / measurements.length
    const maxLatency = Math.max(...measurements)
    
    // Assert P50 latency is under 150ms (same region requirement)
    expect(averageLatency).toBeLessThan(150)
    
    // Assert no message takes longer than 350ms (P95 requirement)
    expect(maxLatency).toBeLessThan(350)
    
    console.log(`Message send - Average: ${averageLatency}ms, Max: ${maxLatency}ms`)
  })

  test('conversation switching performance', async ({ page }) => {
    await page.goto('/chat')
    await page.waitForSelector('[data-testid="conversation-list"]')
    
    const conversations = page.locator('[data-testid="conversation-item"]')
    const conversationCount = await conversations.count()
    
    if (conversationCount < 2) {
      // Skip test if not enough conversations
      test.skip()
    }
    
    const switchTimes = []
    
    for (let i = 0; i < Math.min(conversationCount, 5); i++) {
      const startTime = Date.now()
      
      await conversations.nth(i).click()
      
      // Wait for messages to load
      await page.waitForSelector('[data-testid="message-list"]')
      await page.waitForLoadState('networkidle')
      
      const switchTime = Date.now() - startTime
      switchTimes.push(switchTime)
    }
    
    const averageSwitchTime = switchTimes.reduce((a, b) => a + b, 0) / switchTimes.length
    
    // Conversation switching should be fast
    expect(averageSwitchTime).toBeLessThan(500)
    
    console.log(`Conversation switch - Average: ${averageSwitchTime}ms`)
  })

  test('search performance', async ({ page }) => {
    await page.goto('/chat')
    
    // Open search
    await page.click('[data-testid="search-button"]')
    await page.waitForSelector('[data-testid="search-modal"]')
    
    const searchInput = page.locator('[data-testid="search-input"]')
    const searchQuery = 'test message'
    
    const startTime = Date.now()
    
    await searchInput.fill(searchQuery)
    
    // Wait for search results
    await page.waitForSelector('[data-testid="search-results"]')
    await page.waitForLoadState('networkidle')
    
    const searchTime = Date.now() - startTime
    
    // Search should complete within 300ms (P95 requirement)
    expect(searchTime).toBeLessThan(300)
    
    console.log(`Search response time: ${searchTime}ms`)
  })

  test('virtual scrolling performance', async ({ page }) => {
    await page.goto('/chat')
    await page.waitForSelector('[data-testid="message-list"]')
    
    const messageList = page.locator('[data-testid="message-list"]')
    
    // Measure scrolling performance
    const startTime = Date.now()
    
    // Scroll to top to load more messages
    await messageList.evaluate(el => {
      el.scrollTop = 0
    })
    
    // Wait for new messages to load
    await page.waitForTimeout(1000)
    
    // Scroll to bottom
    await messageList.evaluate(el => {
      el.scrollTop = el.scrollHeight
    })
    
    const scrollTime = Date.now() - startTime
    
    // Scrolling should be smooth and fast
    expect(scrollTime).toBeLessThan(1000)
    
    // Check for frame drops during scrolling
    const fps = await page.evaluate(() => {
      return new Promise((resolve) => {
        let frames = 0
        const startTime = performance.now()
        
        function countFrame() {
          frames++
          if (performance.now() - startTime < 1000) {
            requestAnimationFrame(countFrame)
          } else {
            resolve(frames)
          }
        }
        
        requestAnimationFrame(countFrame)
      })
    })
    
    // Should maintain at least 30 FPS during scrolling
    expect(fps).toBeGreaterThan(30)
    
    console.log(`Scroll performance: ${scrollTime}ms, FPS: ${fps}`)
  })

  test('memory usage during extended chat session', async ({ page }) => {
    await page.goto('/chat')
    
    // Get initial memory usage
    const initialMemory = await page.evaluate(() => {
      return (performance as any).memory?.usedJSHeapSize || 0
    })
    
    // Simulate extended chat session
    const messageInput = page.locator('[data-testid="message-input"]')
    const sendButton = page.locator('[data-testid="send-button"]')
    
    // Send 50 messages to simulate extended usage
    for (let i = 0; i < 50; i++) {
      await messageInput.fill(`Extended session message ${i}`)
      await sendButton.click()
      await page.waitForTimeout(50) // Small delay
      await messageInput.clear()
    }
    
    // Force garbage collection if available
    await page.evaluate(() => {
      if ((window as any).gc) {
        (window as any).gc()
      }
    })
    
    // Get final memory usage
    const finalMemory = await page.evaluate(() => {
      return (performance as any).memory?.usedJSHeapSize || 0
    })
    
    const memoryIncrease = finalMemory - initialMemory
    const memoryIncreaseMB = memoryIncrease / 1024 / 1024
    
    // Memory increase should be reasonable (less than 50MB for 50 messages)
    expect(memoryIncreaseMB).toBeLessThan(50)
    
    console.log(`Memory increase: ${memoryIncreaseMB.toFixed(2)}MB`)
  })
})