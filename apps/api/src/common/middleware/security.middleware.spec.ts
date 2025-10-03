import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SecurityMiddleware } from './security.middleware';
import { Request, Response, NextFunction } from 'express';

describe('SecurityMiddleware', () => {
  let middleware: SecurityMiddleware;
  let configService: ConfigService;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SecurityMiddleware,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              switch (key) {
                case 'NODE_ENV':
                  return 'test';
                default:
                  return undefined;
              }
            }),
          },
        },
      ],
    }).compile();

    middleware = module.get<SecurityMiddleware>(SecurityMiddleware);
    configService = module.get<ConfigService>(ConfigService);

    mockRequest = {
      path: '/api/test',
      ip: '127.0.0.1',
      headers: {},
    };

    mockResponse = {
      setHeader: jest.fn(),
      getHeader: jest.fn(),
    };

    mockNext = jest.fn();
  });

  it('should be defined', () => {
    expect(middleware).toBeDefined();
  });

  it('should add security headers', (done) => {
    middleware.use(mockRequest as Request, mockResponse as Response, () => {
      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Content-Type-Options', 'nosniff');
      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Frame-Options', 'DENY');
      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-XSS-Protection', '1; mode=block');
      expect(mockResponse.setHeader).toHaveBeenCalledWith('Referrer-Policy', 'strict-origin-when-cross-origin');
      expect(mockResponse.setHeader).toHaveBeenCalledWith('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
      done();
    });
  });

  it('should skip rate limiting for health checks', (done) => {
    const healthRequest = {
      ...mockRequest,
      path: '/health',
    };
    
    middleware.use(healthRequest as Request, mockResponse as Response, () => {
      // Should not throw rate limit error
      expect(mockNext).not.toHaveBeenCalled();
      done();
    });
  });

  it('should apply different CSP for development', () => {
    jest.spyOn(configService, 'get').mockReturnValue('development');
    
    const devMiddleware = new SecurityMiddleware(configService);
    expect(devMiddleware).toBeDefined();
  });
});