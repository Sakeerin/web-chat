import { Test, TestingModule } from '@nestjs/testing'
import { MessagesService } from './messages.service'
import { MessagesController } from './messages.controller'
import { MessageSearchService } from './search/message-search.service'
import { MessageDeliveryService } from './delivery/message-delivery.service'
import { PrismaService } from '../database/prisma.service'

describe('Messages Module Integration', () => {
  let messagesService: MessagesService
  let messagesController: MessagesController

  beforeAll(async () => {
    const mockPrismaService = {
      conversationMember: { findFirst: jest.fn() },
      message: { create: jest.fn(), findMany: jest.fn(), count: jest.fn() },
      conversation: { update: jest.fn() },
    }

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [MessagesController],
      providers: [
        MessagesService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: MessageSearchService,
          useValue: {
            searchMessages: jest.fn(),
            getSearchSuggestions: jest.fn(),
          },
        },
        {
          provide: MessageDeliveryService,
          useValue: {
            deliverMessage: jest.fn(),
            markMessageAsRead: jest.fn(),
            getMessageDeliveryState: jest.fn(),
            backfillMessages: jest.fn(),
          },
        },
      ],
    }).compile()

    messagesService = moduleFixture.get<MessagesService>(MessagesService)
    messagesController = moduleFixture.get<MessagesController>(MessagesController)
  })

  describe('Module Structure', () => {
    it('should have MessagesService defined', () => {
      expect(messagesService).toBeDefined()
    })

    it('should have MessagesController defined', () => {
      expect(messagesController).toBeDefined()
    })

    it('should have all required service methods', () => {
      expect(typeof messagesService.createMessage).toBe('function')
      expect(typeof messagesService.getMessages).toBe('function')
      expect(typeof messagesService.getMessage).toBe('function')
      expect(typeof messagesService.editMessage).toBe('function')
      expect(typeof messagesService.deleteMessage).toBe('function')
      expect(typeof messagesService.searchMessages).toBe('function')
      expect(typeof messagesService.markMessagesAsRead).toBe('function')
      expect(typeof messagesService.getUnreadCount).toBe('function')
    })

    it('should have all required controller methods', () => {
      expect(typeof messagesController.createMessage).toBe('function')
      expect(typeof messagesController.getMessages).toBe('function')
      expect(typeof messagesController.getMessage).toBe('function')
      expect(typeof messagesController.editMessage).toBe('function')
      expect(typeof messagesController.deleteMessage).toBe('function')
      expect(typeof messagesController.searchMessages).toBe('function')
      expect(typeof messagesController.getUnreadCount).toBe('function')
    })
  })
})