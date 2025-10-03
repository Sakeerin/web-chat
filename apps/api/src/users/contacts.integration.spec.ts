import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../database/prisma.service';
import { UsersModule } from './users.module';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { JwtService } from '@nestjs/jwt';
import { ContactRequestStatus, ReportStatus } from '@prisma/client';
import * as argon2 from 'argon2';

describe('Contacts Integration Tests', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let jwtService: JwtService;

  let user1: any;
  let user2: any;
  let user3: any;
  let user1Token: string;
  let user2Token: string;
  let user3Token: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [DatabaseModule, AuthModule, UsersModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prismaService = moduleFixture.get<PrismaService>(PrismaService);
    jwtService = moduleFixture.get<JwtService>(JwtService);

    // Clean up database
    await prismaService.userReport.deleteMany();
    await prismaService.blockedUser.deleteMany();
    await prismaService.contactRequest.deleteMany();
    await prismaService.userSession.deleteMany();
    await prismaService.user.deleteMany();

    // Create test users
    const salt = 'test-salt';
    const hashedPassword = await argon2.hash('password123', { salt: Buffer.from(salt) });

    user1 = await prismaService.user.create({
      data: {
        username: 'testuser1',
        email: 'user1@test.com',
        name: 'Test User 1',
        passwordHash: hashedPassword,
        salt,
        privacySettings: {
          allowContactRequests: true,
          lastSeenVisibility: 'EVERYONE',
          showOnlineStatus: true,
        },
      },
    });

    user2 = await prismaService.user.create({
      data: {
        username: 'testuser2',
        email: 'user2@test.com',
        name: 'Test User 2',
        passwordHash: hashedPassword,
        salt,
        privacySettings: {
          allowContactRequests: true,
          lastSeenVisibility: 'CONTACTS',
          showOnlineStatus: true,
        },
      },
    });

    user3 = await prismaService.user.create({
      data: {
        username: 'testuser3',
        email: 'user3@test.com',
        name: 'Test User 3',
        passwordHash: hashedPassword,
        salt,
        privacySettings: {
          allowContactRequests: false,
          lastSeenVisibility: 'NOBODY',
          showOnlineStatus: false,
        },
      },
    });

    // Generate JWT tokens
    user1Token = jwtService.sign({ sub: user1.id, username: user1.username });
    user2Token = jwtService.sign({ sub: user2.id, username: user2.username });
    user3Token = jwtService.sign({ sub: user3.id, username: user3.username });
  });

  afterAll(async () => {
    // Clean up
    await prismaService.userReport.deleteMany();
    await prismaService.blockedUser.deleteMany();
    await prismaService.contactRequest.deleteMany();
    await prismaService.userSession.deleteMany();
    await prismaService.user.deleteMany();
    await app.close();
  });

  beforeEach(async () => {
    // Clean up contact-related data before each test
    await prismaService.userReport.deleteMany();
    await prismaService.blockedUser.deleteMany();
    await prismaService.contactRequest.deleteMany();
  });

  describe('POST /users/contacts/requests', () => {
    it('should send a contact request successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/users/contacts/requests')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          username: 'testuser2',
          message: 'Hello, let\'s connect!',
        })
        .expect(201);

      expect(response.body).toMatchObject({
        senderId: user1.id,
        receiverId: user2.id,
        status: ContactRequestStatus.PENDING,
        message: 'Hello, let\'s connect!',
      });
      expect(response.body.sender.username).toBe('testuser1');
      expect(response.body.receiver.username).toBe('testuser2');
    });

    it('should return 404 when user not found', async () => {
      await request(app.getHttpServer())
        .post('/users/contacts/requests')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          username: 'nonexistent',
          message: 'Hello!',
        })
        .expect(404);
    });

    it('should return 400 when trying to send request to self', async () => {
      await request(app.getHttpServer())
        .post('/users/contacts/requests')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          username: 'testuser1',
          message: 'Hello!',
        })
        .expect(400);
    });

    it('should return 403 when user does not allow contact requests', async () => {
      await request(app.getHttpServer())
        .post('/users/contacts/requests')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          username: 'testuser3',
          message: 'Hello!',
        })
        .expect(403);
    });

    it('should auto-accept when reverse request exists', async () => {
      // User2 sends request to User1 first
      await prismaService.contactRequest.create({
        data: {
          senderId: user2.id,
          receiverId: user1.id,
          status: ContactRequestStatus.PENDING,
          message: 'Hi there!',
        },
      });

      // User1 sends request to User2 (should auto-accept both)
      const response = await request(app.getHttpServer())
        .post('/users/contacts/requests')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          username: 'testuser2',
          message: 'Hello back!',
        })
        .expect(201);

      expect(response.body.status).toBe(ContactRequestStatus.ACCEPTED);

      // Check that both requests are now accepted
      const requests = await prismaService.contactRequest.findMany({
        where: {
          OR: [
            { senderId: user1.id, receiverId: user2.id },
            { senderId: user2.id, receiverId: user1.id },
          ],
        },
      });

      expect(requests).toHaveLength(2);
      expect(requests.every(r => r.status === ContactRequestStatus.ACCEPTED)).toBe(true);
    });
  });

  describe('PUT /users/contacts/requests/:requestId', () => {
    let contactRequest: any;

    beforeEach(async () => {
      contactRequest = await prismaService.contactRequest.create({
        data: {
          senderId: user1.id,
          receiverId: user2.id,
          status: ContactRequestStatus.PENDING,
          message: 'Hello!',
        },
      });
    });

    it('should accept a contact request successfully', async () => {
      const response = await request(app.getHttpServer())
        .put(`/users/contacts/requests/${contactRequest.id}`)
        .set('Authorization', `Bearer ${user2Token}`)
        .send({
          status: ContactRequestStatus.ACCEPTED,
        })
        .expect(200);

      expect(response.body.status).toBe(ContactRequestStatus.ACCEPTED);
    });

    it('should decline a contact request successfully', async () => {
      const response = await request(app.getHttpServer())
        .put(`/users/contacts/requests/${contactRequest.id}`)
        .set('Authorization', `Bearer ${user2Token}`)
        .send({
          status: ContactRequestStatus.DECLINED,
        })
        .expect(200);

      expect(response.body.status).toBe(ContactRequestStatus.DECLINED);
    });

    it('should return 404 when request not found', async () => {
      await request(app.getHttpServer())
        .put('/users/contacts/requests/nonexistent')
        .set('Authorization', `Bearer ${user2Token}`)
        .send({
          status: ContactRequestStatus.ACCEPTED,
        })
        .expect(404);
    });

    it('should return 403 when user is not the receiver', async () => {
      await request(app.getHttpServer())
        .put(`/users/contacts/requests/${contactRequest.id}`)
        .set('Authorization', `Bearer ${user3Token}`)
        .send({
          status: ContactRequestStatus.ACCEPTED,
        })
        .expect(403);
    });
  });

  describe('GET /users/contacts/requests/pending', () => {
    beforeEach(async () => {
      await prismaService.contactRequest.createMany({
        data: [
          {
            senderId: user1.id,
            receiverId: user2.id,
            status: ContactRequestStatus.PENDING,
            message: 'Hello from user1!',
          },
          {
            senderId: user3.id,
            receiverId: user2.id,
            status: ContactRequestStatus.PENDING,
            message: 'Hello from user3!',
          },
        ],
      });
    });

    it('should return pending contact requests', async () => {
      const response = await request(app.getHttpServer())
        .get('/users/contacts/requests/pending')
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(200);

      expect(response.body).toHaveLength(2);
      expect(response.body[0].status).toBe(ContactRequestStatus.PENDING);
      expect(response.body[1].status).toBe(ContactRequestStatus.PENDING);
    });

    it('should return empty array when no pending requests', async () => {
      const response = await request(app.getHttpServer())
        .get('/users/contacts/requests/pending')
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      expect(response.body).toHaveLength(0);
    });
  });

  describe('GET /users/contacts/requests/sent', () => {
    beforeEach(async () => {
      await prismaService.contactRequest.createMany({
        data: [
          {
            senderId: user1.id,
            receiverId: user2.id,
            status: ContactRequestStatus.PENDING,
            message: 'Hello user2!',
          },
          {
            senderId: user1.id,
            receiverId: user3.id,
            status: ContactRequestStatus.PENDING,
            message: 'Hello user3!',
          },
        ],
      });
    });

    it('should return sent contact requests', async () => {
      const response = await request(app.getHttpServer())
        .get('/users/contacts/requests/sent')
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      expect(response.body).toHaveLength(2);
      expect(response.body.every((r: any) => r.senderId === user1.id)).toBe(true);
    });
  });

  describe('GET /users/contacts', () => {
    beforeEach(async () => {
      // Create accepted contact relationships
      await prismaService.contactRequest.createMany({
        data: [
          {
            senderId: user1.id,
            receiverId: user2.id,
            status: ContactRequestStatus.ACCEPTED,
          },
          {
            senderId: user3.id,
            receiverId: user1.id,
            status: ContactRequestStatus.ACCEPTED,
          },
        ],
      });
    });

    it('should return contacts list', async () => {
      const response = await request(app.getHttpServer())
        .get('/users/contacts')
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      expect(response.body.contacts).toHaveLength(2);
      expect(response.body.total).toBe(2);
      expect(response.body.hasMore).toBe(false);

      const contactIds = response.body.contacts.map((c: any) => c.id);
      expect(contactIds).toContain(user2.id);
      expect(contactIds).toContain(user3.id);
    });

    it('should respect privacy settings for last seen', async () => {
      const response = await request(app.getHttpServer())
        .get('/users/contacts')
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      const user2Contact = response.body.contacts.find((c: any) => c.id === user2.id);
      const user3Contact = response.body.contacts.find((c: any) => c.id === user3.id);

      // User2 allows contacts to see last seen, User3 doesn't
      expect(user2Contact.lastSeenAt).toBeDefined();
      expect(user3Contact.lastSeenAt).toBeUndefined();
    });
  });

  describe('DELETE /users/contacts/:contactId', () => {
    beforeEach(async () => {
      await prismaService.contactRequest.create({
        data: {
          senderId: user1.id,
          receiverId: user2.id,
          status: ContactRequestStatus.ACCEPTED,
        },
      });
    });

    it('should remove contact successfully', async () => {
      await request(app.getHttpServer())
        .delete(`/users/contacts/${user2.id}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(204);

      // Verify contact is removed
      const contacts = await prismaService.contactRequest.findMany({
        where: {
          OR: [
            { senderId: user1.id, receiverId: user2.id },
            { senderId: user2.id, receiverId: user1.id },
          ],
        },
      });

      expect(contacts).toHaveLength(0);
    });

    it('should return 404 when contact relationship not found', async () => {
      await request(app.getHttpServer())
        .delete(`/users/contacts/${user3.id}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(404);
    });
  });

  describe('POST /users/blocked', () => {
    it('should block user successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/users/blocked')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          userId: user2.id,
          reason: 'Spam messages',
        })
        .expect(201);

      expect(response.body).toMatchObject({
        blockingUserId: user1.id,
        blockedUserId: user2.id,
        reason: 'Spam messages',
      });
    });

    it('should return 400 when trying to block self', async () => {
      await request(app.getHttpServer())
        .post('/users/blocked')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          userId: user1.id,
          reason: 'Test',
        })
        .expect(400);
    });

    it('should return 404 when user not found', async () => {
      await request(app.getHttpServer())
        .post('/users/blocked')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          userId: 'nonexistent',
          reason: 'Test',
        })
        .expect(404);
    });

    it('should remove existing contact relationship when blocking', async () => {
      // Create contact relationship first
      await prismaService.contactRequest.create({
        data: {
          senderId: user1.id,
          receiverId: user2.id,
          status: ContactRequestStatus.ACCEPTED,
        },
      });

      await request(app.getHttpServer())
        .post('/users/blocked')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          userId: user2.id,
          reason: 'Changed my mind',
        })
        .expect(201);

      // Verify contact relationship is removed
      const contacts = await prismaService.contactRequest.findMany({
        where: {
          OR: [
            { senderId: user1.id, receiverId: user2.id },
            { senderId: user2.id, receiverId: user1.id },
          ],
        },
      });

      expect(contacts).toHaveLength(0);
    });
  });

  describe('POST /users/blocked/username', () => {
    it('should block user by username successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/users/blocked/username')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          username: 'testuser2',
          reason: 'Inappropriate behavior',
        })
        .expect(201);

      expect(response.body.blockedUser.username).toBe('testuser2');
    });

    it('should return 404 when username not found', async () => {
      await request(app.getHttpServer())
        .post('/users/blocked/username')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          username: 'nonexistent',
          reason: 'Test',
        })
        .expect(404);
    });
  });

  describe('DELETE /users/blocked/:userId', () => {
    beforeEach(async () => {
      await prismaService.blockedUser.create({
        data: {
          blockingUserId: user1.id,
          blockedUserId: user2.id,
          reason: 'Test block',
        },
      });
    });

    it('should unblock user successfully', async () => {
      await request(app.getHttpServer())
        .delete(`/users/blocked/${user2.id}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(204);

      // Verify user is unblocked
      const blockedUser = await prismaService.blockedUser.findUnique({
        where: {
          blockingUserId_blockedUserId: {
            blockingUserId: user1.id,
            blockedUserId: user2.id,
          },
        },
      });

      expect(blockedUser).toBeNull();
    });

    it('should return 404 when user is not blocked', async () => {
      await request(app.getHttpServer())
        .delete(`/users/blocked/${user3.id}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(404);
    });
  });

  describe('GET /users/blocked', () => {
    beforeEach(async () => {
      await prismaService.blockedUser.createMany({
        data: [
          {
            blockingUserId: user1.id,
            blockedUserId: user2.id,
            reason: 'Spam',
          },
          {
            blockingUserId: user1.id,
            blockedUserId: user3.id,
            reason: 'Harassment',
          },
        ],
      });
    });

    it('should return blocked users list', async () => {
      const response = await request(app.getHttpServer())
        .get('/users/blocked')
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      expect(response.body.blockedUsers).toHaveLength(2);
      expect(response.body.total).toBe(2);
      expect(response.body.hasMore).toBe(false);
    });
  });

  describe('POST /users/reports', () => {
    it('should report user successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/users/reports')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          userId: user2.id,
          reason: 'Harassment',
          description: 'Sending inappropriate messages',
        })
        .expect(201);

      expect(response.body).toMatchObject({
        reporterId: user1.id,
        reportedUserId: user2.id,
        reason: 'Harassment',
        description: 'Sending inappropriate messages',
        status: ReportStatus.PENDING,
      });
    });

    it('should return 400 when trying to report self', async () => {
      await request(app.getHttpServer())
        .post('/users/reports')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          userId: user1.id,
          reason: 'Test',
        })
        .expect(400);
    });

    it('should return 404 when user not found', async () => {
      await request(app.getHttpServer())
        .post('/users/reports')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          userId: 'nonexistent',
          reason: 'Test',
        })
        .expect(404);
    });
  });

  describe('POST /users/reports/username', () => {
    it('should report user by username successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/users/reports/username')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          username: 'testuser2',
          reason: 'Spam',
          description: 'Posting spam content',
        })
        .expect(201);

      expect(response.body.reported.username).toBe('testuser2');
    });
  });

  describe('GET /users/contacts/check/:userId', () => {
    it('should return true when users are contacts', async () => {
      await prismaService.contactRequest.create({
        data: {
          senderId: user1.id,
          receiverId: user2.id,
          status: ContactRequestStatus.ACCEPTED,
        },
      });

      const response = await request(app.getHttpServer())
        .get(`/users/contacts/check/${user2.id}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      expect(response.body.areContacts).toBe(true);
    });

    it('should return false when users are not contacts', async () => {
      const response = await request(app.getHttpServer())
        .get(`/users/contacts/check/${user3.id}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      expect(response.body.areContacts).toBe(false);
    });
  });

  describe('Authorization', () => {
    it('should return 401 when no token provided', async () => {
      await request(app.getHttpServer())
        .post('/users/contacts/requests')
        .send({
          username: 'testuser2',
          message: 'Hello!',
        })
        .expect(401);
    });

    it('should return 401 when invalid token provided', async () => {
      await request(app.getHttpServer())
        .post('/users/contacts/requests')
        .set('Authorization', 'Bearer invalid-token')
        .send({
          username: 'testuser2',
          message: 'Hello!',
        })
        .expect(401);
    });
  });
});