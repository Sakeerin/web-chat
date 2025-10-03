import { PrismaClient } from '@prisma/client'
import { hash } from 'argon2'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seed...')

  // Create test users
  const users = await Promise.all([
    createUser({
      username: 'alice',
      email: 'alice@example.com',
      name: 'Alice Johnson',
      bio: 'Software engineer who loves building chat applications',
    }),
    createUser({
      username: 'bob',
      email: 'bob@example.com', 
      name: 'Bob Smith',
      bio: 'Product manager passionate about user experience',
    }),
    createUser({
      username: 'charlie',
      email: 'charlie@example.com',
      name: 'Charlie Brown',
      bio: 'Designer focused on creating beautiful interfaces',
    }),
    createUser({
      username: 'diana',
      email: 'diana@example.com',
      name: 'Diana Prince',
      bio: 'DevOps engineer ensuring everything runs smoothly',
    }),
  ])

  console.log(`✅ Created ${users.length} users`)

  // Create a DM conversation between Alice and Bob
  const dmConversation = await prisma.conversation.create({
    data: {
      type: 'DM',
      members: {
        create: [
          {
            userId: users[0].id, // Alice
            role: 'MEMBER',
          },
          {
            userId: users[1].id, // Bob
            role: 'MEMBER',
          },
        ],
      },
    },
  })

  // Create a group conversation
  const groupConversation = await prisma.conversation.create({
    data: {
      type: 'GROUP',
      title: 'Development Team',
      ownerId: users[0].id, // Alice as owner
      members: {
        create: [
          {
            userId: users[0].id, // Alice
            role: 'OWNER',
          },
          {
            userId: users[1].id, // Bob
            role: 'ADMIN',
          },
          {
            userId: users[2].id, // Charlie
            role: 'MEMBER',
          },
          {
            userId: users[3].id, // Diana
            role: 'MEMBER',
          },
        ],
      },
    },
  })

  console.log(`✅ Created 2 conversations (1 DM, 1 group)`)

  // Create some sample messages in the DM
  const dmMessages = await Promise.all([
    prisma.message.create({
      data: {
        conversationId: dmConversation.id,
        senderId: users[0].id, // Alice
        type: 'TEXT',
        content: 'Hey Bob! How are you doing?',
      },
    }),
    prisma.message.create({
      data: {
        conversationId: dmConversation.id,
        senderId: users[1].id, // Bob
        type: 'TEXT',
        content: 'Hi Alice! I\'m doing great, thanks for asking. How about you?',
      },
    }),
    prisma.message.create({
      data: {
        conversationId: dmConversation.id,
        senderId: users[0].id, // Alice
        type: 'TEXT',
        content: 'I\'m good too! Working on the new chat application. It\'s coming along nicely.',
      },
    }),
  ])

  // Create some sample messages in the group
  const groupMessages = await Promise.all([
    prisma.message.create({
      data: {
        conversationId: groupConversation.id,
        senderId: users[0].id, // Alice
        type: 'TEXT',
        content: 'Welcome to the development team chat! 🎉',
      },
    }),
    prisma.message.create({
      data: {
        conversationId: groupConversation.id,
        senderId: users[1].id, // Bob
        type: 'TEXT',
        content: 'Thanks Alice! Excited to be working with everyone.',
      },
    }),
    prisma.message.create({
      data: {
        conversationId: groupConversation.id,
        senderId: users[2].id, // Charlie
        type: 'TEXT',
        content: 'Hey team! I\'ve been working on the UI designs. Will share them soon.',
      },
    }),
    prisma.message.create({
      data: {
        conversationId: groupConversation.id,
        senderId: users[3].id, // Diana
        type: 'TEXT',
        content: 'Great! I\'ve set up the CI/CD pipeline. We\'re ready for deployments.',
      },
    }),
  ])

  console.log(`✅ Created ${dmMessages.length + groupMessages.length} messages`)

  // Create some contact requests
  await prisma.contactRequest.create({
    data: {
      senderId: users[2].id, // Charlie
      receiverId: users[3].id, // Diana
      status: 'PENDING',
      message: 'Hi Diana! Would love to connect and collaborate.',
    },
  })

  await prisma.contactRequest.create({
    data: {
      senderId: users[0].id, // Alice
      receiverId: users[2].id, // Charlie
      status: 'ACCEPTED',
    },
  })

  console.log(`✅ Created contact requests`)

  // Create some message receipts
  for (const message of [...dmMessages, ...groupMessages]) {
    // Create delivered receipts for all conversation members
    const conversation = await prisma.conversation.findUnique({
      where: { id: message.conversationId },
      include: { members: true },
    })

    if (conversation) {
      for (const member of conversation.members) {
        if (member.userId !== message.senderId) {
          await prisma.messageReceipt.create({
            data: {
              messageId: message.id,
              userId: member.userId,
              type: 'DELIVERED',
            },
          })

          // Some messages are also read
          if (Math.random() > 0.3) {
            await prisma.messageReceipt.create({
              data: {
                messageId: message.id,
                userId: member.userId,
                type: 'READ',
              },
            })
          }
        }
      }
    }
  }

  console.log(`✅ Created message receipts`)

  console.log('🎉 Database seed completed successfully!')
}

async function createUser(userData: {
  username: string
  email: string
  name: string
  bio?: string
}) {
  const password = 'password123' // Default password for all test users
  const salt = userData.username + '_salt' // Simple salt generation
  const passwordHash = await hash(password + salt)

  return prisma.user.create({
    data: {
      ...userData,
      passwordHash,
      salt,
      privacySettings: {
        showLastSeen: true,
        showReadReceipts: true,
        allowContactRequests: true,
      },
    },
  })
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })