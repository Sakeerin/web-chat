import { Test, TestingModule } from '@nestjs/testing'
import { HttpExceptionFilter } from './filters/http-exception.filter'
import { ZodValidationPipe } from './pipes/zod-validation.pipe'
import { JwtAuthGuard } from './guards/jwt-auth.guard'
import { LoggingInterceptor } from './interceptors/logging.interceptor'
import { TransformInterceptor } from './interceptors/transform.interceptor'
import { z } from 'zod'

describe('REST API Infrastructure Components', () => {
  describe('ZodValidationPipe', () => {
    it('should validate data successfully', () => {
      const schema = z.object({
        name: z.string().min(1),
        age: z.number().min(0),
      })
      
      const pipe = new ZodValidationPipe(schema)
      const validData = { name: 'John', age: 25 }
      
      const result = pipe.transform(validData, { type: 'body' })
      expect(result).toEqual(validData)
    })

    it('should throw BadRequestException for invalid data', () => {
      const schema = z.object({
        name: z.string().min(1),
        age: z.number().min(0),
      })
      
      const pipe = new ZodValidationPipe(schema)
      const invalidData = { name: '', age: -1 }
      
      expect(() => pipe.transform(invalidData, { type: 'body' }))
        .toThrow()
    })
  })

  describe('HttpExceptionFilter', () => {
    it('should create structured error response', () => {
      const filter = new HttpExceptionFilter()
      
      // This is a basic test - in a real scenario you'd mock the ArgumentsHost
      expect(filter).toBeDefined()
    })
  })

  describe('LoggingInterceptor', () => {
    it('should be instantiable', () => {
      const interceptor = new LoggingInterceptor()
      expect(interceptor).toBeDefined()
    })
  })

  describe('TransformInterceptor', () => {
    it('should be instantiable', () => {
      const interceptor = new TransformInterceptor()
      expect(interceptor).toBeDefined()
    })
  })
})