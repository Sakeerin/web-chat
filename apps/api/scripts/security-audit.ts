#!/usr/bin/env ts-node

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import chalk from 'chalk';

const execAsync = promisify(exec);

interface SecurityCheck {
  name: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  check: () => Promise<{ passed: boolean; message: string; details?: string[] }>;
}

interface AuditResult {
  passed: number;
  failed: number;
  warnings: number;
  critical: number;
  results: Array<{
    name: string;
    passed: boolean;
    severity: string;
    message: string;
    details?: string[];
  }>;
}

class SecurityAuditor {
  private checks: SecurityCheck[] = [
    {
      name: 'Dependency Vulnerabilities',
      description: 'Check for known vulnerabilities in dependencies',
      severity: 'high',
      check: this.checkDependencyVulnerabilities.bind(this),
    },
    {
      name: 'Environment Variables',
      description: 'Verify required security environment variables are set',
      severity: 'critical',
      check: this.checkEnvironmentVariables.bind(this),
    },
    {
      name: 'File Permissions',
      description: 'Check sensitive file permissions',
      severity: 'medium',
      check: this.checkFilePermissions.bind(this),
    },
    {
      name: 'TypeScript Configuration',
      description: 'Verify TypeScript security settings',
      severity: 'medium',
      check: this.checkTypeScriptConfig.bind(this),
    },
    {
      name: 'Package.json Security',
      description: 'Check package.json for security issues',
      severity: 'medium',
      check: this.checkPackageJsonSecurity.bind(this),
    },
    {
      name: 'Docker Security',
      description: 'Check Docker configuration security',
      severity: 'medium',
      check: this.checkDockerSecurity.bind(this),
    },
    {
      name: 'HTTPS Configuration',
      description: 'Verify HTTPS and TLS configuration',
      severity: 'high',
      check: this.checkHttpsConfiguration.bind(this),
    },
    {
      name: 'Security Headers',
      description: 'Check if security headers are properly configured',
      severity: 'high',
      check: this.checkSecurityHeaders.bind(this),
    },
  ];

  async runAudit(): Promise<AuditResult> {
    console.log(chalk.blue('🔒 Starting Security Audit...\n'));

    const result: AuditResult = {
      passed: 0,
      failed: 0,
      warnings: 0,
      critical: 0,
      results: [],
    };

    for (const check of this.checks) {
      console.log(chalk.gray(`Running: ${check.name}...`));
      
      try {
        const checkResult = await check.check();
        
        result.results.push({
          name: check.name,
          passed: checkResult.passed,
          severity: check.severity,
          message: checkResult.message,
          details: checkResult.details,
        });

        if (checkResult.passed) {
          result.passed++;
          console.log(chalk.green(`✓ ${check.name}: ${checkResult.message}`));
        } else {
          result.failed++;
          if (check.severity === 'critical') {
            result.critical++;
            console.log(chalk.red(`✗ ${check.name}: ${checkResult.message}`));
          } else if (check.severity === 'high') {
            console.log(chalk.red(`✗ ${check.name}: ${checkResult.message}`));
          } else {
            result.warnings++;
            console.log(chalk.yellow(`⚠ ${check.name}: ${checkResult.message}`));
          }

          if (checkResult.details) {
            checkResult.details.forEach(detail => {
              console.log(chalk.gray(`  - ${detail}`));
            });
          }
        }
      } catch (error) {
        result.failed++;
        console.log(chalk.red(`✗ ${check.name}: Error running check - ${error}`));
      }

      console.log('');
    }

    return result;
  }

  private async checkDependencyVulnerabilities(): Promise<{ passed: boolean; message: string; details?: string[] }> {
    try {
      const { stdout, stderr } = await execAsync('npm audit --json', { cwd: process.cwd() });
      
      if (stderr && !stderr.includes('found 0 vulnerabilities')) {
        return {
          passed: false,
          message: 'Dependency vulnerabilities found',
          details: ['Run "npm audit fix" to resolve issues'],
        };
      }

      const auditResult = JSON.parse(stdout);
      
      if (auditResult.metadata?.vulnerabilities?.total > 0) {
        const vulns = auditResult.metadata.vulnerabilities;
        const details = [];
        
        if (vulns.critical > 0) details.push(`${vulns.critical} critical vulnerabilities`);
        if (vulns.high > 0) details.push(`${vulns.high} high vulnerabilities`);
        if (vulns.moderate > 0) details.push(`${vulns.moderate} moderate vulnerabilities`);
        if (vulns.low > 0) details.push(`${vulns.low} low vulnerabilities`);

        return {
          passed: vulns.critical === 0 && vulns.high === 0,
          message: `Found ${vulns.total} vulnerabilities`,
          details,
        };
      }

      return {
        passed: true,
        message: 'No dependency vulnerabilities found',
      };
    } catch (error) {
      return {
        passed: false,
        message: 'Failed to check dependencies',
        details: [error instanceof Error ? error.message : 'Unknown error'],
      };
    }
  }

  private async checkEnvironmentVariables(): Promise<{ passed: boolean; message: string; details?: string[] }> {
    const requiredVars = [
      'JWT_SECRET',
      'DATABASE_URL',
      'REDIS_URL',
      'CSRF_SECRET',
    ];

    const missingVars = requiredVars.filter(varName => !process.env[varName]);
    const weakSecrets = [];

    // Check JWT secret strength
    const jwtSecret = process.env.JWT_SECRET;
    if (jwtSecret && jwtSecret.length < 32) {
      weakSecrets.push('JWT_SECRET is too short (minimum 32 characters)');
    }

    // Check CSRF secret strength
    const csrfSecret = process.env.CSRF_SECRET;
    if (csrfSecret && csrfSecret.length < 32) {
      weakSecrets.push('CSRF_SECRET is too short (minimum 32 characters)');
    }

    const issues = [...missingVars.map(v => `Missing: ${v}`), ...weakSecrets];

    return {
      passed: issues.length === 0,
      message: issues.length === 0 
        ? 'All required environment variables are properly set'
        : `${issues.length} environment variable issues found`,
      details: issues.length > 0 ? issues : undefined,
    };
  }

  private async checkFilePermissions(): Promise<{ passed: boolean; message: string; details?: string[] }> {
    const sensitiveFiles = [
      '.env',
      '.env.local',
      '.env.production',
      'prisma/schema.prisma',
    ];

    const issues = [];

    for (const file of sensitiveFiles) {
      try {
        const stats = await fs.stat(file);
        const mode = stats.mode & parseInt('777', 8);
        
        // Check if file is world-readable (others can read)
        if (mode & parseInt('004', 8)) {
          issues.push(`${file} is world-readable (permissions: ${mode.toString(8)})`);
        }
        
        // Check if file is group-readable for sensitive files
        if (file.includes('.env') && (mode & parseInt('040', 8))) {
          issues.push(`${file} is group-readable (permissions: ${mode.toString(8)})`);
        }
      } catch (error) {
        // File doesn't exist, which is fine for optional files
        if (file === '.env' || file === 'prisma/schema.prisma') {
          issues.push(`Required file ${file} not found`);
        }
      }
    }

    return {
      passed: issues.length === 0,
      message: issues.length === 0 
        ? 'File permissions are secure'
        : `${issues.length} file permission issues found`,
      details: issues.length > 0 ? issues : undefined,
    };
  }

  private async checkTypeScriptConfig(): Promise<{ passed: boolean; message: string; details?: string[] }> {
    try {
      const tsConfigPath = path.join(process.cwd(), 'tsconfig.json');
      const tsConfigContent = await fs.readFile(tsConfigPath, 'utf-8');
      const tsConfig = JSON.parse(tsConfigContent);

      const issues = [];
      const compilerOptions = tsConfig.compilerOptions || {};

      // Check for strict mode
      if (!compilerOptions.strict) {
        issues.push('TypeScript strict mode is not enabled');
      }

      // Check for noImplicitAny
      if (compilerOptions.noImplicitAny === false) {
        issues.push('noImplicitAny should be enabled');
      }

      // Check for noImplicitReturns
      if (!compilerOptions.noImplicitReturns) {
        issues.push('noImplicitReturns should be enabled');
      }

      return {
        passed: issues.length === 0,
        message: issues.length === 0 
          ? 'TypeScript configuration is secure'
          : `${issues.length} TypeScript configuration issues found`,
        details: issues.length > 0 ? issues : undefined,
      };
    } catch (error) {
      return {
        passed: false,
        message: 'Failed to check TypeScript configuration',
        details: ['tsconfig.json not found or invalid'],
      };
    }
  }

