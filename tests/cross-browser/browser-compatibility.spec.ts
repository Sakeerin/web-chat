/**
 * Cross-Browser Compatibility Tests
 * Ensures the application works consistently across different browsers
 */

import { test, expect, Page } from '@playwright/test';

test.describe('Cross-Browser Compatibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('Basic application loading and rendering', async ({ page, browserName }) => {
    // Test basic page load
    await expect(page).toHaveTitle(/Telegram Web Chat/);
    
    // Test CSS loading
    const body = page.locator('body');
    await expect(body).toHaveCSS('font-family', /Inter|system-ui|sans-serif/);
    
    // Test JavaScript execution
    await expect(page.locator('[data-testid="app-root"]')).toBeVisible();
    
    // Browser-specific checks
    if (browserName === 'webkit') {
      // Safari-specific tests
      await expect(page.locator('input[type="password"]')).toBeVisible();
    }
    
    if (browserName === 'firefox') {
      // Firefox-specific tests
      const userAgent = await page.evaluate(() => navigator.userAgent);
      expect(userAgent).toContain('Firefox');
    }
  });

  test('Authentication forms compatibility', async ({ page }) => {
    await page.goto('/login');
    
    // Test form elements
    const emailInput = page.locator('[data-testid="email-input"]');
    const passwordInput = page.locator('[data-testid="password-input"]');
    const loginButton = page.locator('[data-testid="login-button"]');
    
    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(loginButton).toBeVisible();
    
    // Test input types
    await expect(emailInput).toHaveAttribute('type', 'email');
    await expect(passwordInput).toHaveAttribute('type', 'password');
    
    // Test form validation
    await emailInput.fill('invalid-email');
    await passwordInput.fill('123');
    await loginButton.click();
    
    // Should show validation errors
    await expect(page.locator('[data-testid="email-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="password-error"]')).toBeVisible();
  });

  test('WebSocket connection compatibility', async ({ page }) => {
    // Mock successful login
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    
    // Mock authentication response
    await page.route('**/api/auth/login', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: { id: '1', email: 'test@example.com', username: 'testuser' },
          accessToken: 'mock-token',
          refreshToken: 'mock-refresh-token'
        })
      });
    });
    
    await page.click('[data-testid="login-button"]');
    
    // Wait for chat interface
    await expect(page).toHaveURL('/chat');
    
    // Test WebSocket connection indicator
    await expect(page.locator('[data-testid="connection-status"]')).toHaveText(/Connected|Online/);
  });

  test('Media upload compatibility', async ({ page }) => {
    // Navigate to chat (mock authentication)
    await page.goto('/chat');
    
    // Test file input support
    const fileInput = page.locator('[data-testid="file-input"]');
    await expect(fileInput).toHaveAttribute('type', 'file');
    
    // Test drag and drop support
    const dropZone = page.locator('[data-testid="drop-zone"]');
    await expect(dropZone).toBeVisible();
    
    // Test supported file types
    const acceptedTypes = await fileInput.getAttribute('accept');
    expect(acceptedTypes).toContain('image/*');
    expect(acceptedTypes).toContain('video/*');
  });

  test('Responsive design compatibility', async ({ page }) => {
    // Test desktop layout
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/chat');
    
    const sidebar = page.locator('[data-testid="chat-sidebar"]');
    const mainArea = page.locator('[data-testid="chat-main"]');
    
    await expect(sidebar).toBeVisible();
    await expect(mainArea).toBeVisible();
    
    // Test tablet layout
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(500); // Allow layout to adjust
    
    // Sidebar might be hidden or collapsed on tablet
    const sidebarVisible = await sidebar.isVisible();
    if (!sidebarVisible) {
      // Should have hamburger menu
      await expect(page.locator('[data-testid="menu-toggle"]')).toBeVisible();
    }
    
    // Test mobile layout
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);
    
    // Should have mobile-optimized layout
    await expect(page.locator('[data-testid="mobile-header"]')).toBeVisible();
  });

  test('Accessibility features compatibility', async ({ page }) => {
    await page.goto('/chat');
    
    // Test keyboard navigation
    await page.keyboard.press('Tab');
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(['BUTTON', 'INPUT', 'A']).toContain(focusedElement);
    
    // Test ARIA attributes
    const chatList = page.locator('[data-testid="conversation-list"]');
    await expect(chatList).toHaveAttribute('role', 'list');
    
    const messageInput = page.locator('[data-testid="message-input"]');
    await expect(messageInput).toHaveAttribute('aria-label');
    
    // Test screen reader support
    const liveRegion = page.locator('[aria-live="polite"]');
    await expect(liveRegion).toBeAttached();
  });

  test('Performance and loading compatibility', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/chat');
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    
    // Should load within reasonable time (adjust based on browser)
    expect(loadTime).toBeLessThan(5000);
    
    // Test critical resources loaded
    const criticalCSS = page.locator('link[rel="stylesheet"]');
    await expect(criticalCSS.first()).toBeAttached();
    
    // Test JavaScript execution
    const appReady = await page.evaluate(() => {
      return window.document.readyState === 'complete';
    });
    expect(appReady).toBe(true);
  });

  test('Local storage and session compatibility', async ({ page }) => {
    await page.goto('/login');
    
    // Test localStorage support
    const localStorageSupported = await page.evaluate(() => {
      try {
        localStorage.setItem('test', 'value');
        const value = localStorage.getItem('test');
        localStorage.removeItem('test');
        return value === 'value';
      } catch {
        return false;
      }
    });
    expect(localStorageSupported).toBe(true);
    
    // Test sessionStorage support
    const sessionStorageSupported = await page.evaluate(() => {
      try {
        sessionStorage.setItem('test', 'value');
        const value = sessionStorage.getItem('test');
        sessionStorage.removeItem('test');
        return value === 'value';
      } catch {
        return false;
      }
    });
    expect(sessionStorageSupported).toBe(true);
  });

  test('CSS Grid and Flexbox compatibility', async ({ page }) => {
    await page.goto('/chat');
    
    // Test CSS Grid support
    const gridSupported = await page.evaluate(() => {
      const div = document.createElement('div');
      div.style.display = 'grid';
      return div.style.display === 'grid';
    });
    expect(gridSupported).toBe(true);
    
    // Test Flexbox support
    const flexSupported = await page.evaluate(() => {
      const div = document.createElement('div');
      div.style.display = 'flex';
      return div.style.display === 'flex';
    });
    expect(flexSupported).toBe(true);
    
    // Test actual layout
    const chatLayout = page.locator('[data-testid="chat-layout"]');
    const displayValue = await chatLayout.evaluate(el => 
      window.getComputedStyle(el).display
    );
    expect(['grid', 'flex']).toContain(displayValue);
  });

  test('WebRTC and media API compatibility', async ({ page }) => {
    // Test getUserMedia support (for future voice/video features)
    const mediaSupported = await page.evaluate(async () => {
      return 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices;
    });
    
    if (mediaSupported) {
      // Test media permissions (without actually requesting)
      const permissionsSupported = await page.evaluate(() => {
        return 'permissions' in navigator;
      });
      expect(permissionsSupported).toBe(true);
    }
    
    // Test WebRTC support
    const webRTCSupported = await page.evaluate(() => {
      return 'RTCPeerConnection' in window;
    });
    expect(webRTCSupported).toBe(true);
  });

  test('Service Worker and PWA compatibility', async ({ page }) => {
    // Test Service Worker support
    const swSupported = await page.evaluate(() => {
      return 'serviceWorker' in navigator;
    });
    expect(swSupported).toBe(true);
    
    // Test Web App Manifest
    const manifest = page.locator('link[rel="manifest"]');
    await expect(manifest).toBeAttached();
    
    // Test PWA installation criteria
    const beforeInstallPrompt = await page.evaluate(() => {
      return 'onbeforeinstallprompt' in window;
    });
    
    // Note: beforeinstallprompt is Chromium-specific
    if (await page.evaluate(() => navigator.userAgent.includes('Chrome'))) {
      expect(beforeInstallPrompt).toBe(true);
    }
  });
});