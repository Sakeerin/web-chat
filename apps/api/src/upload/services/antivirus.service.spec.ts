import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { InternalServerErrorException } from '@nestjs/common';
import { AntivirusService } from './antivirus.service';
import { ScanStatus } from '../dto';
import * as NodeClam from 'clamscan';

// Mock clamscan
jest.mock('clamscan');

describe('AntivirusService', () => {
  let service: AntivirusService;
  let configService: jest.Mocked<ConfigService>;

  const mockNodeClam = NodeClam as jest.MockedClass<typeof NodeClam>;

  beforeEach(async () => {
    const mockConfigService = {
      get: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AntivirusService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AntivirusService>(AntivirusService);
    configService = module.get(ConfigService);

    // Setup default config
    configService.get.mockImplementation((key: string) => {
      switch (key) {
        case 'ANTIVIRUS_ENABLED':
          return true;
        case 'NODE_ENV':
          return 'test';
        case 'CLAMD_HOST':
          return 'localhost';
        case 'CLAMD_PORT':
          return 3310;
        case 'CLAMD_TIMEOUT':
          return 60000;
        default:
          return undefined;
      }
    });

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('initialize', () => {
    it('should initialize ClamAV scanner successfully', async () => {
      const mockClamscanInstance = {
        getVersion: jest.fn().mockResolvedValue('ClamAV 0.103.0'),
      };

      mockNodeClam.mockImplementation(() => ({
        init: jest.fn().mockResolvedValue(mockClamscanInstance),
      }) as any);

      await service.initialize();

      expect(mockNodeClam).toHaveBeenCalled();
    });

    it('should handle initialization failure in production', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'NODE_ENV') return 'production';
        if (key === 'ANTIVIRUS_ENABLED') return true;
        return undefined;
      });

      mockNodeClam.mockImplementation(() => ({
        init: jest.fn().mockRejectedValue(new Error('ClamAV not available')),
      }) as any);

      await expect(service.initialize()).rejects.toThrow(InternalServerErrorException);
    });

    it('should continue without antivirus in development when initialization fails', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'NODE_ENV') return 'development';
        if (key === 'ANTIVIRUS_ENABLED') return true;
        return undefined;
      });

      mockNodeClam.mockImplementation(() => ({
        init: jest.fn().mockRejectedValue(new Error('ClamAV not available')),
      }) as any);

      // Should not throw in development
      await service.initialize();
    });

    it('should skip initialization when antivirus is disabled', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'ANTIVIRUS_ENABLED') return false;
        return undefined;
      });

      await service.initialize();

      expect(mockNodeClam).not.toHaveBeenCalled();
    });
  });

  describe('scanFile', () => {
    beforeEach(async () => {
      const mockClamscanInstance = {
        getVersion: jest.fn().mockResolvedValue('ClamAV 0.103.0'),
        isInfected: jest.fn(),
      };

      mockNodeClam.mockImplementation(() => ({
        init: jest.fn().mockResolvedValue(mockClamscanInstance),
      }) as any);

      await service.initialize();
    });

    it('should scan clean file successfully', async () => {
      const filePath = '/tmp/clean-file.txt';
      
      // Access the private clamscan instance through service
      const clamscanInstance = (service as any).clamscan;
      clamscanInstance.isInfected.mockResolvedValue({
        isInfected: false,
        file: filePath,
        viruses: [],
      });
      clamscanInstance.getVersion.mockResolvedValue('ClamAV 0.103.0');

      const result = await service.scanFile(filePath);

      expect(result.status).toBe(ScanStatus.CLEAN);
      expect(result.scanEngine).toBe('ClamAV');
      expect(result.scanVersion).toBe('ClamAV 0.103.0');
      expect(result.threats).toBeUndefined();
    });

    it('should detect infected file', async () => {
      const filePath = '/tmp/infected-file.txt';
      
      const clamscanInstance = (service as any).clamscan;
      clamscanInstance.isInfected.mockResolvedValue({
        isInfected: true,
        file: filePath,
        viruses: ['Trojan.Generic', 'Malware.Test'],
      });
      clamscanInstance.getVersion.mockResolvedValue('ClamAV 0.103.0');

      const result = await service.scanFile(filePath);

      expect(result.status).toBe(ScanStatus.INFECTED);
      expect(result.threats).toEqual(['Trojan.Generic', 'Malware.Test']);
      expect(result.scanEngine).toBe('ClamAV');
    });

    it('should handle scan errors', async () => {
      const filePath = '/tmp/error-file.txt';
      
      const clamscanInstance = (service as any).clamscan;
      clamscanInstance.isInfected.mockRejectedValue(new Error('Scan failed'));

      const result = await service.scanFile(filePath);

      expect(result.status).toBe(ScanStatus.ERROR);
      expect(result.scanEngine).toBe('ClamAV');
    });

    it('should return clean status when antivirus is disabled', async () => {
      // Create a new service instance with antivirus disabled
      configService.get.mockImplementation((key: string) => {
        if (key === 'ANTIVIRUS_ENABLED') return false;
        return undefined;
      });

      const disabledService = new AntivirusService(configService);
      await disabledService.initialize();

      const result = await disabledService.scanFile('/tmp/any-file.txt');

      expect(result.status).toBe(ScanStatus.CLEAN);
      expect(result.scanEngine).toBe('Disabled');
    });
  });

  describe('scanBuffer', () => {
    beforeEach(async () => {
      const mockClamscanInstance = {
        getVersion: jest.fn().mockResolvedValue('ClamAV 0.103.0'),
        scanBuffer: jest.fn(),
      };

      mockNodeClam.mockImplementation(() => ({
        init: jest.fn().mockResolvedValue(mockClamscanInstance),
      }) as any);

      await service.initialize();
    });

    it('should scan clean buffer successfully', async () => {
      const buffer = Buffer.from('clean file content');
      const fileName = 'test-file.txt';
      
      const clamscanInstance = (service as any).clamscan;
      clamscanInstance.scanBuffer.mockResolvedValue({
        isInfected: false,
        viruses: [],
      });
      clamscanInstance.getVersion.mockResolvedValue('ClamAV 0.103.0');

      const result = await service.scanBuffer(buffer, fileName);

      expect(result.status).toBe(ScanStatus.CLEAN);
      expect(result.scanEngine).toBe('ClamAV');
    });

    it('should detect infected buffer', async () => {
      const buffer = Buffer.from('infected content');
      const fileName = 'malware.exe';
      
      const clamscanInstance = (service as any).clamscan;
      clamscanInstance.scanBuffer.mockResolvedValue({
        isInfected: true,
        viruses: ['Win.Trojan.Generic'],
      });
      clamscanInstance.getVersion.mockResolvedValue('ClamAV 0.103.0');

      const result = await service.scanBuffer(buffer, fileName);

      expect(result.status).toBe(ScanStatus.INFECTED);
      expect(result.threats).toEqual(['Win.Trojan.Generic']);
    });

    it('should handle buffer scan errors', async () => {
      const buffer = Buffer.from('test content');
      const fileName = 'test.txt';
      
      const clamscanInstance = (service as any).clamscan;
      clamscanInstance.scanBuffer.mockRejectedValue(new Error('Buffer scan failed'));

      const result = await service.scanBuffer(buffer, fileName);

      expect(result.status).toBe(ScanStatus.ERROR);
    });
  });

  describe('getStatus', () => {
    it('should return status when antivirus is enabled and initialized', async () => {
      const mockClamscanInstance = {
        getVersion: jest.fn().mockResolvedValue('ClamAV 0.103.0'),
      };

      mockNodeClam.mockImplementation(() => ({
        init: jest.fn().mockResolvedValue(mockClamscanInstance),
      }) as any);

      await service.initialize();

      const status = await service.getStatus();

      expect(status.enabled).toBe(true);
      expect(status.initialized).toBe(true);
      expect(status.version).toBe('ClamAV 0.103.0');
    });

    it('should return status when antivirus is disabled', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'ANTIVIRUS_ENABLED') return false;
        return undefined;
      });

      const disabledService = new AntivirusService(configService);
      await disabledService.initialize();

      const status = await disabledService.getStatus();

      expect(status.enabled).toBe(false);
      expect(status.initialized).toBe(false);
      expect(status.version).toBeUndefined();
    });
  });

  describe('healthCheck', () => {
    it('should return true when antivirus is healthy', async () => {
      const mockClamscanInstance = {
        getVersion: jest.fn().mockResolvedValue('ClamAV 0.103.0'),
      };

      mockNodeClam.mockImplementation(() => ({
        init: jest.fn().mockResolvedValue(mockClamscanInstance),
      }) as any);

      await service.initialize();

      const isHealthy = await service.healthCheck();

      expect(isHealthy).toBe(true);
    });

    it('should return false when antivirus is unhealthy', async () => {
      const mockClamscanInstance = {
        getVersion: jest.fn().mockRejectedValue(new Error('Service unavailable')),
      };

      mockNodeClam.mockImplementation(() => ({
        init: jest.fn().mockResolvedValue(mockClamscanInstance),
      }) as any);

      await service.initialize();

      const isHealthy = await service.healthCheck();

      expect(isHealthy).toBe(false);
    });

    it('should return true when antivirus is disabled', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'ANTIVIRUS_ENABLED') return false;
        return undefined;
      });

      const disabledService = new AntivirusService(configService);
      await disabledService.initialize();

      const isHealthy = await disabledService.healthCheck();

      expect(isHealthy).toBe(true);
    });
  });

  describe('updateDefinitions', () => {
    it('should handle definition updates when antivirus is enabled', async () => {
      const mockClamscanInstance = {
        getVersion: jest.fn().mockResolvedValue('ClamAV 0.103.0'),
      };

      mockNodeClam.mockImplementation(() => ({
        init: jest.fn().mockResolvedValue(mockClamscanInstance),
      }) as any);

      await service.initialize();

      const result = await service.updateDefinitions();

      expect(result).toBe(true);
    });

    it('should return false when antivirus is disabled', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'ANTIVIRUS_ENABLED') return false;
        return undefined;
      });

      const disabledService = new AntivirusService(configService);
      await disabledService.initialize();

      const result = await disabledService.updateDefinitions();

      expect(result).toBe(false);
    });
  });
});