  private async checkPackageJsonSecurity(): Promise<{ passed: boolean; message: string; details?: string[] }> {
    try {
      const packageJsonPath = path.join(process.cwd(), 'package.json');
      const packageJsonContent = await fs.readFile(packageJsonPath, 'utf-8');
      const packageJson = JSON.parse(packageJsonContent);

      const issues = [];

      // Check for private flag
      if (!packageJson.private) {
        issues.push('Package should be marked as private to prevent accidental publishing');
      }

      // Check for security-related scripts
      const scripts = packageJson.scripts || {};
      if (!scripts.audit) {
        issues.push('No audit script found (consider adding "audit": "npm audit")');
      }

      // Check for known problematic dependencies
      const allDeps = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies,
      };

      const problematicDeps = ['eval', 'vm2', 'serialize-javascript'];
      for (const dep of problematicDeps) {
        if (allDeps[dep]) {
          issues.push(`Potentially unsafe dependency: ${dep}`);
        }
      }

      return {
        passed: issues.length === 0,
        message: issues.length === 0 
          ? 'Package.json configuration is secure'
          : `${issues.length} package.json issues found`,
        details: issues.length > 0 ? issues : undefined,
      };
    } catch (error) {
      return {
        passed: false,
        message: 'Failed to check package.json',
        details: ['package.json not found or invalid'],
      };
    }
  }

  private async checkDockerSecurity(): Promise<{ passed: boolean; message: string; details?: string[] }> {
    const dockerFiles = ['Dockerfile', 'docker-compose.yml'];
    const issues = [];

    for (const file of dockerFiles) {
      try {
        const content = await fs.readFile(file, 'utf-8');
        
        if (file === 'Dockerfile') {
          // Check for running as root
          if (!content.includes('USER ') || content.includes('USER root')) {
            issues.push(`${file}: Container runs as root user`);
          }

          // Check for COPY with broad permissions
          if (content.includes('COPY . .')) {
            issues.push(`${file}: Copying entire context (use .dockerignore)`);
          }

          // Check for hardcoded secrets
          if (content.match(/ENV.*(?:PASSWORD|SECRET|KEY|TOKEN).*=/i)) {
            issues.push(`${file}: Potential hardcoded secrets in ENV`);
          }
        }

        if (file === 'docker-compose.yml') {
          // Check for exposed ports
          if (content.includes('ports:') && content.includes('5432')) {
            issues.push(`${file}: Database port exposed (security risk)`);
          }

          // Check for default passwords
          if (content.includes('POSTGRES_PASSWORD: postgres')) {
            issues.push(`${file}: Default database password used`);
          }
        }
      } catch (error) {
        // File doesn't exist, which is fine
      }
    }

    return {
      passed: issues.length === 0,
      message: issues.length === 0 
        ? 'Docker configuration is secure'
        : `${issues.length} Docker security issues found`,
      details: issues.length > 0 ? issues : undefined,
    };
  }

  private async checkHttpsConfiguration(): Promise<{ passed: boolean; message: string; details?: string[] }> {
    const issues = [];

    // Check if HTTPS is enforced in production
    if (process.env.NODE_ENV === 'production') {
      if (!process.env.FORCE_HTTPS && !process.env.HTTPS_REDIRECT) {
        issues.push('HTTPS enforcement not configured for production');
      }
    }

    // Check TLS version configuration
    const tlsVersion = process.env.TLS_VERSION;
    if (tlsVersion && parseFloat(tlsVersion) < 1.2) {
      issues.push('TLS version is below 1.2 (security risk)');
    }

    return {
      passed: issues.length === 0,
      message: issues.length === 0 
        ? 'HTTPS configuration is secure'
        : `${issues.length} HTTPS configuration issues found`,
      details: issues.length > 0 ? issues : undefined,
    };
  }

  private async checkSecurityHeaders(): Promise<{ passed: boolean; message: string; details?: string[] }> {
    // This would typically test actual HTTP responses
    // For now, we'll check if security middleware is configured
    
    try {
      const securityMiddlewarePath = path.join(process.cwd(), 'src/common/middleware/security.middleware.ts');
      await fs.access(securityMiddlewarePath);

      return {
        passed: true,
        message: 'Security middleware is configured',
      };
    } catch (error) {
      return {
        passed: false,
        message: 'Security middleware not found',
        details: ['Implement security headers middleware'],
      };
    }
  }

  async generateReport(result: AuditResult): Promise<void> {
    const reportPath = path.join(process.cwd(), 'security-audit-report.json');
    
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        total: result.passed + result.failed,
        passed: result.passed,
        failed: result.failed,
        warnings: result.warnings,
        critical: result.critical,
      },
      results: result.results,
    };

    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    console.log(chalk.blue(`📄 Report saved to: ${reportPath}`));
  }
}

async function main() {
  const auditor = new SecurityAuditor();
  const result = await auditor.runAudit();

  console.log(chalk.blue('\n📊 Security Audit Summary:'));
  console.log(chalk.green(`✓ Passed: ${result.passed}`));
  console.log(chalk.red(`✗ Failed: ${result.failed}`));
  console.log(chalk.yellow(`⚠ Warnings: ${result.warnings}`));
  console.log(chalk.red(`🚨 Critical: ${result.critical}`));

  await auditor.generateReport(result);

  // Exit with error code if critical issues found
  if (result.critical > 0) {
    console.log(chalk.red('\n🚨 Critical security issues found! Please address them immediately.'));
    process.exit(1);
  } else if (result.failed > 0) {
    console.log(chalk.yellow('\n⚠ Security issues found. Please review and address them.'));
    process.exit(1);
  } else {
    console.log(chalk.green('\n🔒 Security audit passed! No critical issues found.'));
    process.exit(0);
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error(chalk.red('Security audit failed:'), error);
    process.exit(1);
  });
}

export { SecurityAuditor };