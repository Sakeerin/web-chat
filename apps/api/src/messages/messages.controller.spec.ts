import { Test, TestingModule } from '@nestjs/testing'
import { MessagesController } from './messages.controller'
import { MessagesService } from './messages.service'
import { MessageType } from '@prisma/client'
import { CreateMessageDto } from './dto/create-message.dto'
import { UpdateMessageDto } from './dto/update-message.dto'
import { GetMessagesDto } from './dto/get-messages.dto'

describe('MessagesController', () => {
  let controller: MessagesController
  let messagesService: jest.Mocked<MessagesService>

  const mockUser = { id: 'user-1', username: 'testuser' }
  const mockRequest = { user: mockUser }

  const mockMessage = {
    id: 'msg-1',
    conversationId: 'conv-1',
    senderId: 'user-1',
    type: MessageType.TEXT,
    content: 'Hello world',
    metadata: {},
    replyToId: null,
    isEdited: false,
    isDeleted: false,
    deletedAt: null,
    createdAt: new Date(),
    editedAt: null,
    sender: {
      id: 'user-1',
      username: 'testuser',
      name: 'Test User',
      avatarUrl: undefined,
    },
    replyTo: undefined,
    attachments: [],
    edits: [],
    _count: { receipts: 0 },
  }

  const mockMessageListResponse = {
    messages: [mockMessage],
    nextCursor: undefined,
    hasMore: false,
    total: 1,
  }

  beforeEach(async () => {
    const mockMessagesService = {
      createMessage: jest.fn(),
      getMessages: jest.fn(),
      getMessage: jest.fn(),
      editMessage: jest.fn(),
      deleteMessage: jest.fn(),
      getMessageEditHistory: jest.fn(),
      searchMessages: jest.fn(),
      searchAllMessages: jest.fn(),
      getSearchSuggestions: jest.fn(),
      markMessagesAsRead: jest.fn(),
      getUnreadCount: jest.fn(),
      messageDeliveryService: {
        markMessageAsRead: jest.fn(),
        getMessageDeliveryState: jest.fn(),
        backfillMessages: jest.fn(),
      },
    }

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MessagesController],
      providers: [
        {
          provide: MessagesService,
          useValue: mockMessagesService,
        },
      ],
    }).compile()

    controller = module.get<MessagesController>(MessagesController)
    messagesService = module.get(MessagesService)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('createMessage', () => {
    it('should create a message', async () => {
      const createMessageDto: CreateMessageDto = {
        conversationId: 'conv-1',
        type: MessageType.TEXT,
        content: 'Hello world',
      }

      messagesService.createMessage.mockResolvedValue(mockMessage)

      const result = await controller.createMessage(createMessageDto, mockRequest)

      expect(messagesService.createMessage).toHaveBeenCalledWith({
        ...createMessageDto,
        senderId: mockUser.id,
      })
      expect(result).toEqual({ message: mockMessage })
    })
  })

  describe('getMessages', () => {
    it('should get messages for a conversation', async () => {
      const query: GetMessagesDto = { limit: 50 }
      
      messagesService.getMessages.mockResolvedValue(mockMessageListResponse)

      const result = await controller.getMessages('conv-1', query, mockRequest)

      expect(messagesService.getMessages).toHaveBeenCalledWith('conv-1', mockUser.id, query)
      expect(result).toEqual(mockMessageListResponse)
    })
  })

  describe('searchMessages', () => {
    it('should search messages in a conversation', async () => {
      const mockSearchResult = {
        messages: [mockMessage],
        total: 1,
        hasMore: false,
      }

      messagesService.searchMessages.mockResolvedValue(mockSearchResult)

      const result = await controller.searchMessages('conv-1', 'hello', mockRequest, '50', '0')

      expect(messagesService.searchMessages).toHaveBeenCalledWith('conv-1', mockUser.id, 'hello', 50, 0)
      expect(result).toEqual(mockSearchResult)
    })

    it('should use default values for limit and offset', async () => {
      const mockSearchResult = {
        messages: [mockMessage],
        total: 1,
        hasMore: false,
      }

      messagesService.searchMessages.mockResolvedValue(mockSearchResult)

      const result = await controller.searchMessages('conv-1', 'hello', mockRequest, undefined, undefined)

      expect(messagesService.searchMessages).toHaveBeenCalledWith('conv-1', mockUser.id, 'hello', 50, 0)
      expect(result).toEqual(mockSearchResult)
    })
  })

  describe('getUnreadCount', () => {
    it('should get unread message count', async () => {
      messagesService.getUnreadCount.mockResolvedValue(5)

      const result = await controller.getUnreadCount('conv-1', mockRequest)

      expect(messagesService.getUnreadCount).toHaveBeenCalledWith('conv-1', mockUser.id)
      expect(result).toEqual({ count: 5 })
    })
  })

  describe('getMessage', () => {
    it('should get a single message', async () => {
      messagesService.getMessage.mockResolvedValue(mockMessage)

      const result = await controller.getMessage('msg-1', mockRequest)

      expect(messagesService.getMessage).toHaveBeenCalledWith('msg-1', mockUser.id)
      expect(result).toEqual(mockMessage)
    })
  })

  describe('getMessageEditHistory', () => {
    it('should get message edit history', async () => {
      const mockEditHistory = [
        {
          id: 'edit-1',
          previousContent: 'Original content',
          editedAt: new Date(),
        },
      ]

      messagesService.getMessageEditHistory.mockResolvedValue(mockEditHistory)

      const result = await controller.getMessageEditHistory('msg-1', mockRequest)

      expect(messagesService.getMessageEditHistory).toHaveBeenCalledWith('msg-1', mockUser.id)
      expect(result).toEqual(mockEditHistory)
    })
  })

  describe('editMessage', () => {
    it('should edit a message', async () => {
      const updateMessageDto: UpdateMessageDto = {
        content: 'Updated content',
      }

      const updatedMessage = { ...mockMessage, content: 'Updated content', isEdited: true, editedAt: new Date() }
      messagesService.editMessage.mockResolvedValue(updatedMessage)

      const result = await controller.editMessage('msg-1', updateMessageDto, mockRequest)

      expect(messagesService.editMessage).toHaveBeenCalledWith('msg-1', mockUser.id, updateMessageDto)
      expect(result).toEqual(updatedMessage)
    })
  })

  describe('deleteMessage', () => {
    it('should delete a message', async () => {
      messagesService.deleteMessage.mockResolvedValue(undefined)

      const result = await controller.deleteMessage('msg-1', mockRequest)

      expect(messagesService.deleteMessage).toHaveBeenCalledWith('msg-1', mockUser.id)
      expect(result).toBeUndefined()
    })
  })

  describe('markAsRead', () => {
    it('should mark a message as read', async () => {
      messagesService.markMessagesAsRead.mockResolvedValue(undefined)

      const result = await controller.markAsRead('msg-1', 'conv-1', mockRequest)

      expect(messagesService.messageDeliveryService.markMessageAsRead).toHaveBeenCalledWith('msg-1', mockUser.id, 'conv-1')
      expect(result).toBeUndefined()
    })
  })

  describe('searchAllMessages', () => {
    it('should search across all user messages', async () => {
      const mockSearchResult = {
        messages: [mockMessage],
        total: 1,
        hasMore: false,
      }

      messagesService.searchAllMessages.mockResolvedValue(mockSearchResult)

      const result = await controller.searchAllMessages('hello', mockRequest, '50', '0', undefined, undefined, undefined)

      expect(messagesService.searchAllMessages).toHaveBeenCalledWith(mockUser.id, 'hello', {
        limit: 50,
        offset: 0,
      })
      expect(result).toEqual(mockSearchResult)
    })

    it('should handle date filters and message types', async () => {
      const mockSearchResult = {
        messages: [mockMessage],
        total: 1,
        hasMore: false,
      }

      messagesService.searchAllMessages.mockResolvedValue(mockSearchResult)

      const result = await controller.searchAllMessages(
        'hello',
        mockRequest,
        '25',
        '10',
        '2024-01-01',
        '2024-01-31',
        'TEXT,IMAGE'
      )

      expect(messagesService.searchAllMessages).toHaveBeenCalledWith(mockUser.id, 'hello', {
        limit: 25,
        offset: 10,
        dateFrom: new Date('2024-01-01'),
        dateTo: new Date('2024-01-31'),
        messageTypes: ['TEXT', 'IMAGE'],
      })
      expect(result).toEqual(mockSearchResult)
    })
  })

  describe('getSearchSuggestions', () => {
    it('should get search suggestions', async () => {
      const mockSuggestions = ['hello', 'help', 'health']
      messagesService.getSearchSuggestions.mockResolvedValue(mockSuggestions)

      const result = await controller.getSearchSuggestions('hel', mockRequest)

      expect(messagesService.getSearchSuggestions).toHaveBeenCalledWith(mockUser.id, 'hel')
      expect(result).toEqual({ suggestions: mockSuggestions })
    })
  })
})