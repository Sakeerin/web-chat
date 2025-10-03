import { PipeTransform, Injectable, ArgumentMetadata, BadRequestException } from '@nestjs/common';
import * as DOMPurify from 'isomorphic-dompurify';
import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';

@Injectable()
export class SanitizationPipe implements PipeTransform {
  private readonly maxStringLength = 10000;
  private readonly maxArrayLength = 1000;
  private readonly maxObjectDepth = 10;

  async transform(value: any, metadata: ArgumentMetadata) {
    if (!value || typeof value !== 'object') {
      return this.sanitizeValue(value);
    }

    // Sanitize the entire object recursively
    const sanitized = this.sanitizeObject(value, 0);

    // If we have a DTO class, validate against it
    if (metadata.metatype && this.isValidationTarget(metadata.metatype)) {
      const object = plainToClass(metadata.metatype, sanitized);
      const errors = await validate(object);
      
      if (errors.length > 0) {
        const errorMessages = errors.map(error => 
          Object.values(error.constraints || {}).join(', ')
        ).join('; ');
        throw new BadRequestException(`Validation failed: ${errorMessages}`);
      }
      
      return object;
    }

    return sanitized;
  }

  private sanitizeObject(obj: any, depth: number): any {
    if (depth > this.maxObjectDepth) {
      throw new BadRequestException('Object nesting too deep');
    }

    if (Array.isArray(obj)) {
      if (obj.length > this.maxArrayLength) {
        throw new BadRequestException('Array too large');
      }
      return obj.map(item => this.sanitizeObject(item, depth + 1));
    }

    if (obj && typeof obj === 'object') {
      const sanitized: any = {};
      
      for (const [key, value] of Object.entries(obj)) {
        const sanitizedKey = this.sanitizeValue(key);
        if (typeof sanitizedKey === 'string' && sanitizedKey.length > 0) {
          sanitized[sanitizedKey] = this.sanitizeObject(value, depth + 1);
        }
      }
      
      return sanitized;
    }

    return this.sanitizeValue(obj);
  }

  private sanitizeValue(value: any): any {
    if (typeof value === 'string') {
      if (value.length > this.maxStringLength) {
        throw new BadRequestException('String too long');
      }

      // Remove null bytes and control characters
      let sanitized = value.replace(/\0/g, '').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
      
      // Sanitize HTML content to prevent XSS
      sanitized = DOMPurify.sanitize(sanitized, {
        ALLOWED_TAGS: [], // No HTML tags allowed by default
        ALLOWED_ATTR: [],
        KEEP_CONTENT: true,
      });

      // Additional XSS prevention patterns
      sanitized = this.removeXssPatterns(sanitized);
      
      return sanitized;
    }

    if (typeof value === 'number') {
      // Check for safe integer range
      if (!Number.isFinite(value) || Math.abs(value) > Number.MAX_SAFE_INTEGER) {
        throw new BadRequestException('Invalid number value');
      }
      return value;
    }

    if (typeof value === 'boolean') {
      return value;
    }

    if (value === null || value === undefined) {
      return value;
    }

    // For other types, convert to string and sanitize
    return this.sanitizeValue(String(value));
  }

  private removeXssPatterns(input: string): string {
    const xssPatterns = [
      /javascript:/gi,
      /vbscript:/gi,
      /onload/gi,
      /onerror/gi,
      /onclick/gi,
      /onmouseover/gi,
      /onfocus/gi,
      /onblur/gi,
      /onchange/gi,
      /onsubmit/gi,
      /<script[^>]*>.*?<\/script>/gis,
      /<iframe[^>]*>.*?<\/iframe>/gis,
      /<object[^>]*>.*?<\/object>/gis,
      /<embed[^>]*>/gi,
      /<link[^>]*>/gi,
      /<meta[^>]*>/gi,
      /expression\s*\(/gi,
      /url\s*\(/gi,
      /import\s*\(/gi,
    ];

    let sanitized = input;
    xssPatterns.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '');
    });

    return sanitized;
  }

  private isValidationTarget(metatype: any): boolean {
    const types = [String, Boolean, Number, Array, Object];
    return !types.includes(metatype);
  }
}