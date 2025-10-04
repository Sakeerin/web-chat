import DOMPurify from 'dompurify';

export interface SecurityConfig {
  maxRequestsPerMinute: number;
  maxRequestsPerHour: number;
  csrfTokenRefreshInterval: number;
  sessionTimeoutWarning: number;
  maxFileSize: number;
  allowedFileTypes: string[];
}

export const DEFAULT_SECURITY_CONFIG: SecurityConfig = {
  maxRequestsPerMinute: 60,
  maxRequestsPerHour: 1000,
  csrfTokenRefreshInterval: 30 * 60 * 1000, // 30 minutes
  sessionTimeoutWarning: 5 * 60 * 1000, // 5 minutes before timeout
  maxFileSize: 50 * 1024 * 1024, // 50MB
  allowedFileTypes: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'video/mp4',
    'video/webm',
    'audio/mpeg',
    'audio/wav',
    'audio/ogg',
    'application/pdf',
    'text/plain',
    'application/json',
  ],
};

class SecurityManager {
  private config: SecurityConfig;
  private requestCounts: Map<string, { count: number; resetTime: number }> = new Map();
  private csrfToken: string | null = null;
  private csrfTokenExpiry: number = 0;

  constructor(config: SecurityConfig = DEFAULT_SECURITY_CONFIG) {
    this.config = config;
    this.initializeCSP();
  }

  /**
   * Initialize Content Security Policy
   */
  private initializeCSP(): void {
    // CSP is primarily handled by the server, but we can add additional client-side protections
    if (typeof window !== 'undefined') {
      // Prevent eval() usage
      window.eval = () => {
        throw new Error('eval() is disabled for security reasons');
      };

      // Monitor for XSS attempts
      this.setupXSSDetection();
    }
  }

  /**
   * Sanitize user input to prevent XSS attacks
   */
  sanitizeInput(input: string, options?: DOMPurify.Config): string {
    const defaultOptions: DOMPurify.Config = {
      ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'code', 'pre'],
      ALLOWED_ATTR: [],
      KEEP_CONTENT: true,
      RETURN_DOM: false,
      RETURN_DOM_FRAGMENT: false,
    };

