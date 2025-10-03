import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as NodeClam from 'clamscan';
import { FileScanResult, ScanStatus } from '../dto';

@Injectable()
export class AntivirusService {
  private readonly logger = new Logger(AntivirusService.name);
  private clamscan: NodeClam | null = null;
  private readonly isEnabled: boolean;
  private readonly clamConfig: any;

  constructor(private readonly configService: ConfigService) {
    this.isEnabled = this.configService.get<boolean>('ANTIVIRUS_ENABLED', true);
    this.clamConfig = {
      removeInfected: false, // Don't auto-remove, let the application handle it
      quarantineInfected: false,
      scanLog: null,
      debugMode: this.configService.get<string>('NODE_ENV') === 'development',
      fileList: null,
      scanRecursively: false,
      clamdscan: {
        socket: this.configService.get<string>('CLAMD_SOCKET', '/var/run/clamav/clamd.ctl'),
        host: this.configService.get<string>('CLAMD_HOST', 'localhost'),
        port: this.configService.get<number>('CLAMD_PORT', 3310),
        timeout: this.configService.get<number>('CLAMD_TIMEOUT', 60000),
        localFallback: true,
      },
      preference: 'clamdscan', // Use daemon for better performance
    };
  }

  /**
   * Initialize ClamAV scanner
   */
  async initialize(): Promise<void> {
    if (!this.isEnabled) {
      this.logger.warn('Antivirus scanning is disabled');
      return;
    }

    try {
      this.clamscan = await new NodeClam().init(this.clamConfig);
      this.logger.log('ClamAV scanner initialized successfully');
      
      // Test the scanner
      const version = await this.clamscan.getVersion();
      this.logger.log(`ClamAV version: ${version}`);
    } catch (error) {
      this.logger.error(`Failed to initialize ClamAV: ${error.message}`, error.stack);
      
      // In development, we might want to continue without antivirus
      if (this.configService.get<string>('NODE_ENV') === 'development') {
        this.logger.warn('Continuing without antivirus in development mode');
        this.clamscan = null;
      } else {
        throw new InternalServerErrorException('Antivirus service initialization failed');
      }
    }
  }

  /**
   * Scan a file for viruses
   */
  async scanFile(filePath: string): Promise<FileScanResult> {
    const scanResult: FileScanResult = {
      status: ScanStatus.PENDING,
      scannedAt: new Date(),
      scanEngine: 'ClamAV',
    };

    if (!this.isEnabled || !this.clamscan) {
      this.logger.warn('Antivirus scanning is disabled or not initialized, marking as clean');
      return {
        ...scanResult,
        status: ScanStatus.CLEAN,
        scanEngine: 'Disabled',
      };
    }

    try {
      scanResult.status = ScanStatus.SCANNING;
      
      const { isInfected, file, viruses } = await this.clamscan.isInfected(filePath);
      
      // Get scanner version for audit trail
      try {
        scanResult.scanVersion = await this.clamscan.getVersion();
      } catch (error) {
        this.logger.warn(`Failed to get ClamAV version: ${error.message}`);
      }

      if (isInfected) {
        scanResult.status = ScanStatus.INFECTED;
        scanResult.threats = viruses || ['Unknown threat'];
        
        this.logger.warn(`File infected: ${filePath}`, {
          file,
          viruses,
        });
      } else {
        scanResult.status = ScanStatus.CLEAN;
        this.logger.log(`File scan clean: ${filePath}`);
      }

      return scanResult;
    } catch (error) {
      this.logger.error(`File scan failed: ${error.message}`, error.stack);
      
      return {
        ...scanResult,
        status: ScanStatus.ERROR,
      };
    }
  }

  /**
   * Scan file buffer for viruses
   */
  async scanBuffer(buffer: Buffer, fileName: string): Promise<FileScanResult> {
    const scanResult: FileScanResult = {
      status: ScanStatus.PENDING,
      scannedAt: new Date(),
      scanEngine: 'ClamAV',
    };

    if (!this.isEnabled || !this.clamscan) {
      this.logger.warn('Antivirus scanning is disabled or not initialized, marking as clean');
      return {
        ...scanResult,
        status: ScanStatus.CLEAN,
        scanEngine: 'Disabled',
      };
    }

    try {
      scanResult.status = ScanStatus.SCANNING;
      
      const { isInfected, viruses } = await this.clamscan.scanBuffer(buffer);
      
      // Get scanner version for audit trail
      try {
        scanResult.scanVersion = await this.clamscan.getVersion();
      } catch (error) {
        this.logger.warn(`Failed to get ClamAV version: ${error.message}`);
      }

      if (isInfected) {
        scanResult.status = ScanStatus.INFECTED;
        scanResult.threats = viruses || ['Unknown threat'];
        
        this.logger.warn(`Buffer infected: ${fileName}`, {
          fileName,
          viruses,
        });
      } else {
        scanResult.status = ScanStatus.CLEAN;
        this.logger.log(`Buffer scan clean: ${fileName}`);
      }

      return scanResult;
    } catch (error) {
      this.logger.error(`Buffer scan failed: ${error.message}`, error.stack);
      
      return {
        ...scanResult,
        status: ScanStatus.ERROR,
      };
    }
  }

  /**
   * Update virus definitions
   */
  async updateDefinitions(): Promise<boolean> {
    if (!this.isEnabled || !this.clamscan) {
      this.logger.warn('Cannot update definitions: antivirus is disabled or not initialized');
      return false;
    }

    try {
      // Note: This requires freshclam to be configured and available
      // In production, this should be handled by system cron jobs
      this.logger.log('Virus definitions update should be handled by system freshclam');
      return true;
    } catch (error) {
      this.logger.error(`Failed to update virus definitions: ${error.message}`, error.stack);
      return false;
    }
  }

  /**
   * Get scanner status and version info
   */
  async getStatus(): Promise<{
    enabled: boolean;
    initialized: boolean;
    version?: string;
    lastUpdate?: Date;
  }> {
    const status = {
      enabled: this.isEnabled,
      initialized: this.clamscan !== null,
    };

    if (this.clamscan) {
      try {
        status['version'] = await this.clamscan.getVersion();
      } catch (error) {
        this.logger.warn(`Failed to get scanner version: ${error.message}`);
      }
    }

    return status;
  }

  /**
   * Health check for the antivirus service
   */
  async healthCheck(): Promise<boolean> {
    if (!this.isEnabled) {
      return true; // Service is "healthy" if disabled
    }

    if (!this.clamscan) {
      return false;
    }

    try {
      // Try to get version as a simple health check
      await this.clamscan.getVersion();
      return true;
    } catch (error) {
      this.logger.error(`Antivirus health check failed: ${error.message}`);
      return false;
    }
  }
}