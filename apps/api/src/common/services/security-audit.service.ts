import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { Redis } from 'ioredis';
import * as fs from 'fs/promises';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface SecurityEvent {
  id: string;
  type: 'login_attempt' | 'failed_auth' | 'suspicious_activity' | 'rate_limit_exceeded' | 'admin_action';
  severity: 'low' | 'medium' | 'high' | 'critical';
  userId?: string;
  ip: string;
  userAgent?: string;
  details: Record<string, any>;
  timestamp: Date;
}

export interface VulnerabilityReport {
  id: string;
  type: 'dependency' | 'code' | 'configuration' | 'infrastructure';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  recommendation: string;
  affectedComponents: string[];
  discoveredAt: Date;
  status: 'open' | 'investigating' | 'fixed' | 'accepted_risk';
}

@Injectable()
export class SecurityAuditService {
  private readonly logger = new Logger(SecurityAuditService.name);
  private readonly auditLogPath: string;

  constructor(
    private configService: ConfigService,
    @InjectRedis() private redis: Redis,
  ) {
    this.auditLogPath = this.configService.get('AUDIT_LOG_PATH') || './logs/security-audit.log';
  }

  async logSecurityEvent(event: Omit<SecurityEvent, 'id' | 'timestamp'>): Promise<void> {
    const securityEvent: SecurityEvent = {
      ...event,
      id: this.generateEventId(),
      timestamp: new Date(),
    };

    // Store in Redis for real-time monitoring
    await this.redis.lpush('security_events', JSON.stringify(securityEvent));
    await this.redis.ltrim('security_events', 0, 9999); // Keep last 10k events

    // Write to audit log file
    await this.writeToAuditLog(securityEvent);

    // Check for patterns that require immediate attention
    await this.analyzeSecurityEvent(securityEvent);

    this.logger.log(`Security event logged: ${event.type} from ${event.ip}`);
  }

  async getSecurityEvents(
    limit: number = 100,
    type?: string,
    severity?: string,
  ): Promise<SecurityEvent[]> {
    const events = await this.redis.lrange('security_events', 0, limit - 1);
    
    return events
      .map(event => JSON.parse(event) as SecurityEvent)
      .filter(event => {
        if (type && event.type !== type) return false;
        if (severity && event.severity !== severity) return false;
        return true;
      });
  }

  @Cron(CronExpression.EVERY_HOUR)
  async performSecurityScan(): Promise<void> {
    this.logger.log('Starting automated security scan');

    try {
      // Run dependency vulnerability scan
      await this.scanDependencies();

      // Check for common security misconfigurations
      await this.checkSecurityConfiguration();

      // Analyze recent security events for patterns
      await this.analyzeSecurityPatterns();

      // Generate security metrics
      await this.generateSecurityMetrics();

      this.logger.log('Security scan completed successfully');
    } catch (error) {
      this.logger.error('Security scan failed', error);
    }
  }

  private async scanDependencies(): Promise<void> {
    try {
      // Run npm audit
      const { stdout, stderr } = await execAsync('npm audit --json', {
        cwd: process.cwd(),
        timeout: 30000,
      });

      if (stderr && !stderr.includes('found 0 vulnerabilities')) {
        const auditResult = JSON.parse(stdout);
        
        if (auditResult.vulnerabilities) {
          for (const [packageName, vulnerability] of Object.entries(auditResult.vulnerabilities as any)) {
            await this.reportVulnerability({
              type: 'dependency',
              severity: this.mapNpmSeverity(vulnerability.severity),
              title: `Vulnerable dependency: ${packageName}`,
              description: vulnerability.via?.[0]?.title || 'Dependency vulnerability detected',
              recommendation: `Update ${packageName} to version ${vulnerability.fixAvailable?.version || 'latest'}`,
              affectedComponents: [packageName],
            });
          }
        }
      }
    } catch (error) {
      this.logger.warn('Dependency scan failed', error);
    }
  }

