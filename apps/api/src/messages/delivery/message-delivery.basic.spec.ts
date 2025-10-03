import { Test, TestingModule } from '@nestjs/testing'
import { MessageDeliveryService } from './message-delivery.service'
import { PrismaService } from '../../database/prisma.service'
import { WebSocketService } from '../../websocket/websocket.service'

describe('MessageDeliveryService Basic', () => {
  let service: MessageDeliveryService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessageDeliveryService,
        {
          provide: PrismaService,
          useValue: {
            conversationMember: { findMany: jest.fn(), updateMany: jest.fn() },
            user: { findUnique: jest.fn() },
            messageReceipt: { upsert: jest.fn() },
            message: { findFirst: jest.fn(), findMany: jest.fn() },
          },
        },
        {
          provide: WebSocketService,
          useValue: {
            isUserOnline: jest.fn(),
            broadcastToUser: jest.fn(),
            broadcastMessageReceipt: jest.fn(),
            getUserSocketIds: jest.fn(),
            sendMessageAckToSocket: jest.fn(),
          },
        },
      ],
    }).compile()

    service = module.get<MessageDeliveryService>(MessageDeliveryService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  it('should have deliverMessage method', () => {
    expect(service.deliverMessage).toBeDefined()
    expect(typeof service.deliverMessage).toBe('function')
  })

  it('should have processOfflineMessages method', () => {
    expect(service.processOfflineMessages).toBeDefined()
    expect(typeof service.processOfflineMessages).toBe('function')
  })

  it('should have markMessageAsRead method', () => {
    expect(service.markMessageAsRead).toBeDefined()
    expect(typeof service.markMessageAsRead).toBe('function')
  })

  it('should have getMessageDeliveryState method', () => {
    expect(service.getMessageDeliveryState).toBeDefined()
    expect(typeof service.getMessageDeliveryState).toBe('function')
  })

  it('should have backfillMessages method', () => {
    expect(service.backfillMessages).toBeDefined()
    expect(typeof service.backfillMessages).toBe('function')
  })
})