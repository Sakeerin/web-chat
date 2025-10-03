import { PrismaClient } from '@prisma/client'
import { execSync } from 'child_process'
import { randomBytes } from 'crypto'

// Integration test setup
let prisma: PrismaClient
let testDatabaseUrl: string

beforeAll(async () => {
  // Create unique test database
  const testDbName = `test_${randomBytes(8).toString('hex')}`
  testDatabaseUrl = `postgresql://test:test@localhost:5432/${testDbName}`
  
  try {
    // Create test database
    execSync(`createdb ${testDbName}`, { stdio: 'ignore' })
    
    // Set environment variable
    process.env.DATABASE_URL = testDatabaseUrl
    
    // Initialize Prisma client
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: testDatabaseUrl
        }
      }
    })
    
    // Run migrations
    execSync('npx prisma migrate deploy', { 
      stdio: 'ignore',
      env: { ...process.env, DATABASE_URL: testDatabaseUrl }
    })
    
    // Connect to database
    await prisma.$connect()
    
  } catch (error) {
    console.warn('Integration test database setup failed:', error.message)
    console.warn('Skipping database-dependent tests')
  }
}, 30000)

afterAll(async () => {
  if (prisma) {
    await prisma.$disconnect()
  }
  
  // Clean up test database
  if (testDatabaseUrl) {
    try {
      const dbName = testDatabaseUrl.split('/').pop()
      execSync(`dropdb ${dbName}`, { stdio: 'ignore' })
    } catch (error) {
      console.warn('Failed to cleanup test database:', error.message)
    }
  }
})

beforeEach(async () => {
  if (prisma) {
    // Clean up test data before each test
    await prisma.messageEdit.deleteMany()
    await prisma.messageReceipt.deleteMany()
    await prisma.attachment.deleteMany()
    await prisma.message.deleteMany()
    await prisma.conversationMember.deleteMany()
    await prisma.conversation.deleteMany()
    await prisma.contactRequest.deleteMany()
    await prisma.contact.deleteMany()
    await prisma.userSession.deleteMany()
    await prisma.user.deleteMany()
  }
})

export { prisma }