import React from 'react';
import { X, AlertTriangle, AlertCircle, Info, Shield } from 'lucide-react';
import { useSecurityContext } from './SecurityProvider';
import { Alert, AlertDescription } from '@ui/components/alert';
import { Button } from '@ui/components/button';

export interface SecurityAlertsProps {
  className?: string;
  maxAlerts?: number;
  showDismissed?: boolean;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'inline';
}

export function SecurityAlerts({ 
  className = '',
  maxAlerts = 5,
  showDismissed = false,
  position = 'top-right'
}: SecurityAlertsProps) {
  const { securityState, dismissSecurityAlert, clearDismissedAlerts } = useSecurityContext();

  const alerts = securityState.securityAlerts
    .filter(alert => showDismissed || !alert.dismissed)
    .slice(0, maxAlerts)
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  if (alerts.length === 0) {
    return null;
  }

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'info':
        return <Info className="h-4 w-4 text-blue-500" />;
      default:
        return <Shield className="h-4 w-4 text-gray-500" />;
    }
  };

  const getAlertVariant = (type: string) => {
    switch (type) {
      case 'error':
        return 'destructive';
      case 'warning':
        return 'default';
      case 'info':
        return 'default';
      default:
        return 'default';
    }
  };

  const positionClasses = {
    'top-right': 'fixed top-4 right-4 z-50',
    'top-left': 'fixed top-4 left-4 z-50',
    'bottom-right': 'fixed bottom-4 right-4 z-50',
    'bottom-left': 'fixed bottom-4 left-4 z-50',
    'inline': 'relative',
  };

  const containerClass = position === 'inline' 
    ? `space-y-2 ${className}`
    : `${positionClasses[position]} space-y-2 max-w-md ${className}`;

  return (
    <div className={containerClass}>
      {alerts.map((alert) => (
        <Alert
          key={alert.id}
          variant={getAlertVariant(alert.type) as any}
          className={`
            ${alert.dismissed ? 'opacity-50' : ''}
            transition-all duration-300 ease-in-out
            ${position !== 'inline' ? 'shadow-lg' : ''}
          `}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-2">
              {getAlertIcon(alert.type)}
              <div className="flex-1">
                <AlertDescription className="text-sm">
                  {alert.message}
                </AlertDescription>
                <div className="text-xs text-gray-500 mt-1">
                  {alert.timestamp.toLocaleTimeString()}
                </div>
              </div>
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 hover:bg-gray-100"
              onClick={() => dismissSecurityAlert(alert.id)}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </Alert>
      ))}
      
      {showDismissed && alerts.some(alert => alert.dismissed) && (
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={clearDismissedAlerts}
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            Clear dismissed alerts
          </Button>
        </div>
      )}
    </div>
  );
}

export function SecurityStatusIndicator({ className = '' }: { className?: string }) {
  const { securityStatus } = useSecurityContext();

  const getStatusColor = () => {
    switch (securityStatus.overall) {
      case 'good':
        return 'text-green-500';
      case 'warning':
        return 'text-yellow-500';
      case 'critical':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  const getStatusText = () => {
    switch (securityStatus.overall) {
      case 'good':
        return 'Secure';
      case 'warning':
        return `${securityStatus.warnings} Warning${securityStatus.warnings !== 1 ? 's' : ''}`;
      case 'critical':
        return `${securityStatus.criticalIssues} Critical Issue${securityStatus.criticalIssues !== 1 ? 's' : ''}`;
      default:
        return 'Unknown';
    }
  };

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <Shield className={`h-4 w-4 ${getStatusColor()}`} />
      <span className={`text-sm font-medium ${getStatusColor()}`}>
        {getStatusText()}
      </span>
      {!securityStatus.isSecureContext && (
        <AlertTriangle className="h-4 w-4 text-red-500" title="Not in secure context" />
      )}
    </div>
  );
}