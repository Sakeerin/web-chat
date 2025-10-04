import { useState, useEffect, useCallback } from 'react';
import { securityManager, DEFAULT_SECURITY_CONFIG } from '../utils/security';
import type { SecurityConfig } from '../utils/security';

export interface SecurityState {
  csrfToken: string | null;
  rateLimitStatus: Record<string, { remaining: number; resetTime: number }>;
  securityAlerts: SecurityAlert[];
  isSecureContext: boolean;
}

export interface SecurityAlert {
  id: string;
  type: 'warning' | 'error' | 'info';
  message: string;
  timestamp: Date;
  dismissed: boolean;
}

export interface UseSecurityOptions {
  config?: Partial<SecurityConfig>;
  enableRealTimeMonitoring?: boolean;
  enableSecurityAlerts?: boolean;
}

export function useSecurity(options: UseSecurityOptions = {}) {
  const [securityState, setSecurityState] = useState<SecurityState>({
    csrfToken: null,
    rateLimitStatus: {},
    securityAlerts: [],
    isSecureContext: typeof window !== 'undefined' ? window.isSecureContext : false,
  });

  const config = { ...DEFAULT_SECURITY_CONFIG, ...options.config };

  // Initialize security monitoring
  useEffect(() => {
    if (options.enableRealTimeMonitoring) {
      initializeSecurityMonitoring();
    }

    // Check if we're in a secure context
    if (typeof window !== 'undefined' && !window.isSecureContext) {
      addSecurityAlert({
        type: 'warning',
        message: 'Application is not running in a secure context (HTTPS). Some security features may be limited.',
      });
    }

    // Initialize CSRF token
    refreshCSRFToken();
  }, []);

  const initializeSecurityMonitoring = useCallback(() => {
    // Monitor for security-related events
    const handleSecurityViolation = (event: SecurityPolicyViolationEvent) => {
      addSecurityAlert({
        type: 'error',
        message: `Content Security Policy violation: ${event.violatedDirective}`,
      });
    };

    // Monitor for mixed content
    const handleMixedContent = () => {
      addSecurityAlert({
        type: 'warning',
        message: 'Mixed content detected. Ensure all resources are loaded over HTTPS.',
      });
    };

    if (typeof window !== 'undefined') {
      document.addEventListener('securitypolicyviolation', handleSecurityViolation);
      
      // Check for mixed content
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as Element;
              
              // Check for insecure resources
              const insecureAttributes = ['src', 'href', 'action'];
              insecureAttributes.forEach(attr => {
                const value = element.getAttribute(attr);
                if (value && value.startsWith('http://')) {
                  handleMixedContent();
                }
              });
            }
          });
        });
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true,
      });

      return () => {
        document.removeEventListener('securitypolicyviolation', handleSecurityViolation);
        observer.disconnect();
      };
    }
  }, []);

  const refreshCSRFToken = useCallback(async () => {
    try {
      const token = await securityManager.getCSRFToken();
      setSecurityState(prev => ({
        ...prev,
        csrfToken: token,
      }));
    } catch (error) {
      // Only show alert in production or if it's not a connection error
      const isConnectionError = error instanceof Error && 
        (error.message.includes('Failed to fetch') || error.message.includes('ERR_CONNECTION_REFUSED'));
      
      if (!isConnectionError || import.meta.env.PROD) {
        addSecurityAlert({
          type: 'error',
          message: 'Failed to refresh CSRF token. Some operations may fail.',
        });
      } else if (import.meta.env.DEV) {
        console.warn('CSRF token refresh failed - API server may not be running:', error);
      }
    }
  }, []);

  const addSecurityAlert = useCallback((alert: Omit<SecurityAlert, 'id' | 'timestamp' | 'dismissed'>) => {
    const newAlert: SecurityAlert = {
      ...alert,
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      dismissed: false,
    };

    setSecurityState(prev => ({
      ...prev,
      securityAlerts: [...prev.securityAlerts, newAlert],
    }));

    // Auto-dismiss info alerts after 5 seconds
    if (alert.type === 'info') {
      setTimeout(() => {
        dismissSecurityAlert(newAlert.id);
      }, 5000);
    }
  }, []);

  const dismissSecurityAlert = useCallback((alertId: string) => {
    setSecurityState(prev => ({
      ...prev,
      securityAlerts: prev.securityAlerts.map(alert =>
        alert.id === alertId ? { ...alert, dismissed: true } : alert
      ),
    }));
  }, []);

  const clearDismissedAlerts = useCallback(() => {
    setSecurityState(prev => ({
      ...prev,
      securityAlerts: prev.securityAlerts.filter(alert => !alert.dismissed),
    }));
  }, []);

  const checkRateLimit = useCallback((endpoint: string) => {
    const result = securityManager.checkRateLimit(endpoint);
    
    if (!result.allowed) {
      addSecurityAlert({
        type: 'warning',
        message: `Rate limit exceeded for ${endpoint}. Please wait ${result.retryAfter} seconds.`,
      });
    }

    return result;
  }, []);

  const secureRequest = useCallback(async (url: string, options: RequestInit = {}) => {
    try {
      // Check rate limit before making request
      const rateLimitCheck = checkRateLimit(url);
      if (!rateLimitCheck.allowed) {
        throw new Error(`Rate limit exceeded. Retry after ${rateLimitCheck.retryAfter} seconds.`);
      }

      const response = await securityManager.secureRequest(url, options);
      
      // Check for security headers in response
      if (options.enableRealTimeMonitoring) {
        checkResponseSecurity(response);
      }

      return response;
    } catch (error) {
      addSecurityAlert({
        type: 'error',
        message: `Secure request failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
      throw error;
    }
  }, [checkRateLimit, options.enableRealTimeMonitoring]);

  const checkResponseSecurity = useCallback((response: Response) => {
    const securityHeaders = [
      'x-content-type-options',
      'x-frame-options',
      'x-xss-protection',
      'strict-transport-security',
      'content-security-policy',
    ];

    const missingHeaders = securityHeaders.filter(header => !response.headers.get(header));
    
    if (missingHeaders.length > 0) {
      addSecurityAlert({
        type: 'info',
        message: `Response missing security headers: ${missingHeaders.join(', ')}`,
      });
    }
  }, []);

  const validateAndSanitizeInput = useCallback((input: string, options?: any) => {
    try {
      return securityManager.sanitizeInput(input, options);
    } catch (error) {
      addSecurityAlert({
        type: 'warning',
        message: 'Input sanitization failed. Content may be unsafe.',
      });
      return '';
    }
  }, []);

  const validateFile = useCallback((file: File) => {
    const result = securityManager.validateFile(file);
    
    if (!result.valid) {
      addSecurityAlert({
        type: 'error',
        message: result.error || 'File validation failed',
      });
    }

    return result;
  }, []);

  const validateRedirectURL = useCallback((url: string) => {
    const isValid = securityManager.validateRedirectURL(url);
    
    if (!isValid) {
      addSecurityAlert({
        type: 'error',
        message: 'Invalid redirect URL detected. Potential open redirect attack prevented.',
      });
    }

    return isValid;
  }, []);

  const generateSecureRandom = useCallback((length?: number) => {
    return securityManager.generateSecureRandom(length);
  }, []);

  const hashData = useCallback(async (data: string) => {
    return securityManager.hashData(data);
  }, []);

  // Security status checks
  const getSecurityStatus = useCallback(() => {
    const activeAlerts = securityState.securityAlerts.filter(alert => !alert.dismissed);
    const criticalAlerts = activeAlerts.filter(alert => alert.type === 'error');
    const warningAlerts = activeAlerts.filter(alert => alert.type === 'warning');

    return {
      overall: criticalAlerts.length > 0 ? 'critical' : warningAlerts.length > 0 ? 'warning' : 'good',
      criticalIssues: criticalAlerts.length,
      warnings: warningAlerts.length,
      isSecureContext: securityState.isSecureContext,
      hasCSRFToken: !!securityState.csrfToken,
    };
  }, [securityState]);

  return {
    // State
    securityState,
    securityStatus: getSecurityStatus(),

    // CSRF
    csrfToken: securityState.csrfToken,
    refreshCSRFToken,

    // Rate limiting
    checkRateLimit,

    // Secure requests
    secureRequest,

    // Input validation and sanitization
    validateAndSanitizeInput,
    sanitizeHTML: securityManager.sanitizeHTML,

    // File validation
    validateFile,

    // URL validation
    validateRedirectURL,

    // Cryptographic functions
    generateSecureRandom,
    hashData,

    // Alert management
    addSecurityAlert,
    dismissSecurityAlert,
    clearDismissedAlerts,

    // Utility
    config,
  };
}