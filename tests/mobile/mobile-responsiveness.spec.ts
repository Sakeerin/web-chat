/**
 * Mobile Responsiveness Testing
 * Tests the application's behavior and layout on mobile devices
 */

import { test, expect, Page } from '@playwright/test';

const MOBILE_VIEWPORTS = {
  'iPhone SE': { width: 375, height: 667 },
  'iPhone 12': { width: 390, height: 844 },
  'iPhone 12 Pro Max': { width: 428, height: 926 },
  'Samsung Galaxy S21': { width: 384, height: 854 },
  'Samsung Galaxy Note 20': { width: 412, height: 915 },
  'Google Pixel 5': { width: 393, height: 851 }
};

const TABLET_VIEWPORTS = {
  'iPad': { width: 768, height: 1024 },
  'iPad Pro 11': { width: 834, height: 1194 },
  'iPad Pro 12.9': { width: 1024, height: 1366 },
  'Samsung Galaxy Tab': { width: 800, height: 1280 }
};

test.describe('Mobile Responsiveness', () => {
  
  test.describe('Mobile Layout Tests', () => {
    Object.entries(MOBILE_VIEWPORTS).forEach(([deviceName, viewport]) => {
      test(`Layout adaptation on ${deviceName}`, async ({ page }) => {
        await page.setViewportSize(viewport);
        await page.goto('/chat');
        
        // Test mobile header
        await expect(page.locator('[data-testid="mobile-header"]')).toBeVisible();
        
        // Test hamburger menu
        const hamburgerMenu = page.locator('[data-testid="hamburger-menu"]');
        await expect(hamburgerMenu).toBeVisible();
        
        // Test sidebar is hidden by default on mobile
        const sidebar = page.locator('[data-testid="chat-sidebar"]');
        const sidebarVisible = await sidebar.isVisible();
        expect(sidebarVisible).toBe(false);
        
        // Test main chat area takes full width
        const mainArea = page.locator('[data-testid="chat-main"]');
        const mainAreaWidth = await mainArea.boundingBox();
        expect(mainAreaWidth?.width).toBeCloseTo(viewport.width, 10);
        
        // Test bottom navigation (if present)
        const bottomNav = page.locator('[data-testid="bottom-navigation"]');
        if (await bottomNav.isVisible()) {
          const bottomNavBox = await bottomNav.boundingBox();
          expect(bottomNavBox?.y).toBeGreaterThan(viewport.height - 100);
        }
      });
    });
  });

  test.describe('Tablet Layout Tests', () => {
    Object.entries(TABLET_VIEWPORTS).forEach(([deviceName, viewport]) => {
      test(`Layout adaptation on ${deviceName}`, async ({ page }) => {
        await page.setViewportSize(viewport);
        await page.goto('/chat');
        
        // Test tablet layout (sidebar might be visible or collapsible)
        const sidebar = page.locator('[data-testid="chat-sidebar"]');
        const mainArea = page.locator('[data-testid="chat-main"]');
        
        await expect(mainArea).toBeVisible();
        
        // On larger tablets, sidebar should be visible
        if (viewport.width >= 1024) {
          await expect(sidebar).toBeVisible();
        }
        
        // Test proper spacing and proportions
        const sidebarBox = await sidebar.boundingBox();
        const mainAreaBox = await mainArea.boundingBox();
        
        if (sidebarBox && mainAreaBox) {
          expect(sidebarBox.width + mainAreaBox.width).toBeLessThanOrEqual(viewport.width + 10);
        }
      });
    });
  });

  test('Touch interactions and gestures', async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORTS['iPhone 12']);
    await page.goto('/chat');
    
    // Test tap interactions
    const hamburgerMenu = page.locator('[data-testid="hamburger-menu"]');
    await hamburgerMenu.tap();
    
    // Sidebar should slide in
    const sidebar = page.locator('[data-testid="chat-sidebar"]');
    await expect(sidebar).toBeVisible();
    
    // Test swipe to close sidebar (simulate with drag)
    const sidebarBox = await sidebar.boundingBox();
    if (sidebarBox) {
      await page.mouse.move(sidebarBox.x + 10, sidebarBox.y + 100);
      await page.mouse.down();
      await page.mouse.move(sidebarBox.x - 200, sidebarBox.y + 100);
      await page.mouse.up();
      
      // Sidebar should close
      await expect(sidebar).not.toBeVisible();
    }
    
    // Test long press on message (context menu)
    await page.goto('/chat/conversation/1');
    const message = page.locator('[data-testid="message"]').first();
    if (await message.isVisible()) {
      await message.tap({ timeout: 1000 });
      
      // Context menu should appear
      await expect(page.locator('[data-testid="message-context-menu"]')).toBeVisible();
    }
  });

  test('Virtual keyboard handling', async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORTS['iPhone 12']);
    await page.goto('/chat/conversation/1');
    
    // Test message input focus
    const messageInput = page.locator('[data-testid="message-input"]');
    await messageInput.tap();
    
    // Simulate virtual keyboard appearance (reduce viewport height)
    await page.setViewportSize({ 
      width: MOBILE_VIEWPORTS['iPhone 12'].width, 
      height: MOBILE_VIEWPORTS['iPhone 12'].height - 300 
    });
    
    // Message input should remain visible and accessible
    await expect(messageInput).toBeVisible();
    
    // Chat area should adjust to accommodate keyboard
    const chatArea = page.locator('[data-testid="message-list"]');
    const chatAreaBox = await chatArea.boundingBox();
    const inputBox = await messageInput.boundingBox();
    
    if (chatAreaBox && inputBox) {
      expect(chatAreaBox.y + chatAreaBox.height).toBeLessThan(inputBox.y);
    }
  });

  test('Orientation changes', async ({ page }) => {
    // Start in portrait
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/chat');
    
    // Verify portrait layout
    const portraitSidebar = page.locator('[data-testid="chat-sidebar"]');
    expect(await portraitSidebar.isVisible()).toBe(false);
    
    // Switch to landscape
    await page.setViewportSize({ width: 844, height: 390 });
    await page.waitForTimeout(500); // Allow layout to adjust
    
    // In landscape, sidebar might become visible on larger screens
    const landscapeSidebar = page.locator('[data-testid="chat-sidebar"]');
    const sidebarVisible = await landscapeSidebar.isVisible();
    
    // Test that main content adapts properly
    const mainArea = page.locator('[data-testid="chat-main"]');
    await expect(mainArea).toBeVisible();
    
    // Test message input remains accessible
    const messageInput = page.locator('[data-testid="message-input"]');
    await expect(messageInput).toBeVisible();
  });

  test('Font scaling and accessibility', async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORTS['iPhone 12']);
    
    // Test with different font sizes
    const fontSizes = ['12px', '16px', '20px', '24px'];
    
    for (const fontSize of fontSizes) {
      await page.addStyleTag({
        content: `* { font-size: ${fontSize} !important; }`
      });
      
      await page.goto('/chat');
      
      // Verify layout doesn't break with larger fonts
      const messageInput = page.locator('[data-testid="message-input"]');
      await expect(messageInput).toBeVisible();
      
      const sendButton = page.locator('[data-testid="send-button"]');
      await expect(sendButton).toBeVisible();
      
      // Verify text doesn't overflow containers
      const messages = page.locator('[data-testid="message"]');
      const messageCount = await messages.count();
      
      for (let i = 0; i < Math.min(messageCount, 3); i++) {
        const message = messages.nth(i);
        const messageBox = await message.boundingBox();
        if (messageBox) {
          expect(messageBox.width).toBeLessThanOrEqual(MOBILE_VIEWPORTS['iPhone 12'].width);
        }
      }
    }
  });

  test('Touch target sizes', async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORTS['iPhone 12']);
    await page.goto('/chat');
    
    // Test minimum touch target sizes (44px recommended)
    const touchTargets = [
      '[data-testid="hamburger-menu"]',
      '[data-testid="send-button"]',
      '[data-testid="attach-file-button"]',
      '[data-testid="user-menu"]'
    ];
    
    for (const selector of touchTargets) {
      const element = page.locator(selector);
      if (await element.isVisible()) {
        const box = await element.boundingBox();
        if (box) {
          expect(box.width).toBeGreaterThanOrEqual(44);
          expect(box.height).toBeGreaterThanOrEqual(44);
        }
      }
    }
  });

  test('Scroll behavior and performance', async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORTS['iPhone 12']);
    await page.goto('/chat/conversation/1');
    
    // Test smooth scrolling in message list
    const messageList = page.locator('[data-testid="message-list"]');
    await expect(messageList).toBeVisible();
    
    // Simulate scroll to top
    await messageList.evaluate(el => {
      el.scrollTo({ top: 0, behavior: 'smooth' });
    });
    
    // Test scroll to bottom
    await messageList.evaluate(el => {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    });
    
    // Test momentum scrolling (iOS-specific)
    const scrollStyle = await messageList.evaluate(el => 
      window.getComputedStyle(el).webkitOverflowScrolling
    );
    
    // Should have momentum scrolling on iOS
    if (await page.evaluate(() => /iPad|iPhone|iPod/.test(navigator.userAgent))) {
      expect(scrollStyle).toBe('touch');
    }
  });

  test('Media queries and breakpoints', async ({ page }) => {
    const breakpoints = [
      { width: 320, height: 568, name: 'small-mobile' },
      { width: 375, height: 667, name: 'mobile' },
      { width: 768, height: 1024, name: 'tablet' },
      { width: 1024, height: 768, name: 'desktop' }
    ];
    
    for (const breakpoint of breakpoints) {
      await page.setViewportSize(breakpoint);
      await page.goto('/chat');
      
      // Test CSS media query application
      const body = page.locator('body');
      const computedStyle = await body.evaluate(el => {
        const style = window.getComputedStyle(el);
        return {
          fontSize: style.fontSize,
          padding: style.padding,
          margin: style.margin
        };
      });
      
      // Verify styles are appropriate for breakpoint
      expect(computedStyle.fontSize).toBeTruthy();
      
      // Test responsive components
      const chatLayout = page.locator('[data-testid="chat-layout"]');
      const layoutClass = await chatLayout.getAttribute('class');
      
      if (breakpoint.width < 768) {
        expect(layoutClass).toContain('mobile');
      } else if (breakpoint.width < 1024) {
        expect(layoutClass).toContain('tablet');
      } else {
        expect(layoutClass).toContain('desktop');
      }
    }
  });

  test('Performance on mobile devices', async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORTS['iPhone 12']);
    
    // Simulate slower mobile CPU
    const client = await page.context().newCDPSession(page);
    await client.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    
    const startTime = Date.now();
    await page.goto('/chat');
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;
    
    // Should load within reasonable time even on slower mobile
    expect(loadTime).toBeLessThan(8000);
    
    // Test scroll performance
    const messageList = page.locator('[data-testid="message-list"]');
    await expect(messageList).toBeVisible();
    
    // Measure scroll performance
    const scrollStartTime = Date.now();
    await messageList.evaluate(el => {
      for (let i = 0; i < 10; i++) {
        el.scrollTop += 100;
      }
    });
    const scrollTime = Date.now() - scrollStartTime;
    
    // Scrolling should be responsive
    expect(scrollTime).toBeLessThan(1000);
    
    // Reset CPU throttling
    await client.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  });

  test('Network conditions simulation', async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORTS['iPhone 12']);
    
    // Simulate slow 3G connection
    const client = await page.context().newCDPSession(page);
    await client.send('Network.emulateNetworkConditions', {
      offline: false,
      downloadThroughput: 500 * 1024 / 8, // 500 kbps
      uploadThroughput: 500 * 1024 / 8,
      latency: 400 // 400ms latency
    });
    
    const startTime = Date.now();
    await page.goto('/chat');
    
    // Should show loading states appropriately
    const loadingIndicator = page.locator('[data-testid="loading-indicator"]');
    if (await loadingIndicator.isVisible()) {
      await expect(loadingIndicator).not.toBeVisible({ timeout: 10000 });
    }
    
    const loadTime = Date.now() - startTime;
    
    // Should handle slow connections gracefully
    expect(loadTime).toBeLessThan(15000);
    
    // Test offline handling
    await client.send('Network.emulateNetworkConditions', {
      offline: true,
      downloadThroughput: 0,
      uploadThroughput: 0,
      latency: 0
    });
    
    // Should show offline indicator
    await expect(page.locator('[data-testid="offline-indicator"]')).toBeVisible();
    
    // Reset network conditions
    await client.send('Network.emulateNetworkConditions', {
      offline: false,
      downloadThroughput: -1,
      uploadThroughput: -1,
      latency: 0
    });
  });
});