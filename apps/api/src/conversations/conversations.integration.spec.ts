import { Test, TestingModule } from '@nestjs/testing'
import { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { ConversationsModule } from './conversations.module'
import { DatabaseModule } from '../database/database.module'
import { PrismaService } from '../database/prisma.service'
import { JwtModule } from '@nestjs/jwt'
import { ConversationType, ConversationMemberRole } from '@prisma/client'
import { AuthModule } from '../auth/auth.module'

describe('ConversationsController (Integration)', () => {
  let app: INestApplication
  let db: PrismaService
  let authToken: string
  let testUser: any
  let otherUser: any

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConversationsModule,
        DatabaseModule,
        AuthModule,
        JwtModule.register({
          secret: 'test-secret',
          signOptions: { expiresIn: '1h' },
        }),
      ],
    }).compile()

    app = moduleFixture.createNestApplication()
    db = moduleFixture.get<PrismaService>(PrismaService)
    
    await app.init()

    // Clean up database
    await db.conversationMember.deleteMany()
    await db.conversation.deleteMany()
    await db.user.deleteMany()

    // Create test users
    testUser = await db.user.create({
      data: {
        username: 'testuser1',
        email: 'test1@example.com',
        name: 'Test User 1',
        passwordHash: 'hashedpassword',
        salt: 'salt',
      },
    })

    otherUser = await db.user.create({
      data: {
        username: 'testuser2',
        email: 'test2@example.com',
        name: 'Test User 2',
        passwordHash: 'hashedpassword',
        salt: 'salt',
      },
    })

    // Generate auth token for test user
    const jwt = require('jsonwebtoken')
    authToken = jwt.sign({ sub: testUser.id, username: testUser.username }, 'test-secret')
  })

  afterAll(async () => {
    // Clean up
    await db.conversationMember.deleteMany()
    await db.conversation.deleteMany()
    await db.user.deleteMany()
    await app.close()
  })

  describe('POST /conversations', () => {
    it('should create a DM conversation', async () => {
      const createDto = {
        type: ConversationType.DM,
        participantIds: [otherUser.id],
      }

      const response = await request(app.getHttpServer())
        .post('/conversations')
        .set('Authorization', `Bearer ${authToken}`)
        .send(createDto)
        .expect(201)

      expect(response.body).toMatchObject({
        type: ConversationType.DM,
        members: expect.arrayContaining([
          expect.objectContaining({ userId: testUser.id }),
          expect.objectContaining({ userId: otherUser.id }),
        ]),
      })
    })

    it('should create a group conversation', async () => {
      const createDto = {
        type: ConversationType.GROUP,
        title: 'Test Group',
        participantIds: [otherUser.id],
      }

      const response = await request(app.getHttpServer())
        .post('/conversations')
        .set('Authorization', `Bearer ${authToken}`)
        .send(createDto)
        .expect(201)

      expect(response.body).toMatchObject({
        type: ConversationType.GROUP,
        title: 'Test Group',
        ownerId: testUser.id,
        members: expect.arrayContaining([
          expect.objectContaining({ 
            userId: testUser.id,
            role: ConversationMemberRole.OWNER,
          }),
          expect.objectContaining({ 
            userId: otherUser.id,
            role: ConversationMemberRole.MEMBER,
          }),
        ]),
      })
    })

    it('should return 400 for invalid DM creation', async () => {
      const createDto = {
        type: ConversationType.DM,
        participantIds: [testUser.id, otherUser.id], // Too many participants
      }

      await request(app.getHttpServer())
        .post('/conversations')
        .set('Authorization', `Bearer ${authToken}`)
        .send(createDto)
        .expect(400)
    })

    it('should return 400 for group without title', async () => {
      const createDto = {
        type: ConversationType.GROUP,
        participantIds: [otherUser.id],
      }

      await request(app.getHttpServer())
        .post('/conversations')
        .set('Authorization', `Bearer ${authToken}`)
        .send(createDto)
        .expect(400)
    })

    it('should return 401 without auth token', async () => {
      const createDto = {
        type: ConversationType.DM,
        participantIds: [otherUser.id],
      }

      await request(app.getHttpServer())
        .post('/conversations')
        .send(createDto)
        .expect(401)
    })
  })

  describe('GET /conversations', () => {
    let dmConversation: any
    let groupConversation: any

    beforeAll(async () => {
      // Create test conversations
      dmConversation = await db.conversation.create({
        data: {
          type: ConversationType.DM,
        },
      })

      await db.conversationMember.createMany({
        data: [
          {
            conversationId: dmConversation.id,
            userId: testUser.id,
            role: ConversationMemberRole.MEMBER,
          },
          {
            conversationId: dmConversation.id,
            userId: otherUser.id,
            role: ConversationMemberRole.MEMBER,
          },
        ],
      })

      groupConversation = await db.conversation.create({
        data: {
          type: ConversationType.GROUP,
          title: 'Test Group',
          ownerId: testUser.id,
        },
      })

      await db.conversationMember.create({
        data: {
          conversationId: groupConversation.id,
          userId: testUser.id,
          role: ConversationMemberRole.OWNER,
        },
      })
    })

    it('should return user conversations', async () => {
      const response = await request(app.getHttpServer())
        .get('/conversations')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body).toMatchObject({
        conversations: expect.arrayContaining([
          expect.objectContaining({
            id: dmConversation.id,
            type: ConversationType.DM,
          }),
          expect.objectContaining({
            id: groupConversation.id,
            type: ConversationType.GROUP,
            title: 'Test Group',
          }),
        ]),
        hasMore: false,
        total: expect.any(Number),
      })
    })

    it('should filter conversations by type', async () => {
      const response = await request(app.getHttpServer())
        .get('/conversations?type=GROUP')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body.conversations).toHaveLength(1)
      expect(response.body.conversations[0]).toMatchObject({
        type: ConversationType.GROUP,
        title: 'Test Group',
      })
    })

    it('should support pagination', async () => {
      const response = await request(app.getHttpServer())
        .get('/conversations?limit=1')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body.conversations).toHaveLength(1)
      expect(response.body.hasMore).toBe(true)
    })

    it('should return 401 without auth token', async () => {
      await request(app.getHttpServer())
        .get('/conversations')
        .expect(401)
    })
  })

  describe('GET /conversations/:id', () => {
    let testConversation: any

    beforeAll(async () => {
      testConversation = await db.conversation.create({
        data: {
          type: ConversationType.DM,
        },
      })

      await db.conversationMember.create({
        data: {
          conversationId: testConversation.id,
          userId: testUser.id,
          role: ConversationMemberRole.MEMBER,
        },
      })
    })

    it('should return specific conversation', async () => {
      const response = await request(app.getHttpServer())
        .get(`/conversations/${testConversation.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body).toMatchObject({
        id: testConversation.id,
        type: ConversationType.DM,
        members: expect.arrayContaining([
          expect.objectContaining({ userId: testUser.id }),
        ]),
      })
    })

    it('should return 404 for non-existent conversation', async () => {
      await request(app.getHttpServer())
        .get('/conversations/nonexistent')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404)
    })

    it('should return 404 for conversation user is not member of', async () => {
      const otherConversation = await db.conversation.create({
        data: {
          type: ConversationType.DM,
        },
      })

      await request(app.getHttpServer())
        .get(`/conversations/${otherConversation.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404)
    })
  })

  describe('PUT /conversations/:id', () => {
    let groupConversation: any

    beforeAll(async () => {
      groupConversation = await db.conversation.create({
        data: {
          type: ConversationType.GROUP,
          title: 'Original Title',
          ownerId: testUser.id,
        },
      })

      await db.conversationMember.create({
        data: {
          conversationId: groupConversation.id,
          userId: testUser.id,
          role: ConversationMemberRole.OWNER,
        },
      })
    })

    it('should update conversation metadata', async () => {
      const updateDto = {
        title: 'Updated Title',
        description: 'New description',
      }

      const response = await request(app.getHttpServer())
        .put(`/conversations/${groupConversation.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateDto)
        .expect(200)

      expect(response.body).toMatchObject({
        title: 'Updated Title',
        description: 'New description',
      })
    })

    it('should return 403 for non-admin user', async () => {
      // Create another user and add as regular member
      const regularUser = await db.user.create({
        data: {
          username: 'regular',
          email: 'regular@example.com',
          name: 'Regular User',
          passwordHash: 'hash',
          salt: 'salt',
        },
      })

      await db.conversationMember.create({
        data: {
          conversationId: groupConversation.id,
          userId: regularUser.id,
          role: ConversationMemberRole.MEMBER,
        },
      })

      const jwt = require('jsonwebtoken')
      const regularToken = jwt.sign({ sub: regularUser.id, username: regularUser.username }, 'test-secret')

      const updateDto = {
        title: 'Unauthorized Update',
      }

      await request(app.getHttpServer())
        .put(`/conversations/${groupConversation.id}`)
        .set('Authorization', `Bearer ${regularToken}`)
        .send(updateDto)
        .expect(403)
    })
  })

  describe('POST /conversations/:id/members', () => {
    let groupConversation: any
    let newUser: any

    beforeAll(async () => {
      groupConversation = await db.conversation.create({
        data: {
          type: ConversationType.GROUP,
          title: 'Test Group for Members',
          ownerId: testUser.id,
        },
      })

      await db.conversationMember.create({
        data: {
          conversationId: groupConversation.id,
          userId: testUser.id,
          role: ConversationMemberRole.OWNER,
        },
      })

      newUser = await db.user.create({
        data: {
          username: 'newuser',
          email: 'new@example.com',
          name: 'New User',
          passwordHash: 'hash',
          salt: 'salt',
        },
      })
    })

    it('should add member to group conversation', async () => {
      const addMemberDto = {
        userId: newUser.id,
        role: ConversationMemberRole.MEMBER,
      }

      const response = await request(app.getHttpServer())
        .post(`/conversations/${groupConversation.id}/members`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(addMemberDto)
        .expect(201)

      expect(response.body.members).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ userId: newUser.id }),
        ])
      )
    })

    it('should return 400 when adding member to DM', async () => {
      const dmConversation = await db.conversation.create({
        data: {
          type: ConversationType.DM,
        },
      })

      await db.conversationMember.create({
        data: {
          conversationId: dmConversation.id,
          userId: testUser.id,
          role: ConversationMemberRole.MEMBER,
        },
      })

      const addMemberDto = {
        userId: newUser.id,
      }

      await request(app.getHttpServer())
        .post(`/conversations/${dmConversation.id}/members`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(addMemberDto)
        .expect(400)
    })
  })

  describe('DELETE /conversations/:id/members/:userId', () => {
    let groupConversation: any
    let memberUser: any

    beforeAll(async () => {
      groupConversation = await db.conversation.create({
        data: {
          type: ConversationType.GROUP,
          title: 'Test Group for Removal',
          ownerId: testUser.id,
        },
      })

      await db.conversationMember.create({
        data: {
          conversationId: groupConversation.id,
          userId: testUser.id,
          role: ConversationMemberRole.OWNER,
        },
      })

      memberUser = await db.user.create({
        data: {
          username: 'memberuser',
          email: 'member@example.com',
          name: 'Member User',
          passwordHash: 'hash',
          salt: 'salt',
        },
      })

      await db.conversationMember.create({
        data: {
          conversationId: groupConversation.id,
          userId: memberUser.id,
          role: ConversationMemberRole.MEMBER,
        },
      })
    })

    it('should remove member from conversation', async () => {
      await request(app.getHttpServer())
        .delete(`/conversations/${groupConversation.id}/members/${memberUser.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(204)

      // Verify member was deactivated
      const member = await db.conversationMember.findFirst({
        where: {
          conversationId: groupConversation.id,
          userId: memberUser.id,
        },
      })

      expect(member?.isActive).toBe(false)
      expect(member?.leftAt).toBeDefined()
    })
  })

  describe('GET /conversations/search', () => {
    let searchableConversation: any

    beforeAll(async () => {
      searchableConversation = await db.conversation.create({
        data: {
          type: ConversationType.GROUP,
          title: 'Searchable Group',
          description: 'This is a searchable group',
          ownerId: testUser.id,
        },
      })

      await db.conversationMember.create({
        data: {
          conversationId: searchableConversation.id,
          userId: testUser.id,
          role: ConversationMemberRole.OWNER,
        },
      })
    })

    it('should search conversations by title', async () => {
      const response = await request(app.getHttpServer())
        .get('/conversations/search?q=Searchable')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body.conversations).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: searchableConversation.id,
            title: 'Searchable Group',
          }),
        ])
      )
    })

    it('should return empty results for empty query', async () => {
      const response = await request(app.getHttpServer())
        .get('/conversations/search?q=')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body).toMatchObject({
        conversations: [],
        total: 0,
        hasMore: false,
      })
    })
  })

  describe('POST /conversations/:id/leave', () => {
    let leaveTestConversation: any

    beforeAll(async () => {
      leaveTestConversation = await db.conversation.create({
        data: {
          type: ConversationType.GROUP,
          title: 'Leave Test Group',
          ownerId: testUser.id,
        },
      })

      await db.conversationMember.create({
        data: {
          conversationId: leaveTestConversation.id,
          userId: testUser.id,
          role: ConversationMemberRole.OWNER,
        },
      })
    })

    it('should allow user to leave conversation', async () => {
      await request(app.getHttpServer())
        .post(`/conversations/${leaveTestConversation.id}/leave`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(204)

      // Verify member was deactivated
      const member = await db.conversationMember.findFirst({
        where: {
          conversationId: leaveTestConversation.id,
          userId: testUser.id,
        },
      })

      expect(member?.isActive).toBe(false)
      expect(member?.leftAt).toBeDefined()
    })
  })
})