  private async checkSecurityConfiguration(): Promise<void> {
    const checks = [
      this.checkEnvironmentVariables(),
      this.checkFilePermissions(),
      this.checkDatabaseConfiguration(),
      this.checkRedisConfiguration(),
    ];

    await Promise.allSettled(checks);
  }

  private async checkEnvironmentVariables(): Promise<void> {
    const requiredSecureVars = [
      'JWT_SECRET',
      'CSRF_SECRET',
      'DATABASE_URL',
      'REDIS_URL',
    ];

    const missingVars = requiredSecureVars.filter(
      varName => !this.configService.get(varName)
    );

    if (missingVars.length > 0) {
      await this.reportVulnerability({
        type: 'configuration',
        severity: 'high',
        title: 'Missing security environment variables',
        description: `Required security environment variables are not set: ${missingVars.join(', ')}`,
        recommendation: 'Set all required environment variables with secure values',
        affectedComponents: ['configuration'],
      });
    }

    // Check for weak secrets
    const jwtSecret = this.configService.get('JWT_SECRET');
    if (jwtSecret && jwtSecret.length < 32) {
      await this.reportVulnerability({
        type: 'configuration',
        severity: 'medium',
        title: 'Weak JWT secret',
        description: 'JWT secret is too short and may be vulnerable to brute force attacks',
        recommendation: 'Use a JWT secret with at least 32 characters',
        affectedComponents: ['authentication'],
      });
    }
  }

  private async checkFilePermissions(): Promise<void> {
    const sensitiveFiles = [
      '.env',
      'prisma/schema.prisma',
      'package.json',
    ];

    for (const file of sensitiveFiles) {
      try {
        const stats = await fs.stat(file);
        const mode = stats.mode & parseInt('777', 8);
        
        // Check if file is world-readable (others can read)
        if (mode & parseInt('004', 8)) {
          await this.reportVulnerability({
            type: 'configuration',
            severity: 'medium',
            title: `Sensitive file has permissive permissions: ${file}`,
            description: `File ${file} is readable by others, which may expose sensitive information`,
            recommendation: `Change file permissions: chmod 600 ${file}`,
            affectedComponents: ['filesystem'],
          });
        }
      } catch (error) {
        // File doesn't exist or can't be accessed
      }
    }
  }

  private async checkDatabaseConfiguration(): Promise<void> {
    // This would typically connect to the database and check configuration
    // For now, we'll check the connection string format
    const dbUrl = this.configService.get('DATABASE_URL');
    
    if (dbUrl && dbUrl.includes('password=') && !dbUrl.startsWith('postgresql://')) {
      await this.reportVulnerability({
        type: 'configuration',
        severity: 'low',
        title: 'Database password in connection string',
        description: 'Database password is visible in connection string',
        recommendation: 'Use environment variables or secure credential management',
        affectedComponents: ['database'],
      });
    }
  }

  private async checkRedisConfiguration(): Promise<void> {
    try {
      const info = await this.redis.info('server');
      
      // Check Redis version for known vulnerabilities
      const versionMatch = info.match(/redis_version:(\d+\.\d+\.\d+)/);
      if (versionMatch) {
        const version = versionMatch[1];
        // This is a simplified check - in production, you'd check against a vulnerability database
        if (version.startsWith('6.0.') || version.startsWith('6.2.')) {
          await this.reportVulnerability({
            type: 'infrastructure',
            severity: 'medium',
            title: 'Potentially vulnerable Redis version',
            description: `Redis version ${version} may have known vulnerabilities`,
            recommendation: 'Update Redis to the latest stable version',
            affectedComponents: ['redis'],
          });
        }
      }
    } catch (error) {
      this.logger.warn('Redis configuration check failed', error);
    }
  }