    return DOMPurify.sanitize(input, { ...defaultOptions, ...options });
  }

  /**
   * Sanitize HTML content for display
   */
  sanitizeHTML(html: string): string {
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: [
        'p', 'br', 'strong', 'em', 'b', 'i', 'u', 's',
        'code', 'pre', 'blockquote', 'ul', 'ol', 'li',
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      ],
      ALLOWED_ATTR: ['class', 'id'],
      KEEP_CONTENT: true,
    });
  }

  /**
   * Validate file upload security
   */
  validateFile(file: File): { valid: boolean; error?: string } {
    // Check file size
    if (file.size > this.config.maxFileSize) {
      return {
        valid: false,
        error: `File size exceeds maximum allowed size of ${this.config.maxFileSize / (1024 * 1024)}MB`,
      };
    }

    // Check file type
    if (!this.config.allowedFileTypes.includes(file.type)) {
      return {
        valid: false,
        error: `File type ${file.type} is not allowed`,
      };
    }

    // Check file name for suspicious patterns
    const suspiciousPatterns = [
      /\.exe$/i,
      /\.bat$/i,
      /\.cmd$/i,
      /\.scr$/i,
      /\.pif$/i,
      /\.com$/i,
      /\.jar$/i,
      /\.js$/i,
      /\.vbs$/i,
      /\.php$/i,
      /\.asp$/i,
      /\.jsp$/i,
    ];

    if (suspiciousPatterns.some(pattern => pattern.test(file.name))) {
      return {
        valid: false,
        error: 'File type not allowed for security reasons',
      };
    }

    // Check for double extensions
    const parts = file.name.split('.');
    if (parts.length > 2) {
      return {
        valid: false,
        error: 'Files with multiple extensions are not allowed',
      };
    }

    return { valid: true };
  }

  /**
   * Rate limiting for client-side API calls
   */
  checkRateLimit(endpoint: string): { allowed: boolean; retryAfter?: number } {
    const now = Date.now();
    const key = `${endpoint}:${Math.floor(now / 60000)}`; // Per minute bucket
    const hourKey = `${endpoint}:${Math.floor(now / 3600000)}`; // Per hour bucket

    // Check minute limit
    const minuteData = this.requestCounts.get(key) || { count: 0, resetTime: now + 60000 };
    if (minuteData.count >= this.config.maxRequestsPerMinute) {
      return {
        allowed: false,
        retryAfter: Math.ceil((minuteData.resetTime - now) / 1000),
      };
    }

    // Check hour limit
    const hourData = this.requestCounts.get(hourKey) || { count: 0, resetTime: now + 3600000 };
    if (hourData.count >= this.config.maxRequestsPerHour) {
      return {
        allowed: false,
        retryAfter: Math.ceil((hourData.resetTime - now) / 1000),
      };
    }

    // Increment counters
    this.requestCounts.set(key, { count: minuteData.count + 1, resetTime: minuteData.resetTime });
    this.requestCounts.set(hourKey, { count: hourData.count + 1, resetTime: hourData.resetTime });

    // Clean up expired entries
    this.cleanupRateLimitData();

    return { allowed: true };
  }

  /**
   * Get or refresh CSRF token
   */
  async getCSRFToken(): Promise<string> {
    const now = Date.now();
    
    if (this.csrfToken && now < this.csrfTokenExpiry) {
      return this.csrfToken;
    }

    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const response = await fetch(`${API_BASE_URL}/api/csrf-token`, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to get CSRF token');
      }

      const data = await response.json();
      this.csrfToken = data.token;
      this.csrfTokenExpiry = now + this.config.csrfTokenRefreshInterval;

      return this.csrfToken;
    } catch (error) {
      // In development, log as warning instead of error if it's a connection issue
      const isConnectionError = error instanceof Error && 
        (error.message.includes('Failed to fetch') || error.message.includes('ERR_CONNECTION_REFUSED'));
      
      if (isConnectionError && import.meta.env.DEV) {
        console.warn('CSRF token fetch failed - API server may not be running');
      } else {
        console.error('Failed to get CSRF token:', error);
      }
      throw error;
    }
  }

  /**
   * Secure API request wrapper
   */
  async secureRequest(url: string, options: RequestInit = {}): Promise<Response> {
    // Check rate limit
    const rateLimitCheck = this.checkRateLimit(url);
    if (!rateLimitCheck.allowed) {
      throw new Error(`Rate limit exceeded. Retry after ${rateLimitCheck.retryAfter} seconds.`);
    }

    // Add CSRF token for state-changing requests
    const method = options.method?.toUpperCase() || 'GET';
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      const csrfToken = await this.getCSRFToken();
      options.headers = {
        ...options.headers,
        'X-CSRF-Token': csrfToken,
      };
    }

    // Add security headers
    options.headers = {
      ...options.headers,
      'X-Requested-With': 'XMLHttpRequest',
    };

    // Ensure credentials are included for CSRF protection
    options.credentials = options.credentials || 'include';

    return fetch(url, options);
  }

  /**
   * Validate URL to prevent open redirect attacks
   */
  validateRedirectURL(url: string): boolean {
    try {
      const parsedUrl = new URL(url, window.location.origin);
      
      // Only allow same-origin redirects
      if (parsedUrl.origin !== window.location.origin) {
        return false;
      }

      // Block javascript: and data: protocols
      if (['javascript:', 'data:', 'vbscript:'].some(protocol => 
        parsedUrl.protocol.toLowerCase().startsWith(protocol)
      )) {
        return false;
      }

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Setup XSS detection
   */
  private setupXSSDetection(): void {
    // Monitor for suspicious DOM modifications
    if (typeof MutationObserver !== 'undefined') {
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === 'childList') {
            mutation.addedNodes.forEach((node) => {
              if (node.nodeType === Node.ELEMENT_NODE) {
                const element = node as Element;
                
                // Check for suspicious script injections
                if (element.tagName === 'SCRIPT' || 
                    element.innerHTML.includes('<script') ||
                    element.innerHTML.includes('javascript:')) {
                  console.warn('Potential XSS attempt detected:', element);
                  element.remove();
                }
              }
            });
          }
        });
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true,
      });
    }
  }

  /**
   * Clean up expired rate limit data
   */
  private cleanupRateLimitData(): void {
    const now = Date.now();
    
    for (const [key, data] of this.requestCounts.entries()) {
      if (now > data.resetTime) {
        this.requestCounts.delete(key);
      }
    }
  }

  /**
   * Generate secure random string
   */
  generateSecureRandom(length: number = 32): string {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Hash sensitive data (client-side hashing for additional security)
   */
  async hashData(data: string): Promise<string> {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
}

// Export singleton instance
export const securityManager = new SecurityManager();

// Utility functions
export const sanitizeInput = (input: string, options?: DOMPurify.Config) => 
  securityManager.sanitizeInput(input, options);

export const sanitizeHTML = (html: string) => 
  securityManager.sanitizeHTML(html);

export const validateFile = (file: File) => 
  securityManager.validateFile(file);

export const secureRequest = (url: string, options?: RequestInit) => 
  securityManager.secureRequest(url, options);

export const validateRedirectURL = (url: string) => 
  securityManager.validateRedirectURL(url);