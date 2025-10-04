/**
 * Security Penetration Testing
 * Tests application security against common vulnerabilities and attack vectors
 */

import { test, expect, Page, Request } from '@playwright/test';
import { faker } from '@faker-js/faker';

test.describe('Security Penetration Testing', () => {

  test.describe('Authentication Security', () => {
    test('SQL injection attempts in login form', async ({ page }) => {
      await page.goto('/login');

      const sqlInjectionPayloads = [
        "' OR '1'='1",
        "'; DROP TABLE users; --",
        "' UNION SELECT * FROM users --",
        "admin'--",
        "' OR 1=1#",
        "') OR ('1'='1",
        "1' OR '1'='1')) /*"
      ];

      for (const payload of sqlInjectionPayloads) {
        await page.fill('[data-testid="email-input"]', payload);
        await page.fill('[data-testid="password-input"]', payload);
        
        // Capture the request
        const [request] = await Promise.all([
          page.waitForRequest('**/api/auth/login'),
          page.click('[data-testid="login-button"]')
        ]);

        // Should not bypass authentication
        const response = await request.response();
        expect(response?.status()).not.toBe(200);
        
        // Should show appropriate error message
        await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
        
        // Clear form for next test
        await page.fill('[data-testid="email-input"]', '');
        await page.fill('[data-testid="password-input"]', '');
      }
    });

    test('XSS attempts in input fields', async ({ page }) => {
      await page.goto('/register');

      const xssPayloads = [
        '<script>alert("XSS")</script>',
        '<img src="x" onerror="alert(\'XSS\')">',
        'javascript:alert("XSS")',
        '<svg onload="alert(\'XSS\')">',
        '"><script>alert("XSS")</script>',
        '<iframe src="javascript:alert(\'XSS\')"></iframe>',
        '<body onload="alert(\'XSS\')">',
        '<input type="image" src="x" onerror="alert(\'XSS\')">'
      ];

      for (const payload of xssPayloads) {
        // Test in various input fields
        await page.fill('[data-testid="name-input"]', payload);
        await page.fill('[data-testid="username-input"]', payload);
        await page.fill('[data-testid="email-input"]', `test${Date.now()}@example.com`);
        await page.fill('[data-testid="password-input"]', 'ValidPassword123!');
        await page.fill('[data-testid="confirm-password-input"]', 'ValidPassword123!');

        await page.click('[data-testid="register-button"]');

        // Check that XSS payload is not executed
        const alertDialogs: string[] = [];
        page.on('dialog', dialog => {
          alertDialogs.push(dialog.message());
          dialog.dismiss();
        });

        await page.waitForTimeout(1000);
        expect(alertDialogs).toHaveLength(0);

        // Verify content is properly escaped
        if (await page.locator('[data-testid="success-message"]').isVisible()) {
          const displayedName = await page.locator('[data-testid="user-name"]').textContent();
          expect(displayedName).not.toContain('<script>');
          expect(displayedName).not.toContain('javascript:');
        }

        // Reset form
        await page.reload();
      }
    });

    test('Brute force protection', async ({ page }) => {
      await page.goto('/login');

      const email = 'test@example.com';
      const wrongPassword = 'wrongpassword';

      // Attempt multiple failed logins
      for (let i = 0; i < 10; i++) {
        await page.fill('[data-testid="email-input"]', email);
        await page.fill('[data-testid="password-input"]', wrongPassword);
        
        const startTime = Date.now();
        await page.click('[data-testid="login-button"]');
        
        // Wait for response
        await page.waitForSelector('[data-testid="error-message"]', { timeout: 10000 });
        const endTime = Date.now();
        const responseTime = endTime - startTime;

        console.log(`Attempt ${i + 1}: ${responseTime}ms`);

        // After several attempts, should implement progressive delays
        if (i > 5) {
          expect(responseTime).toBeGreaterThan(1000 * (i - 5)); // Progressive delay
        }

        // Should eventually show rate limiting message
        if (i > 7) {
          const errorMessage = await page.locator('[data-testid="error-message"]').textContent();
          expect(errorMessage?.toLowerCase()).toContain('rate limit');
        }

        await page.waitForTimeout(100);
      }
    });

    test('Session fixation and hijacking protection', async ({ page, context }) => {
      // Test session fixation
      await page.goto('/login');
      
      // Get initial session cookie
      const initialCookies = await context.cookies();
      const initialSessionCookie = initialCookies.find(c => c.name.includes('session'));

      // Login
      await page.fill('[data-testid="email-input"]', 'test@example.com');
      await page.fill('[data-testid="password-input"]', 'password123');
      await page.click('[data-testid="login-button"]');

      // Get post-login cookies
      const postLoginCookies = await context.cookies();
      const postLoginSessionCookie = postLoginCookies.find(c => c.name.includes('session'));

      // Session ID should change after login (prevents session fixation)
      if (initialSessionCookie && postLoginSessionCookie) {
        expect(postLoginSessionCookie.value).not.toBe(initialSessionCookie.value);
      }

      // Test session security attributes
      const sessionCookie = postLoginCookies.find(c => c.name.includes('session') || c.name.includes('token'));
      if (sessionCookie) {
        expect(sessionCookie.httpOnly).toBe(true);
        expect(sessionCookie.secure).toBe(true);
        expect(sessionCookie.sameSite).toBe('Strict');
      }
    });
  });

  test.describe('Input Validation and Sanitization', () => {
    test('Message content XSS protection', async ({ page }) => {
      // Mock login
      await page.goto('/chat');
      
      const xssPayloads = [
        '<script>alert("Message XSS")</script>',
        '<img src="x" onerror="alert(\'Message XSS\')">',
        '<svg onload="alert(\'Message XSS\')">',
        'javascript:alert("Message XSS")',
        '<iframe src="javascript:alert(\'Message XSS\')"></iframe>'
      ];

      for (const payload of xssPayloads) {
        await page.fill('[data-testid="message-input"]', payload);
        await page.click('[data-testid="send-button"]');

        // Wait for message to appear
        await page.waitForTimeout(1000);

        // Check that XSS is not executed
        const alertDialogs: string[] = [];
        page.on('dialog', dialog => {
          alertDialogs.push(dialog.message());
          dialog.dismiss();
        });

        expect(alertDialogs).toHaveLength(0);

        // Verify message content is properly escaped
        const messageElements = await page.locator('[data-testid="message"]').all();
        for (const element of messageElements) {
          const innerHTML = await element.innerHTML();
          expect(innerHTML).not.toContain('<script>');
          expect(innerHTML).not.toContain('javascript:');
          expect(innerHTML).not.toContain('onerror=');
          expect(innerHTML).not.toContain('onload=');
        }
      }
    });

    test('File upload security validation', async ({ page }) => {
      await page.goto('/chat');

      // Test malicious file uploads
      const maliciousFiles = [
        { name: 'malware.exe', content: 'MZ\x90\x00\x03\x00\x00\x00' }, // PE header
        { name: 'script.js', content: 'alert("XSS from file")' },
        { name: 'shell.php', content: '<?php system($_GET["cmd"]); ?>' },
        { name: 'large.txt', content: 'A'.repeat(100 * 1024 * 1024) }, // 100MB file
        { name: '../../../etc/passwd', content: 'path traversal attempt' },
        { name: 'image.jpg.exe', content: 'double extension attack' }
      ];

      for (const file of maliciousFiles) {
        // Create temporary file
        const buffer = Buffer.from(file.content);
        
        try {
          await page.setInputFiles('[data-testid="file-input"]', {
            name: file.name,
            mimeType: 'application/octet-stream',
            buffer: buffer
          });

          // Should show appropriate error for malicious files
          const errorMessage = await page.locator('[data-testid="upload-error"]');
          if (await errorMessage.isVisible()) {
            const errorText = await errorMessage.textContent();
            expect(errorText?.toLowerCase()).toMatch(/invalid|not allowed|too large|security/);
          }

          // File should not be uploaded successfully
          const uploadSuccess = page.locator('[data-testid="upload-success"]');
          expect(await uploadSuccess.isVisible()).toBe(false);

        } catch (error) {
          // File rejection is expected for malicious files
          console.log(`File ${file.name} properly rejected: ${error}`);
        }
      }
    });

    test('CSRF protection', async ({ page, context }) => {
      await page.goto('/chat');

      // Test CSRF token presence
      const csrfToken = await page.evaluate(() => {
        const metaTag = document.querySelector('meta[name="csrf-token"]');
        return metaTag?.getAttribute('content');
      });

      // CSRF token should be present
      expect(csrfToken).toBeTruthy();

      // Test API requests include CSRF protection
      let csrfHeaderPresent = false;
      
      page.on('request', request => {
        if (request.method() === 'POST' || request.method() === 'PUT' || request.method() === 'DELETE') {
          const headers = request.headers();
          if (headers['x-csrf-token'] || headers['x-xsrf-token']) {
            csrfHeaderPresent = true;
          }
        }
      });

      // Trigger a POST request
      await page.fill('[data-testid="message-input"]', 'CSRF test message');
      await page.click('[data-testid="send-button"]');

      await page.waitForTimeout(1000);
      expect(csrfHeaderPresent).toBe(true);
    });
  });

  test.describe('Authorization and Access Control', () => {
    test('Unauthorized API access attempts', async ({ page }) => {
      // Test accessing protected endpoints without authentication
      const protectedEndpoints = [
        '/api/conversations',
        '/api/messages',
        '/api/users/profile',
        '/api/admin/users',
        '/api/upload/presigned-url'
      ];

      for (const endpoint of protectedEndpoints) {
        const response = await page.request.get(endpoint);
        
        // Should return 401 Unauthorized
        expect(response.status()).toBe(401);
        
        const responseBody = await response.json();
        expect(responseBody.error).toBeTruthy();
      }
    });

    test('Privilege escalation attempts', async ({ page }) => {
      // Mock regular user login
      await page.goto('/login');
      
      // Mock authentication with regular user
      await page.route('**/api/auth/login', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            user: { id: '2', email: 'user@example.com', username: 'regularuser', role: 'user' },
            accessToken: 'user-token'
          })
        });
      });

      await page.fill('[data-testid="email-input"]', 'user@example.com');
      await page.fill('[data-testid="password-input"]', 'password123');
      await page.click('[data-testid="login-button"]');

      // Try to access admin endpoints
      const adminEndpoints = [
        '/api/admin/users',
        '/api/admin/reports',
        '/api/admin/analytics',
        '/admin'
      ];

      for (const endpoint of adminEndpoints) {
        if (endpoint.startsWith('/admin')) {
          // Try to navigate to admin page
          await page.goto(endpoint);
          
          // Should be redirected or show access denied
          const currentUrl = page.url();
          expect(currentUrl).not.toContain('/admin');
          
          // Should show access denied message
          const accessDenied = page.locator('[data-testid="access-denied"]');
          if (await accessDenied.isVisible()) {
            expect(await accessDenied.textContent()).toContain('Access denied');
          }
        } else {
          // Try API endpoint
          const response = await page.request.get(endpoint);
          expect(response.status()).toBe(403); // Forbidden
        }
      }
    });

    test('Data access control validation', async ({ page }) => {
      // Test that users can only access their own data
      await page.goto('/chat');

      // Mock user 1 authentication
      await page.route('**/api/auth/login', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            user: { id: '1', email: 'user1@example.com', username: 'user1' },
            accessToken: 'user1-token'
          })
        });
      });

      // Try to access another user's data
      const unauthorizedRequests = [
        '/api/users/2/profile',
        '/api/conversations/user/2',
        '/api/messages/conversation/other-user-conversation'
      ];

      for (const endpoint of unauthorizedRequests) {
        const response = await page.request.get(endpoint);
        
        // Should return 403 Forbidden or 404 Not Found
        expect([403, 404]).toContain(response.status());
      }
    });
  });

  test.describe('Data Protection and Privacy', () => {
    test('Sensitive data exposure in responses', async ({ page }) => {
      await page.goto('/chat');

      // Intercept API responses and check for sensitive data
      const sensitiveDataPatterns = [
        /password/i,
        /secret/i,
        /private.*key/i,
        /api.*key/i,
        /token.*secret/i,
        /database.*url/i,
        /connection.*string/i
      ];

      page.on('response', async response => {
        if (response.url().includes('/api/')) {
          try {
            const responseBody = await response.text();
            
            for (const pattern of sensitiveDataPatterns) {
              expect(responseBody).not.toMatch(pattern);
            }
          } catch (error) {
            // Non-JSON responses are okay
          }
        }
      });

      // Trigger various API calls
      await page.click('[data-testid="user-menu"]');
      await page.click('[data-testid="profile-settings"]');
      await page.goto('/settings');
      await page.goto('/chat');
    });

    test('Information disclosure through error messages', async ({ page }) => {
      await page.goto('/login');

      // Test various error conditions
      const errorTestCases = [
        { email: 'nonexistent@example.com', password: 'password123' },
        { email: 'invalid-email', password: 'password123' },
        { email: '', password: '' },
        { email: 'test@example.com', password: '' }
      ];

      for (const testCase of errorTestCases) {
        await page.fill('[data-testid="email-input"]', testCase.email);
        await page.fill('[data-testid="password-input"]', testCase.password);
        await page.click('[data-testid="login-button"]');

        const errorMessage = await page.locator('[data-testid="error-message"]').textContent();
        
        // Error messages should not reveal sensitive information
        expect(errorMessage?.toLowerCase()).not.toContain('database');
        expect(errorMessage?.toLowerCase()).not.toContain('sql');
        expect(errorMessage?.toLowerCase()).not.toContain('server error');
        expect(errorMessage?.toLowerCase()).not.toContain('stack trace');
        expect(errorMessage?.toLowerCase()).not.toContain('internal');
        
        // Should be generic error messages
        expect(errorMessage?.toLowerCase()).toMatch(/invalid|incorrect|required|format/);
      }
    });

    test('Content Security Policy validation', async ({ page }) => {
      await page.goto('/chat');

      // Check CSP headers
      const response = await page.request.get('/chat');
      const cspHeader = response.headers()['content-security-policy'];
      
      expect(cspHeader).toBeTruthy();
      
      // CSP should restrict inline scripts
      expect(cspHeader).toContain("script-src");
      expect(cspHeader).not.toContain("'unsafe-inline'");
      
      // Should restrict object sources
      expect(cspHeader).toContain("object-src 'none'");
      
      // Should have frame ancestors protection
      expect(cspHeader).toContain("frame-ancestors");
    });
  });

  test.describe('Network Security', () => {
    test('HTTPS enforcement', async ({ page }) => {
      // Test that HTTP requests are redirected to HTTPS
      const httpUrl = page.url().replace('https://', 'http://');
      
      try {
        await page.goto(httpUrl);
        
        // Should be redirected to HTTPS
        const finalUrl = page.url();
        expect(finalUrl).toStartWith('https://');
      } catch (error) {
        // HTTP might be completely blocked, which is also secure
        console.log('HTTP access properly blocked');
      }
    });

    test('Security headers validation', async ({ page }) => {
      const response = await page.request.get('/');
      const headers = response.headers();

      // Check for security headers
      expect(headers['strict-transport-security']).toBeTruthy();
      expect(headers['x-content-type-options']).toBe('nosniff');
      expect(headers['x-frame-options']).toMatch(/DENY|SAMEORIGIN/);
      expect(headers['x-xss-protection']).toBeTruthy();
      expect(headers['referrer-policy']).toBeTruthy();
      
      // Check HSTS header
      const hstsHeader = headers['strict-transport-security'];
      expect(hstsHeader).toContain('max-age=');
      expect(hstsHeader).toContain('includeSubDomains');
    });

    test('WebSocket security validation', async ({ page }) => {
      await page.goto('/chat');

      // Monitor WebSocket connections
      let wsSecure = false;
      let wsOriginChecked = false;

      page.on('websocket', ws => {
        const wsUrl = ws.url();
        
        // WebSocket should use secure connection (wss://)
        if (wsUrl.startsWith('wss://')) {
          wsSecure = true;
        }

        // Check for proper origin validation
        ws.on('framereceived', event => {
          const frame = event.payload;
          if (frame.includes('origin') || frame.includes('authentication')) {
            wsOriginChecked = true;
          }
        });
      });

      // Trigger WebSocket connection
      await page.fill('[data-testid="message-input"]', 'WebSocket security test');
      await page.click('[data-testid="send-button"]');

      await page.waitForTimeout(2000);

      expect(wsSecure).toBe(true);
    });
  });

  test.describe('Rate Limiting and DoS Protection', () => {
    test('API rate limiting enforcement', async ({ page }) => {
      await page.goto('/chat');

      // Test rapid API requests
      const rapidRequests = [];
      
      for (let i = 0; i < 100; i++) {
        rapidRequests.push(
          page.request.get('/api/conversations')
        );
      }

      const responses = await Promise.allSettled(rapidRequests);
      
      // Some requests should be rate limited
      const rateLimitedResponses = responses.filter(result => 
        result.status === 'fulfilled' && result.value.status() === 429
      );

      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });

    test('Message sending rate limiting', async ({ page }) => {
      await page.goto('/chat/conversation/1');

      let rateLimitHit = false;

      // Try to send messages rapidly
      for (let i = 0; i < 50; i++) {
        await page.fill('[data-testid="message-input"]', `Rapid message ${i}`);
        
        try {
          await page.click('[data-testid="send-button"]', { timeout: 1000 });
          
          // Check for rate limit message
          const rateLimitMessage = page.locator('[data-testid="rate-limit-warning"]');
          if (await rateLimitMessage.isVisible()) {
            rateLimitHit = true;
            break;
          }
        } catch (error) {
          // Button might be disabled due to rate limiting
          const sendButton = page.locator('[data-testid="send-button"]');
          const isDisabled = await sendButton.isDisabled();
          if (isDisabled) {
            rateLimitHit = true;
            break;
          }
        }
      }

      expect(rateLimitHit).toBe(true);
    });
  });

  test.describe('Dependency and Infrastructure Security', () => {
    test('Client-side dependency vulnerabilities', async ({ page }) => {
      await page.goto('/chat');

      // Check for known vulnerable patterns in loaded scripts
      const scriptUrls: string[] = [];
      
      page.on('response', response => {
        if (response.url().endsWith('.js')) {
          scriptUrls.push(response.url());
        }
      });

      await page.waitForLoadState('networkidle');

      // Verify no known vulnerable libraries are loaded
      const vulnerablePatterns = [
        /jquery.*1\.[0-8]/i,  // Old jQuery versions
        /angular.*1\.[0-5]/i, // Old Angular versions
        /lodash.*[0-3]\./i,   // Old Lodash versions
        /moment.*2\.[0-9]\./i // Old Moment.js versions
      ];

      for (const url of scriptUrls) {
        for (const pattern of vulnerablePatterns) {
          expect(url).not.toMatch(pattern);
        }
      }
    });

    test('Environment information disclosure', async ({ page }) => {
      await page.goto('/');

      // Check that environment information is not exposed
      const pageContent = await page.content();
      
      const sensitiveEnvPatterns = [
        /NODE_ENV.*development/i,
        /DEBUG.*true/i,
        /API_KEY/i,
        /SECRET/i,
        /PASSWORD/i,
        /localhost:\d+/,
        /127\.0\.0\.1/,
        /\.env/i
      ];

      for (const pattern of sensitiveEnvPatterns) {
        expect(pageContent).not.toMatch(pattern);
      }

      // Check console for sensitive information
      const consoleLogs: string[] = [];
      page.on('console', msg => {
        consoleLogs.push(msg.text());
      });

      await page.reload();
      await page.waitForTimeout(2000);

      for (const log of consoleLogs) {
        for (const pattern of sensitiveEnvPatterns) {
          expect(log).not.toMatch(pattern);
        }
      }
    });
  });
});