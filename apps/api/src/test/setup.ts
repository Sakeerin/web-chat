import { Test } from '@nestjs/testing'
import { INestApplication } from '@nestjs/common'

// Global test setup
beforeAll(async () => {
  // Set test environment variables
  process.env.NODE_ENV = 'test'
  process.env.JWT_SECRET = 'test-jwt-secret'
  process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db'
  process.env.REDIS_URL = 'redis://localhost:6379/1'
})

// Mock external services
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    exists: jest.fn(),
    expire: jest.fn(),
    publish: jest.fn(),
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
    on: jest.fn(),
    disconnect: jest.fn(),
  }))
})

jest.mock('meilisearch', () => ({
  MeiliSearch: jest.fn().mockImplementation(() => ({
    index: jest.fn().mockReturnValue({
      addDocuments: jest.fn(),
      updateDocuments: jest.fn(),
      deleteDocument: jest.fn(),
      search: jest.fn(),
      getSettings: jest.fn(),
      updateSettings: jest.fn(),
    }),
    createIndex: jest.fn(),
    getIndex: jest.fn(),
    deleteIndex: jest.fn(),
  }))
}))

jest.mock('aws-sdk', () => ({
  S3: jest.fn().mockImplementation(() => ({
    getSignedUrl: jest.fn(),
    upload: jest.fn().mockReturnValue({
      promise: jest.fn().mockResolvedValue({ Location: 'test-url' })
    }),
    deleteObject: jest.fn().mockReturnValue({
      promise: jest.fn().mockResolvedValue({})
    }),
  })),
  config: {
    update: jest.fn()
  }
}))

// Mock file system operations
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  createReadStream: jest.fn(),
  createWriteStream: jest.fn(),
  unlink: jest.fn((path, callback) => callback()),
  unlinkSync: jest.fn(),
}))

// Mock sharp for image processing
jest.mock('sharp', () => {
  return jest.fn().mockImplementation(() => ({
    resize: jest.fn().mockReturnThis(),
    jpeg: jest.fn().mockReturnThis(),
    png: jest.fn().mockReturnThis(),
    webp: jest.fn().mockReturnThis(),
    toBuffer: jest.fn().mockResolvedValue(Buffer.from('test-image')),
    toFile: jest.fn().mockResolvedValue({}),
    metadata: jest.fn().mockResolvedValue({
      width: 100,
      height: 100,
      format: 'jpeg'
    })
  }))
})

// Mock ffmpeg for video processing
jest.mock('fluent-ffmpeg', () => {
  const mockFfmpeg: any = jest.fn().mockImplementation(() => ({
    screenshots: jest.fn().mockReturnThis(),
    on: jest.fn().mockReturnThis(),
    save: jest.fn(),
  }))
  
  mockFfmpeg.ffprobe = jest.fn((path, callback) => {
    callback(null, {
      streams: [{
        width: 1920,
        height: 1080,
        duration: 60
      }]
    })
  })
  
  return mockFfmpeg
})

// Mock ClamAV antivirus
jest.mock('clamscan', () => ({
  init: jest.fn().mockResolvedValue({
    scanFile: jest.fn().mockResolvedValue({
      isInfected: false,
      viruses: []
    })
  })
}))

// Global test utilities
export const createTestApp = async (moduleMetadata: any): Promise<INestApplication> => {
  const moduleRef = await Test.createTestingModule(moduleMetadata).compile()
  const app = moduleRef.createNestApplication()
  await app.init()
  return app
}

export const closeTestApp = async (app: INestApplication): Promise<void> => {
  if (app) {
    await app.close()
  }
}

// Cleanup after each test
afterEach(() => {
  jest.clearAllMocks()
})