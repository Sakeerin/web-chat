#!/usr/bin/env ts-node

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkIndexes() {
  console.log('🔍 Checking specific performance indexes...\n')

  try {
    // Check messages table indexes
    const messageIndexes = await prisma.$queryRaw`
      SELECT indexname, indexdef 
      FROM pg_indexes 
      WHERE tablename = 'messages' 
      AND schemaname = 'public'
      ORDER BY indexname
    ` as Array<{ indexname: string; indexdef: string }>

    console.log('Messages table indexes:')
    messageIndexes.forEach(idx => {
      console.log(`   ${idx.indexname}: ${idx.indexdef}`)
    })

    // Check for the specific conversation + timestamp index
    const hasConversationTimestampIndex = messageIndexes.some(idx => 
      idx.indexdef.includes('conversationId') && idx.indexdef.includes('createdAt')
    )

    if (hasConversationTimestampIndex) {
      console.log('   ✅ Has conversation + timestamp composite index')
    } else {
      console.log('   ❌ Missing conversation + timestamp composite index')
    }

    console.log('\nUsers table indexes:')
    const userIndexes = await prisma.$queryRaw`
      SELECT indexname, indexdef 
      FROM pg_indexes 
      WHERE tablename = 'users' 
      AND schemaname = 'public'
      ORDER BY indexname
    ` as Array<{ indexname: string; indexdef: string }>

    userIndexes.forEach(idx => {
      console.log(`   ${idx.indexname}: ${idx.indexdef}`)
    })

    // Check required indexes from task requirements
    const requiredIndexes = [
      { table: 'messages', columns: ['conversationId', 'createdAt'] },
      { table: 'users', columns: ['username'] },
      { table: 'users', columns: ['email'] },
    ]

    console.log('\n📋 Checking required indexes from task requirements:')
    
    for (const required of requiredIndexes) {
      const tableIndexes = await prisma.$queryRaw`
        SELECT indexname, indexdef 
        FROM pg_indexes 
        WHERE tablename = ${required.table}
        AND schemaname = 'public'
      ` as Array<{ indexname: string; indexdef: string }>

      const hasIndex = tableIndexes.some(idx => 
        required.columns.every(col => idx.indexdef.toLowerCase().includes(col.toLowerCase()))
      )

      if (hasIndex) {
        console.log(`   ✅ ${required.table}(${required.columns.join(', ')})`)
      } else {
        console.log(`   ❌ ${required.table}(${required.columns.join(', ')})`)
      }
    }

    console.log('\n🎉 Index check completed!')

  } catch (error) {
    console.error('❌ Index check failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkIndexes().catch(console.error)