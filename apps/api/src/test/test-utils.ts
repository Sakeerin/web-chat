import { Test, TestingModule } from '@nestjs/testing'
import { INestApplication } from '@nestjs/common'
import { PrismaService } from '../database/prisma.service'
import { JwtService } from '@nestjs/jwt'
import { User, Conversation, Message } from '@prisma/client'
import * as request from 'supertest'

/**
 * Test utilities for API testing
 */

export interface TestUser {
  id: string
  email: string
  username: string
  name: string
  password: string
}

export interface TestConversation {
  id: string
  type: 'dm' | 'group'
  title?: string
  ownerId?: string
}

export interface TestMessage {
  id: string
  conversationId: string
  senderId: string
  content: string
  type: 'text' | 'image' | 'video' | 'audio' | 'file'
}

export class TestDataFactory {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService
  ) {}

  /**
   * Create a test user
   */
  async createUser(overrides: Partial<TestUser> = {}): Promise<User> {
    const userData = {
      email: `test-${Date.now()}@example.com`,
      username: `testuser${Date.now()}`,
      name: 'Test User',
      password: 'hashedpassword123',
      ...overrides
    }

    return this.prisma.user.create({
      data: userData
    })
  }

  /**
   * Create multiple test users
   */
  async createUsers(count: number): Promise<User[]> {
    const users: User[] = []
    for (let i = 0; i < count; i++) {
      const user = await this.createUser({
        email: `test-${Date.now()}-${i}@example.com`,
        username: `testuser${Date.now()}${i}`,
        name: `Test User ${i}`
      })
      users.push(user)
    }
    return users
  }

  /**
   * Create a test conversation
   */
  async createConversation(
    participants: string[],
    overrides: Partial<TestConversation> = {}
  ): Promise<Conversation> {
    const conversationData = {
      type: 'dm' as const,
      ...overrides
    }

    const conversation = await this.prisma.conversation.create({
      data: conversationData
    })

    // Add participants
    await this.prisma.conversationMember.createMany({
      data: participants.map(userId => ({
        conversationId: conversation.id,
        userId,
        role: 'member' as const,
        joinedAt: new Date()
      }))
    })

    return conversation
  }

  /**
   * Create a test message
   */
  async createMessage(
    conversationId: string,
    senderId: string,
    overrides: Partial<TestMessage> = {}
  ): Promise<Message> {
    const messageData = {
      conversationId,
      senderId,
      content: 'Test message content',
      type: 'text' as const,
      ...overrides
    }

    return this.prisma.message.create({
      data: messageData
    })
  }

  /**
   * Create multiple test messages
   */
  async createMessages(
    conversationId: string,
    senderId: string,
    count: number
  ): Promise<Message[]> {
    const messages: Message[] = []
    for (let i = 0; i < count; i++) {
      const message = await this.createMessage(conversationId, senderId, {
        content: `Test message ${i + 1}`
      })
      messages.push(message)
    }
    return messages
  }

  /**
   * Generate JWT token for user
   */
  generateAuthToken(userId: string): string {
    return this.jwtService.sign({ sub: userId })
  }

  /**
   * Clean up all test data
   */
  async cleanup(): Promise<void> {
    await this.prisma.messageEdit.deleteMany()
    await this.prisma.messageReceipt.deleteMany()
    await this.prisma.attachment.deleteMany()
    await this.prisma.message.deleteMany()
    await this.prisma.conversationMember.deleteMany()
    await this.prisma.conversation.deleteMany()
    await this.prisma.contactRequest.deleteMany()
    await this.prisma.contact.deleteMany()
    await this.prisma.userSession.deleteMany()
    await this.prisma.user.deleteMany()
  }
}

/**
 * Create a test application with common modules
 */
export async function createTestApplication(
  moduleMetadata: any
): Promise<{ app: INestApplication; testDataFactory: TestDataFactory }> {
  const moduleRef: TestingModule = await Test.createTestingModule(moduleMetadata).compile()
  
  const app = moduleRef.createNestApplication()
  await app.init()
  
  const prisma = app.get<PrismaService>(PrismaService)
  const jwtService = app.get<JwtService>(JwtService)
  const testDataFactory = new TestDataFactory(prisma, jwtService)
  
  return { app, testDataFactory }
}

/**
 * Make authenticated request
 */
export function authenticatedRequest(
  app: INestApplication,
  token: string
): request.Test {
  return request(app.getHttpServer()).set('Authorization', `Bearer ${token}`)
}

/**
 * Wait for a condition to be true
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  timeout = 5000,
  interval = 100
): Promise<void> {
  const start = Date.now()
  
  while (Date.now() - start < timeout) {
    if (await condition()) {
      return
    }
    await new Promise(resolve => setTimeout(resolve, interval))
  }
  
  throw new Error(`Condition not met within ${timeout}ms`)
}

/**
 * Mock Redis client for testing
 */
export const mockRedisClient = {
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
}

/**
 * Mock S3 client for testing
 */
export const mockS3Client = {
  getSignedUrl: jest.fn(),
  upload: jest.fn().mockReturnValue({
    promise: jest.fn().mockResolvedValue({ Location: 'test-url' })
  }),
  deleteObject: jest.fn().mockReturnValue({
    promise: jest.fn().mockResolvedValue({})
  }),
}

/**
 * Mock MeiliSearch client for testing
 */
export const mockMeiliSearchClient = {
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
}