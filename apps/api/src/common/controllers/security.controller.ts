import { Controller, Get, Req } from '@nestjs/common';
import { Request } from 'express';

interface RequestWithCsrf extends Request {
  csrfToken?: string;
}

@Controller('api')
export class SecurityController {
  @Get('csrf-token')
  getCsrfToken(@Req() req: RequestWithCsrf) {
    return {
      token: req.csrfToken || null,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('security-status')
  getSecurityStatus() {
    return {
      secure: true,
      timestamp: new Date().toISOString(),
      features: {
        csrf: true,
        rateLimit: true,
        sanitization: true,
        securityHeaders: true,
      },
    };
  }
}