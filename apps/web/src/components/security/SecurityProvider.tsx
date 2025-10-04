import React, { createContext, useContext, useEffect, useState } from 'react';
import { useSecurity } from '../../hooks/useSecurity';
import type { SecurityState, SecurityAlert } from '../../hooks/useSecurity';

interface SecurityContextValue {
  securityState: SecurityState;
  securityStatus: {
    overall: 'good' | 'warning' | 'critical';
    criticalIssues: number;
    warnings: number;
    isSecureContext: boolean;
    hasCSRFToken: boolean;
  };
  csrfToken: string | null;
  refreshCSRFToken: () => Promise<void>;
  checkRateLimit: (endpoint: string) => { allowed: boolean; retryAfter?: number };
  secureRequest: (url: string, options?: RequestInit) => Promise<Response>;
  validateAndSanitizeInput: (input: string, options?: any) => string;
  sanitizeHTML: (html: string) => string;
  validateFile: (file: File) => { valid: boolean; error?: string };
  validateRedirectURL: (url: string) => boolean;
  generateSecureRandom: (length?: number) => string;
  hashData: (data: string) => Promise<string>;
  addSecurityAlert: (alert: Omit<SecurityAlert, 'id' | 'timestamp' | 'dismissed'>) => void;
  dismissSecurityAlert: (alertId: string) => void;
  clearDismissedAlerts: () => void;
}

const SecurityContext = createContext<SecurityContextValue | null>(null);

export interface SecurityProviderProps {
  children: React.ReactNode;
  enableRealTimeMonitoring?: boolean;
  enableSecurityAlerts?: boolean;
  config?: any;
}

export function SecurityProvider({ 
  children, 
  enableRealTimeMonitoring = true,
  enableSecurityAlerts = true,
  config 
}: SecurityProviderProps) {
  const security = useSecurity({
    config,
    enableRealTimeMonitoring,
    enableSecurityAlerts,
  });

  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Initialize security context
    const initialize = async () => {
      try {
        // Refresh CSRF token on initialization (non-blocking)
        security.refreshCSRFToken().catch(() => {
          // Fail silently - handled in useSecurity hook
        });
        
        // Check browser security features
        if (typeof window !== 'undefined') {
          // Check for required security APIs
          if (!window.crypto || !window.crypto.subtle) {
            security.addSecurityAlert({
              type: 'warning',
              message: 'Web Crypto API not available. Some security features may be limited.',
            });
          }

          // Check for secure context
          if (!window.isSecureContext) {
            security.addSecurityAlert({
              type: 'error',
              message: 'Application is not running in a secure context. Please use HTTPS.',
            });
          }

          // Check for required permissions
          if ('permissions' in navigator) {
            try {
              const notificationPermission = await navigator.permissions.query({ name: 'notifications' as PermissionName });
              if (notificationPermission.state === 'denied') {
                security.addSecurityAlert({
                  type: 'info',
                  message: 'Notifications are disabled. You may miss important security alerts.',
                });
              }
            } catch (error) {
              // Permissions API not fully supported
            }
          }
        }

        setIsInitialized(true);
      } catch (error) {
        security.addSecurityAlert({
          type: 'error',
          message: 'Failed to initialize security context',
        });
        setIsInitialized(true); // Still allow app to continue
      }
    };

    initialize();
  }, []);

  // Don't render children until security is initialized
  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Initializing security...</p>
        </div>
      </div>
    );
  }

  return (
    <SecurityContext.Provider value={security}>
      {children}
    </SecurityContext.Provider>
  );
}

export function useSecurityContext(): SecurityContextValue {
  const context = useContext(SecurityContext);
  
  if (!context) {
    throw new Error('useSecurityContext must be used within a SecurityProvider');
  }
  
  return context;
}

// HOC for components that need security context
export function withSecurity<P extends object>(
  Component: React.ComponentType<P>
): React.ComponentType<P> {
  return function SecurityWrappedComponent(props: P) {
    const security = useSecurityContext();
    
    return <Component {...props} security={security} />;
  };
}