  private async analyzeSecurityPatterns(): Promise<void> {
    const recentEvents = await this.getSecurityEvents(1000);
    
    // Analyze failed login attempts
    const failedLogins = recentEvents.filter(e => e.type === 'failed_auth');
    const ipFailureCounts = new Map<string, number>();
    
    failedLogins.forEach(event => {
      const count = ipFailureCounts.get(event.ip) || 0;
      ipFailureCounts.set(event.ip, count + 1);
    });

    // Report IPs with excessive failed attempts
    for (const [ip, count] of ipFailureCounts.entries()) {
      if (count > 50) { // Threshold for suspicious activity
        await this.logSecurityEvent({
          type: 'suspicious_activity',
          severity: 'high',
          ip,
          details: {
            pattern: 'excessive_failed_logins',
            count,
            timeframe: '1_hour',
          },
        });
      }
    }
  }

  private async generateSecurityMetrics(): Promise<void> {
    const events = await this.getSecurityEvents(10000);
    
    const metrics = {
      total_events: events.length,
      events_by_type: this.groupBy(events, 'type'),
      events_by_severity: this.groupBy(events, 'severity'),
      unique_ips: new Set(events.map(e => e.ip)).size,
      timestamp: new Date().toISOString(),
    };

    await this.redis.setex('security_metrics', 3600, JSON.stringify(metrics));
    this.logger.log('Security metrics updated', metrics);
  }

  private async reportVulnerability(
    vulnerability: Omit<VulnerabilityReport, 'id' | 'discoveredAt' | 'status'>
  ): Promise<void> {
    const report: VulnerabilityReport = {
      ...vulnerability,
      id: this.generateEventId(),
      discoveredAt: new Date(),
      status: 'open',
    };

    await this.redis.lpush('vulnerability_reports', JSON.stringify(report));
    await this.redis.ltrim('vulnerability_reports', 0, 999); // Keep last 1k reports

    this.logger.warn(`Vulnerability reported: ${report.title}`, {
      severity: report.severity,
      type: report.type,
    });
  }

  private async analyzeSecurityEvent(event: SecurityEvent): Promise<void> {
    // Implement real-time security event analysis
    if (event.severity === 'critical') {
      // Send immediate alert (email, Slack, etc.)
      this.logger.error('CRITICAL security event detected', event);
    }

    // Check for brute force patterns
    if (event.type === 'failed_auth') {
      const recentFailures = await this.redis.incr(`failed_auth:${event.ip}`);
      await this.redis.expire(`failed_auth:${event.ip}`, 3600); // 1 hour window

      if (recentFailures > 10) {
        await this.logSecurityEvent({
          type: 'suspicious_activity',
          severity: 'high',
          ip: event.ip,
          details: {
            pattern: 'brute_force_attempt',
            failures: recentFailures,
          },
        });
      }
    }
  }

  private async writeToAuditLog(event: SecurityEvent): Promise<void> {
    try {
      const logEntry = `${event.timestamp.toISOString()} [${event.severity.toUpperCase()}] ${event.type} - IP: ${event.ip} - ${JSON.stringify(event.details)}\n`;
      
      // Ensure log directory exists
      const logDir = path.dirname(this.auditLogPath);
      await fs.mkdir(logDir, { recursive: true });
      
      await fs.appendFile(this.auditLogPath, logEntry);
    } catch (error) {
      this.logger.error('Failed to write to audit log', error);
    }
  }

  private generateEventId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private mapNpmSeverity(npmSeverity: string): 'low' | 'medium' | 'high' | 'critical' {
    switch (npmSeverity) {
      case 'info': return 'low';
      case 'low': return 'low';
      case 'moderate': return 'medium';
      case 'high': return 'high';
      case 'critical': return 'critical';
      default: return 'medium';
    }
  }

  private groupBy<T>(array: T[], key: keyof T): Record<string, number> {
    return array.reduce((groups, item) => {
      const value = String(item[key]);
      groups[value] = (groups[value] || 0) + 1;
      return groups;
    }, {} as Record<string, number>);
  }
}