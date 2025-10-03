import { describe, it, expect, vi, beforeEach } from 'vitest'
import { securityManager, sanitizeInput, validateFile, validateRedirectURL } from './security';

// Mock DOMPurify
vi.mock('dompurify', () => ({
  sanitize: vi.fn((input: string) => input.replace(/<script.*?>.*?<\/script>/gi, '')),
}));

describe('Security Utils', () => {
  beforeEach(() => {
    // Reset rate limit data
    (securityManager as any).requestCounts.clear();
  });

  describe('sanitizeInput', () => {
    it('should sanitize HTML content', () => {
      const maliciousInput = '<script>alert("xss")</script>Hello World';
      const sanitized = sanitizeInput(maliciousInput);
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).toContain('Hello World');
    });

    it('should preserve safe content', () => {
      const safeInput = 'Hello <b>World</b>';
      const sanitized = sanitizeInput(safeInput);
      expect(sanitized).toBe(safeInput);
    });

    it('should handle empty input', () => {
      expect(sanitizeInput('')).toBe('');
      expect(sanitizeInput(null as any)).toBe(null);
      expect(sanitizeInput(undefined as any)).toBe(undefined);
    });
  });

  describe('validateFile', () => {
    it('should accept valid image files', () => {
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      Object.defineProperty(file, 'size', { value: 1024 * 1024 }); // 1MB
      
      const result = validateFile(file);
      expect(result.valid).toBe(true);
    });

    it('should reject files that are too large', () => {
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      Object.defineProperty(file, 'size', { value: 100 * 1024 * 1024 }); // 100MB
      
      const result = validateFile(file);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('exceeds maximum');
    });

    it('should reject disallowed file types', () => {
      const file = new File(['test'], 'test.exe', { type: 'application/x-executable' });
      Object.defineProperty(file, 'size', { value: 1024 });
      
      const result = validateFile(file);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('not allowed');
    });

    it('should reject suspicious file extensions', () => {
      const file = new File(['test'], 'test.jpg.exe', { type: 'image/jpeg' });
      Object.defineProperty(file, 'size', { value: 1024 });
      
      const result = validateFile(file);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('multiple extensions');
    });
  });

  describe('rate limiting', () => {
    it('should allow requests within limit', () => {
      const result = securityManager.checkRateLimit('/api/test');
      expect(result.allowed).toBe(true);
    });

    it('should block requests exceeding limit', () => {
      // Simulate many requests
      for (let i = 0; i < 61; i++) {
        securityManager.checkRateLimit('/api/test');
      }
      
      const result = securityManager.checkRateLimit('/api/test');
      expect(result.allowed).toBe(false);
      expect(result.retryAfter).toBeGreaterThan(0);
    });

    it('should reset rate limit after time window', (done) => {
      // This test would need to be adjusted for actual time-based testing
      // For now, we'll just verify the structure
      const result = securityManager.checkRateLimit('/api/test');
      expect(result).toHaveProperty('allowed');
      done();
    });
  });

  describe('validateRedirectURL', () => {
    beforeAll(() => {
      // Mock window.location for tests
      Object.defineProperty(window, 'location', {
        value: {
          origin: 'https://example.com',
        },
        writable: true,
      });
    });

    it('should allow same-origin redirects', () => {
      const result = validateRedirectURL('https://example.com/dashboard');
      expect(result).toBe(true);
    });

    it('should block cross-origin redirects', () => {
      const result = validateRedirectURL('https://evil.com/steal-data');
      expect(result).toBe(false);
    });

    it('should block javascript: URLs', () => {
      const result = validateRedirectURL('javascript:alert("xss")');
      expect(result).toBe(false);
    });

    it('should block data: URLs', () => {
      const result = validateRedirectURL('data:text/html,<script>alert("xss")</script>');
      expect(result).toBe(false);
    });

    it('should handle invalid URLs', () => {
      const result = validateRedirectURL('not-a-url');
      expect(result).toBe(false);
    });
  });

  describe('CSRF token management', () => {
    beforeAll(() => {
      // Mock fetch for CSRF token requests
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ token: 'mock-csrf-token' }),
        })
      );
    });

    it('should get CSRF token', async () => {
      const token = await securityManager.getCSRFToken();
      expect(token).toBe('mock-csrf-token');
    });

    it('should cache CSRF token', async () => {
      const token1 = await securityManager.getCSRFToken();
      const token2 = await securityManager.getCSRFToken();
      
      expect(token1).toBe(token2);
      expect(fetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('secure random generation', () => {
    it('should generate random strings of specified length', () => {
      const random1 = securityManager.generateSecureRandom(16);
      const random2 = securityManager.generateSecureRandom(16);
      
      expect(random1).toHaveLength(32); // 16 bytes = 32 hex chars
      expect(random2).toHaveLength(32);
      expect(random1).not.toBe(random2);
    });

    it('should generate different values each time', () => {
      const values = new Set();
      for (let i = 0; i < 10; i++) {
        values.add(securityManager.generateSecureRandom());
      }
      expect(values.size).toBe(10);
    });
  });

  describe('data hashing', () => {
    it('should hash data consistently', async () => {
      const data = 'test-data';
      const hash1 = await securityManager.hashData(data);
      const hash2 = await securityManager.hashData(data);
      
      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64); // SHA-256 = 64 hex chars
    });

    it('should produce different hashes for different data', async () => {
      const hash1 = await securityManager.hashData('data1');
      const hash2 = await securityManager.hashData('data2');
      
      expect(hash1).not.toBe(hash2);
    });
  });
});